# FilmMaatjes

Sociaal filmplatform: films ontdekken, beoordelen, watchlists delen met vrienden,
en samen kijken via Film Roulette en Film Matcher. Gebouwd met Angular 21
(standalone components, signals), Angular Material, Tailwind, Firebase
(Auth + Firestore) en de TMDB API voor filmdata.

Codeconventies (kleuren als CSS-variabelen, e.d.) staan in [CLAUDE.md](./CLAUDE.md).

## Architectuur

```
app.routes.ts
  ├─ layout/                     MainLayout, Navbar, BottomTabBar (mobiel)
  ├─ pages/                      Landing, Dashboard, NotFound
  └─ features/*/pages/           Movies, Watchlists, Friends, Profile,
                                  Roulette, Matcher, Recommendations, Auth
                                       │
                                       ▼
                          shared/components/
                 MovieCard · StarRating · WatchlistPickerSheet · EmptyState
                                       │
                                       ▼
        ┌──────────────────────┐            ┌────────────────────────────┐
        │   core/services/     │  delegeert  │   features/*/services/     │
        │ NotificationService  │ ─────────▶  │ AuthService                │
        │ UserLibraryService   │             │ WatchlistService           │
        │ MovieActionsService  │             │ FriendsService             │
        │ ReviewService        │             │ MovieService                │
        │ FriendActivityService│             │ MovieMatchingService (matcher)│
        └──────────────────────┘             └────────────────────────────┘
                                       │
                                       ▼
                         Firebase (Firestore, Auth) · TMDB API
```

Pagina's en gedeelde componenten praten nooit rechtstreeks met Firebase of TMDB
— dat loopt altijd via een service in `core/services/` of `features/*/services/`.

### Kernservices

- **`MovieActionsService`** (`core/services/`) — enige plek die "voeg toe aan
  watchlist" en "markeer gezien" afhandelt: auth-check, de "1 lijst → direct
  togglen, meerdere → kiezer tonen"-beslissing, en de meldingstekst. Wordt
  aangeroepen door `MovieCardComponent` en `MovieDetailComponent`; opent zelf
  `WatchlistPickerSheetComponent` (een `MatBottomSheet`) wanneer er een keuze
  gemaakt moet worden.
- **`MovieMatchingService`** (`features/matcher/services/`) — het scoring-
  algoritme achter Film Matcher (genre-profiel per gebruiker, gedeelde
  smaak, filmscore). Puur rekenwerk, geen Firestore/HTTP-calls van zichzelf —
  `MatcherComponent` verzamelt de data, deze service scoort 'm.
- **`UserLibraryService.getTopGenres()`** — de "favoriete genres van deze
  gebruiker"-berekening, gedeeld door dashboard, aanbevolen en roulette (elk
  met hun eigen `minRating`/`weighted`/`limit`-parameters in plaats van een
  eigen kopie van de telling).
- **`WatchlistService`, `AuthService`, `FriendsService`, `ReviewService`,
  `MovieService`** — eigenaar van resp. watchlists, accounts/gebruikers,
  vriendschappen, reviews en TMDB-filmdata. Elke Firestore-toegang voor hun
  domein loopt via hen, nergens anders.

### Mobiel

Onder de 768px-breakpoint vervangt een `BottomTabBarComponent` (5 tabs) het
hamburgermenu; zoeken zit ingebouwd bovenaan de Films-pagina (`/movies`) in
plaats van een aparte route.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
