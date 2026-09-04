"use client";
import { useEffect, useState } from "react";
import { DEFAULT_MODEL, loadSettings, looksLikeKey, saveSettings, type Settings } from "@/lib/settings";

/** Lets the user store their own Anthropic key on this device. Rendered on the scan page. */
export function ApiKeyPanel({ onChange }: { onChange: (s: Settings) => void }) {
  const [settings, setSettings] = useState<Settings>({ apiKey: "", model: DEFAULT_MODEL });
  const [draftKey, setDraftKey] = useState("");
  const [draftModel, setDraftModel] = useState(DEFAULT_MODEL);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = loadSettings();
    setSettings(s); setDraftModel(s.model); setOpen(!s.apiKey); setReady(true);
    onChange(s);
  }, [onChange]);

  const save = () => {
    const next: Settings = { apiKey: draftKey.trim() || settings.apiKey, model: draftModel.trim() || DEFAULT_MODEL };
    saveSettings(next); setSettings(next); onChange(next); setDraftKey(""); setOpen(false);
  };
  const clear = () => {
    const next: Settings = { apiKey: "", model: DEFAULT_MODEL };
    saveSettings(next); setSettings(next); onChange(next); setDraftModel(DEFAULT_MODEL); setOpen(true);
  };

  if (!ready) return null;
  const masked = settings.apiKey ? `${settings.apiKey.slice(0, 10)}…${settings.apiKey.slice(-4)}` : "";

  return (
    <div className="panel stack" style={{ gap: ".5rem" }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <strong>Anthropic API key</strong>{" "}
          <span className="stat">{settings.apiKey ? `${masked} · ${settings.model}` : "not set — needed to identify paints from photos"}</span>
        </div>
        <button className="btn small" onClick={() => setOpen((o) => !o)}>{open ? "Close" : settings.apiKey ? "Change" : "Add key"}</button>
      </div>
      {open && (
        <div className="stack" style={{ gap: ".5rem" }}>
          <p className="stat" style={{ margin: 0 }}>
            This site is static and has no server: photos go straight from your browser to Anthropic using your own key. The key is stored only in this browser's local storage and is never sent anywhere else. Use a key from a personal account with a sensible spend limit.
          </p>
          <div className="row">
            <input type="password" placeholder="sk-ant-…" value={draftKey} onChange={(e) => setDraftKey(e.target.value)} style={{ flex: 2, minWidth: 260 }} autoComplete="off" />
            <input type="text" value={draftModel} onChange={(e) => setDraftModel(e.target.value)} title="Model id" style={{ flex: 1, minWidth: 160 }} />
            <button className="btn primary" onClick={save} disabled={!draftKey.trim() && !settings.apiKey}>Save</button>
            {settings.apiKey && <button className="btn ghost" onClick={clear}>Forget key</button>}
          </div>
          {draftKey && !looksLikeKey(draftKey) && <span className="stat" style={{ color: "var(--accent)" }}>That does not look like an Anthropic key (they start with sk-ant-).</span>}
        </div>
      )}
    </div>
  );
}
