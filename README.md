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
Gewoon `index.html` openen in een browser werkt meestal, maar voor modules is een server beter:
```bash
npx --yes serve
```
Of gebruik de Live Server extensie in VS Code.
