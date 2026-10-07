"""Creator-side results: submissions, per-question summary stats, CSV export."""

import csv
import io

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..answers import display, read_value
from ..db import get_db
from ..models import CHOICE_TYPES, Answer, AnswerChoice, Response
from ..schemas import AnswerOut, ResponseOut
from .forms import get_form

router = APIRouter(prefix="/api/forms/{form_id}", tags=["results"])


def _load_responses(db: Session, form_id: int, response_id: int | None = None):
    q = (
        select(Response)
        .where(Response.form_id == form_id, Response.submitted_at.is_not(None))
        .options(selectinload(Response.answers).options(selectinload(Answer.question), selectinload(Answer.choices)))
        .order_by(Response.submitted_at.desc())
    )
    if response_id is not None:
        q = q.where(Response.id == response_id)
    return db.scalars(q).all()


def _out(r: Response) -> ResponseOut:
    return ResponseOut(
        id=r.id,
        started_at=r.started_at,
        submitted_at=r.submitted_at,
        answers=[AnswerOut(question_id=a.question_id, value=read_value(a), display=display(a)) for a in r.answers],
    )


@router.get("/responses", response_model=list[ResponseOut])
def list_responses(form_id: int, db: Session = Depends(get_db)):
    get_form(db, form_id)
    return [_out(r) for r in _load_responses(db, form_id)]


@router.get("/responses/{response_id}", response_model=ResponseOut)
def read_response(form_id: int, response_id: int, db: Session = Depends(get_db)):
    rows = _load_responses(db, form_id, response_id)
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Response not found")
    return _out(rows[0])


@router.delete("/responses/{response_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_response(form_id: int, response_id: int, db: Session = Depends(get_db)):
    resp = db.get(Response, response_id)
    if not resp or resp.form_id != form_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Response not found")
    db.delete(resp)
    db.commit()


@router.get("/summary")
def summary(form_id: int, db: Session = Depends(get_db)):
    """Aggregates are computed in SQL (GROUP BY over the typed answer columns),
    which is the main reason answers are not stored as a JSON blob."""
    form = get_form(db, form_id)
    submitted = Response.submitted_at.is_not(None)
    in_form = Answer.response_id.in_(select(Response.id).where(Response.form_id == form_id, submitted))

    started = db.scalar(select(func.count()).where(Response.form_id == form_id)) or 0
    completed = db.scalar(select(func.count()).where(Response.form_id == form_id, submitted)) or 0

    answered = dict(db.execute(select(Answer.question_id, func.count()).where(in_form).group_by(Answer.question_id)).all())
    choice_counts = dict(
        db.execute(
            select(AnswerChoice.choice_id, func.count())
            .join(Answer, Answer.id == AnswerChoice.answer_id)
            .where(in_form)
            .group_by(AnswerChoice.choice_id)
        ).all()
    )
    numeric = {
        qid: (avg, lo, hi)
        for qid, avg, lo, hi in db.execute(
            select(Answer.question_id, func.avg(Answer.number_value), func.min(Answer.number_value), func.max(Answer.number_value))
            .where(in_form, Answer.number_value.is_not(None))
            .group_by(Answer.question_id)
        ).all()
    }
    buckets: dict[int, dict] = {}
    for qid, val, n in db.execute(
        select(Answer.question_id, func.coalesce(Answer.number_value, Answer.bool_value), func.count())
        .where(in_form, (Answer.number_value.is_not(None)) | (Answer.bool_value.is_not(None)))
        .group_by(Answer.question_id, func.coalesce(Answer.number_value, Answer.bool_value))
    ).all():
        buckets.setdefault(qid, {})[val] = n

    out = []
    for q in form.questions:
        item = {"question_id": q.id, "type": q.type, "title": q.title, "answered": answered.get(q.id, 0)}
        if q.type in CHOICE_TYPES:
            item["choices"] = [{"id": c.id, "label": c.label, "count": choice_counts.get(c.id, 0)} for c in q.choices]
        elif q.type == "yes_no":
            b = buckets.get(q.id, {})
            item["choices"] = [{"label": "Yes", "count": b.get(1, 0)}, {"label": "No", "count": b.get(0, 0)}]
        elif q.type in ("rating", "number"):
            avg, lo, hi = numeric.get(q.id, (None, None, None))
            item.update(average=avg, min=lo, max=hi)
            if q.type == "rating":
                b = buckets.get(q.id, {})
                steps = int(q.settings.get("steps", 5))
                item["choices"] = [{"label": str(i), "count": b.get(float(i), 0)} for i in range(1, steps + 1)]
        else:
            item["latest"] = db.scalars(
                select(Answer.text_value).where(in_form, Answer.question_id == q.id).order_by(Answer.id.desc()).limit(5)
            ).all()
        out.append(item)

    return {
        "started": started,
        "completed": completed,
        "completion_rate": completed / started if started else None,
        "questions": out,
    }


@router.get("/responses.csv")
def export_csv(form_id: int, db: Session = Depends(get_db)):
    form = get_form(db, form_id)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Response ID", "Submitted at", *[q.title or f"Question {i + 1}" for i, q in enumerate(form.questions)]])
    for r in _load_responses(db, form_id):
        by_q = {a.question_id: display(a) for a in r.answers}
        w.writerow([r.id, r.submitted_at.isoformat(), *[by_q.get(q.id, "") for q in form.questions]])
    filename = f"{form.slug}-responses.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
