import { Toaster as Sonner } from "sonner";
import { usePrefs } from "@/lib/prefs";

export function Toaster() {
  const { resolvedTheme } = usePrefs();
  return (
    <Sonner
      theme={resolvedTheme}
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast: "!rounded-xl !border-border !bg-popover !text-popover-foreground !font-sans",
          description: "!text-muted-foreground",
        },
      }}
    />
  );
}
