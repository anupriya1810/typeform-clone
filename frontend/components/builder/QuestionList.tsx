"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, Flag, MoreVertical, Plus, Sparkles, Trash2 } from "lucide-react";
import { Menu } from "@/components/ui/Menu";
import { QUESTION_TYPES } from "@/lib/questionTypes";
import type { Question } from "@/lib/types";

export type Selection = { kind: "question"; key: string } | { kind: "welcome" } | { kind: "ending" };

export function TypeTile({ type, n, size = "sm" }: { type: Question["type"]; n?: number; size?: "sm" | "lg" }) {
  const { icon: Icon, color } = QUESTION_TYPES[type];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 text-ink ${size === "lg" ? "h-9 min-w-9 justify-center" : "h-6"}`}
      style={{ background: color }}
    >
      <Icon size={size === "lg" ? 18 : 13} />
      {n != null && <span className="text-xs font-medium">{n}</span>}
    </span>
  );
}

function Row({
  q,
  n,
  active,
  onSelect,
  onDuplicate,
  onDelete,
}: {
  q: Question;
  n: number;
  active: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.key });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      className={`group flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm ${active ? "builder-selected" : "text-[#173f35]/75 hover:bg-[#f1f5f1] hover:text-[#173f35]"} ${isDragging ? "z-10 shadow-lg" : ""}`}
    >
      <TypeTile type={q.type} n={n} />
      <span className={`min-w-0 flex-1 truncate ${q.title ? "" : "text-muted"}`}>{q.title || "..."}</span>
      <span className="opacity-0 group-hover:opacity-100" onPointerDown={(e) => e.stopPropagation()}>
        <Menu
          trigger={<MoreVertical size={15} />}
          items={[
            { label: "Duplicate", icon: <Copy size={15} />, onClick: onDuplicate },
            { label: "Delete", icon: <Trash2 size={15} />, danger: true, onClick: onDelete },
          ]}
        />
      </span>
    </div>
  );
}

export function QuestionList({
  questions,
  selected,
  onSelect,
  onReorder,
  onAdd,
  onDuplicate,
  onDelete,
}: {
  questions: Question[];
  selected: Selection;
  onSelect: (s: Selection) => void;
  onReorder: (qs: Question[]) => void;
  onAdd: () => void;
  onDuplicate: (q: Question) => void;
  onDelete: (q: Question) => void;
}) {
  // Small drag threshold so a click still selects; keyboard sensor makes reordering accessible.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = questions.findIndex((q) => q.key === active.id);
    const to = questions.findIndex((q) => q.key === over.id);
    onReorder(arrayMove(questions, from, to));
  };

  const isSel = (s: Selection) => JSON.stringify(s) === JSON.stringify(selected);

  return (
    <aside className="builder-rail flex w-full shrink-0 flex-col border-r border-[#12372e] md:w-72">
      <div className="border-b border-white/10 p-4">
        <p className="builder-label mb-3 text-[#f2ad8d]">Build your form</p>
        <button onClick={onAdd} className="builder-add flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white">
          <Plus size={16} /> Add content
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3 pt-4">
        <button
          onClick={() => onSelect({ kind: "welcome" })}
          className={`mb-1 flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm ${isSel({ kind: "welcome" }) ? "builder-selected" : "text-[#173f35]/75 hover:bg-[#f1f5f1] hover:text-[#173f35]"}`}
        >
          <span className="inline-flex h-6 items-center rounded-md bg-[#fff1c9] px-1.5"><Sparkles size={13} /></span>
          <span className="text-muted">Welcome screen</span>
        </button>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={questions.map((q) => q.key)} strategy={verticalListSortingStrategy}>
            {questions.map((q, i) => (
              <Row
                key={q.key}
                q={q}
                n={i + 1}
                active={isSel({ kind: "question", key: q.key })}
                onSelect={() => onSelect({ kind: "question", key: q.key })}
                onDuplicate={() => onDuplicate(q)}
                onDelete={() => onDelete(q)}
              />
            ))}
          </SortableContext>
        </DndContext>

        <p className="builder-label mt-5 px-2 pb-2 text-[#f2ad8d]">Endings</p>
        <button
          onClick={() => onSelect({ kind: "ending" })}
          className={`flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm ${isSel({ kind: "ending" }) ? "builder-selected" : "text-[#173f35]/75 hover:bg-[#f1f5f1] hover:text-[#173f35]"}`}
        >
          <span className="inline-flex h-6 items-center rounded-md bg-[#e0f5ec] px-1.5"><Flag size={13} /></span>
          <span className="text-muted">Thank you screen</span>
        </button>
      </div>
    </aside>
  );
}
