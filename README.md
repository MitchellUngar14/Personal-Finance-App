# Raymond James Finance Tracker

A personal finance tracking application with a hacker/terminal aesthetic. Import CSV exports from Raymond James to track portfolio growth, analyze holdings, and visualize performance over time.

## Features

- **CSV Import**: Upload Raymond James portfolio exports
- **Portfolio Dashboard**: View total value, gain/loss, and holdings summary
- **Interactive Charts**: Growth over time, asset allocation, top/bottom performers
- **Historical Data**: Track and compare portfolio snapshots
- **Filtering**: Filter holdings by account, symbol, or holding name
- **Hacker Aesthetic**: Terminal-inspired dark theme with neon accents

## Tech Stack

- **Frontend**: Next.js 14+, React, TailwindCSS
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM
- **Authentication**: NextAuth.js v5
- **Charts**: Recharts
- **Hosting**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- Neon account (free tier available)
- Vercel account (for deployment)

### Setup

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Create Neon database**:
   - Sign up at [neon.tech](https://neon.tech)
   - Create a new project
   - Copy the connection string

3. **Configure environment variables**:
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local`:
   ```bash
   DATABASE_URL=your-neon-connection-string
   AUTH_SECRET=generate-with-openssl-rand-base64-32
   AUTH_URL=http://localhost:3000
   ```

4. **Push database schema**:
   ```bash
   npm run db:push
   ```

5. **Run development server**:
   ```bash
   npm run dev
   ```

6. **Create an account**: Visit http://localhost:3000/register

## CSV Format

The application expects Raymond James CSV exports with these columns:

| Column | Description |
|--------|-------------|
| Client Name | Account holder name |
| Client Id | Client identifier |
| Account Nickname | Account display name |
| Account Number | Account number |
| Asset Category | Asset type (Equity, Fixed Income, etc.) |
| Industry | Industry sector |
| Symbol | Ticker symbol |
| Holding | Security name |
| Quantity | Number of shares |
| Price | Current price |
| Fund | Fund name |
| Average Cost | Cost basis per share |
| Book Value | Total cost basis |
| Market Value | Current market value |
| Accrued Interest | Interest accrued |
| G/L | Gain/loss amount |
| G/L (%) | Gain/loss percentage |
| Percentage of Assets | Weight in portfolio |

## Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `AUTH_URL` (your production URL)
4. Deploy

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:generate  # Generate Drizzle migrations
npm run db:push      # Push schema to database
npm run db:studio    # Open Drizzle Studio
```

## Security

- All routes require authentication
- Passwords hashed with bcrypt (12 rounds)
- JWT session strategy with 24-hour expiry
- HTTPS enforced in production (Vercel)
- Row-level data isolation per user
