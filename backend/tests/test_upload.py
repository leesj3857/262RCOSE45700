from pathlib import Path

from fastapi.testclient import TestClient

from tests.conftest import OPERATOR_PASSWORD, auth_header, login, upload, wav_bytes


def _token(client: TestClient) -> str:
    return login(client, "operator1", OPERATOR_PASSWORD).json()["access_token"]


def _stored_files(app) -> list[Path]:
    storage = Path(app.state.settings.storage_dir)
    return list(storage.iterdir()) if storage.exists() else []


def _post_audio(client: TestClient, token: str, filename: str, payload: bytes):
    return client.post(
        "/api/recordings",
        files={"audio": (filename, payload, "application/octet-stream")},
        headers=auth_header(token),
    )


def test_unsupported_extension_is_rejected_and_not_stored(client: TestClient, app) -> None:
    response = _post_audio(client, _token(client), "payload.exe", wav_bytes())
    assert response.status_code == 422
    assert _stored_files(app) == []


def test_missing_extension_is_rejected(client: TestClient, app) -> None:
    response = _post_audio(client, _token(client), "noextension", wav_bytes())
    assert response.status_code == 422
    assert _stored_files(app) == []


def test_oversized_upload_is_rejected_and_removed(client: TestClient, app) -> None:
    app.state.settings.max_upload_mb = 0
    response = upload(client, _token(client))
    assert response.status_code == 413
    assert _stored_files(app) == []


def test_empty_upload_is_rejected_and_removed(client: TestClient, app) -> None:
    response = _post_audio(client, _token(client), "empty.wav", b"")
    assert response.status_code == 422
    assert _stored_files(app) == []


def test_failed_pipeline_removes_stored_audio(client: TestClient, app) -> None:
    app.state.settings.extractor_provider = "gateway_claude"
    response = upload(client, _token(client))
    assert response.status_code == 503
    assert _stored_files(app) == []


def test_valid_upload_keeps_audio(client: TestClient, app) -> None:
    response = upload(client, _token(client))
    assert response.status_code == 200
    assert len(_stored_files(app)) == 1
