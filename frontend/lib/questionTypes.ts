import {
  AlignLeft,
  ChevronDown,
  Equal,
  Hash,
  List,
  Mail,
  Star,
  ThumbsUp,
  type LucideIcon,
} from "lucide-react";
import { newKey } from "./api";
import type { Question, QuestionType } from "./types";

// One place for everything type-specific the UI needs: builder rail, type picker, settings, renderer.
export const QUESTION_TYPES: Record<QuestionType, { label: string; icon: LucideIcon; color: string; group: string }> = {
  short_text: { label: "Short Text", icon: Equal, color: "#E2EEFF", group: "Text" },
  long_text: { label: "Long Text", icon: AlignLeft, color: "#E2EEFF", group: "Text" },
  multiple_choice: { label: "Multiple Choice", icon: List, color: "#F4E3FF", group: "Choice" },
  dropdown: { label: "Dropdown", icon: ChevronDown, color: "#F4E3FF", group: "Choice" },
  yes_no: { label: "Yes/No", icon: ThumbsUp, color: "#F4E3FF", group: "Choice" },
  email: { label: "Email", icon: Mail, color: "#E0F5EC", group: "Contact info" },
  number: { label: "Number", icon: Hash, color: "#FFE9DA", group: "Rating & ranking" },
  rating: { label: "Rating", icon: Star, color: "#FFE9DA", group: "Rating & ranking" },
};

export const hasChoices = (t: QuestionType) => t === "multiple_choice" || t === "dropdown";

export function blankQuestion(type: QuestionType): Question {
  return {
    key: newKey(),
    type,
    title: "",
    description: null,
    required: false,
    settings: type === "rating" ? { steps: 5 } : {},
    choices: hasChoices(type)
      ? [
          { key: newKey(), label: "Choice 1" },
          { key: newKey(), label: "Choice 2" },
        ]
      : [],
  };
}

export const letter = (i: number) => String.fromCharCode(65 + i);
