# FilmMaatjes — codeconventies

## Styling: geen hardcoded kleuren

Alle kleuren staan als CSS custom properties in het `:root`-blok van `src/styles.scss`.
Gebruik in component-`styles`/`.scss`/inline-`style` altijd `var(--color-x)` — nooit een
hex-code of losse `rgb()`/`rgba()`-waarde hardcoden.

Beschikbare variabelen:

| Categorie | Variabelen |
|---|---|
| Surfaces | `--color-surface` (+ `-rgb`), `--color-surface-50` (+ `-rgb`), `--color-surface-100` (+ `-rgb`), `--color-surface-200`, `--color-surface-400`, `--color-poster-placeholder` |
| Accent (paars) | `--color-accent` (+ `-rgb`), `--color-accent-light` (+ `-rgb`), `--color-accent-lighter`, `--color-accent-pale`, `--color-accent-dark`, `--color-violet-deep`, `--color-indigo-rgb` |
| Status | `--color-gold` (+ `-rgb`), `--color-silver` (+ `-rgb`), `--color-bronze` (+ `-rgb`), `--color-success` (+ `-rgb`), `--color-danger`, `--color-danger-strong` (+ `-rgb`), `--color-info` (+ `-rgb`), `--color-pink` (+ `-rgb`), `--color-cyan`, `--color-orange` (+ `-rgb`), `--color-amber` |
| Tekst | `--color-text-primary`, `--color-text-secondary`, `--color-text-soft`, `--color-text-meta`, `--color-text-muted`, `--color-text-body` |
| Overig | `--color-border`, `--color-white-rgb`, `--color-black-rgb`, `--color-scrollbar-thumb` |

Waar `(+ -rgb)` staat, bestaat er ook een `--color-x-rgb: r, g, b;`-variant zonder `#`,
specifiek om in `rgba(var(--color-x-rgb), 0.2)` te gebruiken.

Voor een transparante variant: gebruik de bijbehorende `-rgb`-variabele met een eigen
alpha-waarde, bv. `rgba(var(--color-accent-rgb), 0.15)`. Maak geen nieuwe losse variabele
per opacity-niveau aan.

Nieuwe kleur nodig? Voeg 'm toe aan `:root` in `styles.scss`, verwijs er dan naar — hardcode
'm niet in het component.

`tailwind.config.js` blijft los daarvan de bron voor Tailwind-utility-classes (`bg-accent`,
`text-text-secondary`, etc.). Beide systemen gebruiken dezelfde kleurwaarden maar zijn niet
technisch aan elkaar gekoppeld.

## SOLID / componentverantwoordelijkheid

Watchlist-toggle, "gezien"-toggle en het matcher-scoringsalgoritme zijn al uit de
components getrokken (`MovieActionsService`, `MovieMatchingService`,
`UserLibraryService.getTopGenres()`) — nieuwe features op die vlakken horen daar ook in
thuis, niet opnieuw in een component.

Bewust nog niet aangepakt (grensgeval, lage prioriteit — alleen de moeite waard als het
toch een keer wijzigt):
- `WatchlistService` en `UserLibraryService` mixen query- en mutatiemethodes in één klasse.
- `window.prompt`/`confirm` worden rechtstreeks aangeroepen in
  `watchlist-overview.component.ts` en `movie-detail.component.ts` i.p.v. via een
  dialog-service.

## Overig

- Mobiel breakpoint: `@media (max-width: 767px)` in component-scoped SCSS. Deze codebase
  gebruikt geen Tailwind `md:`-prefixes voor responsiveness.
- Zoeken zit ingebouwd bovenaan de Films-pagina (`/movies`) — geen aparte `/movies/search`
  route meer.
