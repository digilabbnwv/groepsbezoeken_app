# Bibliotheek Speurtocht App (BiebBattle)

Een interactieve speurtocht voor groepsbezoeken (groep 6), bestaande uit een Speler-app (iPad) en Beheerder-app (Groot scherm).

## Features
- **Speler (Leerling):**
  - Team kiezen (Dier + Kleur + Naam)
  - 12 Vragen (Meerkeuze, Matchen, Volgorde)
  - Competitie-element (live voortgang andere teams)
  - "Kluis" code ontdekken
- **Beheerder (Bibliothecaris):**
  - Sessie aanmaken & beheren (Start/Pauze/Stop)
  - Live overzicht van teams
  - Competitie aan/uit zetten
  - Woorden voor kluis beheren
- **Technisch:**
  - Volledig statisch frontend (HTML/JS/CSS) via GitHub Pages
  - Cloudflare Workers + D1 backend voor snelle en betrouwbare API
  - Offline-capable (hervatten na refresh)
  - Dyslexie-modus switch

## Architectuur

```
┌─────────────────┐     ┌──────────────────────────┐     ┌─────────────────┐
│  GitHub Pages   │────▶│  Cloudflare Worker       │────▶│  Cloudflare D1  │
│  (Frontend)     │     │  (API + Rate Limiting)   │     │  (SQLite DB)    │
└─────────────────┘     └──────────────────────────┘     └─────────────────┘
```

## Quick Start

### 1. Frontend (GitHub Pages)
De frontend is al geconfigureerd voor GitHub Pages deployment.

**Gebruik de app met secrets in de URL:**
```
https://digilabbnwv.github.io/groepsbezoeken_app/?secret=BNWV-2026-speler

# Voor admin toegang:
https://digilabbnwv.github.io/groepsbezoeken_app/#admin?secret=BNWV-2026-speler&adminSecret=BNWV-2026-admin
```

### 2. Backend Setup (Cloudflare Workers + D1)

