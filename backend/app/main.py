import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from .db import Base, SessionLocal, engine
from .models import Form
from .routers import forms, public, results
from .seed import seed


@asynccontextmanager
async def lifespan(_: FastAPI):
    # ponytail: create_all instead of Alembic; add migrations once the schema must evolve with live data.
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if db.scalar(select(Form.id).limit(1)) is None:
            seed(db)
    yield


app = FastAPI(title="Typeform Clone API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(forms.router)
app.include_router(results.router)
app.include_router(public.router)


@app.get("/api/health")
def health():
    return {"ok": True}
