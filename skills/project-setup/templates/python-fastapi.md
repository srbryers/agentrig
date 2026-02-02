---
id: python-fastapi
name: Python FastAPI
description: Python API development with FastAPI, Pydantic, SQLAlchemy, and Alembic
version: 1
detection:
  files_any:
    - "app/main.py"
    - "main.py"
    - "src/main.py"
  config_files_any:
    - "pyproject.toml"
    - "requirements.txt"
  package_json_deps_any: []
  python_deps_any:
    - "fastapi"
    - "uvicorn"
---

# Python FastAPI

## claude_md

### Project Overview

This is a Python API project built with FastAPI. It uses Pydantic for data validation, SQLAlchemy for database access (with Alembic for migrations), and uvicorn as the ASGI server.

### Build & Run Commands

```bash
# Start development server with auto-reload
uvicorn app.main:app --reload

# Or if using a runner script
python -m app.main

# Run tests
pytest

# Run tests with coverage
pytest --cov=app --cov-report=term-missing

# Run linting
ruff check .

# Run formatting
ruff format .

# Run type checking
mypy app/

# Create a new database migration
alembic revision --autogenerate -m "description"

# Run migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

### Code Style

- **Type hints:** Use type hints on all function signatures, class attributes, and variables where not obvious
- **Pydantic models:** Use Pydantic `BaseModel` for all request/response schemas. Separate input and output models
- **Naming:** snake_case for functions, variables, and modules. PascalCase for classes and Pydantic models
- **Imports:** Group imports: stdlib, third-party, local. Use absolute imports
- **Async:** Use `async def` for all route handlers and database operations. Avoid blocking calls in async functions
- **Docstrings:** Add docstrings to all public functions and classes

### Project Structure

```
├── app/
│   ├── __init__.py
│   ├── main.py            # FastAPI app instance and startup
│   ├── config.py          # Settings via pydantic-settings
│   ├── dependencies.py    # Shared dependencies (DB session, auth)
│   ├── routers/           # API route modules
│   │   ├── __init__.py
│   │   ├── users.py
│   │   └── items.py
│   ├── models/            # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   └── user.py
│   ├── schemas/           # Pydantic request/response models
│   │   ├── __init__.py
│   │   └── user.py
│   ├── services/          # Business logic layer
│   │   ├── __init__.py
│   │   └── user_service.py
│   └── db/                # Database connection and session
│       ├── __init__.py
│       └── session.py
├── alembic/               # Database migrations
│   ├── versions/
│   └── env.py
├── tests/                 # Test files
│   ├── conftest.py        # Fixtures (test client, DB session)
│   ├── test_users.py
│   └── test_items.py
├── alembic.ini            # Alembic configuration
├── pyproject.toml         # Project config, dependencies
└── .env                   # Environment variables (not committed)
```

### API Conventions

- **Router organization:** One router module per resource in `app/routers/`
- **Path conventions:** Use plural nouns (`/users`, `/items`), not verbs
- **Response models:** Specify `response_model` on every route for auto-documentation
- **Status codes:** Use appropriate HTTP status codes via `status_code` parameter
- **Error handling:** Raise `HTTPException` for expected errors. Use exception handlers for unexpected errors
- **Pagination:** Use query params `skip` and `limit` with sensible defaults
- **Versioning:** Prefix routes with `/api/v1/` if the API needs versioning

```python
# Example route pattern
@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    user = await user_service.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```

### Pydantic Model Conventions

- Separate `Create`, `Update`, and `Response` schemas for each resource
- Use `model_config = ConfigDict(from_attributes=True)` for ORM compatibility
- Define shared fields in a base schema, extend for specific use cases
- Use `Field()` for validation constraints, descriptions, and examples

### SQLAlchemy Conventions

- Use `DeclarativeBase` (SQLAlchemy 2.0 style) with `Mapped` type annotations
- Use `async_sessionmaker` and `AsyncSession` for async database access
- Define relationships with `relationship()` and use `selectinload` for eager loading
- Keep model files focused — one model per file in `app/models/`

### Security Notes

- Store secrets in `.env`, load via `pydantic-settings`
- Use `Depends()` for authentication middleware on protected routes
- Hash passwords with `bcrypt` or `passlib` — never store plaintext
- Validate all input through Pydantic models — never trust raw request data
- Use CORS middleware configured for specific origins, not `*`

### Testing

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_users.py

# Run with verbose output
pytest -v

# Run with coverage report
pytest --cov=app --cov-report=term-missing
```

