# Agriksense

Agriksense is a farm operations dashboard for precision agriculture in Nigeria. It supports farmer onboarding, plot mapping, drone and IoT sensor monitoring, AI-driven advisories, credit scoring, and yield analytics.

The repo contains a Fastify API with EJS views, plus a static build of the dashboard that can be deployed anywhere static files are served.

## Pages

| Page | Route | What it covers |
| --- | --- | --- |
| Landing | `/` | Public product page |
| Login / Signup | `/login`, `/signup` | Auth forms backed by the API |
| Dashboard | `/dashboard` | KPIs, IoT activity, drone / NDVI progress, farm network |
| Farmers | `/farmers` | Farmer registry, onboarding funnel |
| Farms & Plots | `/farms` | Farm clusters, plot network, GPS mapping |
| Drone Monitoring | `/drone` | Flight schedule, NDVI coverage |
| IoT Sensors | `/iot` | Soil moisture, live alerts, sensor fleet |
| AI Advisory | `/advisory` | Advisory queue, delivery channels |
| AgriScore | `/agriscore` | Score bands, credit readiness |
| Analytics | `/analytics` | Yield confidence, field health, top fields |

## Tech stack

- Node.js with Fastify
- EJS server-side templates
- MySQL via Prisma ORM
- bcryptjs for password hashing
- Zod for request validation
- JWT based auth (Fastify JWT)
- Plain CSS and vanilla JS (no frontend framework)

## Project structure

```
css/                Stylesheets (landing, auth, dashboard)
images/             Logo and landing assets
js/                 Browser scripts (main, auth)
scripts/
  build-static.mjs  Pre-renders all EJS pages into dist/
server/
  prisma/           Schema and migrations config
  src/
    index.js        App entry, routes, static file serving
    routes/auth.js  Signup, login, me
    lib/prisma.js   Prisma client
  views/            EJS templates and partials
  .env.example      Environment template
dist/               Static build output (generated)
```

## Getting started

### Prerequisites

- Node.js 18 or later
- MySQL 8 running locally

### Setup

```bash
# install dependencies
npm install
npm install --prefix server

# configure environment
cp server/.env.example server/.env
# edit server/.env with your DATABASE_URL, JWT_SECRET, and CLIENT_ORIGIN

# create the database
npx prisma db push --schema server/prisma/schema.prisma
```

### Run locally

```bash
npm run dev
```

The app listens on `http://localhost:5000`. The server reads `PORT`, `HOST`, `DATABASE_URL`, `JWT_SECRET`, and `CLIENT_ORIGIN` from `server/.env` via dotenv.

## API

Base path: `/api/auth`

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/signup` | Create an account, returns JWT |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Current user (Bearer token required) |
| GET | `/health` | Health check |

The dashboard routes (`/dashboard`, `/farmers`, `/farms`, `/drone`, `/iot`, `/advisory`, `/agriscore`, `/analytics`) render EJS views and do not touch the database, so they can run without a live DB.

## Static deploy

For hosts that only serve static files, pre-render the pages:

```bash
npm run build:static
```

This renders every page from `server/views/` into `dist/` and copies `css/`, `js/`, and `images/`. The generated `dist/_redirects` maps clean URLs like `/farmers` to `farmers.html`.

Netlify settings:

- Build command: `node scripts/build-static.mjs`
- Publish directory: `dist`

## Notes

- `dist/` is generated output. Rebuild it whenever the EJS views or styles change.
- Passwords are hashed with bcrypt at cost 12.
- CORS allows the origins listed in `CLIENT_ORIGIN`. A wildcard `*` is accepted when the variable is empty or unset.