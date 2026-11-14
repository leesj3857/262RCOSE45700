# 주행 이슈 리포팅 백엔드

오퍼레이터 음성을 STT로 옮기고, 사실을 추출·분류·검증한 뒤 저장하고, 관리자용 주간 요약을 만드는 API입니다.

로컬 개발 외에는 반드시 HTTPS 뒤에서 사용합니다. 인증 쿠키의 `Secure` 는 `APP_ENV` 가 `dev` 가 아니면 켜집니다.

## 실행

```bash
cd backend
cp .env.example .env
# .env 의 JWT_SECRET 과 SEED_*_PASSWORD 를 채웁니다.

make up          # Docker Compose: postgres + api. 기동 시 alembic upgrade head
make seed        # 데모 계정과 샘플 이슈. 다른 터미널에서, 또는 compose exec
```

컨테이너 안에서 시드할 때:

```bash
docker compose exec api python -m scripts.seed
```

로컬에서 직접 실행할 때:

```bash
make migrate
make dev         # http://localhost:8000
make test
make lint
make contracts   # contracts/openapi.json
make purge       # 만료·폐기 세션 삭제
```

패키지 관리는 uv 입니다. 비밀번호 해시는 `pwdlib[argon2]` 의 `PasswordHash.recommended()` (argon2id) 입니다.

## 환경변수

값은 `.env.example` 에 있습니다. `.env` 는 커밋하지 않습니다.

| 이름 | 의미 |
|---|---|
| `APP_ENV` | `dev` 가 아니면 자리표시 `JWT_SECRET` 으로 시작하지 않습니다. |
| `DATABASE_URL` | SQLAlchemy URL |
| `STORAGE_DIR` | 업로드 음성을 저장하는 디렉터리 |
| `MAX_UPLOAD_MB` | 업로드 음성 최대 크기. 기본 25. 넘으면 413 |
| `JWT_SECRET` | access token 서명 키. example 의 `change-me` 은 자리표시입니다. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | access token 수명. 기본 15분 |
| `REFRESH_TOKEN_EXPIRE_DAYS` | refresh token 수명. 기본 7일 |
| `SESSION_ABSOLUTE_DAYS` | 세션 절대 수명. 기본 30일. 넘기면 refresh 도 거절합니다. |
| `REFRESH_REUSE_GRACE_SECONDS` | 회전 직후 중복 요청을 세션 폐기 없이 401 만 내는 시간. 기본 10초 |
| `REFRESH_COOKIE_*` | HttpOnly 쿠키. `Secure` 를 비우면 dev 가 아닐 때 켭니다. |
| `SEED_*_PASSWORD` | 데모 계정 비밀번호. 코드에 넣지 않습니다. |
| `GATEWAY_BASE_URL`, `GATEWAY_API_KEY` | 서버 내부용 키 하나. Claude, GPT, Jev, 게이트웨이 STT 가 같이 씁니다. 응답과 프론트에 넣지 않습니다. |
| `CLAUDE_MODEL`, `JEV_MODEL_VERSION` | TODO. `latest` 는 거부합니다. |
| `STT_PROVIDER` | `mock`, `gateway` |
| `EXTRACTOR_PROVIDER` | `mock`, `gateway_claude` |
| `CLASSIFIER_PROVIDER` | `mock`, `gateway_jev` |
| `CLS_CONF_HIGH`, `CLS_CONF_LOW`, `STT_CONF_MIN` | 임시 임계값. tune 데이터로 보정 후 확정 |
| `CORS_ORIGINS` | 쉼표로 구분한 명시 origin. `*` 는 금지입니다. |

## 구조

한 요청은 아래 순서로만 흐릅니다. 라우터에서 SQL이나 외부 API를 직접 호출하지 않습니다.

```
HTTP (app/api)
  → 인증·권한 (app/auth)
  → 업무 로직 (app/services)
  → 외부 AI는 어댑터만 (app/adapters)
  → 테이블 (app/models) / 프론트 계약 (app/schemas)
```

