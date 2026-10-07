import os
import tempfile

os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.mkdtemp()}/test.db"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


def test_seeded_forms_listed():
    with TestClient(app) as c:
        forms = c.get("/api/forms").json()
        fb = next(f for f in forms if f["slug"] == "feedback")
        assert fb["status"] == "published" and fb["response_count"] == 16
        summary = c.get(f"/api/forms/{fb['id']}/summary").json()
        assert summary["started"] == 21 and summary["completed"] == 16


def test_full_flow():
    with TestClient(app) as c:
        form = c.post("/api/forms", json={"title": "Flow"}).json()
        fid = form["id"]
        assert c.post(f"/api/forms/{fid}/publish").status_code == 422  # no questions yet

        qs = c.put(f"/api/forms/{fid}/questions", json=[
            {"type": "short_text", "title": "Name", "required": True},
            {"type": "email", "title": "Email", "required": True},
            {"type": "multiple_choice", "title": "Pick", "choices": [{"label": "A"}, {"label": "B"}]},
            {"type": "rating", "title": "Rate", "settings": {"steps": 5}},
        ]).json()
        name, email, pick, rate = qs
        # reorder + rename a choice keeps ids stable
        qs2 = c.put(f"/api/forms/{fid}/questions", json=[
            {**rate}, {**name}, {**email},
            {**pick, "choices": [{"id": pick["choices"][0]["id"], "label": "A2"}, pick["choices"][1]]},
        ]).json()
        assert [q["id"] for q in qs2] == [rate["id"], name["id"], email["id"], pick["id"]]
        assert qs2[3]["choices"][0] == {"id": pick["choices"][0]["id"], "label": "A2"}

        slug = c.post(f"/api/forms/{fid}/publish").json()["slug"]
        assert len(c.get(f"/api/public/forms/{slug}").json()["questions"]) == 4

        bad = c.post(f"/api/public/forms/{slug}/responses", json={"answers": [
            {"question_id": email["id"], "value": "nope"},
            {"question_id": rate["id"], "value": 9},
        ]})
        assert bad.status_code == 422
        assert set(bad.json()["detail"]["errors"]) == {str(name["id"]), str(email["id"]), str(rate["id"])}

        rid = c.post(f"/api/public/forms/{slug}/start").json()["response_id"]
        ok = c.post(f"/api/public/forms/{slug}/responses", json={"response_id": rid, "answers": [
            {"question_id": name["id"], "value": "Ada"},
            {"question_id": email["id"], "value": "ada@example.com"},
            {"question_id": pick["id"], "value": [pick["choices"][1]["id"]]},
            {"question_id": rate["id"], "value": 4},
        ]})
        assert ok.status_code == 201 and ok.json()["response_id"] == rid

        summary = c.get(f"/api/forms/{fid}/summary").json()
        assert summary["completion_rate"] == 1
        by_id = {q["question_id"]: q for q in summary["questions"]}
        assert [ch["count"] for ch in by_id[pick["id"]]["choices"]] == [0, 1]
        assert by_id[rate["id"]]["average"] == 4

        detail = c.get(f"/api/forms/{fid}/responses/{rid}").json()
        assert {a["display"] for a in detail["answers"]} == {"Ada", "ada@example.com", "B", "4"}
        assert "ada@example.com" in c.get(f"/api/forms/{fid}/responses.csv").text

        dup = c.post(f"/api/forms/{fid}/duplicate").json()
        assert dup["status"] == "draft" and len(dup["questions"]) == 4

        c.post(f"/api/forms/{fid}/unpublish")
        assert c.get(f"/api/public/forms/{slug}").status_code == 404
        assert c.delete(f"/api/forms/{fid}").status_code == 204
        assert c.get(f"/api/forms/{fid}").status_code == 404
