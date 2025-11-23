# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a REST API built with Elysia (Bun framework) for managing sports teams, athletes, and matches. The project uses Drizzle ORM with PostgreSQL for data persistence, JWT for authentication, and follows a modular architecture pattern.

## Development Commands

```bash
# Start development server with hot reload
bun run dev

# Database operations
bunx drizzle-kit push       # Push schema changes to database
bunx drizzle-kit generate   # Generate migration files
bunx drizzle-kit migrate    # Run migrations

# Code formatting (runs automatically on pre-commit)
prettier --write --ignore-unknown **/*
```

## Architecture

### Tech Stack

- **Runtime**: Bun
- **Framework**: Elysia (TypeScript-first web framework)
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT tokens via @elysiajs/jwt
- **Validation**: Zod schemas
- **Logging**: Winston
- **Pre-commit**: Husky + lint-staged (auto-formats with Prettier)

### Module Structure

The codebase follows a modular pattern where each feature is organized in `src/modules/`:

```
src/modules/{feature}/
  ├── index.ts    # Elysia route handlers
  ├── model.ts    # Zod validation schemas
  └── service.ts  # Business logic (static class methods)
```

**Example**: The `auth` module demonstrates this pattern:

- `index.ts`: Defines `/auth/sign-in` and `/auth/register` routes using Elysia
- `model.ts`: Exports `loginSchema` and `registerSchema` Zod validators
- `service.ts`: Exports `Auth` abstract class with static methods `signIn()` and `register()`

### Database Schema

Located in `src/db/schema.ts`. Key entities:

- **users**: Authentication and team ownership
- **teams**: Sports teams with branding (colors, icons)
- **athletes**: Player information
- **athleteCareer**: Junction table tracking athlete-team relationships with denormalized stats (matches, goals, assists, cards)
- **matches**: Game records with home/away teams and scores
- **matchAthletes**: Athlete performance in specific matches

**Important**: `athleteCareer` contains denormalized statistics that must be updated when matches are created or modified.

### Entry Point

`src/index.ts` initializes:

1. Drizzle DB connection from `DATABASE_URL` env var
2. Elysia server with `/v1` prefix
3. OpenAPI documentation
4. Request tracing with Winston logger
5. Module registration (currently only `auth`)

The `db` and `server` instances are exported for use across modules.

### Environment Variables

Required variables (see `.env.example`):

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT token signing
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)

### Password Handling

Use Bun's built-in password hashing:

```typescript
const hash = await Bun.password.hash(password);
const isValid = await Bun.password.verify(password, hash);
```

### Adding New Modules

1. Create directory in `src/modules/{feature}/`
2. Implement `index.ts` (Elysia routes), `model.ts` (Zod schemas), `service.ts` (business logic)
3. Import and register in `src/index.ts` using `.use()` method
4. Access database via the exported `db` instance from `src/index.ts`

### Response Patterns

- **Success**: Return data object, optionally with `token` for auth endpoints
- **Validation errors**: Zod automatically handles with 400 status
- **Business logic errors**: Use `status()` helper from Elysia:
  ```typescript
  throw status(409, "Endereço de e-mail já utilizado.");
  ```
