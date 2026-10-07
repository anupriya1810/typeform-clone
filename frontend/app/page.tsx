"use client";

import { Copy, ExternalLink, Globe, Link2, MoreHorizontal, Pencil, Plus, Sparkles, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { Menu } from "@/components/ui/Menu";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button, ConfirmModal, PromptModal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { publicUrl, timeAgo } from "@/lib/format";
import type { FormSummary } from "@/lib/types";

type Dialog = { kind: "create" } | { kind: "rename" | "delete"; form: FormSummary } | null;

// Deterministic pastel tile per form, like Typeform's colored form thumbnails.
const TILES = ["#D4E5FF", "#FCE3D8", "#DCF1E4", "#EFE1FB", "#FFF1C9", "#D9F0F2"];

export default function Workspace() {
  const router = useRouter();
  const toast = useToast();
  const [forms, setForms] = useState<FormSummary[] | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);

  const load = useCallback(() => api.listForms().then(setForms).catch(() => toast("Couldn't load forms", "error")), [toast]);
  useEffect(() => {
    load();
  }, [load]);

  const liveCount = forms?.filter((form) => form.status === "published").length ?? 0;
  const responseCount = forms?.reduce((total, form) => total + form.response_count, 0) ?? 0;

  // Wraps a mutation: run it, toast, refresh the list.
  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast(ok);
      setDialog(null);
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Something went wrong", "error");
    }
  };

  return (
    <div className="workspace-shell flex h-screen flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#dedbd3] bg-[#fbfaf7]/90 px-5 backdrop-blur-md md:px-8">
        <Logo />
        <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#1f5145] text-sm font-semibold text-white shadow-sm" title="Default creator">
          A
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 flex-col gap-7 border-r border-[#dedbd3] bg-[#f6f4ef]/70 p-5 md:flex">
          <Button onClick={() => setDialog({ kind: "create" })} className="w-full bg-[#1f5145] shadow-[0_8px_16px_rgb(31_81_69_/_0.16)] hover:bg-[#163e35]">
            <Plus size={16} /> Create a new form
          </Button>
          <div>
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Workspaces</p>
            <div className="flex items-center justify-between rounded-lg bg-[#e5eee8] px-3 py-2 text-sm font-medium text-[#1f5145]">
              My workspace <span className="text-muted">{forms?.length ?? ""}</span>
            </div>
            <button
              onClick={() => toast("Team workspaces are coming soon")}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-white"
            >
              <Users size={15} /> Shared with me
            </button>
          </div>
          <div className="mt-auto rounded-xl border border-[#d8d3c7] bg-[#fffdf9] p-4">
            <Sparkles size={17} className="mb-3 text-[#c86b4a]" />
            <p className="text-sm font-medium">Make something people want to answer.</p>
            <p className="mt-1 text-xs leading-5 text-muted">A thoughtful question is a small act of hospitality.</p>
          </div>
        </aside>

        <main className="workspace-main min-w-0 flex-1 overflow-y-auto px-4 py-7 md:px-10 md:py-10">
          <div className="workspace-enter mx-auto max-w-5xl">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c86b4a]">Your creative desk</p>
                <h1 className="text-3xl font-medium tracking-[-0.03em] md:text-4xl">My workspace</h1>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted">A quiet place for bold questions, useful answers, and forms worth finishing.</p>
              </div>
              <Button onClick={() => setDialog({ kind: "create" })} className="bg-[#1f5145] shadow-[0_8px_16px_rgb(31_81_69_/_0.16)] hover:bg-[#163e35] md:hidden">
                <Plus size={16} /> Create
              </Button>
            </div>

            <div className="mb-7 grid grid-cols-2 gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-[#d8d3c7] bg-[#fffdf9]/80 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">All forms</p>
                <p className="mt-2 text-2xl font-medium">{forms?.length ?? "—"}</p>
              </div>
              <div className="rounded-xl border border-[#d8d3c7] bg-[#fffdf9]/80 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Live now</p>
                <p className="mt-2 text-2xl font-medium text-[#1f5145]">{forms ? liveCount : "—"}</p>
              </div>
              <div className="col-span-2 rounded-xl border border-[#d8d3c7] bg-[#f9e7dc]/80 p-4 md:col-span-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Responses collected</p>
                <p className="mt-2 text-2xl font-medium text-[#a84f35]">{forms ? responseCount : "—"}</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#d8d3c7] bg-[#fffdf9]/90 shadow-[0_18px_50px_rgb(38_38_39_/_0.06)]">
            <div className="hidden grid-cols-[1fr_120px_120px_140px_44px] gap-4 border-b border-[#e5e1d8] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted md:grid">
              <span>Name</span>
              <span>Responses</span>
              <span>Status</span>
              <span>Updated</span>
              <span />
            </div>
            {forms === null && <p className="p-8 text-center text-sm text-muted">Loading…</p>}
            {forms?.length === 0 && (
              <div className="p-12 text-center">
                <p className="mb-4 text-muted">No forms yet. Let&apos;s make your first one.</p>
                <Button onClick={() => setDialog({ kind: "create" })}>
                  <Plus size={16} /> Create a new form
                </Button>
              </div>
            )}
            {forms?.map((f) => (
              <div
                key={f.id}
                onClick={() => router.push(`/forms/${f.id}/create`)}
                className="form-row grid cursor-pointer grid-cols-[1fr_44px] items-center gap-4 border-b border-[#e5e1d8] px-5 py-4 last:border-0 md:grid-cols-[1fr_120px_120px_140px_44px]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="form-tile h-11 w-11 shrink-0 rounded-lg" style={{ background: TILES[f.id % TILES.length] }} />
                  <div className="min-w-0">
                    <p className="truncate font-medium tracking-[-0.01em]">{f.title}</p>
                    <p className="text-xs text-muted">
                      {f.question_count} question{f.question_count === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/forms/${f.id}/results`}
                  onClick={(e) => e.stopPropagation()}
                  className="hidden text-sm hover:underline md:block"
                >
                  {f.response_count}
                </Link>
                <span className="hidden md:block">
                  <StatusBadge status={f.status} />
                </span>
                <span className="hidden text-sm text-muted md:block">{timeAgo(f.updated_at)}</span>
                <Menu
                  trigger={<MoreHorizontal size={18} />}
                  items={[
                    { label: "Open", icon: <ExternalLink size={15} />, onClick: () => router.push(`/forms/${f.id}/create`) },
                    { label: "Rename", icon: <Pencil size={15} />, onClick: () => setDialog({ kind: "rename", form: f }) },
                    {
                      label: "Duplicate",
                      icon: <Copy size={15} />,
                      onClick: () => act(() => api.duplicateForm(f.id), "Form duplicated"),
                    },
                    f.status === "published"
                      ? {
                          label: "Copy link",
                          icon: <Link2 size={15} />,
                          onClick: () => navigator.clipboard.writeText(publicUrl(f.slug)).then(() => toast("Link copied")),
                        }
                      : {
                          label: "Publish",
                          icon: <Globe size={15} />,
                          onClick: () => act(() => api.publish(f.id), "Form published"),
                        },
                    ...(f.status === "published"
                      ? [{ label: "Unpublish", icon: <Globe size={15} />, onClick: () => act(() => api.unpublish(f.id), "Form unpublished") }]
                      : []),
                    { label: "Delete", icon: <Trash2 size={15} />, danger: true, onClick: () => setDialog({ kind: "delete", form: f }) },
                  ]}
                />
              </div>
            ))}
            </div>
          </div>
        </main>
      </div>

      {dialog?.kind === "create" && (
        <PromptModal
          title="Start from scratch"
          initial="My new form"
          confirm="Create"
          onClose={() => setDialog(null)}
          onSubmit={async (title) => {
            try {
              const f = await api.createForm(title);
              router.push(`/forms/${f.id}/create`);
            } catch {
              toast("Couldn't create form", "error");
            }
          }}
        />
      )}
      {dialog?.kind === "rename" && (
        <PromptModal
          title="Rename form"
          initial={dialog.form.title}
          confirm="Save"
          onClose={() => setDialog(null)}
          onSubmit={(title) => act(() => api.updateForm(dialog.form.id, { title }), "Form renamed")}
        />
      )}
      {dialog?.kind === "delete" && (
        <ConfirmModal
          title={`Delete "${dialog.form.title}"?`}
          body={
            <>
              This form and its <b>{dialog.form.response_count} responses</b> will be permanently deleted. This can&apos;t be undone.
            </>
          }
          confirm="Delete form"
          onClose={() => setDialog(null)}
          onConfirm={() => act(() => api.deleteForm(dialog.form.id), "Form deleted")}
        />
      )}
    </div>
  );
}
