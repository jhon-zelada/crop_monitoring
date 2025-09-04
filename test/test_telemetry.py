# tests/test_telemetry.py
import json
import pytest
from fastapi.testclient import TestClient

from app.main import app, manager  # your FastAPI app
# monkeypatch will be used to patch get_db/process_measurement

# Helper fake DB that returns a fake device object
class DummyDevice:
    def __init__(self, token="device-token"):
        self.token = token
        self.id = None

class DummyQuery:
    def __init__(self, device):
        self._device = device
    def filter(self, *args, **kwargs):
        return self
    def one_or_none(self):
        return self._device

class DummyDB:
    def __init__(self, device):
        self._device = device
    def query(self, model):
        return DummyQuery(self._device)

# Override get_db dependency
def override_get_db():
    device = DummyDevice(token="device-token")
    try:
        yield DummyDB(device)
    finally:
        pass

@pytest.fixture(autouse=True)
def client(monkeypatch):
    # override DB dependency
    from app.db import session as db_session_module
    monkeypatch.setattr(db_session_module, "get_db", lambda: override_get_db())

    with TestClient(app) as c:
        yield c

def test_login_and_get_token(client):
    # demo credentials (if you left demo login)
    r = client.post("/api/auth/login", json={"username": "admin", "password": "secret"})
    assert r.status_code == 200
    j = r.json()
    assert "access_token" in j
    # store token for next steps
    token = j["aaccess_token"]
    assert token

def test_ingest_calls_celery(monkeypatch, client):
    called = {}
    def fake_delay(payload):
        called["payload"] = payload

    # monkeypatch the celery task's delay
    import app.workers.tasks as tasks_mod
    monkeypatch.setattr(tasks_mod.process_measurement, "delay", fake_delay)

    payload = {
      "device_id": "11111111-1111-1111-1111-111111111111",
      "message_id": "m1",
      "timestamp": "2025-09-03T21:32:02.029Z",
      "measurements": {
        "temperature_c": 10,
        "relative_humidity_pct": 20,
        "solar_radiance_w_m2": 0,
        "wind_speed_m_s": 0,
        "wind_direction_deg": 0,
        "battery_v": 0
      },
      "meta": {}
    }

    r = client.post("/api/v1/telemetry", json=payload, headers={"X-Device-Token": "device-token"})
    assert r.status_code == 202
    assert "payload" in called
    assert called["payload"]["device_id"] == payload["device_id"]

def test_ws_receive_broadcast(client):
    # login to obtain access_token
    r = client.post("/api/auth/login", json={"username": "admin", "password": "secret"})
    assert r.status_code == 200
    token = r.json()["access_token"]

    # open WS connection with access_token -> no device_id means "all"
    url = f"/ws/live?access_token={token}"
    with client.websocket_connect(url) as ws:
        payload = {"type": "measurement", "device_id": "1111", "data": {"temperature_c": 12.3}}
        # broadcast directly using manager (same process)
        import asyncio
        # manager.broadcast is async; run in event loop via asyncio.run
        asyncio.get_event_loop().run_until_complete(manager.broadcast(device_id=payload["device_id"], payload=payload))
        data = ws.receive_text()
        assert json.loads(data)["type"] == "measurement"
