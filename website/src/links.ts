/** A file from /public, under the base path the site is published at (e.g. /foodhabits.com/ on GitHub Pages). */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

/** Where "Try now" opens the web app: a sibling folder on the published site, or the app's dev server. */
export const APP_URL: string = import.meta.env.VITE_APP_URL ?? `${import.meta.env.BASE_URL}app/`;