녹음 업로드(`POST /api/recordings`)만 예외적으로 길어집니다. 요청 한 번 안에서 파일을 디스크에 저장한 뒤 파이프라인을 끝까지 돌립니다. 큐는 없습니다. 허용 형식은 wav, mp3, m4a, webm, ogg 이고, 형식 오류(422)·크기 초과(413)·파이프라인 실패(503) 때는 저장한 파일을 지웁니다.

```
파일 저장 → STT → 용어 사전 치환 → 사실 추출 → 분류 → 근거·신뢰도 검증 → issue(draft)
```

오퍼레이터가 `PATCH /api/issues/{id}` 로 확인하면 `final_extraction` 과 `issue_edits` 에 사람 수정이 남고 상태가 `confirmed` 가 됩니다. AI가 처음 채운 `ai_extraction` 은 덮어쓰지 않습니다.

### 디렉터리

```
backend/
  app/main.py              # 앱 조립, CORS, /health, 문서 on/off
  app/config.py            # 환경변수. 새 설정은 여기와 .env.example 에 같이 추가
  app/db.py                # 엔진·세션. 요청마다 세션 하나
  app/api/                 # 라우터. 상태 코드와 스키마 변환만
    auth.py                # login(form), refresh, logout, me
    users.py               # 관리자 전용 계정
    recordings.py          # 업로드. 소유자는 로그인 사용자
    issues.py              # 목록·수정·음성. 남의 이슈는 404
    summary.py             # 주간 요약. 관리자만
    errors.py              # 공통 에러 문구와 OpenAPI 응답
  app/auth/                # 비밀번호, JWT, 세션, refresh 회전, 쿠키, Depends
  app/schemas/             # Pydantic = OpenAPI 계약. 바꾸면 프론트에 영향
  app/models/entities.py   # SQLAlchemy 테이블
  app/adapters/
    gateway/client.py      # 공통 HTTP 클라이언트. 호출 형식은 아직 TODO
    stt/                   # mock | gateway
    extractor/             # mock | gateway_claude. 요약 문장도 여기
    classifier/            # mock | gateway_jev
  app/services/
    pipeline.py            # 업로드 한 건의 순서
    verify.py              # 근거 span, 분류 신뢰도 게이트, STT 단어 신뢰도
    glossary.py            # 오인식 치환
    state_text.py          # 분류기 입력. 전사문 + cause + location 만
    summary.py             # 건수·분포는 SQL. 문장만 어댑터에 맡김
    issues.py              # 조회 범위, 수정 저장
    users.py               # 계정 생성·비활성화(세션 폐기)
  app/domain/
    taxonomy/v1.yaml       # 사건 유형, 심각도, 발화 보기. 코드 수정 없이 목록 변경
    glossary.yaml          # 도메인 용어와 오인식 맵
  alembic/                 # 스키마 변경은 마이그레이션 파일로
  contracts/               # make contracts 결과. 프론트 타입 생성용
  data/                    # tune / test / demo. 오디오는 git 제외
  eval/                    # 평가 CLI. test 분할을 읽어도 되는 쪽
  scripts/                 # seed, create_user, purge, export_contracts
  tests/                   # API는 sqlite 파일 DB. 마이그레이션은 돌리지 않음
```

### 테이블

| 테이블 | 무엇을 남기는지 |
|---|---|
| `users` | 계정. 역할은 `operator` 또는 `admin`. 비밀번호는 argon2 해시만 |
| `auth_sessions` | 로그인 1회. access token 의 `sid`. 폐기되면 그 세션의 access token 도 즉시 거절 |
| `refresh_tokens` | refresh 원문의 SHA-256. 회전 시 기존 행은 `used_at`, 새 행은 `replaced_by_id` |
| `recordings` | 음성 파일 경로, 발화 시각, 녹음한 사용자 |
| `transcripts` | STT 원문(`raw_text`)과 용어 보정본(`corrected_text`), 단어 시각·신뢰도 |
| `issues` | AI 결과와 사람 확인값, 상태, 파이프라인 메타, 지라에 올릴 차량 번호·발생일자·버전·위경도·이슈 내용 |
| `issue_edits` | 필드별 수정 전 값, 수정 후 값, 수정한 사용자 |

### 어디에 손을 대는지

