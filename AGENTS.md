<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Coding agents — Etur-tasks

## Factory pilot (read first)

Org AI Software Factory pilot lives in this repo. Full charter:

→ **[`docs/ai-software-factory/FACTORY.md`](docs/ai-software-factory/FACTORY.md)**

Hard rules:

1. **Product assistant ≠ coding agent.** Do not wire `src/modules/assistant/` ("לא נייהוז") into PR / Jira coding automation.
2. Prefer the existing loop: `dev-feedback` → Kobi approve → Jira ETUR → PR → Actions deploy → close ticket.
3. Do not fork this monolith as an org-wide template until stage 7 in `FACTORY.md` is proven.
4. Git commits: human identity only (`liad07` / session override) — never Cursor Agent authorship.
5. Never commit `.env*` or secrets.

## Layout (for coding agents)

| Area | Path |
|------|------|
| App Router + APIs | `src/app/` |
| Product modules | `src/modules/{tasks,malshabim,nagadim,dovrut,agam}/` |
| Module registry | `src/shared/modules/registry.ts` |
| Dev-feedback (factory intake) | `src/modules/dev-feedback/`, `src/components/dev-feedback/` |
| Product assistant (not coding factory) | `src/modules/assistant/` |
| Jira | `src/services/jira.service.ts` |
| Migrations | `supabase/migrations/` (+ manual Actions workflow) |
| Deploy | `.github/workflows/deploy-production.yml` → `platform-workflows@v1` |

Thin API routes; business logic in `modules/*/services` or `src/services/*`.

## Verify before claiming done

- `npm run lint` (and `npm run build` when touching app-critical paths)
- Manual check of the relevant screen when UI/API behavior changes
