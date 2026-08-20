---
name: filmmaatjes-styling-check
description: Audit visuele consistentie en styling van de FilmMaatjes-website: uitlijning, spacing, icon-scaling, component-consistentie en responsive gedrag. Gebruik deze skill wanneer Julia vraagt om styling te checken, uitlijning te fixen, de UI netter te maken, of als ze twijfelt of dingen er "scheef" of "niet netjes" uitzien.
---

# FilmMaatjes styling & consistency check

Herhaalbare audit voor kleine visuele inconsistenties: iconen, elementen of componenten die net niet lekker uitgelijnd of netjes gepositioneerd staan.

## Focus areas

### 1. Uitlijning van iconen en tekst
- Verticale centrering van iconen t.o.v. tekst
- Consistente baseline tussen icon en label

### 2. Spacing en padding
- Consistente marges/padding tussen vergelijkbare elementen op verschillende pagina's
- Geen losse pixel-afwijkingen tussen componenten die hetzelfde horen te zijn

### 3. Icon-scaling en baseline
- Iconen overal dezelfde grootte binnen dezelfde context
- Correcte optische uitlijning (niet alleen bounding-box-uitlijning)

### 4. Component-consistentie
- Vergelijkbare UI-elementen (bijv. film cards, buttons) moeten overal dezelfde styling-regels volgen
- Check hover/focus/active states op consistentie

### 5. Responsive gedrag
- Test op kleinere schermen (mobile/tablet breakpoints)
- Let op overflow, tekst die afkapt, elementen die overlappen

## Werkwijze

1. Loop door de belangrijkste pagina's/componenten en noteer per gevonden issue: waar, wat er precies mis is, en hoe ernstig (cosmetisch/vervelend/blokkerend).
2. Rapporteer eerst alle gevonden issues voordat je iets fixt, zodat Julia kan kiezen: alles in één keer of stap voor stap.
3. Fix pas na akkoord, en leg per fix kort uit wat er is aangepast.
4. Sluit af met een korte samenvatting: wat is gefixt, wat staat nog open.

Schrijf rapportages in informeel Nederlands, geen overdreven markdown-opmaak.
