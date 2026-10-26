// Shrinks the textures inside the photoscanned foods in public/models to 512 x 512 (WebP).
// The scans come from Poly Haven with three 2048 x 2048 textures each, about 67 MB of GPU
// memory per food once decoded, and every 3D canvas that shows a food holds its own copy.
// On screen a food is at most a few hundred pixels across, so 512 looks the same and needs
// a sixteenth of the memory, which phones need. Run from website/: node scripts/shrink-scans.mjs
// (sharp comes with the app's dependencies, installed at the repository root).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const SIZE = 512;
const folder = fileURLToPath(new URL('../public/models/', import.meta.url));
const align = (value) => Math.ceil(value / 4) * 4;

for (const name of readdirSync(folder).filter((file) => file.endsWith('.glb'))) {
  const file = join(folder, name);
  const glb = readFileSync(file);
  const jsonLength = glb.readUInt32LE(12);
  const json = JSON.parse(glb.subarray(20, 20 + jsonLength).toString('utf8'));
  const bin = glb.subarray(20 + jsonLength + 8, 20 + jsonLength + 8 + glb.readUInt32LE(20 + jsonLength));

  // New bytes for each image's buffer view.
  const replaced = new Map();
  for (const image of json.images ?? []) {
    const view = json.bufferViews[image.bufferView];
    const bytes = bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
    const { width } = await sharp(bytes).metadata();
    if (width <= SIZE) continue;
    replaced.set(image.bufferView, await sharp(bytes).resize(SIZE, SIZE, { kernel: 'lanczos3' }).webp({ quality: 88 }).toBuffer());
    image.mimeType = 'image/webp';
  }
  if (replaced.size === 0) {
    console.log(`${name}: already ${SIZE}px or smaller`);
    continue;
  }

  // Lay out the binary chunk (buffer 0) again, each region 4-byte aligned, with the shrunk images in
  // place. Meshopt-compressed views keep their (virtual) place in the fallback buffer; their data in
  // buffer 0 is found through the extension's own offset.
  const regions = [];
  json.bufferViews.forEach((view, index) => {
    if ((view.buffer ?? 0) === 0) regions.push({ index, place: view });
    const meshopt = view.extensions?.EXT_meshopt_compression;
    if (meshopt && (meshopt.buffer ?? 0) === 0) regions.push({ index: -1, place: meshopt });
  });
  regions.sort((a, b) => (a.place.byteOffset ?? 0) - (b.place.byteOffset ?? 0));
  const parts = [];
  let offset = 0;
  for (const { index, place } of regions) {
    const bytes = replaced.get(index) ?? bin.subarray(place.byteOffset ?? 0, (place.byteOffset ?? 0) + place.byteLength);
    const start = align(offset);
    if (start > offset) parts.push(Buffer.alloc(start - offset));
    place.byteOffset = start;
    place.byteLength = bytes.length;
    parts.push(bytes);
    offset = start + bytes.length;
  }
  if (align(offset) > offset) parts.push(Buffer.alloc(align(offset) - offset));
  const newBin = Buffer.concat(parts);
  json.buffers[0].byteLength = newBin.length;

  let jsonBytes = Buffer.from(JSON.stringify(json), 'utf8');
  jsonBytes = Buffer.concat([jsonBytes, Buffer.alloc(align(jsonBytes.length) - jsonBytes.length, 0x20)]);
  const header = Buffer.alloc(12);
  header.write('glTF', 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonBytes.length + 8 + newBin.length, 8);
  const chunk = (bytes, type) => {
    const head = Buffer.alloc(8);
    head.writeUInt32LE(bytes.length, 0);
    head.write(type, 4);
    return Buffer.concat([head, bytes]);
  };
  writeFileSync(file, Buffer.concat([header, chunk(jsonBytes, 'JSON'), chunk(newBin, 'BIN\0')]));
  console.log(`${name}: ${Math.round(glb.length / 1024)} KB -> ${Math.round((12 + 16 + jsonBytes.length + newBin.length) / 1024)} KB`);
}
