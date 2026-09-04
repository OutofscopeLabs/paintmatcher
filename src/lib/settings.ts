/** Per-device settings kept in localStorage: the user's own Anthropic key and optional model override. */

const KEY = "paintmatcher.settings.v1";

export interface Settings {
  apiKey: string;
  model: string;
}

export const DEFAULT_MODEL = "claude-opus-5";
export const DEFAULTS: Settings = { apiKey: "", model: DEFAULT_MODEL };

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { apiKey: parsed.apiKey ?? "", model: parsed.model || DEFAULT_MODEL };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(s: Settings): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}

export function looksLikeKey(k: string): boolean {
  return /^sk-ant-[A-Za-z0-9_-]{20,}$/.test(k.trim());
}
