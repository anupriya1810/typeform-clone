"use client";

import { CalendarDays, CreditCard, Upload } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { QUESTION_TYPES } from "@/lib/questionTypes";
import type { QuestionType } from "@/lib/types";
import { TypeTile } from "./QuestionList";

// Out of scope per the assignment; listed so the picker feels complete.
const SOON = [
  { label: "File Upload", icon: Upload },
  { label: "Payment", icon: CreditCard },
  { label: "Date", icon: CalendarDays },
];

export function AddQuestionModal({ onPick, onClose }: { onPick: (t: QuestionType) => void; onClose: () => void }) {
  const groups = Object.entries(QUESTION_TYPES).reduce<Record<string, QuestionType[]>>((acc, [type, meta]) => {
    (acc[meta.group] ??= []).push(type as QuestionType);
    return acc;
  }, {});

  return (
    <Modal title="Add form elements" onClose={onClose} width="max-w-3xl">
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-3">
        {Object.entries(groups).map(([group, types]) => (
          <div key={group}>
            <p className="mb-2 text-xs font-medium text-muted">{group}</p>
            {types.map((t) => (
              <button
                key={t}
                onClick={() => onPick(t)}
                className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-hover"
              >
                <TypeTile type={t} /> {QUESTION_TYPES[t].label}
              </button>
            ))}
          </div>
        ))}
        <div>
          <p className="mb-2 text-xs font-medium text-muted">Other</p>
          {SOON.map(({ label, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3 px-2 py-1.5 text-sm text-muted" title="Coming soon">
              <span className="inline-flex h-6 items-center rounded-md bg-hover px-1.5"><Icon size={13} /></span>
              {label}
              <span className="ml-auto rounded bg-hover px-1.5 py-0.5 text-[10px] font-medium uppercase">Soon</span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
