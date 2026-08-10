# Handoff: FilmMaatjes — mobiel ontwerp (402 × 874)

> Doel: Claude Code (of een andere developer) kan met dit document alleen het mobiele
> ontwerp van FilmMaatjes bouwen in de bestaande Angular-app, zonder de designbestanden
> te hoeven openen.

## Overzicht

FilmMaatjes is een sociaal filmplatform (Angular 18 standalone + Material + Tailwind +
Firebase + TMDB). De web-app is nu desktop-first: een navbar van 90px met een logo van
150–200px hoog, een hamburgermenu voor alles op mobiel, en hover-only acties op de
filmkaarten. Dit ontwerp maakt de app mobiel bruikbaar zonder de visuele taal te wijzigen.

De drie kern-ingrepen:

1. **Onderbalk (bottom tab bar) vervangt het hamburgermenu** op < 768px.
2. **Hover-acties worden permanent zichtbaar** — touch kent geen hover.
3. **Alle raakvlakken minimaal 44 × 44 px** (sterren, iconknoppen, tabs).

## Over de designbestanden

De bestanden in deze map zijn **designreferenties, gemaakt in HTML** — prototypes die de
bedoelde vormgeving en het gedrag tonen. Het is **geen productiecode om over te nemen**.
De opdracht is om deze ontwerpen na te bouwen in de bestaande Angular-codebase
(`JuliaPieters/FilmMaatjes`, branch `main`), met de bestaande patronen: standalone
components, signals, Angular Material, Tailwind-tokens uit `tailwind.config.js` en de
globale klassen uit `src/styles.scss` (`.page-container`, `.card-grid`,
`.horizontal-scroll`, `.glass-card`, `.section-title`).

## Fidelity

**High-fidelity.** Kleuren, typografie, spacing en radii zijn exact en komen uit de
bestaande codebase. Bouw pixelnauwkeurig na met de bestaande Material-componenten en
Tailwind-tokens — introduceer geen nieuwe kleuren of fonts.

---

## Designtokens (bestaand — niet wijzigen)

Alle waarden komen uit `tailwind.config.js` en `src/styles.scss`.

### Kleuren

| Token | Hex | Gebruik |
|---|---|---|
| `surface.DEFAULT` / `surface.300` | `#0f0f13` | Paginacanvas |
| `surface.50` | `#1a1a24` | Kaarten, menu's, sheets |
| `surface.100` | `#16161f` | Invoervelden (mat-form-field filled) |
| `surface.400` | `#0a0a0e` | Achtergrond buiten het toestel (alleen in het design) |
| `accent.DEFAULT` | `#7c3aed` | Primaire knoppen, actieve staat |
| `accent.light` | `#a78bfa` | Actieve tekst/iconen, links |
| `accent.dark` | `#5b21b6` | Einde van gradient |
| `gold` | `#f59e0b` | Sterren, badges |
| `text-primary` | `#f1f5f9` | Koppen en primaire tekst |
| `text-secondary` | `#94a3b8` | Secundaire tekst |
| `text-muted` | `#475569` | Meta, jaartallen, placeholders |
| `border` | `#1e1e2e` | Scheidingslijnen (footer) |
| — | `#64748b` | Labels onder statistieken, datums |
| — | `#16162a` | Posterplaceholder-achtergrond |
| — | `#4ade80` | "Gezien"-status |
| — | `#fca5a5` | Uitloggen (destructief) |

Randen en overlays: `rgba(255,255,255,0.06)` (kaartrand), `rgba(255,255,255,0.1)`
(inputrand), `rgba(124,58,237,0.15)` + `1px solid #7c3aed` (actieve pill),
`rgba(0,0,0,0.7)` + `backdrop-filter: blur(4px)` (badge op poster).

Avatar-gradient: `linear-gradient(135deg, #7c3aed, #a78bfa)`.
Gradient-tekst (`.gradient-text`): `linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #5b21b6 100%)` met `background-clip: text`.
Profielbanner: `linear-gradient(135deg, #1a0533 0%, #12121a 40%, #0f0f13 100%)`.

### Typografie

Inter (`@fontsource/inter`, 400/500/600/700). Op mobiel:

