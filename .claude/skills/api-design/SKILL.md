---
name: api-design
description: "REST API design with validation, error handling, auth wrappers, and facades. Use when building API routes, server actions, implementing auth middleware, or designing backend services."
---

# API Design Principles

## Critical Rules

- **Validate all incoming data** with Zod schemas at the API boundary.
- **Never expose stack traces** or internal details in production error responses.
- **Always use facades** between presentation and services.
- **Auth wrappers on every protected endpoint** — `withAuth()`, `withAdmin()`.
- **Consistent response shapes** — `{ data }` for success, `{ error, code }` for errors.
- **Parameterized queries only** — never string concatenation for SQL.

## Route Structure

- Use resource-based URLs: `/api/users`, `/api/posts/:id/comments`.
- Use HTTP methods semantically:
  - `GET` — read (no side effects)
  - `POST` — create
  - `PUT/PATCH` — update (PUT replaces, PATCH partial update)
  - `DELETE` — remove
- Nest sub-resources only one level deep: `/api/posts/:id/comments` — not deeper.
- Use plural nouns for collections: `/api/users` (not `/api/user`).

## Request Validation

- Validate **all** incoming data with Zod schemas at the API boundary:
  ```ts
  const CreatePostSchema = z.object({
    title: z.string().min(1).max(200),
    content: z.string().min(1),
    published: z.boolean().default(false),
  })

  const body = CreatePostSchema.parse(await request.json())
  ```
- Return 400 with structured validation errors:
  ```json
  { "error": "Validation failed", "details": [{ "field": "title", "message": "Required" }] }
  ```
- Validate path params, query params, and headers — not just body.

## Response Format

- Use consistent response shapes across all endpoints:
  ```ts
  // Success
  { "data": { ... } }
  { "data": [...], "pagination": { "total": 100, "page": 1, "pageSize": 20 } }

  // Error
  { "error": "Not found", "code": "RESOURCE_NOT_FOUND" }
  ```
- Always return appropriate HTTP status codes:
  - `200` — success
  - `201` — created
  - `204` — no content (successful delete)
  - `400` — bad request (validation error)
  - `401` — unauthorized (no/invalid auth)
  - `403` — forbidden (insufficient permissions)
  - `404` — not found
  - `409` — conflict (duplicate resource)
  - `429` — too many requests (rate limit)
  - `500` — internal server error

## Error Handling

- Catch errors at the route handler level with a consistent pattern:
  ```ts
  try {
    // ... handler logic
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('Unhandled error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  ```
- Never expose stack traces or internal details in production error responses.
- Log errors server-side with request context (method, path, user ID).

## Authentication & Authorization

- Validate auth on every protected endpoint — middleware + route-level checks.
- Extract user from session/token, never from request body.
- Check permissions at the resource level: "Can this user access THIS specific post?"
- Return `401` for missing/invalid auth, `403` for insufficient permissions.

### Auth Wrappers

Use auth wrapper functions for consistent protection:

```ts
// Require any authenticated user
export async function withAuth() {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Unauthorized");
  return user;
}

// Require authenticated user with valid token
export async function withAuthToken(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) throw new ApiError(401, "Missing token");
  return verifyToken(token);
}

// Dynamic auth — optional session, different behavior for authed/unauthed
export async function withDynamicAuth() {
  const user = await getCurrentUser();
  return { user, isAuthenticated: !!user };
}
```

## Facades

- **Always use facades** between presentation and services.
- One facade per domain entity in `src/facades/`.
- Facades handle auth context extraction and coordinate service calls.
- Routes/pages call facades — never services directly.

## Rate Limiting

- Implement rate limiting on public endpoints and auth endpoints.
- Use token bucket or sliding window algorithm.
- Return `429` with `Retry-After` header when rate limited.
- Rate limit by IP for public endpoints, by user ID for authenticated endpoints.

## Pagination

- Use cursor-based pagination for large datasets:
  ```
  GET /api/posts?cursor=abc123&limit=20
  ```
- Return pagination metadata: `{ "data": [...], "nextCursor": "def456", "hasMore": true }`
- Default limit to 20, max to 100.
- For simple cases, offset-based is acceptable: `?page=1&pageSize=20`.

## Security

- Validate Content-Type header on POST/PUT/PATCH requests.
- Set CORS headers explicitly — never use `*` in production.
- Sanitize user input before database queries.
- Use parameterized queries — never string concatenation for SQL.
- Set security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`.

## Do

- Validate all inputs (body, params, query, headers) with Zod schemas at the API boundary before any logic runs.
- Return consistent response shapes: `{ data }` for success, `{ error, code }` for errors.
- Use auth wrappers (`withAuth()`, `withAdmin()`) on every protected endpoint for uniform enforcement.
- Route all calls through facades; never call services directly from route handlers or pages.
- Return appropriate HTTP status codes (201 for create, 204 for delete, 400 for validation, etc.).
- Log errors server-side with request context (method, path, user ID) for debugging.
- Use cursor-based pagination for large datasets; default limit to 20, max to 100.
- Set explicit CORS origins in production; never use wildcard `*`.

## Don't

- Don't expose stack traces, internal error messages, or database details in API responses.
- Don't trust client-provided user IDs or roles; always extract identity from the session or token.
- Don't use string concatenation for SQL queries; always use parameterized queries.
- Don't nest sub-resources deeper than one level (`/posts/:id/comments` is fine, `/posts/:id/comments/:cid/likes` is not).
- Don't return 200 for every response; use the correct status code to communicate what happened.
- Don't skip validation on query parameters or path parameters; they are user input too.
- Don't use `GET` for mutations or `POST` for reads; use HTTP methods semantically.
- Don't create custom error shapes per endpoint; use one project-wide error format.
- Don't rely solely on middleware for auth; add route-level permission checks for resource ownership.

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| **Leaking Internals** | Returning raw database errors or stack traces in production responses, exposing schema and code paths. | Catch all errors at the handler level; return generic messages with error codes. |
| **Body-Only Validation** | Validating the request body but ignoring path params and query strings, allowing injection or type errors. | Validate all input sources (body, params, query, headers) with Zod schemas. |
| **Trust-the-Client Auth** | Reading `userId` or `role` from the request body instead of the server-side session/token. | Always extract identity from `withAuth()` or the session; never from client-submitted data. |
| **God Route Handler** | Putting validation, auth, business logic, and DB queries all in one route handler function. | Use facades to orchestrate, services for logic, and keep the handler as a thin adapter. |
| **Inconsistent Errors** | Each endpoint returning errors in a different shape, forcing clients to handle multiple formats. | Standardize on `{ error: string, code: string, details?: array }` across all endpoints. |
| **Offset Pagination at Scale** | Using `OFFSET` pagination on tables with millions of rows, causing slow queries as page numbers grow. | Switch to cursor-based pagination (`WHERE id > cursor LIMIT n`) for large datasets. |
| **Missing Rate Limits** | Leaving auth and public endpoints unprotected, allowing brute-force or scraping attacks. | Add rate limiting by IP for public endpoints and by user ID for authenticated endpoints. |
