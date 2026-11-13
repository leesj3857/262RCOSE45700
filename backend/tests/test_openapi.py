from fastapi.testclient import TestClient

PUBLIC = {
    ("get", "/health"),
    ("post", "/api/auth/login"),
    ("post", "/api/auth/refresh"),
    ("post", "/api/auth/logout"),
}


def test_docs_and_openapi_contract(client: TestClient) -> None:
    docs = client.get("/docs")
    assert docs.status_code == 200
    assert "persistAuthorization" in docs.text
    assert client.get("/redoc").status_code == 200

    spec = client.get("/openapi.json").json()
    schemes = spec["components"]["securitySchemes"].values()
    password_flows = [item for item in schemes if item.get("type") == "oauth2" and "password" in item.get("flows", {})]
    assert password_flows
    assert password_flows[0]["flows"]["password"]["tokenUrl"] == "/api/auth/login"

    login = spec["paths"]["/api/auth/login"]["post"]
    assert "application/x-www-form-urlencoded" in login["requestBody"]["content"]

    for path, operations in spec["paths"].items():
        for method, operation in operations.items():
            if method not in {"get", "post", "patch", "put", "delete"}:
                continue
            assert operation.get("summary"), path
            assert operation.get("tags"), path
            if (method, path) in PUBLIC:
                continue
            assert operation.get("security"), path
            assert "401" in operation["responses"]