| Rol | Grootte | Gewicht | Letterspacing |
|---|---|---|---|
| Pagina-H1 (Films, Vrienden) | 28px | 700 | -0.025em |
| Hero-H1 (landing) | 38px | 900 | -0.035em, line-height 1.08 |
| Filmtitel op detail | 28px | 800 | -0.03em, line-height 1.1 |
| Sectiekop (H2) | 19–20px | 700 | -0.025em |
| Kaarttitel | 14–15px | 500–600 | — |
| Body | 14–15px | 400 | line-height 1.6–1.7 |
| Meta / jaartal | 12–13px | 400 | kleur `#475569` |
| Tablabel onderbalk | 10px | 500 | — |

### Spacing, radii, schaduw

- Horizontale paginamarge mobiel: **20px** (desktop 32px).
- Verticale ritme: 20–28px tussen blokken, 14–16px binnen een blok.
- Radii: kaarten en posters **12px** (`rounded-card`), knoppen **999px** (pill),
  invoervelden **8px 8px 0 0** (Material filled), sheets **16px** boven.
- Schaduw poster op detail: `0 20px 60px rgba(0,0,0,0.6)`.
- Schaduw primaire CTA: `0 0 40px rgba(124,58,237,0.3)`.

### Iconen

Material Symbols / `mat-icon`, dezelfde namen als in de code: `movie`, `search`,
`bookmark`, `people`, `person`, `casino`, `star`, `star_border`, `bookmark_add`,
`check_circle`, `rate_review`, `arrow_back`, `notifications`, `trending_up`, `whatshot`,
`schedule`, `play_circle`, `expand_more`, `chevron_right`, `auto_awesome`, `shuffle`,
`recommend`, `person_add`, `hourglass_empty`, `refresh`, `close`, `delete_outline`,
`public`, `visibility`, `edit`, `home`, `movie_off`, `local_movies`, `tune`.

Gevulde sterren gebruiken `star` (FILL 1), lege `star_border`.

---

## Globale structuur op mobiel

### Onderbalk — nieuw component

Vervangt op `< 768px` het mobiele menu in `navbar.component.html`.

- `position: fixed; bottom: 0; left: 0; right: 0; z-index: 100`
- `background: rgba(15,15,19,0.94)`, `backdrop-filter: blur(12px)`,
  `border-top: 1px solid rgba(255,255,255,0.06)`
- Padding: `8px 8px 28px` (die 28px is de safe-area; gebruik
  `padding-bottom: calc(8px + env(safe-area-inset-bottom))`)
- `display: grid; grid-template-columns: repeat(5, 1fr)`
- Per item: kolom, `min-height: 48px`, icoon 22px, label 10px/500, gap 3px,
  `border-radius: 10px`
- Actief: kleur `#a78bfa`, achtergrond `rgba(124,58,237,0.12)`, icoon gevuld (FILL 1)
- Inactief: kleur `#64748b`, icoon niet gevuld

Vijf tabs met hun routes:

| Label | Icoon | Route | Ook actief bij |
|---|---|---|---|
| Films | `movie` | `/movies` | `/`, `/movies/:id` |
| Zoeken | `search` | `/movies/search` | — |
| Lijsten | `bookmark` | `/watchlists` | `/watchlists/:id` |
| Vrienden | `people` | `/friends` | — |
| Profiel | `person` | `/profile` | — |

Roulette, Matcher en Aanbevolen zijn geen tab; die bereik je via het dashboard
(snelacties) en het profiel. De onderbalk is verborgen op `/auth/login` en
`/auth/register`.

Alle scrollbare pagina's krijgen `padding-bottom: 96px` zodat de laatste rij niet onder de
balk valt.

### Bovenbalk (mobiel)

Hoogte 58px content + safe-area top; `position: sticky; top: 0; z-index: 50`,
`background: rgba(15,15,19,0.92)`, `backdrop-filter: blur(12px)`,
`border-bottom: 1px solid rgba(255,255,255,0.06)`, padding `0 16px`.

Links, afhankelijk van de route:
- **`/` en `/dashboard`:** merk — `favicon.svg` op 30 × 30 px met `border-radius: 7px`,
  daarnaast "FilmMaatjes" 17px/700, `letter-spacing: -0.02em`.
  **Belangrijk:** het huidige `logo.png` (2,1 MB, `height: 150px`) wordt hier vervangen door
  `public/favicon.svg` (1 kB). Vervang het ook op desktop.
