---
name: table-pagination
description: "Data table patterns with server-side pagination, toolbar, and responsive columns. Use when building data tables, implementing search and pagination, or creating admin list views."
---

# Table & Pagination Patterns

## Critical Rules

- **Server-side pagination** — paginate in the database, not in the client.
- **URL-based state** — page, limit, search, sort in query params for shareable URLs.
- **Toolbar = search + counter + limit** — consistent UX across all tables.
- **Responsive columns** — hide columns with `hidden sm:table-cell` breakpoints.
- **Reset page on filter change** — always return to page 1 when search/filter changes.
- **Use `tabular-nums`** on numeric columns — for proper alignment.

## Table Architecture

```
DataTable (container)
  ├── Toolbar (search + filters + counter + limit selector)
  ├── Table (columns + rows)
  └── Pagination (page navigation)
```

## Server-Side Pagination

### URL-Based State

```tsx
// app/users/page.tsx
import { Suspense } from "react";
import { getUsersPaginated } from "@/facades/user.facade";

interface Props {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    sort?: string;
    order?: string;
  }>;
}

export default async function UsersPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 20;

  const { data, total } = await getUsersPaginated({
    page,
    limit,
    search: params.search,
    sort: params.sort,
    order: params.order as "asc" | "desc",
  });

  return (
    <DataTable
      columns={columns}
      data={data}
      total={total}
      page={page}
      limit={limit}
    />
  );
}
```

### Backend Pagination

```ts
// src/dal/user.dal.ts
import { db } from "@/lib/db";
import { users } from "@/schema";
import { sql, ilike, desc, asc } from "drizzle-orm";

interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
}

export async function findUsersPaginated(params: PaginationParams) {
  const { page, limit, search, sort = "createdAt", order = "desc" } = params;
  const offset = (page - 1) * limit;

  const where = search ? ilike(users.name, `%${search}%`) : undefined;
  const orderBy = order === "asc" ? asc(users[sort]) : desc(users[sort]);

  const [data, [{ count }]] = await Promise.all([
    db.select().from(users).where(where).orderBy(orderBy).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(users).where(where),
  ]);

  return { data, total: Number(count) };
}
```

## Table Toolbar

```tsx
"use client";

export function DataTableToolbar({ table, total }: ToolbarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page"); // reset to page 1 on filter change
    router.push(`${pathname}?${params}`);
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-1 items-center gap-2">
        <Input
          placeholder="Search..."
          defaultValue={searchParams.get("search") ?? ""}
          onChange={(e) => updateParam("search", e.target.value)}
          className="h-8 w-[250px]"
        />
        <span className="text-sm text-muted-foreground">
          {total} result{total !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Select
          defaultValue={searchParams.get("limit") ?? "20"}
          onValueChange={(v) => updateParam("limit", v)}
        >
          <SelectTrigger className="h-8 w-[80px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 20, 50, 100].map((n) => (
              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
```

## Responsive Columns

Hide columns by breakpoint to keep tables readable on mobile:

```tsx
const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "Name",
    // Always visible
  },
  {
    accessorKey: "email",
    header: "Email",
    meta: { className: "hidden sm:table-cell" },
  },
  {
    accessorKey: "role",
    header: "Role",
    meta: { className: "hidden md:table-cell" },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    meta: { className: "hidden lg:table-cell" },
    cell: ({ row }) => formatDate(row.getValue("createdAt")),
  },
];
```

Apply the responsive class in the table cell:

```tsx
<TableCell className={column.columnDef.meta?.className}>
  {flexRender(cell.column.columnDef.cell, cell.getContext())}
</TableCell>
```

## Pagination Component

```tsx
"use client";

export function DataTablePagination({ page, limit, total }: PaginationProps) {
  const totalPages = Math.ceil(total / limit);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(p));
    router.push(`${pathname}?${params}`);
  }

  return (
    <div className="flex items-center justify-between px-2">
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => goToPage(page - 1)} disabled={page <= 1}>
          Previous
        </Button>
        <Button variant="outline" size="sm" onClick={() => goToPage(page + 1)} disabled={page >= totalPages}>
          Next
        </Button>
      </div>
    </div>
  );
}
```

## Do

- Paginate in the database with `LIMIT`/`OFFSET` — never fetch all rows and slice on the client.
- Store page, limit, search, and sort in URL query params for shareable, bookmarkable state.
- Reset to page 1 whenever search or filter criteria change.
- Use `tabular-nums` on numeric columns and dates for proper alignment.
- Hide non-essential columns on smaller breakpoints with responsive utility classes.

## Don't

- Don't fetch all data and paginate client-side — it does not scale beyond a few hundred rows.
- Don't store pagination state in React state — use URL search params for persistence and sharing.
- Don't forget the total count query — you need it for "Page X of Y" display.
- Don't fire a search request on every keystroke without debouncing.

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| **Client-side pagination** | Loads all rows into memory, slow on large datasets | Use server-side `LIMIT`/`OFFSET` with a total count query |
| **Pagination state in `useState`** | State is lost on refresh, URLs are not shareable | Store `page`, `limit`, `search`, `sort` in URL search params |
| **Not resetting page on filter change** | User sees empty results or wrong page after filtering | Delete the `page` param whenever search or filter params change |
| **Search without debounce** | Fires a request per keystroke, overwhelming the server | Debounce search input (300ms) before updating the URL param |
| **Missing total count** | Cannot display "Page X of Y" or disable next button correctly | Run a parallel `COUNT(*)` query alongside the paginated data query |
