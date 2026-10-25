import { createContext, useContext, useRef, type ReactNode } from "react";
import { compress } from "@/lib/images";

/**
 * Worksheet mode (/fill/:id): empty answer cells become text fields and empty
 * image slots take a photo. Answers live only in this browser, keyed by
 * slide and position so they survive reloads and deck updates.
 */
interface Fill {
  get: (key: string) => string;
  set: (key: string, value: string) => void;
}

const FillCtx = createContext<Fill | null>(null);
const SlideKey = createContext("");

export const FillProvider = FillCtx.Provider;

export function FillSlide({ index, children }: { index: number; children: ReactNode }) {
  return <SlideKey.Provider value={`s${index}`}>{children}</SlideKey.Provider>;
}

/** Text field on ruled lines; null outside worksheet mode. */
export function FillText({ name }: { name: string }) {
  const fill = useContext(FillCtx);
  const key = `${useContext(SlideKey)}:${name}`;
  if (!fill) return null;
  return <textarea className="xs-fill-text" value={fill.get(key)} onChange={(e) => fill.set(key, e.target.value)} aria-label={name} />;
}

/** Photo picker for an empty slot; shows the chosen photo. Null outside worksheet mode. */
export function FillImage({ name }: { name: string }) {
  const fill = useContext(FillCtx);
  const key = `${useContext(SlideKey)}:${name}`;
  const input = useRef<HTMLInputElement>(null);
  if (!fill) return null;
  const src = fill.get(key);
  return (
    <button type="button" className="xs-fill-img" onClick={() => input.current?.click()} aria-label={name}>
      {src ? <img src={src} alt="" /> : <span className="xs-label">+</span>}
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          // Small JPEGs so several photos fit in browser storage.
          const { data, type } = await compress(file, 900);
          fill.set(key, `data:${type};base64,${data}`);
        }}
      />
    </button>
  );
}

export const useFillMode = () => useContext(FillCtx) !== null;