- 사건 유형, 심각도, 발화 가이드 보기: `app/domain/taxonomy/v1.yaml`. 로더가 스키마 검증, Jev 질문, mock 키워드를 같이 만듭니다.
- 용어·오인식: `app/domain/glossary.yaml`.
- 새 API: `app/api` 라우터, 필요하면 `app/schemas`, `app/main.py` 등록, `tests/` 추가. 응답 필드를 바꾸면 `make contracts` 후 PR에 알립니다.
- 외부 모델: 해당 `app/adapters/...` 와 factory. 호출 방식을 모르면 `NotImplementedError` 만 둡니다. mock 은 같은 입력에 같은 결과를 유지합니다.
- 컬럼 추가: `app/models` 와 `alembic/versions` 를 같이. 테스트 DB는 `create_all` 이라 마이그레이션 SQL을 타지 않습니다. 빈 Postgres 에서 `make migrate` 후 `uv run alembic check` 가 `No new upgrade operations detected` 를 내면 모델과 마이그레이션이 맞는 것입니다.
- 분류기 입력은 `state_text.py` 가 전사문과 cause, location 만 넘깁니다. 도로 유형·직전 동작·대상·반응은 그 출력입니다.

## 필드가 어디서 오는지

값은 두 곳에서 오고, 한 칸에 섞지 않습니다.

발화에서 고르는 항목은 taxonomy 의 `guide` 이고, 분류 결과로 `ai_extraction` 에 들어갑니다. 신뢰도가 낮으면 값은 비우고 `needs_review` 를 켭니다.

| 필드 | 보기 |
|---|---|
| `road_type` | 교차로, 곡선로, 합류로, 직선로, 횡단보도 |
| `ego_action_before` | 직진, 차선 변경, 좌회전, 우회전, 정차 중 |
| `target_type` | 차량, 보행자, 이륜차, 없음, 미확인 |
| `ego_reaction` | 급감속, 급가속, 과조향, 정차 |

말로 나온 장소 이름(강남대로)은 그대로 `location` 입니다. 도로 모양은 `road_type` 입니다. 이슈 유형은 기존 `event_type` 입니다. 이슈 내용은 보정된 전사문으로 `issues.content` 를 채우고, 확인 화면에서 고칠 수 있습니다.

지라에 올릴 나머지 값은 업로드 폼이나 `PATCH` 로만 저장합니다. 모델이 만들지 않습니다.

| 응답의 `ticket` | 의미 |
|---|---|
| `vehicle_number` | 차량 번호 |
| `occurred_on` | 발생일자. 녹음 시각 `recorded_at` 과 다릅니다. 요청에 있을 때만 저장합니다. |
| `autonomy_version` | 자율주행 버전 |
| `map_version` | 맵 버전 |
| `latitude`, `longitude` | 이슈에 사람이 넣은 위경도 |
| `content` | 세이프티 매니저가 다듬는 이슈 내용 |

보기는 임시안입니다. 1주차 멘토링 후 `v1.yaml` 만 고치면 됩니다.

`0001_initial` 은 팀에 공유하기 전이라 직접 고쳐 왔습니다. 이전 버전으로 만든 로컬 DB(컬럼이 없거나 삭제된 `vehicle_logs` 테이블이 남아 있는 경우)는 `docker compose down -v` 후 `make up` 으로 볼륨을 다시 만듭니다. 공유한 뒤에는 `0001` 을 고치지 않고 새 리비전을 추가합니다.

## 배포

플랫폼은 정하지 않았습니다. 지금 이미지는 **컨테이너 1개 + Postgres 1대 + 앞단 HTTPS** 로 올릴 수 있습니다. VM, 단일 컨테이너 호스트, 대학 서버가 이 형태입니다.

이미 맞춰 둔 것:

- `Dockerfile` 이 앱을 이미지로 만들고, 기동 시 `alembic upgrade head` 후 8000 포트에서 받습니다.
- 설정·비밀은 환경변수입니다. `.env` 는 이미지에 넣지 않습니다(`.dockerignore`).
- DB 위치는 `DATABASE_URL` 만 바꿉니다. Compose 는 로컬용으로 `db` 호스트를 덮어씁니다.
- `GET /health` 는 인증 없이 프로세스 생존만 봅니다.
- `APP_ENV` 가 `dev` 가 아니면 자리표시 `JWT_SECRET` 으로 시작하지 않고, refresh 쿠키에 `Secure` 가 붙습니다.

