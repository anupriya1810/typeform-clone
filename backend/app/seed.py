"""Demo data so the app is usable on first boot. Runs only when the forms table is empty."""

import random
from datetime import timedelta

from sqlalchemy.orm import Session

from .answers import write_value
from .models import Answer, Choice, Form, Question, Response, now

NAMES = ["Aarav", "Diya", "Kabir", "Meera", "Rohan", "Ananya", "Vihaan", "Isha", "Arjun", "Sara",
         "Neel", "Tara", "Dev", "Nisha", "Yash", "Riya"]
COMMENTS = ["Loved the onboarding.", "Search could be faster.", "Great support team!",
            "Please add dark mode.", "Pricing is a bit confusing.", "", "Keep it up!"]


def q(type_, title, *, required=False, description=None, choices=(), **settings) -> Question:
    return Question(
        type=type_, title=title, required=required, description=description, settings=settings,
        choices=[Choice(position=i, label=c) for i, c in enumerate(choices)],
    )


def _form(title, slug, status, age_days, questions, **kw) -> Form:
    for i, question in enumerate(questions):
        question.position = i
    created = now() - timedelta(days=age_days)
    return Form(
        title=title, slug=slug, status=status, questions=questions, created_at=created,
        updated_at=created + timedelta(days=1), published_at=created + timedelta(days=1) if status == "published" else None, **kw,
    )


def _fake_value(rng: random.Random, question: Question, name: str):
    t = question.type
    if t == "short_text":
        return name
    if t == "email":
        return f"{name.lower()}@example.com"
    if t == "long_text":
        return rng.choice(COMMENTS)
    if t == "rating":
        return rng.choices(range(1, question.settings.get("steps", 5) + 1), weights=[1, 1, 3, 6, 5])[0]
    if t == "number":
        return rng.randint(question.settings.get("min", 0), question.settings.get("max", 10))
    if t == "yes_no":
        return rng.random() < 0.75
    ids = [c.id for c in question.choices]
    if question.settings.get("allow_multiple"):
        return rng.sample(ids, rng.randint(1, min(3, len(ids))))
    return [rng.choice(ids)]


def _respond(db: Session, rng: random.Random, form: Form, count: int, partial: int) -> None:
    for i in range(count + partial):
        started = now() - timedelta(days=rng.randint(0, 13), minutes=rng.randint(0, 1440))
        resp = Response(form=form, started_at=started)
        if i < count:
            resp.submitted_at = started + timedelta(minutes=rng.randint(1, 6))
            name = NAMES[i % len(NAMES)]
            for question in form.questions:
                value = _fake_value(rng, question, name)
                if value in ("", None):
                    continue
                answer = Answer(question=question)
                write_value(answer, question, value)
                resp.answers.append(answer)
        db.add(resp)


def seed(db: Session) -> None:
    rng = random.Random(42)
    feedback = _form(
        "Customer Feedback Survey", "feedback", "published", 15,
        [
            q("short_text", "Hi there! What's your name?", required=True, placeholder="Type your answer here..."),
            q("email", "Thanks! What's your email address?", required=True,
              description="We'll only use this to follow up on your feedback."),
            q("rating", "How satisfied are you with our product?", required=True, steps=5),
            q("multiple_choice", "Which features do you use the most?",
              choices=["Dashboard", "Reports", "Integrations", "Mobile app", "API"], allow_multiple=True),
            q("yes_no", "Would you recommend us to a friend?", required=True),
            q("long_text", "Anything else you'd like to tell us?"),
        ],
        welcome_title="We'd love your feedback",
        welcome_message="It takes about 2 minutes. Your answers help us build a better product.",
        thank_you_title="Thanks for your feedback! 🙌",
        thank_you_message="We read every single response.",
    )
    event = _form(
        "Tech Meetup Registration", "meetup", "published", 9,
        [
            q("short_text", "What's your full name?", required=True),
            q("email", "Where should we send your ticket?", required=True),
            q("dropdown", "Which track are you most interested in?", required=True,
              choices=["Frontend", "Backend", "AI / ML", "DevOps", "Product & Design"]),
            q("number", "How many guests are you bringing?", description="Max 3 guests per registration",
              min=0, max=3),
            q("multiple_choice", "Any dietary preference?", choices=["Vegetarian", "Vegan", "Non-vegetarian", "Jain"]),
            q("yes_no", "Can we add you to our newsletter?"),
        ],
        thank_you_title="You're in! 🎉",
        thank_you_message="Check your inbox for the ticket.",
    )
    draft = _form(
        "Frontend Engineer Application", "apply-fe", "draft", 3,
        [
            q("short_text", "Let's start with your name", required=True),
            q("email", "And your email?", required=True),
            q("number", "Years of professional experience?", min=0, max=50),
            q("long_text", "Tell us about a project you're proud of"),
        ],
    )
    db.add_all([feedback, event, draft])
    db.flush()  # assign choice ids before fake answers reference them
    _respond(db, rng, feedback, count=16, partial=5)
    _respond(db, rng, event, count=11, partial=3)
    db.commit()
