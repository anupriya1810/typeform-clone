"""Creator-side form management. Single implicit creator (no auth) — see README assumptions."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..db import get_db
from ..models import CHOICE_TYPES, Choice, Form, Question, Response, now
from ..schemas import FormCreate, FormOut, FormPatch, FormSummary, QuestionIn, QuestionOut

router = APIRouter(prefix="/api/forms", tags=["forms"])


def get_form(db: Session, form_id: int) -> Form:
    form = db.scalar(
        select(Form)
        .where(Form.id == form_id)
        .options(selectinload(Form.questions).selectinload(Question.choices))
    )
    if not form:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Form not found")
    return form


@router.get("", response_model=list[FormSummary])
def list_forms(db: Session = Depends(get_db)):
    responses = (
        select(func.count(Response.id))
        .where(Response.form_id == Form.id, Response.submitted_at.is_not(None))
        .scalar_subquery()
    )
    questions = select(func.count(Question.id)).where(Question.form_id == Form.id).scalar_subquery()
    rows = db.execute(
        select(Form, responses.label("rc"), questions.label("qc")).order_by(Form.updated_at.desc())
    ).all()
    return [
        FormSummary.model_validate(f).model_copy(update={"response_count": rc, "question_count": qc})
        for f, rc, qc in rows
    ]


@router.post("", response_model=FormOut, status_code=status.HTTP_201_CREATED)
def create_form(body: FormCreate, db: Session = Depends(get_db)):
    form = Form(title=body.title)
    db.add(form)
    db.commit()
    return get_form(db, form.id)


@router.get("/{form_id}", response_model=FormOut)
def read_form(form_id: int, db: Session = Depends(get_db)):
    return get_form(db, form_id)


@router.patch("/{form_id}", response_model=FormOut)
def update_form(form_id: int, body: FormPatch, db: Session = Depends(get_db)):
    form = get_form(db, form_id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(form, k, v)
    db.commit()
    return get_form(db, form_id)


@router.delete("/{form_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_form(form_id: int, db: Session = Depends(get_db)):
    db.delete(get_form(db, form_id))
    db.commit()


@router.put("/{form_id}/questions", response_model=list[QuestionOut])
def save_questions(form_id: int, body: list[QuestionIn], db: Session = Depends(get_db)):
    """Replace the form's ordered question list in one transaction.

    Questions/choices with an `id` are updated in place (so existing answers stay linked),
    ones without are created, and ones missing from the payload are deleted.
    The response is in payload order, so the client can map new ids back by index.
    """
    form = get_form(db, form_id)
    existing = {q.id: q for q in form.questions}
    unknown = {q.id for q in body if q.id is not None} - existing.keys()
    if unknown:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"Questions {sorted(unknown)} not in this form")

    ordered: list[Question] = []
    for pos, qin in enumerate(body):
        q = existing.pop(qin.id) if qin.id is not None else Question()
        q.position, q.type, q.title = pos, qin.type, qin.title
        q.description, q.required, q.settings = qin.description, qin.required, qin.settings

        old_choices = {c.id: c for c in q.choices}
        new_choices = []
        if qin.type in CHOICE_TYPES:
            for cpos, cin in enumerate(qin.choices):
                c = old_choices.get(cin.id) if cin.id is not None else None
                c = c or Choice()
                c.position, c.label = cpos, cin.label
                new_choices.append(c)
        q.choices = new_choices  # delete-orphan removes dropped choices
        ordered.append(q)

    form.questions = ordered  # delete-orphan removes questions left in `existing`
    form.updated_at = now()
    db.commit()
    return ordered


@router.post("/{form_id}/duplicate", response_model=FormOut, status_code=status.HTTP_201_CREATED)
def duplicate_form(form_id: int, db: Session = Depends(get_db)):
    src = get_form(db, form_id)
    copy = Form(
        title=f"{src.title} (copy)",
        theme=dict(src.theme),
        welcome_title=src.welcome_title,
        welcome_message=src.welcome_message,
        thank_you_title=src.thank_you_title,
        thank_you_message=src.thank_you_message,
        questions=[
            Question(
                position=q.position,
                type=q.type,
                title=q.title,
                description=q.description,
                required=q.required,
                settings=dict(q.settings),
                choices=[Choice(position=c.position, label=c.label) for c in q.choices],
            )
            for q in src.questions
        ],
    )
    db.add(copy)
    db.commit()
    return get_form(db, copy.id)


def _set_status(db: Session, form_id: int, published: bool) -> Form:
    form = get_form(db, form_id)
    if published and not form.questions:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Add at least one question before publishing")
    form.status = "published" if published else "draft"
    if published:
        form.published_at = now()
    db.commit()
    return get_form(db, form_id)


@router.post("/{form_id}/publish", response_model=FormOut)
def publish_form(form_id: int, db: Session = Depends(get_db)):
    return _set_status(db, form_id, True)


@router.post("/{form_id}/unpublish", response_model=FormOut)
def unpublish_form(form_id: int, db: Session = Depends(get_db)):
    return _set_status(db, form_id, False)
