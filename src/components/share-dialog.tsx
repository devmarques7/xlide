import { Check, Copy, Share2, Wifi } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePrefs } from "@/lib/prefs";
import { usePublicOrigin } from "@/lib/sync";

export function QrBlock({ url, caption }: { url: string; caption?: string }) {
  return (
    <figure className="flex flex-col items-center gap-3">
      <div className="rounded-2xl border border-border bg-[#f7f6f3] p-4">
        <QRCodeSVG value={url} size={200} bgColor="#f7f6f3" fgColor="#161615" level="M" className="size-44 sm:size-52" />
      </div>
      {caption && <figcaption className="label-xs text-muted-foreground">{caption}</figcaption>}
    </figure>
  );
}

export function CopyField({ value }: { value: string }) {
  const { t } = usePrefs();
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-1 pl-3">
      <span className="min-w-0 flex-1 truncate font-mono text-xs">{value}</span>
      <Button
        size="sm"
        variant="secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
          } catch {
            /* clipboard blocked — still show the link */
          }
          setCopied(true);
          toast.success(t("json.copied"));
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check /> : <Copy />} {t("share.copy")}
      </Button>
    </div>
  );
}

export function LanHint() {
  const { t } = usePrefs();
  const { isLocal, origin } = usePublicOrigin();
  if (!isLocal) return null;
  return (
    <p className="flex gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
      <Wifi className="mt-0.5 size-4 shrink-0" />
      <span>
        {t("share.lanHint")} <b className="font-mono text-foreground">{origin}</b>
      </span>
    </p>
  );
}

export function ShareDialog({ id, title, open, onOpenChange }: { id: string; title: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = usePrefs();
  const { origin } = usePublicOrigin();
  const url = `${origin}/view/${id}`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("share.title")}</DialogTitle>
          <DialogDescription>{t("share.desc")}</DialogDescription>
        </DialogHeader>
        <QrBlock url={url} caption={t("share.scan")} />
        <CopyField value={url} />
        <LanHint />
        {"share" in navigator && (
          <Button variant="outline" onClick={() => navigator.share({ title, url }).catch(() => {})}>
            <Share2 /> {t("share.native")}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
