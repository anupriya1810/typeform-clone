import secrets
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import TypeDecorator

from .db import Base

QUESTION_TYPES = (
    "short_text",
    "long_text",
    "multiple_choice",
    "dropdown",
    "email",
    "number",
    "yes_no",
    "rating",
)
CHOICE_TYPES = ("multiple_choice", "dropdown")


def now() -> datetime:
    return datetime.now(timezone.utc)


class UTCDateTime(TypeDecorator):
    """SQLite drops tzinfo; store UTC and re-attach it on load so the API emits `+00:00`."""

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value, dialect):
        return value.astimezone(timezone.utc).replace(tzinfo=None) if value else value

    def process_result_value(self, value, dialect):
        return value.replace(tzinfo=timezone.utc) if value else value


def new_slug() -> str:
    # 8 url-safe chars ≈ 48 bits: unguessable enough for "anyone with the link" sharing.
    return secrets.token_urlsafe(6)


class Form(Base):
    __tablename__ = "forms"
    __table_args__ = (CheckConstraint("status IN ('draft','published')", name="ck_form_status"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(16), unique=True, default=new_slug)
    title: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(16), default="draft")
    # Presentation-only knobs (colors, font). Never filtered on, so JSON beats extra columns.
    theme: Mapped[dict] = mapped_column(JSON, default=dict)
    welcome_title: Mapped[str | None] = mapped_column(String(300))
    welcome_message: Mapped[str | None] = mapped_column(Text)
    thank_you_title: Mapped[str] = mapped_column(String(300), default="Thanks for completing this typeform")
    thank_you_message: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=now)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=now, onupdate=now)
    published_at: Mapped[datetime | None] = mapped_column(UTCDateTime)

    questions: Mapped[list["Question"]] = relationship(
        back_populates="form", order_by="Question.position", cascade="all, delete-orphan", passive_deletes=True
    )
    responses: Mapped[list["Response"]] = relationship(
        back_populates="form", cascade="all, delete-orphan", passive_deletes=True
    )


class Question(Base):
    __tablename__ = "questions"
    __table_args__ = (
        CheckConstraint(f"type IN {QUESTION_TYPES}", name="ck_question_type"),
        Index("ix_questions_form_position", "form_id", "position"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    form_id: Mapped[int] = mapped_column(ForeignKey("forms.id", ondelete="CASCADE"))
    position: Mapped[int] = mapped_column(Integer)
    type: Mapped[str] = mapped_column(String(32))
    title: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[str | None] = mapped_column(Text)
    required: Mapped[bool] = mapped_column(Boolean, default=False)
    # Per-type knobs: rating `steps`, number `min`/`max`, choice `allow_multiple`, `placeholder`.
    settings: Mapped[dict] = mapped_column(JSON, default=dict)

    form: Mapped[Form] = relationship(back_populates="questions")
    choices: Mapped[list["Choice"]] = relationship(
        back_populates="question", order_by="Choice.position", cascade="all, delete-orphan", passive_deletes=True
    )


class Choice(Base):
    __tablename__ = "choices"

    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(Integer)
    label: Mapped[str] = mapped_column(String(300))

    question: Mapped[Question] = relationship(back_populates="choices")


class Response(Base):
    __tablename__ = "responses"
    __table_args__ = (Index("ix_responses_form_submitted", "form_id", "submitted_at"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    form_id: Mapped[int] = mapped_column(ForeignKey("forms.id", ondelete="CASCADE"))
    started_at: Mapped[datetime] = mapped_column(UTCDateTime, default=now)
    # NULL = respondent opened the form but never submitted (partial) -> completion rate.
    submitted_at: Mapped[datetime | None] = mapped_column(UTCDateTime)

    form: Mapped[Form] = relationship(back_populates="responses")
    answers: Mapped[list["Answer"]] = relationship(
        back_populates="response", cascade="all, delete-orphan", passive_deletes=True
    )


class Answer(Base):
    """One row per (response, question). Exactly one typed value column is used,
    picked by question type; choice answers live in answer_choices."""

    __tablename__ = "answers"
    __table_args__ = (UniqueConstraint("response_id", "question_id", name="uq_answer_response_question"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    response_id: Mapped[int] = mapped_column(ForeignKey("responses.id", ondelete="CASCADE"))
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), index=True)
    text_value: Mapped[str | None] = mapped_column(Text)
    number_value: Mapped[float | None] = mapped_column(Float)
    bool_value: Mapped[bool | None] = mapped_column(Boolean)

    response: Mapped[Response] = relationship(back_populates="answers")
    question: Mapped[Question] = relationship()
    choices: Mapped[list[Choice]] = relationship(secondary="answer_choices", order_by="Choice.position")


class AnswerChoice(Base):
    __tablename__ = "answer_choices"

    answer_id: Mapped[int] = mapped_column(ForeignKey("answers.id", ondelete="CASCADE"), primary_key=True)
    choice_id: Mapped[int] = mapped_column(ForeignKey("choices.id", ondelete="CASCADE"), primary_key=True, index=True)