- **Overige routes:** terugpijl (44 × 44, alleen waar een bovenliggende pagina bestaat)
  + paginatitel 19px/700.
- **`/movies/:id`:** geen balk; de backdrop loopt onder de statusbalk door met een eigen
  ronde terugknop.

Rechts altijd: zoeken (44 × 44), meldingen (44 × 44, badge `#f59e0b`, tekst `#0f0f13`,
16px rond, 10px/700) en avatar 32 × 32.

Het meldingenpaneel (`Vriendenactiviteit` uit `navbar.component.html`) opent als kaart
onder de balk: `#1a1a24`, radius 12px, rand `rgba(255,255,255,0.1)`,
`box-shadow: 0 8px 32px rgba(0,0,0,0.5)`. Rij = avatar 28px + tekst 13px/1.35 +
tijd 11px `#94a3b8`. Vult `FriendActivity` uit `core/models/friend-activity.model.ts`.

---

## Schermen

Volgorde volgt `app.routes.ts`.

### 1. Landing — `/`

Doel: bezoeker zonder account overtuigen.

- **Hero:** padding `40px 20px 32px`, gecentreerd, achtergrond
  `radial-gradient(500px 300px at 50% 0%, rgba(124,58,237,0.28), transparent 72%)`.
  Badge-pill (32px hoog, `rgba(124,58,237,0.15)`, rand `rgba(124,58,237,0.3)`, tekst
  `#c4b5fd` 12px) met `auto_awesome` + "Jouw filmwereld begint hier".
  H1 38px/900 in drie regels: "Ontdek films." / "Deel verhalen." (gradient-tekst) /
  "Vind jouw favoriet.". Subtitel 16px `#94a3b8`.
  Twee CTA's **onder elkaar, volle breedte, 52px hoog**: primair `#7c3aed`
  "Gratis aanmelden" (`person_add`), secundair outline "Films ontdekken" (`explore`).
  Voetnoot 12px `#475569`: "Helemaal gratis • Geen creditcard nodig".
- **Filmstrip:** horizontale scroll, posters 108 × 162 px, gap 10px (op desktop is dit
  de animerende strip; op mobiel gewoon scrollbaar).
- **Features:** de vier items uit `landing.component.ts` (`features`), maar als
  **verticale lijst** in plaats van een grid: kaart `rgba(26,26,36,0.8)`, radius 12px,
  padding 20px, met links een icoonvierkant 44 × 44 (radius 11px) in de kleur van het
  feature (`#f59e0b`, `#7c3aed`, `#06b6d4`, `#ec4899`) op 13% dekking met rand op 19%.
- **Trending:** kop + "Alle films →", daaronder een **2-koloms** posterraster (2 items).
- **CTA-blok:** radius 16px, `linear-gradient(135deg, rgba(124,58,237,0.22), rgba(26,26,36,0.9) 65%)`,
  rand `rgba(124,58,237,0.25)`, icoon `local_movies`, H2 24px, knop volle breedte.

### 2. Dashboard — `/dashboard`

- Begroeting: "Hoi, **Julia**!" — naam in gradient-tekst; H1 28px/800. Subtitel
  "Wat ga je vandaag kijken?".
- **Snelacties** horizontaal scrollbaar (pills 44px hoog): Film Roulette (primair),
  Zoeken, Film Matcher (outline). Op desktop staan die rechts naast de begroeting.
- **Statistieken:** 2 × 2 grid (desktop 4 × 1). Kaart 16px padding, icoon 26px in de
  bestaande kleuren (`#7c3aed` watchlists, `#06b6d4` gezien, `#ec4899` vrienden,
  `#f59e0b` beoordeeld), getal 22px/700, label 12px `#64748b`. Elke kaart is een link
  naar respectievelijk `/watchlists`, `/profile`, `/friends`, `/profile`.
- **Rijen** ("Aanbevolen voor jou", "Trending deze week", "Populair"): `horizontal-scroll`
  met posters van **132 × 198 px** (desktop 160–180px), gap 12px, marge `0 -20px` +
  padding `0 20px` zodat de rij bleedt tot de schermrand.

### 3. Films — `/movies`

