/**
 * App state kept on the device: language, profile, settings and meal history.
 * A tiny external store (no library) persisted to AsyncStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { findLanguage, type LanguageCode } from '@/i18n/languages';

import type { FoodRef } from './engine';
import { deletePhoto } from './photo-store';
import { DEFAULT_PROFILE, type Profile } from './profile-options';

/** One logged meal. The analysis is recomputed when shown, so it follows the current profile. */
export type Scan = {
  id: string;
  createdAt: number;
  food: FoodRef;
  /** Photo reference from photo-store, or null for searched foods. */
  photo: string | null;
  source: 'photo' | 'search';
  /** Model confidence for the chosen dish, 0-1, when recognised from a photo. */
  confidence?: number;
  /** Other dishes the model suggested, so the user can change their mind later. */
  alternatives?: number[];
};

type State = {
  ready: boolean;
  language: LanguageCode | null;
  onboarded: boolean;
  profile: Profile;
  voice: boolean;
  scans: Scan[];
};

const KEYS = {
  language: 'foodhabits/language',
  onboarded: 'foodhabits/onboarded',
  profile: 'foodhabits/profile',
  voice: 'foodhabits/voice',
  scans: 'foodhabits/scans',
} as const;

const MAX_SCANS = 500;

let state: State = {
  ready: false,
  language: null,
  onboarded: false,
  profile: DEFAULT_PROFILE,
  voice: true,
  scans: [],
};
const listeners = new Set<() => void>();

function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Select a slice of state. The selector must return a stable reference (a field, not a new object). */
export function useAppState<T>(selector: (state: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  );
}

export function getState() {
  return state;
}

function persist(key: keyof typeof KEYS, value: unknown) {
  AsyncStorage.setItem(KEYS[key], JSON.stringify(value)).catch((error) => {
    console.warn(`Could not save ${key}`, error);
  });
}

function parse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function loadState() {
  try {
    const entries = Object.fromEntries(await AsyncStorage.multiGet(Object.values(KEYS)));
    const language = parse<string | null>(entries[KEYS.language], null);
    setState({
      ready: true,
      language: findLanguage(language)?.code ?? null,
      onboarded: parse(entries[KEYS.onboarded], false),
      profile: { ...DEFAULT_PROFILE, ...parse<Partial<Profile>>(entries[KEYS.profile], {}) },
      voice: parse(entries[KEYS.voice], true),
      scans: parse<Scan[]>(entries[KEYS.scans], []),
    });
  } catch (error) {
    console.warn('Could not load saved data', error);
    setState({ ready: true });
  }
}

export function setLanguage(language: LanguageCode) {
  setState({ language });
  persist('language', language);
}

export function completeOnboarding() {
  setState({ onboarded: true });
  persist('onboarded', true);
}

export function updateProfile(patch: Partial<Profile>) {
  const profile = { ...state.profile, ...patch };
  setState({ profile });
  persist('profile', profile);
}

export function setVoice(voice: boolean) {
  setState({ voice });
  persist('voice', voice);
}

export function createScanId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function addScan(scan: Scan) {
  const scans = [scan, ...state.scans];
  scans.slice(MAX_SCANS).forEach((old) => deletePhoto(old.photo));
  setState({ scans: scans.slice(0, MAX_SCANS) });
  persist('scans', state.scans);
}

export function updateScan(id: string, patch: Partial<Scan>) {
  setState({ scans: state.scans.map((scan) => (scan.id === id ? { ...scan, ...patch } : scan)) });
  persist('scans', state.scans);
}

export function deleteScan(id: string) {
  const scan = state.scans.find((candidate) => candidate.id === id);
  deletePhoto(scan?.photo ?? null);
  setState({ scans: state.scans.filter((candidate) => candidate.id !== id) });
  persist('scans', state.scans);
}

export function clearScans() {
  state.scans.forEach((scan) => deletePhoto(scan.photo));
  setState({ scans: [] });
  persist('scans', []);
}