#### Vereisten
- [Node.js](https://nodejs.org/) 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

#### Installatie

```bash
# 1. Installeer dependencies
npm install

# 2. Login bij Cloudflare
npx wrangler login

# 3. Maak D1 database aan
npx wrangler d1 create groepsbezoeken-db

# 4. Update wrangler.toml met de database_id uit stap 3
# Vervang "TO_BE_REPLACED_AFTER_D1_CREATE" met je echte database_id

# 5. Voer database migrations uit
npx wrangler d1 execute groepsbezoeken-db --local --file=./migrations/0001_init.sql
npx wrangler d1 execute groepsbezoeken-db --remote --file=./migrations/0001_init.sql

# 6. Configureer secrets
npx wrangler secret put APP_SECRET
# Voer je app secret in wanneer gevraagd

npx wrangler secret put ADMIN_SECRET
# Voer je admin secret in wanneer gevraagd

# 7. Deploy de worker
npx wrangler deploy
```

### Lokale Ontwikkeling

```bash
# Start de worker lokaal (met D1 lokale database)
npx wrangler dev

# Start de frontend lokaal
npm run dev

# Open in browser:
# http://localhost:3000/?secret=DEV_SECRET
```

## Security Model

### API Authenticatie

De app gebruikt een **API key model** met twee niveaus:

| Niveau | Secret | Endpoints | Gebruik |
|--------|--------|-----------|---------|
| **App** | `APP_SECRET` | createSession, joinTeam, updateTeam, fetchSessionState | Normale app-functionaliteit |
| **Admin** | `ADMIN_SECRET` | adminUpdateWords, purgeSession | Administratieve acties |

**Secrets worden doorgegeven via:**
1. URL query parameter: `?secret=...` (primair)
2. Request body: `{ "secret": "..." }` (backup)

### Rate Limiting

- **60 requests/minuut** per IP per sessie code (standaard)
- Configureerbaar via `RATE_LIMIT_MAX_REQUESTS` en `RATE_LIMIT_WINDOW_SECONDS`
- In-memory per Cloudflare colo (edge location)
- Effectief tegen casual abuse, niet voor geavanceerde DDoS

### CORS

Alleen toegestaan voor geconfigureerde origins:
- `https://digilabbnwv.github.io` (productie)
- `http://localhost:3000` (lokale ontwikkeling)

## Automatische Purge (Cron)

Elke **zondag 22:00 UTC** (≈ 23:00 Nederlandse wintertijd, 00:00 zomertijd) worden oude sessies automatisch verwijderd.

**Purge criteria:**
- Sessies ouder dan 14 dagen (`AUTO_PURGE_DAYS`) worden verwijderd
- Dit is een veiligheidsnet naast de handmatige purge knop

**Timezone toelichting:**  
Cloudflare cron triggers gebruiken UTC. 22:00 UTC is:
- 23:00 CET (wintertijd Nederland)
- 00:00 CEST (zomertijd Nederland, volgende dag)

## API Endpoints

Zie [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) voor volledige API specificatie.

| Endpoint | Method | Auth | Beschrijving |
|----------|--------|------|--------------|
| `/api/createSession` | POST | APP_SECRET | Nieuwe sessie aanmaken |
| `/api/fetchSessionState` | GET | APP_SECRET | Sessie status ophalen |
| `/api/joinTeam` | POST | APP_SECRET | Team joinen (idempotent) |
| `/api/updateTeam` | POST | APP_SECRET | Team progress updaten |
| `/api/adminUpdateWords` | POST | ADMIN_SECRET | Woorden bijwerken |
| `/api/purgeSession` | POST | ADMIN_SECRET | Sessie verwijderen |

## Project Structuur

```
├── worker/                  # Cloudflare Worker code
│   └── src/
│       ├── index.js         # Main entry point + routing
│       ├── handlers.js      # API endpoint handlers
│       ├── auth.js          # Secret validation
│       ├── cors.js          # CORS handling
│       ├── rateLimit.js     # Rate limiting
│       └── utils.js         # ID generators, helpers
├── migrations/
│   └── 0001_init.sql        # D1 database schema
├── js/                      # Frontend JavaScript
│   ├── config.js            # Configuratie (URLs, secrets uit query params)
│   ├── api.js               # API communicatie
│   ├── app.js               # Hoofd applicatie logica
│   └── ...
├── tests/
│   ├── unit/                # Unit tests (Vitest)
│   ├── integration/         # Integration tests
│   └── e2e/                 # End-to-end tests (Playwright)
├── wrangler.toml            # Cloudflare Worker configuratie
└── ...
```

## Testing

```bash
# Unit tests
npm run test

# Unit tests met watch mode
npm run test:watch

# Unit tests met coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# Alle tests + lint
npm run validate
```

## Environment Variables

### Worker Secrets (via `wrangler secret put`)

| Secret | Beschrijving |
|--------|--------------|
| `APP_SECRET` | API key voor normale endpoints |
| `ADMIN_SECRET` | API key voor admin endpoints |

### Worker Vars (in `wrangler.toml`)

| Variable | Default | Beschrijving |
|----------|---------|--------------|
| `ALLOWED_ORIGINS` | GitHub Pages URL | Toegestane CORS origins |
| `RATE_LIMIT_MAX_REQUESTS` | 60 | Max requests per window |
| `RATE_LIMIT_WINDOW_SECONDS` | 60 | Rate limit window duur |
| `AUTO_PURGE_DAYS` | 14 | Verwijder sessies ouder dan X dagen |

## Migratiehistorie

### v1.1.0 - Cloudflare D1 Backend
- Power Automate + Microsoft Lists vervangen door Cloudflare Workers + D1
- Secrets verplaatst naar URL query parameters
- Rate limiting toegevoegd
- Wekelijkse auto-purge geïmplementeerd
- Verbeterde CORS ondersteuning

### v1.0.x - Power Automate Backend
- Originele implementatie met Microsoft Power Automate flows
- Microsoft Lists als database

## Development

### Lokale Ontwikkeling
```bash
npm run dev          # Start frontend server (port 3000)
npx wrangler dev     # Start worker lokaal (port 8787)
```

### Code Style
```bash
npm run lint         # Check code style
npm run lint:fix     # Fix code style automatisch
```

## Licentie

MIT © Bibliotheek Noordwest Veluwe