- H1 "Films" + sorteerpill rechts ("Populair", `expand_more`, 34px hoog).
- **Categorie-pills** (`tabs` uit `movie-list.component.ts`: Trending, Populair, Hoogst
  gewaardeerd, Binnenkort, Nu te zien) horizontaal scrollbaar, 36px hoog, radius 999px,
  `scrollbar-width: none`. Actief: `rgba(124,58,237,0.15)` + rand `#7c3aed` + tekst
  `#a78bfa`. Inactief: transparant + rand `rgba(255,255,255,0.1)` + `#94a3b8`.
- **Raster: 2 kolommen**, gap 16px, `align-items: start` (bestaande `.card-grid` doet dit
  al op mobiel). Poster `aspect-ratio: 2/3`, radius 12px.
- **Poster-acties permanent zichtbaar** (belangrijkste afwijking van
  `movie-card.component.ts`): scorebadge linksboven (`rgba(0,0,0,0.7)`, blur 4px, ster
  12px `#f59e0b`, cijfer 12px/500) en één actieknop rechtsboven, 32 × 32 rond. De
  hover-overlay met samenvatting en de tweede actieknop vervallen op touch.
  Statuskleuren: standaard `rgba(0,0,0,0.6)`, in watchlist `rgba(124,58,237,0.8)`,
  gezien `rgba(74,222,128,0.25)` met icoon `#4ade80`.
- Onder het raster de infinite-scroll-spinner: 28px rond, rand 3px
  `rgba(124,58,237,0.25)` met `border-top-color: #7c3aed`.

### 4. Filmdetail — `/movies/:id`

- **Backdrop** 400px hoog, loopt door onder de statusbalk (geen bovenbalk). Gradient
  eroverheen: `linear-gradient(to bottom, rgba(15,15,19,0.5) 0%, rgba(15,15,19,0.35) 40%, rgba(15,15,19,1) 100%)`.
  Terugknop linksboven: 40 × 40 rond, `rgba(0,0,0,0.5)` + blur 8px.
- Content start met `margin-top: -120px` (desktop -180px).
- **Kop:** poster 116px breed (2:3, radius 12px, schaduw) naast genre-chips
  (`padding: 3px 10px`, radius 100px, `rgba(124,58,237,0.2)`, rand
  `rgba(124,58,237,0.3)`, tekst `#c4b5fd` 11px) en de TMDB-score.
- Titel 28px/800, tagline cursief `#94a3b8`, metarij (jaar, speelduur, taal) 13px met
  iconen van 15px.
- Samenvatting 14px/1.7 `#cbd5e1`.
- **Actierij:** primaire knop "Trailer" vult de breedte, daarnaast twee ronde
  iconknoppen 44 × 44 (watchlist, gezien). De watchlist-picker uit
  `movie-detail.component.html` wordt op mobiel een **bottom sheet** in plaats van een
  dropdown.
- **Beoordelingsblok:** `rgba(26,26,36,0.6)`, rand `rgba(255,255,255,0.06)`, radius 12px,
  label "Jouw beoordeling:" 13px. Sterren: **44 × 44 px raakvlak per ster**, glyph 28px
  (`star-rating.component.ts` gebruikt nu 28px zonder padding). Onder de sterren de
  tekstuele waarde: `4/5 · Heel goed` — labels uit `starLabel()`: Slecht, Matig, Goed,
  Heel goed, Uitstekend. Nogmaals op dezelfde ster tikken zet de score op 0 (bestaand
  gedrag).
- **Cast:** horizontale scroll, foto's 96 × 144 px, radius 8px, naam 13px/600, rol 12px
  `#64748b` (desktop: raster van 6).
- **Reviews:** kop + knop "Review schrijven" (36px). Formulier opent inline:
  rand `rgba(124,58,237,0.3)`, sterrenrij 40px, textarea min-hoogte 84px met
  `rgba(255,255,255,0.04)` en focusrand `rgba(124,58,237,0.5)`, knoppen "Plaatsen"
  (primair, 44px) en "Annuleren".
  Reviewkaart: avatar 36px gradient, naam 15px/600, datum 12px `#64748b`, sterren 14px
  rechts, tekst 14px/1.7.

### 5. Zoeken — `/movies/search`

- Bovenbalk met terugpijl + titel "Zoeken".
- Zoekveld in Material *filled*-stijl: hoogte 52px, `#16161f`, radius `8px 8px 0 0`,
  onderrand 2px `#7c3aed` bij focus, label 11px `#a78bfa` boven de waarde 15px.
  Wisknop (`close`) rechts, 44 × 44 raakvlak.
