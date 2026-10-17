import {
  closestCenter, DndContext, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, Copy, GripVertical, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePrefs } from "@/lib/prefs";
import type { Locale, Slide } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SlideFrame } from "@/slides/SlideView";

interface Props {
  slides: Slide[];
  selected: string | undefined;
  lang: Locale;
  fallback: Locale;
  issueCount: (index: number) => number;
  onSelect: (id: string) => void;
  onReorder: (slides: Slide[]) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SlideList({ slides, onReorder, ...rest }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = slides.findIndex((s) => s.id === active.id);
    const to = slides.findIndex((s) => s.id === over.id);
    onReorder(arrayMove(slides, from, to));
  };

  const move = (id: string, dir: -1 | 1) => {
    const i = slides.findIndex((s) => s.id === id);
    const j = i + dir;
    if (j < 0 || j >= slides.length) return;
    onReorder(arrayMove(slides, i, j));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={slides.map((s) => s.id)} strategy={rectSortingStrategy}>
        <ol className="flex gap-3 overflow-x-auto px-4 py-3 no-scrollbar lg:flex-col lg:overflow-x-visible lg:px-0 lg:py-0">
          {slides.map((s, i) => (
            <SortableThumb key={s.id} slide={s} index={i} total={slides.length} onMove={move} {...rest} />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function SortableThumb({
  slide,
  index,
  total,
  selected,
  lang,
  fallback,
  issueCount,
  onSelect,
  onDuplicate,
  onDelete,
  onMove,
}: Omit<Props, "slides" | "onReorder"> & { slide: Slide; index: number; total: number; onMove: (id: string, d: -1 | 1) => void }) {
  const { t } = usePrefs();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id });
  const active = selected === slide.id;
  const issues = issueCount(index);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("group relative w-40 shrink-0 lg:w-full", isDragging && "z-10 opacity-80")}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className={cn("label-xs tabular-nums", active ? "text-foreground" : "text-muted-foreground")}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="label-xs truncate text-muted-foreground">{t(`layout.${slide.layout}`)}</span>
        {issues > 0 && <span className="ml-auto size-1.5 shrink-0 rounded-full bg-foreground/50" title={`${issues}`} />}
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => onSelect(slide.id)}
          className={cn(
            "block w-full rounded-lg ring-offset-2 ring-offset-background transition-shadow",
            active ? "ring-2 ring-foreground" : "hover:ring-1 hover:ring-border",
          )}
          aria-current={active}
          aria-label={`${index + 1}`}
          {...attributes}
          {...listeners}
        >
          <SlideFrame slide={slide} lang={lang} fallback={fallback} className="pointer-events-none" />
        </button>
        <div className="absolute top-1 right-1 flex gap-0.5 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100">
          <span className="hidden size-7 cursor-grab place-items-center rounded-md bg-background/85 text-muted-foreground backdrop-blur lg:grid" title={t("editor.dragHint")}>
            <GripVertical className="size-3.5" />
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="size-7 bg-background/85 backdrop-blur" aria-label="Menu">
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={index === 0} onSelect={() => onMove(slide.id, -1)}>
                <ArrowUp /> {t("editor.moveUp")}
              </DropdownMenuItem>
              <DropdownMenuItem disabled={index === total - 1} onSelect={() => onMove(slide.id, 1)}>
                <ArrowDown /> {t("editor.moveDown")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onDuplicate(slide.id)}>
                <Copy /> {t("editor.duplicate")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={total <= 1} onSelect={() => onDelete(slide.id)}>
                <Trash2 /> {t("editor.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </li>
  );
}
