import { norm } from "@/lib/search";

export function Highlight({ text, query }: { text: string; query: string }) {
  const terms = norm(query.trim()).split(/\s+/).filter(Boolean);
  if (!terms.length) return <>{text}</>;
  const n = norm(text);
  const marks: [number, number][] = [];
  for (const t of terms) {
    let i = n.indexOf(t);
    while (i >= 0) {
      marks.push([i, i + t.length]);
      i = n.indexOf(t, i + t.length);
    }
  }
  if (!marks.length) return <>{text}</>;
  marks.sort((a, b) => a[0] - b[0]);
  const out: React.ReactNode[] = [];
  let pos = 0;
  marks.forEach(([s, e], k) => {
    if (s < pos) return;
    out.push(text.slice(pos, s));
    out.push(
      <mark key={k} className="rounded-sm bg-foreground px-0.5 text-background">
        {text.slice(s, e)}
      </mark>,
    );
    pos = e;
  });
  out.push(text.slice(pos));
  return <>{out}</>;
}