- **Leeg (< 2 tekens):** "Populaire zoekopdrachten" + de acht chips uit
  `search.component.ts` (`popularSuggestions`): Marvel, Star Wars, Harry Potter,
  James Bond, The Lord of the Rings, Disney, Pixar, Christopher Nolan. Chip:
  `padding: 9px 16px`, radius 100px, `rgba(26,26,36,0.8)`, rand `rgba(255,255,255,0.08)`.
  Tikken vult het zoekveld.
- **Met resultaten:** "12 resultaten voor "anatomy"" (13px, `#475569`, term in `#94a3b8`)
  + hetzelfde 2-koloms posterraster als `/movies`.
- Geen resultaten: bestaande `app-empty-state` met `search_off`.
- Debounce 400ms en zoeken vanaf 2 tekens blijven zoals ze zijn.

### 6. Watchlists — `/watchlists`

- Titel in de bovenbalk; de knop "Nieuwe watchlist" wordt op mobiel een **FAB**:
  56 × 56 rond, `#7c3aed`, icoon `add` 26px, `position: fixed; right: 20px; bottom: 108px`
  (boven de onderbalk), `box-shadow: 0 8px 30px rgba(124,58,237,0.45)`.
- Kaart (één kolom): padding 18px, radius 12px, `rgba(26,26,36,0.8)`, rand
  `rgba(255,255,255,0.06)`. Bovenin icoonvierkant 44 × 44 (`rgba(124,58,237,0.2)`,
  radius 10px, icoon `bookmark` `#a78bfa`) en rechts `delete_outline` `#475569`.
  Daaronder naam 17px/600, omschrijving 14px `#64748b`, metarij (`movie` + "14 films",
  rechts `public` + "Publiek").
- **Nieuw t.o.v. desktop:** een strip van drie posters 48 × 72 px plus een "+11"-tegel,
  zodat de lijst herkenbaar is zonder hem te openen.
- Leeg: bestaande `app-empty-state` met `bookmark_border`.

### 7. Watchlist-detail — `/watchlists/:id`

- Bovenbalk: terugpijl + lijstnaam. Daaronder omschrijving 14px `#94a3b8` en het aantal
  films 13px `#64748b`.
- 2-koloms posterraster. De verwijderknop (`close`) staat **permanent** linksboven op de
  poster, 32 × 32 rond `rgba(0,0,0,0.7)` (op desktop verschijnt hij bij hover).

### 8. Vrienden — `/friends`

De `mat-tab-group` wordt een scrollbare tabrij onder de bovenbalk: label 14px/500,
padding `14px 12px`, actief `#a78bfa` met 2px onderlijn `#7c3aed`, inactief `#64748b`.
Drie tabs, exact als in `friends-overview.component.ts`:

1. **Mijn vrienden** — lijstkaart per vriend: avatar 44px gradient met initiaal,
   naam 15px/600, `@username` 13px `#475569`, `chevron_right`. Eén kolom.
2. **Vriendverzoeken (n)** — dezelfde kaart, rechts twee knoppen van 44 × 44:
   accepteren (`check`, `rgba(124,58,237,0.15)`, `#a78bfa`) en weigeren (`close`,
   `#94a3b8`). Erboven "2 openstaande verzoeken" + "Vernieuwen".
3. **Gebruikers zoeken** — filled zoekveld + resultaatkaarten met rechts één statusknop:
   `person_add` (`#a78bfa`), `hourglass_empty` (verzoek verstuurd) of `people`
   (`#4ade80`, al vrienden).

### 9. Profiel — `/profile`

- **Banner** 150px hoog met de bestaande gradient (het patroon-overlay mag vervallen).
- **Avatar** 96 × 96, `border: 4px solid #0f0f13`, `margin-top: -48px`, gradient met
  initiaal 40px/700. Op mobiel **onder elkaar** in plaats van naast elkaar.
- Naam 28px/800, `@username` 14px `#64748b`, bio 14px `#94a3b8`.
- **Statistieken in één rij** (eigen profiel): Watchlists, Reviews, Vrienden — getal
  20px/700, label 12px `#64748b`, gap 24px. (Bij het profiel van een ander:
  Gezien, Watchlists, Vrienden.)
