# PropScore — Property Investment Analysis Platform

A full-stack property investment analysis tool built with Netlify + Netlify DB (PostgreSQL).

## Features

- **Full analysis form** — all metrics from the DSR suburb analysis spreadsheet
- **Auto-scoring engine** — 5-category scoring across Demand, Returns, Growth, Risk, and Affordability
- **Property dashboard** — portfolio overview with averages and top opportunities
- **Compare tool** — side-by-side comparison of up to 4 properties
- **PostgreSQL database** — powered by Netlify DB (Neon)
- **Live preview** — radar chart updates as you type

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS (zero build step)
- **Backend**: Netlify Serverless Functions (TypeScript)
- **Database**: Netlify DB (PostgreSQL via Neon)

## Local Development

```bash
npm install
netlify dev
```

## Deployment

Deployed automatically via Netlify. The database is provisioned automatically on first deploy.

## Scoring Categories

| Category | Key Metrics |
|----------|-------------|
| Demand & Supply | Vacancy rate, DSR, Days on market, Stock on market, Search interest |
| Investment Returns | Gross yield, 36M capital growth, 36M rental growth |
| Growth Outlook | 10yr growth, Household income vs state, Professional occupation trend |
| Risk Profile | Vendor discounting, Building approvals ratio, Statistical reliability, Land supply |
| Affordability | Rent <30% of income, Mortgage <30% of income |

Scores range from 0–10. Overall score is the average of all categories with available data.

| Score | Rating |
|-------|--------|
| 8–10 | Excellent opportunity |
| 7–8 | Strong opportunity |
| 6–7 | Good opportunity |
| 5–6 | Moderate — review carefully |
| 4–5 | Weak — significant risks |
| <4 | Poor — not recommended |
