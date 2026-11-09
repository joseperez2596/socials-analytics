# Contributing

1. Follow **Local development** in the README.
2. Before opening a PR: `npm run lint && npm run build && npm test`.
3. Keep PRs focused, one change per PR.

## Database changes

- Add a new numbered file in `migrations/` (e.g. `003_add_x.sql`). Never edit a file that has already shipped.
- **Migrations run on every container start**, so every statement must be idempotent: `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `ON CONFLICT DO NOTHING`.
- If the change affects the pages, update `seed/demo.sql` so the demo still covers it.

## Bugs and ideas

Open an issue with steps to reproduce, or with the use case behind the idea.
