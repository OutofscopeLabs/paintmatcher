"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { addCustom, addOwned, EMPTY, importJson, loadCollection, saveCollection, setQty, type Collection, type CustomPaint, type OwnedPaint } from "./storage";
import { getPaint } from "./catalog";
import type { Paint } from "./types";

interface Ctx {
  collection: Collection;
  ready: boolean;
  qtyOf: (paintId: string) => number;
  add: (paintId: string, qty?: number, source?: OwnedPaint["source"]) => void;
  addCustomPaint: (custom: CustomPaint, qty?: number) => void;
  setQuantity: (paintId: string, qty: number) => void;
  replace: (text: string) => void;
  clear: () => void;
  /** Resolve an owned id to a Paint, including custom entries. */
  resolve: (paintId: string) => Paint | undefined;
}

const CollectionContext = createContext<Ctx | null>(null);

export function CollectionProvider({ children }: { children: ReactNode }) {
  const [collection, setCollection] = useState<Collection>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCollection(loadCollection());
    setReady(true);
  }, []);

  const update = useCallback((fn: (c: Collection) => Collection) => {
    setCollection((prev) => {
      const next = fn(prev);
      saveCollection(next);
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(() => ({
    collection,
    ready,
    qtyOf: (id) => collection.owned.find((o) => o.paintId === id)?.qty ?? 0,
    add: (id, qty = 1, source = "manual") => update((c) => addOwned(c, id, qty, source)),
    addCustomPaint: (custom, qty = 1) => update((c) => addCustom(c, custom, qty)),
    setQuantity: (id, qty) => update((c) => setQty(c, id, qty)),
    replace: (text) => update(() => importJson(text)),
    clear: () => update(() => EMPTY),
    resolve: (id) => {
      const p = getPaint(id);
      if (p) return p;
      const cu = collection.custom.find((x) => x.id === id);
      if (!cu) return undefined;
      return {
        id: cu.id,
        brand: cu.brand === "other" ? "citadel" : cu.brand, // brand is only used for labels; "other" is flagged via range
        range: cu.brand === "other" ? `Other: ${cu.range ?? "unknown"}` : cu.range ?? "Unlisted",
        name: cu.name,
        code: cu.code,
        hex: cu.hex,
        type: cu.type,
        finish: cu.type === "metallic" ? "metallic" : "matte",
        opacity: cu.type === "shade" ? "transparent" : cu.type === "contrast" ? "translucent" : "opaque",
        tags: [],
        notes: "Added from a photo without a catalog match; details are approximate.",
      };
    },
  }), [collection, ready, update]);

  return <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>;
}

export function useCollection(): Ctx {
  const ctx = useContext(CollectionContext);
  if (!ctx) throw new Error("useCollection must be used inside CollectionProvider");
  return ctx;
}
