"""Server-side answer validation. Authoritative: the client mirrors these rules
in frontend/lib/validate.ts for instant feedback, but never gets the last word."""

import re
from typing import Any

from .models import CHOICE_TYPES, Question

# Same pattern as the client. Deliberately simple: "something@something.tld".
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def is_empty(value: Any) -> bool:
    return value is None or value == "" or value == []


def validate_answer(q: Question, value: Any) -> str | None:
    """Return an error message, or None if the value is acceptable for the question."""
    if isinstance(value, str):
        value = value.strip()
    if is_empty(value):
        return "Please fill this in" if q.required else None

    s = q.settings or {}
    t = q.type
    if t in ("short_text", "long_text"):
        if not isinstance(value, str):
            return "Expected text"
        limit = 255 if t == "short_text" else 5000
        if len(value) > limit:
            return f"Maximum {limit} characters"
    elif t == "email":
        if not isinstance(value, str) or not EMAIL_RE.match(value):
            return "Hmm... that email doesn't look right"
    elif t in ("number", "rating"):
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            return "Numbers only please"
        if t == "rating":
            steps = int(s.get("steps", 5))
            if value != int(value) or not 1 <= value <= steps:
                return f"Pick a rating from 1 to {steps}"
        else:
            if s.get("min") is not None and value < s["min"]:
                return f"Number must be at least {s['min']}"
            if s.get("max") is not None and value > s["max"]:
                return f"Number must be at most {s['max']}"
    elif t == "yes_no":
        if not isinstance(value, bool):
            return "Expected yes or no"
    elif t in CHOICE_TYPES:
        if not isinstance(value, list) or not all(isinstance(v, int) for v in value):
            return "Expected a list of choices"
        valid = {c.id for c in q.choices}
        if not set(value) <= valid:
            return "Unknown choice"
        if len(value) > 1 and not (t == "multiple_choice" and s.get("allow_multiple")):
            return "Only one choice allowed"
    return None


if __name__ == "__main__":
    from .models import Choice

    q = Question(type="email", required=True, settings={})
    assert validate_answer(q, "") == "Please fill this in"
    assert validate_answer(q, "nope") is not None
    assert validate_answer(q, "a@b.co") is None
    q = Question(type="rating", required=False, settings={"steps": 5})
    assert validate_answer(q, None) is None
    assert validate_answer(q, 6) is not None
    assert validate_answer(q, True) is not None
    q = Question(type="multiple_choice", required=True, settings={}, choices=[Choice(id=1, label="a", position=0)])
    assert validate_answer(q, [1]) is None
    assert validate_answer(q, [2]) == "Unknown choice"
    print("ok")
