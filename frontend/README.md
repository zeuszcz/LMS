# YES LMS — Frontend

React 18 + Vite + TypeScript + Zustand + TanStack Query + Tailwind CSS.

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

http://localhost:5173 (Vite proxies `/api/*` to http://localhost:8000)

## Project layout

```
src/
  api/         axios client + per-resource API modules
  components/  reusable UI (Layout, ProtectedRoute, …)
  pages/       route-level components
  stores/      Zustand stores (authStore)
  types/       shared TS types mirroring backend schemas
  index.css    Tailwind directives + component classes
  main.tsx     entrypoint
  App.tsx      router
```

## Conventions

- One Zustand store per concern; persist only what survives reload (tokens, not UI state).
- Selectors must be narrow: `useAuthStore((s) => s.user)`, never `useAuthStore()` (re-render trap).
- API modules return typed promises — components use TanStack Query, not direct calls in effects.
- No business logic in components — push to hooks/services.
- All new pages go through `ProtectedRoute` unless explicitly public (login, password reset).
- Tailwind: prefer utility classes, extract to `@layer components` when 3+ uses.

## Commands

```bash
npm run dev        # vite dev server
npm run build      # tsc + vite build
npm run typecheck  # tsc --noEmit
npm run lint
npm test
```
