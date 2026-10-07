// Client mirror of backend/app/validation.py — keep the two in sync.
// Gives instant feedback; the server re-checks everything on submit.
import type { AnswerValue, Question } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isEmpty = (v: AnswerValue | undefined) =>
  v === null || v === undefined || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0);

export function validate(q: Question, v: AnswerValue | undefined): string | null {
  if (isEmpty(v)) return q.required ? "Please fill this in" : null;
  const s = q.settings;
  switch (q.type) {
    case "short_text":
      return (v as string).trim().length > 255 ? "Maximum 255 characters" : null;
    case "long_text":
      return (v as string).trim().length > 5000 ? "Maximum 5000 characters" : null;
    case "email":
      return EMAIL_RE.test((v as string).trim()) ? null : "Hmm... that email doesn't look right";
    case "number":
      if (typeof v !== "number" || Number.isNaN(v)) return "Numbers only please";
      if (s.min != null && v < s.min) return `Number must be at least ${s.min}`;
      if (s.max != null && v > s.max) return `Number must be at most ${s.max}`;
      return null;
    case "rating": {
      const steps = s.steps ?? 5;
      return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= steps ? null : `Pick a rating from 1 to ${steps}`;
    }
    default:
      return null;
  }
}
