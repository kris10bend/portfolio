# Kristen Beard Portfolio

A personal portfolio website for Kristen Beard — Experience Design & Creative Direction.

## Stack

- **Frontend:** React 18 + Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Express 5 (TypeScript), serves both API and client
- **Routing:** Wouter (client-side)
- **Data:** Static project data in `client/src/data/projects.ts` (no database required)
- **Session:** express-session with SESSION_SECRET env var

## Project structure

```
client/src/
  pages/          — Home, ProjectPage, 404
  pages/sections/ — Section components (Hero, Navigation, Gallery, etc.)
  components/ui/  — shadcn/ui primitives
  data/           — Static project data
  types/          — TypeScript types
server/
  index.ts        — Express entry point
  routes.ts       — API routes (extend here)
  storage.ts      — Storage interface (in-memory by default)
shared/
  schema.ts       — Drizzle ORM schema (users table)
```

## Running the app

```bash
npm run dev   # development server on port 5000
npm run build # production build
npm start     # serve production build
```

## User preferences

- **Frontend-first:** This is a frontend React + Vite portfolio based on Figma designs.
- **Preserve existing structure:** Do not replace pages, reorganize components, or scaffold a new app.
- **Milestone-based:** Implementation tasks are assigned one milestone at a time.
- **Ask before large changes:** Get approval before architectural changes or adding new dependencies.
