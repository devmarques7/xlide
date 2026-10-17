import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadImage } from "@/lib/images";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";

/** Image field: preview, URL, upload button and drag & drop. */
export function ImageInput({ value, onChange, compact }: { value?: string; onChange: (url: string | undefined) => void; compact?: boolean }) {
  const { t } = usePrefs();
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  const upload = async (f: File | undefined) => {
    if (!f || !f.type.startsWith("image/")) return;
    setBusy(true);
    try {
      const r = await uploadImage(f);
      onChange(r.url);
      if (!r.shared) toast(t("editor.imageLocalOnly"));
    } catch {
      toast.error(t("editor.imageFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn("flex gap-2 border border-dashed border-transparent p-0.5 transition-colors", over && "border-foreground bg-accent")}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        upload(e.dataTransfer.files[0]);
      }}
    >
      <button
        type="button"
        onClick={() => file.current?.click()}
        className={cn("grid shrink-0 place-items-center overflow-hidden border border-border bg-muted text-muted-foreground", compact ? "size-9" : "size-10")}
        aria-label={t("editor.uploadImage")}
        title={t("editor.uploadImage")}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : value ? (
          <img src={value} alt="" className="size-full object-cover" />
        ) : (
          <ImagePlus className="size-4" />
        )}
      </button>
      <Input
        className={cn("min-w-0 flex-1", compact && "h-9")}
        value={value?.startsWith("data:") ? t("editor.imageEmbedded") : value ?? ""}
        readOnly={value?.startsWith("data:")}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder={t("editor.dropImage")}
      />
      <Button variant="outline" size={compact ? "icon-sm" : "icon"} className={compact ? "size-9" : ""} onClick={() => file.current?.click()} disabled={busy} aria-label={t("editor.uploadImage")} title={t("editor.uploadImage")}>
        <ImagePlus />
      </Button>
      {value && (
        <Button variant="ghost" size={compact ? "icon-sm" : "icon"} className={compact ? "size-9" : ""} onClick={() => onChange(undefined)} aria-label={t("editor.removeImage")} title={t("editor.removeImage")}>
          <Trash2 />
        </Button>
      )}
      <input
        ref={file}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
