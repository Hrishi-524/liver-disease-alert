"""Smoke test for Streamlit app using AppTest."""
from streamlit.testing.v1 import AppTest


def test_app_smoke():
    """Verify Streamlit app runs without errors and can submit form."""
    at = AppTest.from_file("app.py", default_timeout=30)
    at.run()
    assert not at.exception, f"App crashed with: {at.exception}"
    assert len(at.title) > 0
    assert "Liver Disease Risk" in at.title[0].value
