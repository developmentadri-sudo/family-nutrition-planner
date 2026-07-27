# Family Nutrition Planner v11

Version 11 is a separate React/Vite app with a tiny backend API. The v10 single-file app remains at the repository root and in `outputs/`.

## Structure

- `client/` React + Vite frontend
- `server/` Node HTTP API
- `server/data/store.json` local JSON persistence

## Run Locally

```bash
cd v11
pnpm install
OPENAI_API_KEY=your_key pnpm dev:server
pnpm dev:client
```

The frontend runs on `http://127.0.0.1:5173` and proxies `/api` to `http://127.0.0.1:8787`.

Without `OPENAI_API_KEY`, generation endpoints return a deterministic local starter plan so the app remains functional.

## API Shape

- `GET /api/health`
- `GET /api/family`
- `PUT /api/family`
- `GET /api/plans/current`
- `POST /api/plans/generate`
- `POST /api/plans/:planId/days/:dayId/regenerate`
- `POST /api/plans/:planId/meals/:mealId/adapt`
- `POST /api/activities`
- `POST /api/symptoms`

The OpenAI key is read only by the backend from `OPENAI_API_KEY`.
