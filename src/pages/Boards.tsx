import { Cable, MoreHorizontal, Network, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input, Textarea } from "@/components/ui/input";
import { createBoard, deleteBoard, saveBoard, syncBoards, useBoards } from "@/lib/boards";
import { relativeTime } from "@/lib/format";
import { usePrefs } from "@/lib/prefs";

export default function Boards() {
  const { t, locale } = usePrefs();
  const navigate = useNavigate();
  const boards = [...useBoards()].sort((a, b) => b.updatedAt - a.updatedAt);
  const [title, setTitle] = useState("");
  const [idea, setIdea] = useState("");

  useEffect(() => {
    syncBoards();
    const timer = setInterval(syncBoards, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto max-w-[90rem] px-4 sm:px-6">
        <section className="grid gap-8 py-12 sm:py-20 lg:grid-cols-[1fr_28rem]">
          <div>
            <p className="label-xs text-muted-foreground">{t("board.map")} · {t("board.moodboard")} · MCP</p>
            <h1 className="display mt-4 text-5xl sm:text-7xl">{t("nav.boards")}</h1>
            <p className="mt-4 max-w-xl text-muted-foreground">{t("board.connectHint")}</p>
          </div>
          <form
            className="space-y-2 border border-border bg-card p-4"
            onSubmit={(e) => {
              e.preventDefault();
              const b = createBoard(title.trim() || t("common.untitled"), idea.trim());
              navigate(`/b/${b.id}`);
            }}
          >
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("board.titlePlaceholder")} />
            <Textarea rows={3} value={idea} onChange={(e) => setIdea(e.target.value)} placeholder={t("board.ideaPlaceholder")} />
            <Button type="submit" className="w-full">
              <Plus /> {t("board.create")}
            </Button>
          </form>
        </section>

        <section className="border-t border-border pt-4 pb-20">
          {boards.length === 0 ? (
            <p className="flex items-center justify-center gap-2 py-20 text-center text-muted-foreground">
              <Cable className="size-4" /> {t("board.empty")}
            </p>
          ) : (
            <ul className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {boards.map((b) => {
                const stages = b.nodes.filter((n) => n.kind === "stage").length;
                const reels = b.nodes.filter((n) => n.kind === "video").length;
                const imgs = b.nodes.flatMap((n) => n.images ?? []).slice(0, 4);
                return (
                  <li key={b.id} className="group relative border border-border bg-card transition-colors hover:border-foreground">
                    <Link to={`/b/${b.id}`} className="block p-5">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 place-items-center text-white" style={{ background: b.accent }}>
                          <Network className="size-4" />
                        </span>
                        <span className="label-xs text-muted-foreground">{relativeTime(b.updatedAt, locale)}</span>
                      </div>
                      <h2 className="mt-5 truncate text-xl font-medium uppercase">{b.title}</h2>
                      <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted-foreground">{b.idea}</p>
                      {imgs.length > 0 && (
                        <div className="mt-4 grid grid-cols-4 gap-1">
                          {imgs.map((src, i) => (
                            <img key={src + i} src={src} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                          ))}
                        </div>
                      )}
                      <p className="label-xs mt-4 flex gap-3 text-muted-foreground">
                        <span>{t("board.cards", { n: b.nodes.length })}</span>
                        <span>{t("board.stages", { n: stages })}</span>
                        <span>{t("board.reels", { n: reels })}</span>
                      </p>
                    </Link>
                    <div className="absolute top-3 right-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label="Menu">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => {
                              deleteBoard(b.id);
                              toast(t("board.boardDeleted"), { action: { label: t("common.undo"), onClick: () => saveBoard(b) } });
                            }}
                          >
                            <Trash2 /> {t("board.deleteBoard")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
