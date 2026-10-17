import { FileUp, Wand2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { parseImport, type ParsedImport } from "@/lib/importer";
import { usePrefs } from "@/lib/prefs";
import { JSON_EXAMPLE } from "@/lib/samples";

export interface ImportAction {
  label: string;
  variant?: "default" | "outline";
  run: (parsed: ParsedImport) => void;
}

export function ImportPanel({ actions }: { actions: ImportAction[] }) {
  const { t } = usePrefs();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const run = (a: ImportAction) => {
    try {
      a.run(parseImport(text));
      setError(null);
      setText("");
    } catch (e) {
      setError(t("json.invalid", { e: e instanceof Error ? e.message : String(e) }));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setError(null);
        }}
        placeholder={t("json.paste")}
        spellCheck={false}
        className="min-h-48 font-mono text-xs leading-relaxed"
        aria-invalid={!!error}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <input
          ref={file}
          type="file"
          accept=".json,.txt,.md,application/json,text/plain"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) setText(await f.text());
            e.target.value = "";
          }}
        />
        <Button variant="outline" size="sm" onClick={() => file.current?.click()}>
          <FileUp /> {t("json.upload")}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setText(JSON.stringify(JSON_EXAMPLE, null, 2))}>
          <Wand2 /> {t("json.example")}
        </Button>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{t("json.schemaHint")}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {actions.map((a) => (
          <Button key={a.label} variant={a.variant ?? "default"} disabled={!text.trim()} onClick={() => run(a)}>
            {a.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