Use `httpx.AsyncClient` with `ASGITransport` for async test client. Override dependencies in tests using `app.dependency_overrides`.

## hooks

```json
{
  "PostToolUse": [
    {
      "matcher": "Write|Edit",
      "command": "ruff check --fix $CLAUDE_FILE_PATHS 2>/dev/null && ruff format $CLAUDE_FILE_PATHS 2>/dev/null || true"
    }
  ],
  "PreToolUse": [
    {
      "matcher": "Write|Edit",
      "command": "case \"$CLAUDE_FILE_PATHS\" in alembic/versions/*) echo 'BLOCKED: Do not edit migration files directly — use alembic revision --autogenerate' && exit 2;; esac"
    },
    {
      "matcher": "Write|Edit",
      "command": "case \"$CLAUDE_FILE_PATHS\" in *.env*) echo 'BLOCKED: Do not edit .env files — they contain secrets and database credentials' && exit 2;; esac"
    }
  ]
}
```

## skills

### create-endpoint

```markdown
---
name: create-endpoint
description: Scaffold a new FastAPI router with CRUD endpoints, Pydantic schemas, and tests
invocation: user
user_invocation: /create-endpoint
---

# Create Endpoint

Scaffold a new FastAPI resource with router, schemas, service layer, and tests.

## Input

Ask the user for:
1. **Resource name** (e.g., "product", "order", "comment")
2. **Fields** — list of fields with types (str, int, float, bool, datetime, etc.)
3. **Operations** — which CRUD operations to include (create, read, list, update, delete)
4. **Relationships** — any foreign keys to existing models

## Output

Generate the following files:

1. `app/routers/{resource}.py` — Router with selected CRUD endpoints
2. `app/schemas/{resource}.py` — Pydantic Create, Update, and Response schemas
3. `app/models/{resource}.py` — SQLAlchemy model with columns and relationships
4. `app/services/{resource}_service.py` — Business logic functions
5. `tests/test_{resource}.py` — Test cases for each endpoint

Then:
- Register the router in `app/main.py`
- Remind the user to run `alembic revision --autogenerate -m "add {resource}"` and `alembic upgrade head`

Follow existing patterns in the project for consistency.
```

## agents

### api-contract-reviewer

```markdown
---
name: api-contract-reviewer
description: Reviews FastAPI endpoints for API design consistency and contract correctness
model: haiku
tools:
  - Read
  - Grep
  - Glob
---

# API Contract Reviewer

You review FastAPI routers, Pydantic schemas, and SQLAlchemy models for API design consistency and correctness.

## Review Checklist

1. **Response models:** Every route must have a `response_model` specified. Flag routes without one.
2. **Status codes:** Verify appropriate status codes — 201 for creation, 204 for deletion, 404 for not found.
3. **Input validation:** Check that Pydantic schemas have appropriate `Field()` constraints (min_length, ge, le, etc.).
4. **Error handling:** Verify that service functions raise appropriate `HTTPException` errors, not bare exceptions.
5. **Schema separation:** Flag routes using the same schema for input and output. Create, Update, and Response should be separate.
6. **Async consistency:** All route handlers and DB operations should use `async def`. Flag synchronous DB calls in async handlers.
7. **Dependency injection:** Database sessions and auth should use `Depends()`. Flag direct session creation in routes.
8. **Naming conventions:** Routes should use plural nouns. Schema classes should follow `{Resource}Create`, `{Resource}Response` pattern.
9. **Pagination:** List endpoints should support `skip` and `limit` parameters with sensible defaults.
10. **Documentation:** Routes should have docstrings that become OpenAPI descriptions. Flag undocumented endpoints.

Output findings as a table: | Severity | File | Line | Issue | Fix |
```

## mcp_servers

```json
{
  "context7": {
    "command": "npx",
    "args": ["-y", "@upstash/context7-mcp@latest"],
    "type": "stdio"
  }
}
```

## external_skills

| Name | Repository | Skill | Description |
|------|-----------|-------|-------------|
| API Design Principles | wshobson/agents | api-design-principles | RESTful API design patterns and conventions |
| Python Testing Patterns | wshobson/agents | python-testing-patterns | Python testing best practices with pytest |
| FastAPI Templates | wshobson/agents | fastapi-templates | FastAPI project templates and patterns |
