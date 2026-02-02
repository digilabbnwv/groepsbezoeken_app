# API Contract Changelog

Alle wijzigingen aan de API contract worden hier gedocumenteerd.
Dit bestand volgt [Keep a Changelog](https://keepachangelog.com/nl/) principes.

## [1.1.0] - 2026-02-02

### Changed
- **Backend**: Power Automate + Microsoft Lists vervangen door Cloudflare Workers + D1
- **Authentication**: Twee-niveau secret model (APP_SECRET + ADMIN_SECRET)
- **Session Code**: Nu consistent 7 karakters (ABC1234 formaat)

### Added
- Rate limiting (60 req/min per IP per sessie)
- Auto-purge cron (zondag 22:00 UTC, sessies ouder dan 14 dagen)
- CORS ondersteuning voor meerdere origins
- Team token validatie voor updateTeam
- Finished veld voor teams

### Security
- Secrets niet langer hardcoded, maar via URL query params
- Admin endpoints vereisen apart ADMIN_SECRET

### Performance
- Directe D1 database calls (geen Power Automate orkestratie)
- Edge-based rate limiting per Cloudflare colo

---

## [1.0.0] - 2026-02-02

### Added
- Initiële contract-definite voor alle API endpoints
- JSON Schema validatie (`api.schema.json`)
- Voorbeelden voor alle endpoints (`api.examples.json`)

### Endpoints
- `createSession` - Maak nieuwe game sessie
- `fetchSessionState` - Haal huidige sessie status op
- `joinTeam` - Registreer team bij sessie
- `updateTeam` - Update team voortgang
- `adminUpdateWords` - Admin update oplossingswoorden
- `purgeSession` - Wis sessie data

### Schema Details
- `sessionCode`: 3-7 tekens, uppercase alfanumeriek
- `animalId`: integer 1-10
- `progress`: integer 0-12
- `words`: array van exact 20 strings
- `teamToken`: verplicht voor alle team operaties

---

## Compatibility Guidelines

### Breaking Changes
Wijzigingen die als "breaking" worden beschouwd:
- Verwijderen van verplichte velden
- Wijzigen van veldtypes
- Aanpassen van array lengtes (`words` moet 20 items blijven)
- Wijzigen van validatie constraints (bijv. `animalId` range)

### Non-Breaking Changes
Wijzigingen die veilig zijn:
- Toevoegen van optionele velden
- Toevoegen van nieuwe endpoints
- Uitbreiden van enum values (mits backwards compatible)

### Versioning Strategy
Bij breaking changes:
1. Verhoog major versie in dit bestand
2. Voeg `schema_version` veld toe aan payloads
3. Documenteer migratiepad
4. Ondersteun oude versie minimaal 30 dagen
