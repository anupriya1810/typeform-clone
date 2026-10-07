from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

QuestionType = Literal[
    "short_text", "long_text", "multiple_choice", "dropdown", "email", "number", "yes_no", "rating"
]


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- questions ----------


class ChoiceIn(BaseModel):
    id: int | None = None
    label: str = Field(max_length=300)


class ChoiceOut(ORM):
    id: int
    label: str


class QuestionIn(BaseModel):
    id: int | None = None  # None = new question
    type: QuestionType
    title: str = ""
    description: str | None = None
    required: bool = False
    settings: dict[str, Any] = {}
    choices: list[ChoiceIn] = []


class QuestionOut(ORM):
    id: int
    type: QuestionType
    title: str
    description: str | None
    required: bool
    settings: dict[str, Any]
    choices: list[ChoiceOut]


# ---------- forms ----------


class FormCreate(BaseModel):
    title: str = Field("My new form", min_length=1, max_length=200)


class FormPatch(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    theme: dict[str, Any] | None = None
    welcome_title: str | None = None
    welcome_message: str | None = None
    thank_you_title: str | None = None
    thank_you_message: str | None = None


class FormSummary(ORM):
    id: int
    slug: str
    title: str
    status: Literal["draft", "published"]
    created_at: datetime
    updated_at: datetime
    response_count: int = 0
    question_count: int = 0


class FormOut(ORM):
    id: int
    slug: str
    title: str
    status: Literal["draft", "published"]
    theme: dict[str, Any]
    welcome_title: str | None
    welcome_message: str | None
    thank_you_title: str
    thank_you_message: str
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None
    questions: list[QuestionOut]


class PublicFormOut(ORM):
    """What an anonymous respondent may see: no ids of other forms, no timestamps, no status."""

    slug: str
    title: str
    theme: dict[str, Any]
    welcome_title: str | None
    welcome_message: str | None
    thank_you_title: str
    thank_you_message: str
    questions: list[QuestionOut]


# ---------- responses ----------

AnswerValue = str | float | bool | list[int] | int | None


class AnswerIn(BaseModel):
    question_id: int
    # text/email -> str, number/rating -> number, yes_no -> bool,
    # multiple_choice/dropdown -> list of choice ids
    value: AnswerValue


class SubmitIn(BaseModel):
    response_id: int | None = None  # from /start, if the client called it
    answers: list[AnswerIn]


class StartOut(BaseModel):
    response_id: int


class AnswerOut(BaseModel):
    question_id: int
    value: AnswerValue
    display: str  # human-readable, used by table + CSV


class ResponseOut(BaseModel):
    id: int
    started_at: datetime
    submitted_at: datetime | None
    answers: list[AnswerOut]
