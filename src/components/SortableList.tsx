import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SortableRowProps {
  id: string;
  index: number;
  total: number;
  onMove: (dir: -1 | 1) => void;
  children: ReactNode;
}

function SortableRow({ id, index, total, onMove, children }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-xl border bg-card shadow-sm transition-shadow",
        isDragging && "z-10 shadow-lg ring-2 ring-primary/40",
      )}
    >
      <div className="flex items-stretch">
        <button
          type="button"
          className="flex w-10 shrink-0 cursor-grab touch-none items-center justify-center rounded-l-xl bg-muted/60 text-muted-foreground hover:bg-muted active:cursor-grabbing"
          aria-label="Arrastar para reordenar"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1 p-3 sm:p-4">{children}</div>
        {/* No celular as setas são o controle principal — arrastar com o dedo
            numa lista longa é impreciso. 28px era alvo pequeno demais. */}
        <div className="flex flex-col items-center justify-center gap-0.5 border-l bg-muted/30 px-1 py-2 sm:gap-1 sm:px-1.5">
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 sm:h-7 sm:w-7"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            aria-label="Mover para cima"
          >
            <ArrowUp className="h-5 w-5 sm:h-4 sm:w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 sm:h-7 sm:w-7"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            aria-label="Mover para baixo"
          >
            <ArrowDown className="h-5 w-5 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface SortableListProps<T extends { id: string }> {
  items: T[];
  onReorder: (newOrder: string[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
}

export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const ids = items.map((i) => i.id);

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = ids.indexOf(active.id as string);
    const newIdx = ids.indexOf(over.id as string);
    if (oldIdx < 0 || newIdx < 0) return;
    onReorder(arrayMove(ids, oldIdx, newIdx));
  }

  function move(id: string, dir: -1 | 1) {
    const idx = ids.indexOf(id);
    const next = idx + dir;
    if (next < 0 || next >= ids.length) return;
    onReorder(arrayMove(ids, idx, next));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-3">
          {items.map((item, i) => (
            <SortableRow
              key={item.id}
              id={item.id}
              index={i}
              total={items.length}
              onMove={(dir) => move(item.id, dir)}
            >
              {renderItem(item, i)}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}