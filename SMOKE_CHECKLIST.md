# Handmatige Smoke Checklist

Gebruik deze checklist na elke wijziging om de kernfunctionaliteit te valideren.
**Duur**: ~5 minuten

## Prerequisites
- [ ] App draait lokaal (`npm run dev`)
- [ ] Browser dev tools open (voor fouten monitoring)

## Landing Page
- [ ] Logo zichtbaar
- [ ] "Start als speler" knop werkt → navigeert naar #player
- [ ] "Start als beheerder" link werkt → navigeert naar #admin
- [ ] Versienummer zichtbaar in footer
- [ ] Dyslexie toggle (Aa knop) werkt - font verandert

## Player Flow (Mock Mode)
- [ ] Sessiecode invoer accepteert tekst
- [ ] Code wordt uppercase weergegeven
- [ ] Bij invalid/lege code: geen crash, blijft op pagina

## Admin Flow
- [ ] Sessienaam kan ingevuld worden
- [ ] PIN veld accepteert alleen cijfers
- [ ] Invalid PIN toont foutmelding
- [ ] Valid PIN (7300, 6801, 6800, 4500, 3800) gaat door

## Responsive
- [ ] App werkt op smalle viewport (375px breed)
- [ ] Geen horizontale scroll op mobiel

## Console Errors
- [ ] Geen JavaScript errors in console
- [ ] Geen 404's voor resources

---
**Laatste check**: _datum invullen_
**Door**: _naam_
**Resultaat**: ⬜ PASS / ⬜ FAIL