- Knop "Profiel bewerken" outline, 44px, links uitgelijnd.
- **Tabs** scrollbaar met onderlijn: "Gezien (n)", "Beoordeeld (n)", "Watchlists (n)".
  - Gezien → 2-koloms posterraster.
  - Beoordeeld → rijen: poster 48 × 72, titel 14px/600, sterren 16px eronder.
  - Watchlists → dezelfde lijstkaarten als op `/watchlists`, compacter.

### 10. Film Roulette — `/roulette`

- Kop gecentreerd: icoonvierkant 56 × 56 (`rgba(236,72,153,0.15)`, rand op 25%,
  `casino` `#ec4899`), H1 28px/800, subtitel 15px.
- **Modusschakelaar** als segmented control: grid van 3, container
  `rgba(255,255,255,0.03)` radius 12px met 4px padding; item radius 9px, icoon 20px,
  label 12px. Actief `rgba(124,58,237,0.18)` + `#a78bfa`. Modi: Willekeurig, Watchlists,
  Aanbevolen.
- **Filters** worden op mobiel niet als zijpaneel getoond maar als **één rij die een
  bottom sheet opent**: `tune`-icoon, "Filters", samenvatting eronder ("Drama · vanaf
  7/10"), `chevron_right`. In de sheet staan de genre-chips, decennium-chips en de
  `mat-slider` voor de minimale beoordeling uit `roulette.component.html`.
- **Resultaat** gecentreerd: poster 180px breed met badge "Jouw film!" (`#7c3aed`, 28px
  hoog, `auto_awesome`), titel 24px/800, jaar + score, samenvatting 14px, en twee knoppen
  naast elkaar ("Details" primair, "Andere" outline).
- **Draaiknop** vast onderaan de content: volle breedte, 54px, `#7c3aed`,
  `box-shadow: 0 0 40px rgba(124,58,237,0.3)`.
- Spin-animatie ongewijzigd (`spinning-animation` uit de bestaande scss).

### 11. Film Matcher — `/matcher`

- Kop als bij Roulette, maar `people` in `#06b6d4`.
- **Vriendenselectie: 3 kolommen** (desktop 6): kaart radius 12px, padding `16px 8px`,
  avatar 48px, naam 13px, selectie-indicator rechtsboven (`check_circle` `#a78bfa` /
  `radio_button_unchecked` `#475569`). Geselecteerd: `rgba(124,58,237,0.12)` + rand
  `#7c3aed`.
- Onder de selectie: "2 vrienden geselecteerd" (14px `#a78bfa`) en de knop "Vind films"
  op volle breedte, 48px.
- **Resultaten: één kaart per rij** (desktop 3 kolommen). Per kaart: badge met het
  matchtype in de kleur uit `getMatchColor()` (beste match `#4ade80`, veilige keuze
  `#a78bfa`, wildcard `#ec4899`) op 13–15% dekking, rechts het percentage 20px/800 in
  dezelfde kleur; daaronder poster 72 × 108 met titel, jaar en score; onderaan
  "Waarom dit?" met `check_circle`-regels van 13px.

### 12. Aanbevolen — `/recommendations`

Titel in de bovenbalk, ondertitel 14px `#64748b`. Per groep uit
`recommendations.component.ts` een kop (`favorite` `#a78bfa` + "Omdat je van X houdt") en
een horizontale rij posters van 132 × 198 px. Leeg: `app-empty-state` met `auto_awesome`.

### 13. Inloggen — `/auth/login`

Geen boven- of onderbalk. Verticaal gecentreerd, padding `80px 20px 40px`, achtergrond
`radial-gradient(400px 260px at 50% 8%, rgba(124,58,237,0.24), transparent 72%)`.
Logo + wordmark boven de kaart. Kaart: `rgba(26,26,36,0.8)`, radius 16px, padding 24px.
H1 24px/700 "Welkom terug", subtitel 14px. Twee filled velden van 56px
(E-mailadres, Wachtwoord met `visibility`-toggle van 44 × 44). Knop "Inloggen"
volle breedte, 50px, pill. Onderaan "Nog geen account? **Aanmelden**".
Foutmelding: rij met `error_outline` in `#f87171`, 13px.

### 14. Aanmelden — `/auth/register`

Zelfde opzet, vijf velden in deze volgorde: Naam, Gebruikersnaam (met hint "Alleen
letters, cijfers en underscores"), E-mailadres, Wachtwoord (hint "Minimaal 8 tekens"),
Wachtwoord bevestigen. Validatieteksten letterlijk overnemen uit
`register.component.html`.

### 15. 404 — `/**`

Gecentreerd: "404" 96px/900 in gradient-tekst met `opacity: 0.8`, cirkel 60px met
`movie_off` `#475569`, H1 24px/700 "Pagina niet gevonden", tekst 15px `#94a3b8`, en twee
knoppen **onder elkaar** op volle breedte: "Naar homepage" (primair) en
"Films ontdekken" (outline).

---

## Interacties en gedrag

- **Navigatie:** onderbalk = `routerLink` met `routerLinkActive`. Actieve staat ook bij
  child-routes (`/movies/:id` → tab Films).
- **Categorie-pills:** `onTabChange($index)` — reset `page` naar 1 en leegt de lijst
  (bestaand). De actieve pill scrollt in beeld (`scrollLeft`, geen `scrollIntoView`).
- **Sterren:** tikken zet de score, nogmaals tikken op dezelfde ster zet hem op 0.
  Emit `ratingChange`. Geen hover-state op touch — verwijder `mouseenter/mouseleave`
  achter `@media (hover: hover)`.
- **Reviewformulier:** in-/uitklappen onder de kop; "Plaatsen" is uitgeschakeld zolang de
  tekst leeg is (bestaand).
- **Watchlist toevoegen:** op mobiel altijd via bottom sheet, ook bij precies één lijst
  (nu navigeert de code bij meerdere lijsten naar de detailpagina).
- **Meldingen:** paneel opent onder de bovenbalk; sluiten markeert alles als gelezen
  (`markAllSeen()`).
- **Infinite scroll:** ongewijzigd, drempel 600px.
- **Animaties:** `fadeInUp` 0.5s ease (bestaand) voor het rouletteresultaat; overige
  transities 0.15–0.2s `cubic-bezier(0.4, 0, 0.2, 1)`.
- **Hover-effecten** (`translateY(-4px)`, poster-zoom, overlay) alleen binnen
  `@media (hover: hover)` laten staan.

## Breakpoints

| Breedte | Gedrag |
|---|---|
| < 640px | 2 posters per rij, onderbalk, één kolom kaarten, FAB |
| 640–767px | 3 posters per rij, onderbalk blijft |
| ≥ 768px | Bestaande desktoplayout: navbar met links, geen onderbalk |

De bestaande `.card-grid` (2 → 3 → 4 → 5 → 6 kolommen) hoeft niet te wijzigen.

## State

Geen nieuwe globale state. Per scherm signals zoals nu (`selectedTab`, `movies`,
`loading`, `page`, `totalPages`, `searchControl`, `activeTab`, `friendTab`, `mode`,
`selectedFriends`, `step`). Nieuw is alleen:

- `mobileTabBarVisible` — afgeleid van de route (verborgen op `/auth/*`).
- `filterSheetOpen` (roulette) en `watchlistSheetOpen` (filmdetail) — booleans voor de
  bottom sheets; gebruik `MatBottomSheet`.

## Assets

- `public/favicon.svg` (1 kB) — het merkicoon voor boven- en onderbalk en de authpagina's.
  Vervangt `assets/logo.png` (2,1 MB) in `navbar.component.html`.
- `public/assets/movie-placeholder.svg` — fallback als `poster_path` leeg is (bestaand
  gedrag in `onImageError`).
- Posters/backdrops: TMDB (`w342` in rasters, `w500` op detail, `w92` in lijstrijen).

## Bestanden in deze map

- `FilmMaatjes Mobiel.dc.html` — klikbaar prototype van alle vijftien schermen met de
  onderbalk, sterren, tabs en zoekchips werkend.
- `FilmMaatjes Laptop.dc.html` — dezelfde pagina's op 1440 × 900, als referentie voor
  wat er op desktop hetzelfde moet blijven.
- `image-slot.js`, `ios-frame.jsx`, `browser-window.jsx`, `support.js` — hulpbestanden
  van de prototypes (niet nodig in de app).
- `public/favicon.svg`, `public/assets/movie-placeholder.svg` — de assets hierboven.

Open de prototypes in een browser; kies links een pagina.
