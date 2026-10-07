"""Unauthenticated respondent endpoints. Forms are addressed by slug, never by numeric id,
and only published forms are visible."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..answers import write_value
from ..db import get_db
from ..models import Answer, Form, Question, Response, now
from ..schemas import PublicFormOut, StartOut, SubmitIn
from ..validation import is_empty, validate_answer

router = APIRouter(prefix="/api/public/forms", tags=["public"])


def get_published(db: Session, slug: str) -> Form:
    form = db.scalar(
        select(Form)
        .where(Form.slug == slug, Form.status == "published")
        .options(selectinload(Form.questions).selectinload(Question.choices))
    )
    if not form:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This typeform isn't accepting responses")
    return form


@router.get("/{slug}", response_model=PublicFormOut)
def read_public_form(slug: str, db: Session = Depends(get_db)):
    return get_published(db, slug)


@router.post("/{slug}/start", response_model=StartOut, status_code=status.HTTP_201_CREATED)
def start_response(slug: str, db: Session = Depends(get_db)):
    """Record that someone opened the form; powers the completion-rate stat."""
    resp = Response(form=get_published(db, slug))
    db.add(resp)
    db.commit()
    return StartOut(response_id=resp.id)


@router.post("/{slug}/responses", response_model=StartOut, status_code=status.HTTP_201_CREATED)
def submit_response(slug: str, body: SubmitIn, db: Session = Depends(get_db)):
    form = get_published(db, slug)
    questions = {q.id: q for q in form.questions}
    values = {a.question_id: a.value for a in body.answers}

    errors = {str(qid): "Unknown question" for qid in values.keys() - questions.keys()}
    for q in form.questions:
        if msg := validate_answer(q, values.get(q.id)):
            errors[str(q.id)] = msg
    if errors:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, {"errors": errors})

    resp = None
    if body.response_id is not None:
        resp = db.get(Response, body.response_id)
        # Only reuse an open, unsubmitted response that belongs to this form.
        if not resp or resp.form_id != form.id or resp.submitted_at is not None:
            resp = None
    resp = resp or Response(form=form)
    for qid, value in values.items():
        if is_empty(value.strip() if isinstance(value, str) else value):
            continue
        answer = Answer(question=questions[qid])
        write_value(answer, questions[qid], value)
        resp.answers.append(answer)
    resp.submitted_at = now()
    db.add(resp)
    db.commit()
    return StartOut(response_id=resp.id)
