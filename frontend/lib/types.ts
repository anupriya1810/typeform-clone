// Mirrors backend/app/schemas.py.

export type QuestionType =
  | "short_text"
  | "long_text"
  | "multiple_choice"
  | "dropdown"
  | "email"
  | "number"
  | "yes_no"
  | "rating";

export interface Choice {
  id?: number;
  key: string; // client-only stable key (React lists, dnd, mapping new ids back after save)
  label: string;
}

export interface QuestionSettings {
  placeholder?: string;
  steps?: number; // rating
  min?: number | null; // number
  max?: number | null;
  allow_multiple?: boolean; // multiple_choice
}

export interface Question {
  id?: number;
  key: string;
  type: QuestionType;
  title: string;
  description: string | null;
  required: boolean;
  settings: QuestionSettings;
  choices: Choice[];
}

export interface Theme {
  background?: string;
  question?: string;
  answer?: string;
  font?: "sans" | "serif" | "mono";
}

export interface Form {
  id: number;
  slug: string;
  title: string;
  status: "draft" | "published";
  theme: Theme;
  welcome_title: string | null;
  welcome_message: string | null;
  thank_you_title: string;
  thank_you_message: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  questions: Question[];
}

export type PublicForm = Pick<
  Form,
  "slug" | "title" | "theme" | "welcome_title" | "welcome_message" | "thank_you_title" | "thank_you_message" | "questions"
>;

export interface FormSummary {
  id: number;
  slug: string;
  title: string;
  status: "draft" | "published";
  created_at: string;
  updated_at: string;
  response_count: number;
  question_count: number;
}

// text/email -> string, number/rating -> number, yes_no -> boolean, choices -> choice ids
export type AnswerValue = string | number | boolean | number[] | null;

export interface ResponseRow {
  id: number;
  started_at: string;
  submitted_at: string | null;
  answers: { question_id: number; value: AnswerValue; display: string }[];
}

export interface QuestionSummary {
  question_id: number;
  type: QuestionType;
  title: string;
  answered: number;
  choices?: { id?: number; label: string; count: number }[];
  average?: number | null;
  min?: number | null;
  max?: number | null;
  latest?: string[];
}

export interface Summary {
  started: number;
  completed: number;
  completion_rate: number | null;
  questions: QuestionSummary[];
}
