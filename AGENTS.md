<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Testing

Run with `npm run test` (Vitest). Tests live colocated in `__tests__/` next to the
code they cover. See `TESTING.md` for framework details and conventions.

- 100% test coverage is the goal — tests make vibe coding safe, not slower.
- When writing a new function, write a corresponding test.
- When fixing a bug, write a regression test that reproduces it first.
- When adding error handling, write a test that triggers the error path.
- When adding a conditional (if/else, switch), test BOTH branches.
- Never commit code that makes existing tests fail.
