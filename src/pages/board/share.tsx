import { Share2 } from "lucide-react";
import { useState } from "react";
import { CopyField, LanHint, QrBlock } from "@/components/share-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CONTENT_LANGS, type ContentLang } from "@/lib/board-i18n";
import type { Board } from "@/lib/boards";
import { usePrefs } from "@/lib/prefs";
import { appUrl, usePublicOrigin } from "@/lib/sync";
import { cn } from "@/lib/utils";

/** Public link to follow the board live, optionally opening in a given language. */
export function BoardShareDialog({ board, open, onOpenChange }: { board: Board; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = usePrefs();
  const { origin } = usePublicOrigin();
  const [lang, setLang] = useState<ContentLang>("original");
  const url = appUrl(origin, `/board/${board.id}${lang === "original" ? "" : `?lang=${lang}`}`);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:w-[min(92vw,30rem)]">
        <DialogHeader>
          <DialogTitle>{t("board.shareTitle")}</DialogTitle>
          <DialogDescription>{t("board.shareDesc")}</DialogDescription>
        </DialogHeader>
        <div>
          <p className="label-xs text-muted-foreground">{t("board.shareLang")}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {CONTENT_LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang(l.code)}
                className={cn("label-xs h-8 border px-2.5", lang === l.code ? "border-foreground bg-foreground text-background" : "border-border hover:bg-accent")}
              >
                {l.code === "original" ? t("board.original") : l.code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <QrBlock url={url} caption={t("share.scan")} />
        <CopyField value={url} />
        <LanHint />
        {"share" in navigator && (
          <Button variant="outline" onClick={() => navigator.share({ title: board.title, url }).catch(() => {})}>
            <Share2 /> {t("share.native")}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
