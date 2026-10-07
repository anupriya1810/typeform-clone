"use client";

import { Download, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "@/components/builder/FormContext";
import { TypeTile } from "@/components/builder/QuestionList";
import { ConfirmModal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Form, QuestionSummary, ResponseRow, Summary } from "@/lib/types";

export default function ResultsPage() {
  const { form } = useForm();
  const toast = useToast();
  const [tab, setTab] = useState<"summary" | "responses">("summary");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<ResponseRow[] | null>(null);
  const [open, setOpen] = useState<ResponseRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(() => {
    Promise.all([api.summary(form.id), api.responses(form.id)])
      .then(([s, r]) => {
        setSummary(s);
        setRows(r);
      })
      .catch(() => toast("Couldn't load results", "error"));
  }, [form.id, toast]);
  useEffect(load, [load]);

  const deleteOpen = async () => {
    if (!open) return;
    try {
      await api.deleteResponse(form.id, open.id);
      toast("Response deleted");
      setOpen(null);
      setConfirmDelete(false);
      load();
    } catch {
      toast("Couldn't delete response", "error");
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-canvas">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <div className="mb-6 grid grid-cols-3 gap-3">
          <Metric label="Responses" value={summary?.completed} />
          <Metric label="Started" value={summary?.started} />
          <Metric
            label="Completion rate"
            value={summary?.completion_rate == null ? "–" : `${Math.round(summary.completion_rate * 100)}%`}
          />
        </div>

        <div className="mb-4 flex items-center justify-between border-b border-line">
          <div className="flex">
            {(["summary", "responses"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`-mb-px border-b-2 px-3 py-2 text-sm capitalize ${tab === t ? "border-ink font-medium" : "border-transparent text-muted"}`}
              >
                {t}
                {t === "responses" && rows ? ` (${rows.length})` : ""}
              </button>
            ))}
          </div>
          <a href={api.csvUrl(form.id)} className="mb-1 flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-1.5 text-sm hover:bg-hover">
            <Download size={15} /> Download CSV
          </a>
        </div>

        {tab === "summary" ? (
          <div className="flex flex-col gap-4">
            {summary?.questions.map((qs, i) => <SummaryCard key={qs.question_id} s={qs} n={i + 1} total={summary.completed} />)}
            {summary && summary.questions.length === 0 && <Empty text="This form has no questions yet." />}
          </div>
        ) : (
          <ResponsesTable form={form} rows={rows ?? []} onOpen={setOpen} />
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-40">
          <div className="animate-fade absolute inset-0 bg-black/30" onClick={() => setOpen(null)} />
          <aside
            role="dialog"
            aria-label="Response details"
            className="animate-slide absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <p className="font-medium">Response #{open.id}</p>
                <p className="text-xs text-muted">Submitted {open.submitted_at && formatDate(open.submitted_at)}</p>
              </div>
              <div className="flex gap-1">
                <button aria-label="Delete response" onClick={() => setConfirmDelete(true)} className="rounded p-1.5 text-[#c41f1f] hover:bg-hover">
                  <Trash2 size={17} />
                </button>
                <button aria-label="Close" onClick={() => setOpen(null)} className="rounded p-1.5 hover:bg-hover">
                  <X size={17} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {form.questions.map((q, i) => {
                const a = open.answers.find((x) => x.question_id === q.id);
                return (
                  <div key={q.key} className="border-b border-line py-4 last:border-0">
                    <div className="mb-1.5 flex items-start gap-2 text-sm text-muted">
                      <TypeTile type={q.type} n={i + 1} />
                      <span>{q.title}</span>
                    </div>
                    <p className={`whitespace-pre-wrap ${a?.display ? "" : "text-muted italic"}`}>{a?.display || "No answer"}</p>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      )}
      {confirmDelete && (
        <ConfirmModal
          title="Delete this response?"
          body="It will be removed from your results and summary. This can't be undone."
          confirm="Delete"
          onClose={() => setConfirmDelete(false)}
          onConfirm={deleteOpen}
        />
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl">{value ?? "–"}</p>
    </div>
  );
}

const Empty = ({ text }: { text: string }) => (
  <div className="rounded-xl border border-line bg-white p-10 text-center text-sm text-muted">{text}</div>
);

function SummaryCard({ s, n, total }: { s: QuestionSummary; n: number; total: number }) {
  const max = Math.max(1, ...(s.choices ?? []).map((c) => c.count));
  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <div className="flex items-start gap-2.5">
        <TypeTile type={s.type} n={n} />
        <div>
          <p className="font-medium">{s.title || "Untitled question"}</p>
          <p className="text-xs text-muted">
            {s.answered} out of {total} people answered this question
          </p>
        </div>
      </div>

      {s.average != null && (
        <div className="mt-4 flex gap-8 text-sm">
          <Stat label="Average" value={s.average.toFixed(1)} />
          <Stat label="Min" value={s.min} />
          <Stat label="Max" value={s.max} />
        </div>
      )}

      {s.choices && (
        <div className="mt-4 flex flex-col gap-2">
          {s.choices.map((c) => {
            const pct = s.answered ? Math.round((c.count / s.answered) * 100) : 0;
            return (
              <div key={c.label} className="grid grid-cols-[minmax(0,160px)_1fr_80px] items-center gap-3 text-sm">
                <span className="truncate">{c.label}</span>
                <div className="h-7 overflow-hidden rounded bg-hover">
                  <div className="h-full rounded bg-[#4c3b6b]/80 transition-[width] duration-500" style={{ width: `${(c.count / max) * 100}%` }} />
                </div>
                <span className="text-right text-muted">
                  {pct}% · {c.count}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {s.latest && (
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          {s.latest.length === 0 && <li className="text-muted">No answers yet</li>}
          {s.latest.map((t, i) => (
            <li key={i} className="rounded-md bg-canvas px-3 py-2">{t}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-xs text-muted">{label}</p>
    <p className="text-lg">{value ?? "–"}</p>
  </div>
);

function ResponsesTable({ form, rows, onOpen }: { form: Form; rows: ResponseRow[]; onOpen: (r: ResponseRow) => void }) {
  if (rows.length === 0) return <Empty text="No responses yet. Share your form to start collecting them." />;
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line text-xs text-muted">
          <tr>
            <th className="whitespace-nowrap px-4 py-3 font-medium">Submitted</th>
            {form.questions.map((q) => (
              <th key={q.key} className="max-w-56 truncate px-4 py-3 font-medium">{q.title || "Untitled"}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} onClick={() => onOpen(r)} className="cursor-pointer border-b border-line last:border-0 hover:bg-[#fafafa]">
              <td className="whitespace-nowrap px-4 py-3 text-muted">{r.submitted_at && formatDate(r.submitted_at)}</td>
              {form.questions.map((q) => (
                <td key={q.key} className="max-w-56 truncate px-4 py-3">
                  {r.answers.find((a) => a.question_id === q.id)?.display}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
