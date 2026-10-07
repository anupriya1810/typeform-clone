import type { AnswerValue, Form, FormSummary, PublicForm, Question, ResponseRow, Summary } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(public status: number, public detail: unknown) {
    super(typeof detail === "string" ? detail : `Request failed (${status})`);
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail ?? res.statusText);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

const json = (method: string, body?: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

// The backend has no `key`; attach one so React/dnd have a stable identity for every row.
let seq = 0;
export const newKey = () => `k${Date.now().toString(36)}${(seq++).toString(36)}`;
type ServerQuestion = Omit<Question, "key" | "choices"> & { choices: { id: number; label: string }[] };
const withKeys = (qs: ServerQuestion[]): Question[] =>
  qs.map((q) => ({ ...q, key: `q${q.id}`, choices: q.choices.map((c) => ({ ...c, key: `c${c.id}` })) }));
type Raw<T> = Omit<T, "questions"> & { questions: ServerQuestion[] };
const hydrate = <T extends { questions: Question[] }>(f: Raw<T>) => ({ ...f, questions: withKeys(f.questions) }) as T;

export const api = {
  listForms: () => req<FormSummary[]>("/forms"),
  getForm: (id: number) => req<Raw<Form>>(`/forms/${id}`).then(hydrate<Form>),
  createForm: (title: string) => req<{ id: number }>("/forms", json("POST", { title })),
  updateForm: (id: number, patch: Partial<Form>) =>
    req<Raw<Form>>(`/forms/${id}`, json("PATCH", patch)).then(hydrate<Form>),
  deleteForm: (id: number) => req<void>(`/forms/${id}`, { method: "DELETE" }),
  duplicateForm: (id: number) => req<{ id: number }>(`/forms/${id}/duplicate`, { method: "POST" }),
  publish: (id: number) => req<Raw<Form>>(`/forms/${id}/publish`, { method: "POST" }).then(hydrate<Form>),
  unpublish: (id: number) => req<Raw<Form>>(`/forms/${id}/unpublish`, { method: "POST" }).then(hydrate<Form>),
  // Response is in payload order; caller maps new ids back by index.
  saveQuestions: (id: number, qs: Question[]) =>
    req<ServerQuestion[]>(
      `/forms/${id}/questions`,
      json(
        "PUT",
        qs.map((q) => ({
          id: q.id,
          type: q.type,
          title: q.title,
          description: q.description,
          required: q.required,
          settings: q.settings,
          choices: q.choices.map((c) => ({ id: c.id, label: c.label })),
        })),
      ),
    ),

  responses: (id: number) => req<ResponseRow[]>(`/forms/${id}/responses`),
  deleteResponse: (id: number, rid: number) => req<void>(`/forms/${id}/responses/${rid}`, { method: "DELETE" }),
  summary: (id: number) => req<Summary>(`/forms/${id}/summary`),
  csvUrl: (id: number) => `${API_URL}/api/forms/${id}/responses.csv`,

  publicForm: (slug: string) =>
    req<Raw<PublicForm>>(`/public/forms/${slug}`).then(hydrate<PublicForm>),
  start: (slug: string) => req<{ response_id: number }>(`/public/forms/${slug}/start`, { method: "POST" }),
  submit: (slug: string, responseId: number | null, answers: Record<number, AnswerValue>) =>
    req<{ response_id: number }>(
      `/public/forms/${slug}/responses`,
      json("POST", {
        response_id: responseId,
        answers: Object.entries(answers).map(([question_id, value]) => ({ question_id: Number(question_id), value })),
      }),
    ),
};
