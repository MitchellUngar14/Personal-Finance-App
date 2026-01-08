# CLAUDE.md - Finance Tracker

This file provides guidance to Claude Code when working with this repository.

## Project Overview

A personal finance tracker web application with a "hacker terminal" aesthetic. Supports importing portfolio data from Raymond James and Wealthsimple CSV exports, tracking external accounts (bank accounts, mortgages, etc.), and visualizing portfolio growth over time.

**Tech Stack:**
- Next.js 16 (App Router) with React 19
- TypeScript
- Tailwind CSS v4
- PostgreSQL via Neon (serverless)
- Drizzle ORM
- NextAuth.js v5 (beta) for authentication
- Recharts for data visualization
- Deployed on Vercel

## Commands

```bash
# Development
npm run dev          # Start dev server with Turbopack

# Production
npm run build        # Build for production (uses webpack)
npm start            # Start production server

# Linting
npm run lint         # Run ESLint

# Database (Drizzle + Neon PostgreSQL)
npm run db:generate  # Generate migrations from schema changes
npm run db:push      # Push schema directly to database
npm run db:studio    # Open Drizzle Studio for database browsing
```

## Environment Variables

Required in `.env.local`:
```
DATABASE_URL=          # Neon PostgreSQL connection string
AUTH_SECRET=           # NextAuth secret (generate with: openssl rand -base64 32)
NEXTAUTH_URL=          # Base URL (http://localhost:3000 for dev)
```

## Architecture

### Directory Structure

```
src/
├── app/
│   ├── (auth)/              # Auth route group (login, register)
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/         # Protected dashboard route group
│   │   ├── layout.tsx       # Dashboard layout with Navbar
│   │   ├── page.tsx         # Overview/home page
│   │   ├── accounts/        # External accounts management
│   │   ├── charts/          # Growth and allocation charts
│   │   ├── history/         # Import history with source tabs
│   │   ├── import/          # CSV import page
│   │   └── portfolio/       # Holdings table with source tabs
│   └── api/
│       ├── auth/[...nextauth]/  # NextAuth API routes
│       ├── analytics/           # Portfolio analytics (totals, growth data)
│       ├── external-accounts/   # External account CRUD
│       ├── holdings/            # Holdings queries
│       ├── imports/             # CSV import processing
│       ├── register/            # User registration
│       └── snapshots/           # Snapshot CRUD
├── components/
│   ├── auth/                # Login/Register forms
│   ├── charts/              # GrowthChart, AllocationChart, PerformanceChart
│   ├── dashboard/           # PortfolioSummary, HoldingsTable, FilterBar, StatCard
│   ├── import/              # CSVDropzone
│   └── layout/              # Navbar, Terminal
└── lib/
    ├── auth.ts              # NextAuth configuration
    ├── db.ts                # Drizzle database connection
    ├── schema.ts            # Database schema definitions
    ├── utils.ts             # Formatting utilities (currency, dates, etc.)
    └── validations.ts       # Zod schemas for CSV parsing
```

### Database Schema

Key tables defined in `src/lib/schema.ts`:

- **users** - User accounts with hashed passwords
- **sessions** - Optional session storage (JWT by default)
- **snapshots** - Each CSV import creates a snapshot with `source` field ("raymond_james" or "wealthsimple")
- **holdings** - Individual holdings linked to snapshots
- **portfolioMetrics** - Pre-calculated totals per snapshot
- **externalAccounts** - Manual accounts from other institutions
- **externalAccountEntries** - Immutable value history for external accounts
- **auditLog** - Security audit trail

### Multi-Source Portfolio Tracking

The application supports two portfolio sources:
- `raymond_james` - Raymond James CSV exports (18 columns)
- `wealthsimple` - Wealthsimple CSV exports (21 columns)

Key implementation details:
- Source detection in `CSVDropzone.tsx` based on CSV column headers
- Separate validation schemas in `validations.ts` for each source
- Charts page combines all sources with value carry-forward for gaps
- History and Portfolio pages have source tabs (only shown when both exist)

### CSV Column Mappings

**Raymond James** (18 columns):
- Client Name, Client Id*, Account Nickname, Account Number*, Asset Category, Industry, Symbol, Holding, Quantity, Price, Fund, Average Cost, Book Value, Market Value, Accrued Interest, G/L, G/L (%), Percentage of Assets

**Wealthsimple** (21 columns):
- Account Name, Account Type, Account Classification, Account Number*, Symbol, Exchange, MIC, Name, Security Type, Quantity, Position Direction, Market Price, Market Price Currency, Book Value (CAD), Book Value Currency, Book Value Currency (Market), Market Value, Market Value Currency, Market Unrealized Returns, Market Unrealized Returns Currency

*Note: Client Id and Account Number are NOT stored for security reasons.

### Growth Chart Algorithm

The charts page (`src/app/(dashboard)/charts/page.tsx`) uses a two-pass algorithm to combine data from multiple sources:

1. **First pass**: Collect all data points, keyed by date
2. **Second pass**: Sort chronologically and carry forward the last known values for each source when a date only has data from one source

This ensures Total Net Worth calculates correctly even when RJ and WS snapshots are on different dates.

### Key Components

- **GrowthChart** (`src/components/charts/GrowthChart.tsx`): Line chart with time range filter (3M, 6M, 1Y, 3Y, 5Y, ALL), separate lines for RJ/WS portfolios, book value, external assets, and total net worth
- **CSVDropzone** (`src/components/import/CSVDropzone.tsx`): Auto-detects CSV source type and validates data
- **PortfolioTabs** (`src/components/dashboard/PortfolioTabs.tsx`): Client component for switching between portfolio sources
- **Terminal** (`src/components/layout/Terminal.tsx`): Styled container with terminal window aesthetic

## Styling

The app uses a "hacker terminal" theme with:
- Dark background (`terminal-bg`, `terminal-bg-card`, `terminal-bg-light`)
- Green primary color (`terminal-green`)
- Cyan accent (`terminal-cyan`)
- Magenta for negative values/errors (`terminal-magenta`)
- Yellow for warnings (`terminal-yellow`)

Custom CSS classes are defined in `src/app/globals.css`.

## Security Considerations

- Passwords require 12+ chars with uppercase, lowercase, number, and special character
- Client IDs and Account Numbers from CSV are never stored
- All routes under `(dashboard)` require authentication
- JWT-based sessions with secure cookies
- Audit logging for sensitive actions

## PWA Support

The app is configured as a Progressive Web App via `next-pwa`:
- Service worker in `public/sw.js`
- Manifest in `public/manifest.json`
- Can be installed on mobile devices
