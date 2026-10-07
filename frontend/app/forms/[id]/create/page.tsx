"use client";

import { useState } from "react";
import { AddQuestionModal } from "@/components/builder/AddQuestionModal";
import { Canvas } from "@/components/builder/Canvas";
import { useForm } from "@/components/builder/FormContext";
import { QuestionList, type Selection } from "@/components/builder/QuestionList";
import { SettingsPanel } from "@/components/builder/SettingsPanel";
import { useAutosave } from "@/components/builder/useAutosave";
import { ConfirmModal } from "@/components/ui/Modal";
import { newKey } from "@/lib/api";
import { blankQuestion } from "@/lib/questionTypes";
import type { Question } from "@/lib/types";

export default function CreatePage() {
  const { form } = useForm();
  const { setQuestions, setMeta, flush } = useAutosave();
  const qs = form.questions;
  const [selection, setSelection] = useState<Selection>(
    qs.length ? { kind: "question", key: qs[0].key } : { kind: "welcome" },
  );
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Question | null>(null);

  const selectedKey = selection.kind === "question" ? selection.key : null;
  const selected = qs.find((q) => q.key === selectedKey);

  const patchQuestion = (key: string, patch: Partial<Question>) =>
    setQuestions((all) => all.map((q) => (q.key === key ? { ...q, ...patch } : q)));

  // New/duplicated questions go right after the selected one, like Typeform.
  const insertAfterSelected = (q: Question) => {
    setQuestions((all) => {
      const at = all.findIndex((x) => x.key === selectedKey);
      return at < 0 ? [...all, q] : [...all.slice(0, at + 1), q, ...all.slice(at + 1)];
    });
    setSelection({ kind: "question", key: q.key });
  };

  return (
    <div className="builder-shell flex h-full">
      <div className="hidden md:flex">
        <QuestionList
          questions={qs}
          selected={selection}
          onSelect={setSelection}
          onReorder={(next) => setQuestions(() => next)}
          onAdd={() => setAdding(true)}
          onDuplicate={(q) => {
            const copy = { ...q, id: undefined, key: newKey(), choices: q.choices.map((c) => ({ label: c.label, key: newKey() })) };
            setQuestions((all) => {
              const at = all.findIndex((x) => x.key === q.key);
              return [...all.slice(0, at + 1), copy, ...all.slice(at + 1)];
            });
            setSelection({ kind: "question", key: copy.key });
          }}
          onDelete={setDeleting}
        />
      </div>

      <Canvas
        form={form}
        selection={selection}
        onQuestion={patchQuestion}
        onMeta={setMeta}
        flush={flush}
      />

      <SettingsPanel
        form={form}
        selection={selection}
        question={selected}
        onQuestion={(patch) => selected && patchQuestion(selected.key, patch)}
        onMeta={setMeta}
      />

      {/* Mobile: no side rails, so offer a compact question switcher. */}
      <div className="fixed inset-x-0 bottom-0 flex gap-2 overflow-x-auto border-t border-[#d8d3c7] bg-[#fffdf9] p-2 md:hidden">
        <button onClick={() => setAdding(true)} className="builder-add shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-white">+ Add</button>
        {qs.map((q, i) => (
          <button
            key={q.key}
            onClick={() => setSelection({ kind: "question", key: q.key })}
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm ${q.key === selectedKey ? "bg-[#173f35] text-white" : "bg-white"}`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {adding && (
        <AddQuestionModal
          onClose={() => setAdding(false)}
          onPick={(type) => {
            insertAfterSelected(blankQuestion(type));
            setAdding(false);
          }}
        />
      )}
      {deleting && (
        <ConfirmModal
          title="Delete this question?"
          body="Any answers already collected for this question will be deleted too."
          confirm="Delete"
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            const at = qs.findIndex((q) => q.key === deleting.key);
            const rest = qs.filter((q) => q.key !== deleting.key);
            setQuestions(() => rest);
            const next = rest[Math.min(at, rest.length - 1)];
            setSelection(next ? { kind: "question", key: next.key } : { kind: "welcome" });
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}
