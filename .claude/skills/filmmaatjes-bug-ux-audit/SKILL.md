---
name: filmmaatjes-bug-ux-audit
description: Test de FilmMaatjes-website grondig als een echte gebruiker, vind bugs en los ze op, en kom met concrete ideeën om de app leuker/beter te maken. Gebruik deze skill altijd wanneer Julia vraagt om FilmMaatjes te testen, te checken op bugs, door te lopen als gebruiker, of te verbeteren — ook als ze het losjes formuleert zoals "kan je even checken of alles nog werkt" of "wat kan er beter aan de app".
---

# FilmMaatjes bug & UX audit

Een herhaalbare workflow om FilmMaatjes te testen als gebruiker, bugs te vinden en op te lossen, en verbeterideeën aan te dragen. Bedoeld om na elke nieuwe feature of periodiek te draaien.

## Werkwijze

### 1. Verkennen
- Loop door de codebase om te begrijpen wat er is veranderd sinds de vorige audit (of, bij de eerste keer, wat de app doet): welke features, structuur (frontend/backend), belangrijke user flows (account aanmaken, films zoeken, matchen met filmmaatjes, etc.)
- Als er een vorig auditverslag bestaat in de repo, lees dat eerst zodat je weet wat al opgelost is.

### 2. Testen als gebruiker
- Loop de belangrijkste user flows door alsof je een nieuwe gebruiker bent die de app voor het eerst gebruikt.
- Let specifiek op:
  - kapotte links/knoppen
  - foutmeldingen die niet kloppen of ontbreken
  - edge cases (lege states, extreem lange input, speciale tekens)
  - inconsistente styling/gedrag tussen pagina's
  - dingen die traag of onhandig aanvoelen
- Test zowel het happy path als verkeerd gebruik (leeg formulier versturen, ongeldige invoer).
- Als er browser-toegang beschikbaar is, gebruik die om de site echt te doorlopen in plaats van alleen de code te lezen.

### 3. Bugs rapporteren en oplossen
- Maak een lijst van alle gevonden bugs met per bug:
  - wat er misgaat
  - waar in de code de oorzaak zit
  - ernst: blokkerend / vervelend / cosmetisch
- Los op, beginnend bij de meest ernstige. Leg per fix kort uit wat je hebt veranderd en waarom.

### 4. Verbeterideeën
- Kom naast bugfixes met 3-5 concrete ideeën om de app leuker/prettiger te maken, passend bij het concept "filmmaatjes vinden" (kleine UX-verbeteringen, microinteracties, of features).
- Geef per idee aan hoeveel werk het is: klein / middel / groot.

### 5. Afsluiten
Geef aan het eind altijd een kort overzicht:
- wat is er gefixt
- wat staat er nog open
- top-aanbevelingen

Schrijf dit overzicht in gewoon, informeel Nederlands — geen bullet-overkill, geen markdown-bold in lopende tekst, zoals Julia dat zelf zou schrijven.
