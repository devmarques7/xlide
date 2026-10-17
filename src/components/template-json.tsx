import { Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePrefs } from "@/lib/prefs";
import { TEMPLATE_LIST, templateJson } from "@/lib/templates";

/** Copy / download a fill-in JSON model for each template. */
export function TemplateJson() {
  const { t } = usePrefs();
  return (
    <section className="flex flex-col gap-3 border border-border p-3">
      <div>
        <h3 className="text-sm font-medium">{t("json.templateTitle")}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{t("json.templateHint")}</p>
      </div>
      {TEMPLATE_LIST.map(({ id }) => {
        const json = () => JSON.stringify(templateJson(id), null, 2);
        return (
          <div key={id} className="flex flex-wrap items-center gap-2">
            <span className="label-xs min-w-28 flex-1">{t(`template.${id}`)}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(json());
                  toast.success(t("json.copied"));
                } catch {
                  toast.error(t("json.copy"));
                }
              }}
            >
              <Copy /> {t("json.copyTemplate")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const a = document.createElement("a");
                a.href = URL.createObjectURL(new Blob([json()], { type: "application/json" }));
                a.download = `xlide-${id}-template.json`;
                a.click();
                URL.revokeObjectURL(a.href);
              }}
            >
              <Download /> {t("json.downloadTemplate")}
            </Button>
          </div>
        );
      })}
    </section>
  );
}
