# Bibliotheek Speurtocht App

Een interactieve speurtocht voor groepsbezoeken (groep 6), bestaande uit een Speler-app (iPad) en Beheerder-app (Groot scherm).

## Features
- **Speler (Leerling):**
  - Team kiezen (Dier + Kleur + Naam)
  - 12 Vragen (Meerkeuze, Matchen, Volgorde)
  - Hints & Straftijd
  - Competitie-element (live voortgang andere teams)
  - "Kluis" code ontdekken
- **Beheerder (Bibliothecaris):**
  - Sessie aanmaken & beheren (Start/Pauze/Stop)
  - Live overzicht van teams
  - Competitie aan/uit zetten
  - Woorden voor kluis beheren
- **Technisch:**
  - Volledig statisch (HTML/JS/CSS) - Geen backend server nodig (behalve Power Automate endpoints)
  - Offline-capable (hervatten na refresh)
  - Dyslexie-modus switch

## Installatie (GitHub Pages)
1. Upload de inhoud van deze map naar een GitHub repository.
2. Ga naar **Settings > Pages**.
3. Kies `main` branch en `/` root folder.
4. De app is nu live!

## Configuratie (Power Automate)
Open `js/config.js` en vul de `SECRET` en `ENDPOINTS` in.
De app werkt standaard in **MOCK MODUS** als er geen endpoints zijn ingevuld. Dit is perfect om te testen.

### Endpoints Specificatie
Zie de code in `js/api.js` of de originele aanvraag voor de payload structuren.

## Gebruik
1. Open de URL.
2. **Beheerder**: Klik op "Beheerder Login" (onderaan) of ga naar `/#admin`. Maak een sessie.
3. **Speler**: Voer de code in op het startscherm.

## Lokale Ontwikkeling

### Prerequisites
- Node.js 18+
- npm

### Setup
```bash
# Installeer dependencies
npm install

# Installeer Playwright browsers (voor E2E tests)
npx playwright install chromium
```

### Development Server
```bash
npm run dev
```
Dit start een lokale server op `http://localhost:3000`.

### Testing

```bash
# Unit tests
npm run test

# Unit tests met watch mode
npm run test:watch

# Unit tests met coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# E2E tests met UI
npm run test:e2e:ui

# Alle tests + lint
npm run validate
```

### Linting
```bash
npm run lint
npm run lint:fix
```

### CI/CD
De repository bevat een GitHub Actions workflow (`.github/workflows/ci.yml`) die automatisch draait bij push/PR:
- Linting
- Unit tests
- E2E tests
- Build validatie

## Project Structuur

```
├── js/
│   ├── app.js           # Hoofd applicatie logica
│   ├── api.js           # API communicatie
│   ├── config.js        # Configuratie (endpoints, secrets)
│   ├── constants.js     # Constanten (dieren, game config)
│   ├── payloadBuilder.js # Pure functies voor API payloads
│   ├── validators.js    # Validatie functies
│   ├── views.js         # UI componenten
│   └── utils.js         # Hulpfuncties
├── contracts/
│   ├── api.schema.json  # JSON Schema voor API
│   ├── api.examples.json # Voorbeeld payloads
│   └── CHANGELOG.md     # Contract versioning
├── tests/
│   ├── unit/            # Unit tests (Vitest)
│   ├── integration/     # Contract validatie tests
│   └── e2e/             # End-to-end tests (Playwright)
└── ...
```


## Database (Microsoft Lists)
De applicatie is ontworpen om te werken met Microsoft Lists als backend (via Power Automate).

In de map `database/` vind je twee CSV-bestanden die als template dienen voor het aanmaken van de benodigde lijsten:

1. **Sessions.csv** -> Maak een lijst genaamd `Sessions`
2. **Teams.csv** -> Maak een lijst genaamd `Teams`

### Instructies voor aanmaken:
1. Open de CSV bestanden in Excel en sla ze op als Excel Werkmap (.xlsx). Zorg dat de data in een Tabel staat (Insert > Table).
2. Ga naar Microsoft Lists.
3. Kies **"Nieuwe lijst"** > **"Vanuit Excel"**.
4. Upload het zojuist opgeslagen Excel bestand.
5. Controleer de kolomtypes (zorg dat datums als *Datum en tijd*, nummers als *Getal*, en ja/nee als *Boolean* of *Tekst* worden herkend).
6. Geef de lijst de naam **Sessions** of **Teams** (overeenkomstig het bestand).

De kolommen in deze lijsten corresponderen met de data die de app verstuurt en ophaalt. Zie `API_DOCUMENTATION.md` voor meer technische details.