나중에 막히는 지점:

- 음성 파일은 컨테이너 디스크(`STORAGE_DIR`)에 있고, DB에는 그 경로가 문자열로 저장됩니다. 인스턴스가 여러 개이거나 디스크가 지워지면 재생이 깨집니다. 지금은 볼륨 하나로 유지합니다. 객체 스토리지는 아직 없습니다.
- 마이그레이션이 프로세스마다 실행됩니다. 복제본이 동시에 뜨면 겹칠 수 있으니, 인스턴스를 늘릴 때는 배포 단계에서 한 번만 실행합니다.
- 업로드 요청은 STT·추출·분류가 끝날 때까지 붙잡습니다. 프록시·플랫폼 타임아웃을 그 시간보다 길게 둡니다.
- `MAX_UPLOAD_MB` 는 서버가 본문을 받은 뒤 적용되는 저장소 보호용 상한입니다. 큰 요청 자체를 막으려면 프록시에서도 본문 크기를 제한합니다(예: Nginx `client_max_body_size`).
- `docker-compose.yml` 은 DB 포트를 `127.0.0.1` 에만 엽니다.
- refresh 쿠키는 `Path=/api/auth`, `SameSite=Lax` 입니다. 프론트와 API가 다른 사이트면 브라우저가 쿠키를 안 보냅니다. 같은 도메인 뒤(리버스 프록시)에 두거나, 그때 `SameSite=None` 과 `Secure` 를 같이 켭니다.
- `docker-compose.yml` 의 DB 비밀번호와 공개 포트는 로컬용입니다. 운영 compose 로 쓰지 않습니다.
- `ENABLE_DOCS` 기본값은 true 입니다. 공개 전에 끕니다.

HTTPS 인증서와 리버스 프록시는 앱 밖에 둡니다. 로컬 개발 외에는 그 뒤에서만 사용합니다.

## 어댑터를 추가하는 방법

1. `app/adapters/<종류>/` 에 구현 파일을 추가합니다.
2. 벤더 파일은 호출 방식을 모르면 `NotImplementedError` 와 TODO 만 둡니다. 기능을 추측해서 채우지 않습니다.
3. factory 의 provider 분기와 `config.py` 의 Literal 에 이름을 추가합니다.
4. mock 은 외부 호출 없이 같은 입력에 같은 결과를 내야 합니다.

선정할 때 보는 기준:

- STT: 용어 힌트 지원, 그다음 소음 환경 정확도, 단어 신뢰도·타임스탬프, 지연, 비용
- 분류(Jev): 보기별 확률·신뢰도, 신뢰도 보정 상태, 버전을 고정할 수 있는지

## 게이트웨이 연동 TODO

엔드포인트, 인증 헤더, 필드명은 아직 정하지 않았습니다. `app/adapters/gateway/client.py` 는 골격만 있습니다. 정하기 전에 확인할 것:

- base URL
- 인증 방식(헤더 이름, 키 위치). 키는 Claude, GPT, Jev, 게이트웨이 STT 가 하나
- Claude 호출 형식과 JSON schema 강제 방법
- GPT 호출 형식. 같은 키를 쓰며, 사실 추출 경로에는 아직 연결하지 않음
- Jev 호출 형식(Choice, Score, Noul)과 모델 버전 이름
- STT 호출 형식, 용어 힌트, 단어 신뢰도, 타임스탬프
- 모델명
- 요금과 호출 한도

그 전까지 `STT_PROVIDER=mock`, `EXTRACTOR_PROVIDER=mock`, `CLASSIFIER_PROVIDER=mock` 으로 전체 흐름이 동작합니다.

## 인증

1. `POST /api/auth/login` 에 form(`username`, `password`)을 보냅니다.
2. 응답 JSON 의 access token 을 `Authorization: Bearer` 로 보냅니다.
3. refresh token 은 `Path=/api/auth` HttpOnly 쿠키입니다. 만료되면 `POST /api/auth/refresh` 한 번으로 회전합니다.
4. `POST /api/auth/logout` 은 access token 또는 refresh 쿠키 중 하나만 있어도 현재 세션을 끊습니다. 이미 끊긴 뒤에도 204 입니다.
5. `POST /api/auth/logout-all` 은 access token 이 필요하며 모든 세션을 끊습니다.

