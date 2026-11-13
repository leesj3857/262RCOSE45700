from __future__ import annotations

import json
from pathlib import Path

from app.main import create_app


def main() -> None:
    app = create_app()
    destination = Path("contracts")
    destination.mkdir(exist_ok=True)
    schema = app.openapi()
    (destination / "openapi.json").write_text(json.dumps(schema, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"openapi.json 을 {destination.resolve()} 에 썼습니다.")


if __name__ == "__main__":
    main()
