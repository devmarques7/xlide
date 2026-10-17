import { Fragment } from "react";

/** Inline markup for slide copy: *word* = highlight (bold, attention colour). */
export function Rich({ text }: { text: string }) {
  if (!text.includes("*")) return <>{text}</>;
  return (
    <>
      {text.split(/(\*[^*\n]+\*)/g).map((part, i) =>
        part.startsWith("*") && part.endsWith("*") && part.length > 2 ? (
          <strong key={i} className="xs-hl">
            {part.slice(1, -1)}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

export const plain = (text: string) => text.replace(/\*([^*\n]+)\*/g, "$1");
