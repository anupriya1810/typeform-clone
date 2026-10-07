"""Mapping between the API's loose `value` and the typed columns of the answers table."""

from typing import Any

from .models import CHOICE_TYPES, Answer, Question


def write_value(answer: Answer, q: Question, value: Any) -> None:
    if q.type in CHOICE_TYPES:
        by_id = {c.id: c for c in q.choices}
        answer.choices = [by_id[i] for i in value]
    elif q.type in ("number", "rating"):
        answer.number_value = float(value)
    elif q.type == "yes_no":
        answer.bool_value = value
    else:
        answer.text_value = value.strip()


def read_value(answer: Answer) -> Any:
    t = answer.question.type
    if t in CHOICE_TYPES:
        return [c.id for c in answer.choices]
    if t in ("number", "rating"):
        n = answer.number_value
        return int(n) if n is not None and n.is_integer() else n
    if t == "yes_no":
        return answer.bool_value
    return answer.text_value


def display(answer: Answer) -> str:
    t = answer.question.type
    if t in CHOICE_TYPES:
        return ", ".join(c.label for c in answer.choices)
    if t == "yes_no":
        return "" if answer.bool_value is None else ("Yes" if answer.bool_value else "No")
    v = read_value(answer)
    return "" if v is None else str(v)

