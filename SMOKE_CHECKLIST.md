# Handmatige Smoke Checklist

Gebruik deze checklist na elke wijziging om de kernfunctionaliteit te valideren.
**Duur**: ~10 minuten

## Prerequisites
- [ ] Frontend draait lokaal (`npm run dev`) op http://localhost:3000
- [ ] Worker draait lokaal (`npm run dev:worker`) op http://localhost:8787
- [ ] Browser dev tools open (voor fouten monitoring)
- [ ] URL bevat secrets: `?secret=YOUR_SECRET&adminSecret=YOUR_ADMIN_SECRET`

## Backend (Worker) Health
- [ ] `http://localhost:8787/health` retourneert `{"status":"ok"}`
- [ ] Geen errors in wrangler console

## Landing Page
- [ ] Logo zichtbaar
- [ ] "Start als speler" knop werkt → navigeert naar #player
- [ ] "Start als beheerder" link werkt → navigeert naar #admin
- [ ] Versienummer (1.1.0+) zichtbaar in footer
- [ ] Dyslexie toggle (Aa knop) werkt - font verandert

## Admin Flow (D1 Backend)
- [ ] Sessienaam kan ingevuld worden
- [ ] PIN veld accepteert alleen cijfers
- [ ] Valid PIN (7300, 6801, 6800, 4500, 3800) gaat door
- [ ] **createSession**: Sessie wordt aangemaakt (check Network tab)
- [ ] **adminUpdateWords**: Woorden kunnen worden opgeslagen (20 woorden)
- [ ] SessionCode wordt getoond

## Player Flow (D1 Backend)
- [ ] Sessiecode invoer accepteert tekst
- [ ] Code wordt uppercase weergegeven
- [ ] **fetchSessionState**: Bij geldige code → teams worden opgehaald
- [ ] **joinTeam**: Dier selecteren → team wordt aangemaakt
- [ ] `teamToken` wordt opgeslagen (check localStorage)
- [ ] **updateTeam**: Progress updates worden verstuurd
- [ ] word1/word2 worden correct toegewezen per animalId

## Security Tests
- [ ] Request zonder `?secret=...` faalt met 401
- [ ] Admin endpoints zonder admin secret falen met 401
- [ ] Na 60+ requests binnen 1 minuut: rate limit (429)

## Responsive
- [ ] App werkt op smalle viewport (375px breed)
- [ ] Geen horizontale scroll op mobiel

## Console Errors
- [ ] Geen JavaScript errors in console
- [ ] Geen 404's voor resources
- [ ] Geen CORS errors

---

## API Quick Tests (cURL)

```bash
# Health check
curl http://localhost:8787/health

# Create session (replace YOUR_SECRET)
curl -X POST "http://localhost:8787/api/createSession?secret=YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"secret":"YOUR_SECRET","sessionName":"Test"}'

# Fetch session (replace CODE)
curl "http://localhost:8787/api/fetchSessionState?secret=YOUR_SECRET&code=ABC1234"

# Join team
curl -X POST "http://localhost:8787/api/joinTeam?secret=YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"secret":"YOUR_SECRET","sessionCode":"ABC1234","animalId":1}'
```

---
**Laatste check**: _datum invullen_
**Door**: _naam_
**Resultaat**: ⬜ PASS / ⬜ FAIL
