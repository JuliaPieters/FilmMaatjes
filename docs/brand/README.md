# FilmMaatjes – merkpakket v2

## Mascotte: Klappie
Een filmklapper op pootjes. De klep staat open alsof hij net "Action!" roept.
Drie poses: `zwaai` (standaard), `knipoog` en `action` (beide armen omhoog, klep wijd open).
Elke pose bestaat in twee versies: voor lichte achtergrond, en `-op-donker` met lila armen en benen en violet lijnwerk.

Handig voor lege staten (geen films in je watchlist), 404, onboarding of de Roulette/Matcher.

## Kleuren (uit de site gehaald)
| Naam      | Hex       |
|-----------|-----------|
| Violet    | `#833EEF` |
| Violet donker | `#6526D6` |
| Lila      | `#D5BAFF` |
| Inkt      | `#2A1650` |
| Blos      | `#FF8FC4` |
| Achtergrond | `#0f0f13` |

Badge-gradient: `#9D5CF7` naar `#6526D6`, diagonaal.

## Lettertype
Wordmark in Inter Display ExtraBold, als paden in de SVG (geen font nodig).

## Mappen
- `public`: direct in je Angular `public/`. Het manifest verwijst naar `/icons/...`.
- `logo`: horizontaal en gestapeld (donker/licht), losse wordmark, app-icon 1024.
- `mascotte`: Klappie in alle poses, SVG + PNG (800px).
- `head-snippet.html`: tags voor `index.html`.