권한은 토큰이 아니라 DB 의 `role` 로 판단합니다. 역할은 `operator`, `admin` 두 가지입니다. 오퍼레이터는 자기 이슈만 보고, 다른 사람의 이슈는 404 입니다. 주간 요약과 사용자 관리는 관리자만 가능하고, 오퍼레이터가 호출하면 403 입니다.

한계: 셀프 가입, 비밀번호 재설정, 소셜 로그인, MFA, 로그인 시도 제한은 없습니다. 계정은 관리자의 `POST /api/users` 또는 `scripts/create_user.py` 로 만듭니다.

```bash
SEED_OPERATOR1_PASSWORD='...' uv run python -m scripts.create_user \
  --username operator4 --display-name 오퍼레이터4 --role operator \
  --password-env SEED_OPERATOR1_PASSWORD
```

## Swagger 로 테스트하는 방법

1. 서버를 띄웁니다.
2. http://localhost:8000/docs 를 엽니다. ReDoc 은 `/redoc` 입니다.
3. Authorize 에 username 과 password 를 넣습니다. 로그인 요청은 form 입니다.
4. 보호된 API 를 호출합니다. 새로고침 후에도 Authorize 가 유지됩니다(`persistAuthorization`).
5. refresh 와 logout 은 같은 origin 이라 브라우저가 `/api/auth` 쿠키를 붙입니다.
6. refresh token 은 응답 JSON 에 없고 쿠키로만 옵니다. `http://localhost` 에서 쿠키가 안 붙으면 `APP_ENV=dev`(Secure 꺼짐)인지 확인합니다.

`make contracts` 가 `contracts/openapi.json` 을 갱신합니다. 스키마가 바뀌면 PR 과 함께 팀에 알립니다.

## 프론트 담당자

1. 인증이 필요한 요청에 `credentials: 'include'` 를 넣습니다.
2. refresh 는 동시에 여러 번 보내지 않습니다. 한 번만 보내고 나머지는 그 결과를 기다립니다.
3. 401 이면 refresh 후 원래 요청을 한 번만 다시 보냅니다. refresh 도 실패하면 로그인 화면으로 이동합니다.
4. 음성 재생은 `<audio src>` 에 토큰을 붙이지 않습니다. `GET /api/issues/{id}/audio` 를 Authorization 헤더로 fetch 하고 blob URL 로 재생합니다.
5. 허용 origin 은 `http://localhost:5173` 입니다. 쿠키를 쓰므로 origin 와일드카드는 쓰지 않습니다.

## 데이터와 평가

`data/splits.json` 의 비율은 임의 값입니다. 확보량에 맞춰 조정합니다. `tune` 은 개발, `test` 는 고정 평가, `demo` 는 시연용입니다. `test` 는 튜닝에 쓰지 않습니다. 코드로 막아 두지는 않았으니, 평가 스크립트(`eval/`)에서만 `--split test` 로 읽습니다.

오디오 파일은 git 에 넣지 않습니다. 예시로 대본, 전사문, 정답 JSON 만 있습니다.

```bash
uv run python -m eval.stt_metrics --split tune --runs 3 --condition quiet
uv run python -m eval.compare_stt --providers mock,gateway --split tune
uv run python -m eval.field_f1 --split tune
uv run python -m eval.classification --split tune --threshold 0.85
uv run python -m eval.hallucination --split tune
```

`test` 분할은 최종 평가 때만 `--split test` 로 읽습니다.

## 아직 정하지 않은 것

taxonomy 8종은 임시안입니다. 1주차 멘토링 후 확정합니다. 분류 신뢰도 임계값과 STT 단어 신뢰도 임계값도 임시이며 tune 데이터로 다시 잡습니다. Claude 모델명, Jev 고정 버전, 게이트웨이 호출 형식은 설정과 TODO 로만 남겨 두었습니다. GPT 는 같은 게이트웨이 키를 쓰며 호출 경로는 아직 없습니다.
