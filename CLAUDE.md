# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a REST API built with Elysia (Bun framework) for managing sports teams, athletes, and matches. The project uses Drizzle ORM with PostgreSQL for data persistence, JWT for authentication, and follows a modular architecture pattern.

## Development Commands

```bash
# Start development server with hot reload
bun run dev

# Database operations
bun run db:push      # Push schema changes to database
bun run db:generate  # Generate migration files
bun run db:migrate   # Run migrations

# Code formatting (runs automatically on pre-commit via Husky)
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
  └── service.ts  # Business logic (abstract classes with static methods)
```

**Key patterns**:

- **Route handlers** (`index.ts`): Export an Elysia instance or function that takes `ElysiaProtectedServer` for protected routes
- **Schemas** (`model.ts`): Export Zod schemas for validation with Portuguese error messages
- **Services** (`service.ts`): Export abstract classes with static methods for business logic
- **Submodules**: Nested features like `team/submodules/athlete/` follow the same pattern

**Auth module** (public routes):

```typescript
const auth = new Elysia({ prefix: "/auth" })
  .use(jwt({ ... }))
  .post("/sign-in", ...)
  .derive({ as: "scoped" }, authMiddleware) // Adds { user } to context
```

**Team module** (protected routes):

```typescript
const team = (app: ElysiaProtectedServer) =>
  app.group("/teams", (controller) =>
    controller.get("/", ({ user }) => Team.own(user.id)),
  );
```

**Service classes**: Always abstract with static methods, using `z.infer<typeof schema>` for type safety:

```typescript
abstract class Team {
  static async create(
    ownerId: string,
    payload: z.infer<typeof createTeamSchema>,
  ) {
    // Implementation
  }
}
```

### Database Schema

Located in `src/db/schema.ts`. Key patterns:

- **Tables**: Use `pgTable()` with camelCase field names
- **Relations**: Define separately using `relations()` helper (e.g., `teamRelations`, `athleteRelations`)
- **Timestamps**: Use `.$onUpdateFn(() => new Date())` for auto-update behavior
- **UUIDs**: Default to `uuid().defaultRandom().primaryKey()`

**Core entities**:

- **users**: Authentication and team ownership
- **teams**: Sports teams with branding (colors, icons), linked to owner via `createdBy`
- **athletes**: Player information (name, birthdate)
- **athleteCareer**: Junction table with composite PK `(athleteId, teamId)` containing denormalized stats
- **matches**: Game records with `homeTeamId`/`awayTeamId` and scores
- **matchAthletes**: Performance data per match, composite PK `(athleteId, matchId, teamId)`
- **trainings** & **trainingClasses**: Training sessions with athlete stats

**Critical**: `athleteCareer` contains denormalized statistics (matches, goals, assists, yellowCards, redCards) that must be updated when matches are created or modified.

### Entry Point & TypeScript

`src/index.ts` initializes:

1. Drizzle DB connection: `drizzle(Bun.env.DATABASE_URL!, { schema })`
2. Elysia server with `/v1` prefix
3. OpenAPI documentation via `@elysiajs/openapi`
4. Request tracing with Winston logger (logs request, handle, and error events)
5. Module registration: `.use(auth)` then `.use(team)`

**Exports**:

- `db`: Database instance (import for queries in services)
- `server`: Elysia instance
- `ElysiaProtectedServer`: Type for modules that need auth context (use after `.derive()` auth middleware)

**TypeScript config**: Strict mode enabled (`"strict": true`), ES2022 modules, targeting ES2021.

### Environment Variables

Required variables (see `.env.example`):

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT token signing
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)

### Authentication & Security

**JWT authentication**:

- Tokens stored in HTTP-only cookies (`auth` cookie, 1-day expiry)
- Protected routes access `{ user }` context via `.derive()` middleware in `auth` module
- Import `ElysiaProtectedServer` type for modules requiring authentication

**Password handling** (Bun built-in):

```typescript
const hash = await Bun.password.hash(password);
const isValid = await Bun.password.verify(password, hash);
```

**Query patterns**:

- Use `db.query.{table}.findFirst()` or `.findMany()` with relational queries
- Exclude sensitive fields: `columns: { password: false }` or delete from result
- Use `returning()` for inserts/updates to get created/modified records

### Drizzle Query Patterns

**Relational queries** (preferred):

```typescript
await db.query.teams.findFirst({
  where: (row) => eq(row.id, teamId),
  with: {
    athletes: true,
    owner: { columns: { password: false } },
  },
});
```

**Manual joins** (for complex filters):

```typescript
await db
  .select({ name: athletes.name, goals: athleteCareer.goals })
  .from(athleteCareer)
  .innerJoin(athletes, eq(athleteCareer.athleteId, athletes.id))
  .where(and(eq(athleteCareer.teamId, teamId), ...filters));
```

**Dynamic filtering**: Build `SQLWrapper[]` arrays and spread into `and()`:

```typescript
const filters: SQLWrapper[] = [];
if (filter.from) filters.push(gte(athleteCareer.startedAt, filter.from));
// ...
.where(and(eq(athleteCareer.teamId, teamId), ...filters))
```

### Response & Error Patterns

- **Success**: Return plain data object or `{ success: true, data: ... }`
- **Auth endpoints**: Set cookie via `cookie: { auth }` context, return `{ success: true, data: user }`
- **Validation errors**: Zod handles automatically (400 status)
- **Business logic errors**: Use `status()` helper from Elysia (Portuguese messages):
  ```typescript
  throw status(409, "Endereço de e-mail já utilizado.");
  throw status(401, "Unauthorized");
  throw status(403, "Forbidden");
  ```
- **TODO pattern**: Code includes TODO comments for refactoring (e.g., creating error helpers)

### Adding New Modules

1. Create `src/modules/{feature}/` with `index.ts`, `model.ts`, `service.ts`
2. **For public routes**: Export `new Elysia({ prefix: "/feature" })`
3. **For protected routes**: Export function taking `ElysiaProtectedServer`, use `.group()` and access `{ user }` context
4. Import and register in `src/index.ts` using `.use(moduleName)`
5. Access database via `import { db } from "../.."`
6. Use Portuguese for validation error messages and user-facing strings
