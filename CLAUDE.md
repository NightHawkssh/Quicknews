# Quicknews - Project Context

## Overview
Quicknews is an Indian financial news aggregator that scrapes articles from configurable sources and displays them in a clean web UI. It has user authentication, an admin panel for managing sources, and configurable scraping settings.

**Repo:** https://github.com/NightHawkssh/Quicknews
**GitHub user:** NightHawkssh

## Tech Stack
- **Framework:** Next.js 16.1.6 (App Router, Turbopack)
- **React:** 19.2.3
- **Database:** Prisma 7.3 + SQLite locally / Turso (libSQL) in production
- **Styling:** Tailwind CSS 4 (PostCSS plugin, `@import "tailwindcss"` syntax)
- **Data Fetching:** SWR 2.4 (client-side), fetch (server-side API routes)
- **Auth:** JWT (jose) + bcryptjs, stored in httpOnly `session` cookie
- **Scraping:** Cheerio + Axios with configurable CSS selectors per source + smart auto-detection fallback
- **Deployment:** Vercel (standalone output), Turso for cloud DB

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout (Geist fonts, suppressHydrationWarning)
│   ├── globals.css             # Global styles, prose typography, scrollbar, animations
│   ├── (auth)/                 # Auth route group (no header)
│   │   ├── layout.tsx          # Centered card layout for auth pages
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (main)/                 # Main route group (with header)
│   │   ├── layout.tsx          # Wraps children with <Header />
│   │   ├── page.tsx            # Home — ArticleGrid + RefreshButton
│   │   ├── article/[id]/page.tsx  # Article detail page
│   │   └── admin/
│   │       ├── page.tsx        # Admin dashboard (stats, source status table/cards)
│   │       └── sources/page.tsx # CRUD for news sources + selector config modal
│   └── api/
│       ├── articles/route.ts   # GET paginated articles (with source filter)
│       ├── articles/[id]/route.ts  # GET single article
│       ├── auth/login/         # POST login
│       ├── auth/register/      # POST register
│       ├── auth/logout/        # POST logout
│       ├── auth/me/            # GET current user
│       ├── scrape/route.ts     # GET status, POST trigger scrape
│       ├── sources/route.ts    # GET all, POST create source
│       ├── sources/[id]/route.ts   # GET/PUT/DELETE single source
│       └── health/route.ts     # Debug endpoint
├── components/
│   ├── Header.tsx              # Sticky header with hamburger mobile menu
│   ├── ArticleGrid.tsx         # Article list with source filters + pagination
│   ├── ArticleCard.tsx         # Single article row in the list
│   ├── RefreshButton.tsx       # Triggers scrape + revalidates SWR
│   └── ui/                     # Reusable primitives
│       ├── Button.tsx          # Variants: primary/secondary/outline/ghost/danger, sizes: sm/md/lg
│       ├── Input.tsx           # With label + error display
│       ├── Modal.tsx           # Bottom-sheet on mobile, centered on desktop
│       ├── Card.tsx            # Card + CardHeader/CardContent/CardFooter
│       ├── Skeleton.tsx        # Loading skeletons (article list + card variants)
│       └── index.ts            # Barrel exports
├── hooks/
│   └── useAuth.ts              # SWR-based auth hook (user, isAdmin, logout)
├── lib/
│   ├── db.ts                   # Prisma client singleton (libSQL adapter)
│   ├── auth.ts                 # Server auth (hash, verify, JWT, cookies, getCurrentUser)
│   ├── auth-edge.ts            # Edge-compatible JWT verify (for middleware)
│   └── utils.ts                # cn(), formatDate(), formatRelativeTime()
├── services/scraper/
│   ├── index.ts                # Main scraper orchestrator
│   ├── fetcher.ts              # HTTP fetching with rate limiting
│   ├── parser.ts               # HTML parsing with Cheerio using source selectors
│   ├── auto-detect.ts          # Smart fallback: JSON-LD, __NEXT_DATA__, RSC, HTML heuristics, link analysis
│   └── rate-limiter.ts         # Per-source rate limiting
├── middleware.ts                # Auth middleware (public paths, admin gate)
└── types/index.ts              # All TypeScript interfaces
```

## Database Schema (Prisma)
- **Source** — id, name (unique), url, isActive, selectors (JSON string), rateLimit, lastScrapedAt
- **Article** — id, title, summary?, content?, sourceUrl (unique), imageUrl?, author?, publishedAt?, sourceId (FK → Source, cascade delete)
- **Settings** — singleton (id="global"), scrapeInterval, enableAutoScrape
- **User** — id, email (unique), username (unique), passwordHash, role ("user"/"admin")

## Key Patterns

### Authentication Flow
1. Register/Login → server hashes password / verifies → signs JWT → sets httpOnly cookie
2. Middleware (`src/middleware.ts`) runs on all non-API routes: redirects unauthenticated users to `/login`, blocks non-admins from `/admin`
3. Client uses `useAuth()` hook (SWR on `/api/auth/me`) for user state
4. Edge-compatible `auth-edge.ts` used in middleware (no Node.js crypto)

### Scraping System
- Each Source has a `selectors` JSON config (SelectorConfig type) defining CSS selectors for list page and article page
- Scraper fetches list page → parses article links → fetches each article → stores in DB
- Rate limiting per source via configurable `rateLimit` (ms between requests)
- Triggered manually via admin dashboard "Refresh" buttons or POST `/api/scrape`
- **Auto-detection fallback** (`auto-detect.ts`): When configured selectors find 0 articles, the scraper tries 5 strategies in order:
  1. **JSON-LD** — `<script type="application/ld+json">` structured data (most reliable)
  2. **__NEXT_DATA__** — Next.js Pages Router embedded data
  3. **RSC payload** — Next.js App Router `self.__next_f.push` data (for sites like YourStory)
  4. **HTML heuristics** — Broad attribute-contains selectors (`[class*="Card"]`, `[class*="article"]`, etc.) + article URL pattern matching
  5. **Link analysis** — Finds all `<a>` tags with article-like URLs (date segments, slug patterns)
- `parser.ts` uses the list page URL as fallback base URL for resolving relative links
- If `listPage.url` is empty, falls back to `source.url` for scraping

### Data Fetching
- All client pages use SWR with auto-refresh intervals
- Articles page: refreshes every 5 minutes, revalidates on focus
- Admin dashboard: refreshes every 30 seconds

### Mobile Responsive Design (implemented)
- All touch targets >= 44px (buttons, inputs, close buttons)
- Hamburger menu on mobile (`md:hidden` breakpoint)
- Bottom-sheet modal on mobile, centered on desktop
- Admin source status: card layout on mobile, table on desktop
- Responsive typography scaling across all pages
- Form grid columns stack on mobile (`grid-cols-1 sm:grid-cols-2`)
- Home page title + refresh button stack vertically on mobile

## Config Files
- `next.config.ts` — standalone output, all remote image patterns allowed
- `prisma.config.ts` — uses TURSO_DATABASE_URL or falls back to `file:./dev.db`
- `prisma/schema.prisma` — SQLite provider with libSQL adapter at runtime

## Environment Variables
- `TURSO_DATABASE_URL` — Turso database URL (or `file:./dev.db` for local)
- `TURSO_AUTH_TOKEN` — Turso auth token (not needed locally)
- `JWT_SECRET` — Secret for signing JWT tokens

## Scripts
- `npm run dev` — Start dev server
- `npm run build` — Generate Prisma client + build Next.js
- `npm run db:push` — Push schema to database
- `npm run db:seed` — Seed database (`prisma/seed.ts`)
- `npm run db:studio` — Open Prisma Studio

## User Preferences
- Always push changes to GitHub after committing
- `gh` CLI is at `/tmp/gh_2.67.0_linux_amd64/bin/gh` (needs PATH export)
- Vercel deployment via `npx vercel --prod --yes` (may need `vercel login` if token expires)

## Commit History (newest first)
1. `8da8147` — Add smart auto-detection for scraping any news source
2. `5b5bc55` — Add CLAUDE.md project context file
3. `501c9e6` — Add mobile-responsive design across entire app
2. `ffc20bd` — Add /api/health debug endpoint for Vercel troubleshooting
3. `66d3515` — Fix Vercel deployment: remove conflicting deps and clean up build
4. `0f67912` — Remove deprecated stub types and add Turso setup script
5. `85f35f2` — Remove deprecated stub type definitions
6. `e2884c7` — Migrate from better-sqlite3 to Turso (libSQL) for Vercel compatibility
7. `d9b7b8b` — Add authentication system with email/password login
8. `dcfc282` — Fix scraping issues and increase article limits
9. `c53fc86` — Compact list view with multi-source filters
10. `e598459` — Rename project to Quicknews and add full application
11. `44e7651` — Initial commit from Create Next App
