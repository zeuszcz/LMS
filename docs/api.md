# API Specification

> Подробная спецификация автогенерируется из FastAPI: запустить backend и
> открыть `http://localhost:8000/docs` (Swagger UI) или `/redoc`.

Этот документ — высокоуровневый обзор и соглашения, которые не выводятся
автоматически.

## Базовый URL

- Development: `http://localhost:8000`
- Staging: `https://api-stg.lms.yescenter.ru` (TBD)
- Production: `https://api.lms.yescenter.ru` (TBD)

Все endpoints под префиксом `/api/`.

## Authentication

Все защищённые endpoints требуют заголовок:

```
Authorization: Bearer <access_token>
```

Получение пары токенов:

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "user@example.com", "password": "..." }
```

Ответ:

```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

Refresh при 401:

```http
POST /api/auth/refresh
{ "refresh_token": "..." }
```

## Соглашения

### Версионирование
Версия в URL не используется на старте. Breaking changes — через `/api/v2/...`
(Phase 4+) и `Sunset` заголовок на старых endpoints.

### Pagination
Списки поддерживают `limit` (default 50, max 200) и `offset`. Ответ для списков:

```json
{ "items": [...], "total": 1234 }
```

Курсорная пагинация — для больших таблиц (Phase 2+).

### Errors

```json
{ "detail": "Human-readable message" }
```

| Код | Когда                                                     |
|-----|-----------------------------------------------------------|
| 400 | Валидация payload не прошла                                |
| 401 | Токен отсутствует / невалиден / истёк                      |
| 403 | Не хватает роли                                            |
| 404 | Ресурс не найден                                           |
| 409 | Конфликт (уникальность, состояние)                         |
| 422 | Pydantic валидация (FastAPI default)                       |
| 429 | Rate limit (Phase 2)                                        |
| 500 | Серверная ошибка — детали в `request_id`, не в ответе       |

Каждый ответ содержит `X-Request-ID` (UUID) — для корреляции с логами.

### Idempotency

Платёжные endpoints (Phase 2) принимают `Idempotency-Key` в заголовке. Повтор
с тем же ключом возвращает кешированный результат 24 часа.

### Rate limit (Phase 2)

| Endpoint                | Лимит              |
|-------------------------|--------------------|
| `POST /api/auth/login`   | 5 / IP / минуту    |
| `POST /api/auth/refresh` | 10 / IP / минуту   |
| Прочие                   | 100 / user / минуту |

При превышении — 429 + заголовок `Retry-After`.

## Endpoints (MVP)

### Auth
- `POST /api/auth/login` — выдать пару токенов
- `POST /api/auth/refresh` — обменять refresh на новую пару
- `GET /api/auth/me` — текущий пользователь

### Users
- `GET /api/users/` — список (admin / branch_manager)
- `POST /api/users/` — создать (admin)
- `GET /api/users/me` — синоним `/api/auth/me`

### Courses
- `GET /api/courses/` — каталог с фильтрами `language`, `level`, `age_group`,
  `only_published`
- `POST /api/courses/` — создать (admin / methodist)
- `POST /api/courses/{id}/publish` — публикация (admin / methodist)

### Health
- `GET /api/health` — liveness
- `GET /api/health/db` — readiness (Postgres ping)

### (Phase 1, weeks 6+)
- `GET / POST /api/branches/`
- `GET / POST /api/groups/`
- `POST /api/groups/{id}/enroll`
- `GET /api/lessons/?group_id=`
- `POST /api/lessons/{id}/start`
- `POST /api/lessons/{id}/close`
- `POST /api/lessons/{id}/attendance` — bulk

### (Phase 1, weeks 9+)
- `GET / POST /api/assignments/`
- `POST /api/submissions/`
- `POST /api/submissions/{id}/grade`

## WebSocket (Phase 2)

```
WS /api/ws?token=<access_token>
```

События (server → client):
- `lesson.started` — для участников группы
- `homework.graded` — для автора submission
- `chat.message` — новое сообщение
- `notification.created` — генеральные уведомления

Heartbeat: ping каждые 30s; клиент обязан ответить pong.

## Локали и таймзоны

- Все datetime — ISO 8601 с TZ (UTC при хранении).
- Поле `Accept-Language` поддерживается (пока только `ru`, `en` — в Phase 2).
- `User.timezone` — IANA name; используется бэкендом для генерации напоминаний.
