# Marquee

A streaming service front end — profile gate, billboard hero, hover-expand rows,
title detail sheets with episode lists, and a working player shell.
No build step, no dependencies, no framework, no images.

## Files

```
index.html    markup shell — nav, mount points, footer
styles.css    all styling, including the generated film-grain texture
app.js        catalog, routing, rendering, player engine
README.md     this file
```

## Running it

Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8000    # http://localhost:8000
npx serve .
```

No server is required — there are no modules or fetch calls, so `file://` works.

## How it fits together

**Catalog.** Every title lives in the `CATALOG` array in `app.js`. Add an object
to that array and it appears in the rows, grids, and search automatically. The
`T()` helper fills in defaults so a new entry only needs a name, genres, and a
synopsis.

## Real film artwork (optional)

Out of the box the app runs on its own fictional catalog with drawn posters, so
it works offline with nothing to configure. To browse real films with real key
art instead:

1. Make a free account at [themoviedb.org](https://www.themoviedb.org) and
   request an API key under **Settings → API**.
2. Paste it into `TMDB_KEY` — it's the first thing in `app.js`, in the
   CONFIG block right under `"use strict"` (line 38).
3. Reload.

The app then pulls trending, top-rated, and genre shelves from TMDB, with real
posters, backdrops, synopses, cast, seasons, and episode stills. Detail sheets
fetch cast and episodes lazily on first open and cache them on the title.

TMDB licenses this imagery for exactly this use and requires the attribution
line already sitting in the footer — keep it. If the key is missing, rejected,
or the network is down, the app falls back to the built-in catalog and says so
rather than rendering an empty page.

Two things I deliberately did **not** do: hotlink posters from a studio or
scraper site, and bundle stills ripped from films. Both are someone else's
copyright, and neither survives contact with a real deployment.

If you have your own licensed images, skip TMDB entirely — put a `poster` and
`backdrop` URL on each catalog entry and `art()` will use them.

**Artwork without image files.** Every poster is a procedurally generated SVG
scene. `art(title, variant, ratio)` picks a scene type, seeds a PRNG from the
title's id, and draws the composition — so a title always renders the same
artwork, and the whole site still ships as three text files.

Nine scene generators live in `SCENES`:

| Scene | Draws |
|---|---|
| `ridge` | layered mountain ridgelines under a low sun |
| `skyline` | night city, lit windows |
| `sea` | horizon, sun column on water, lighthouse and beam |
| `corridor` | one-point perspective hallway toward a lit door |
| `orbit` | planet limb, atmosphere rim, stars |
| `forest` | trunks in fog with a small figure |
| `figure` | lone silhouette casting a long shadow |
| `road` | road to a vanishing point, receding poles |
| `rain` | rain on glass with neon behind |
| `stage` | curtains and a single spotlight pool |

Scene choice comes from `LOOKS` (hand-assigned per title where the story
suggests a specific image) falling back to `LOOK_BY_GENRE`. Each poster renders
in a wide 16:10 crop for cards and a tall 2:3 crop for the Top 10 row, and
results are memoized in `_posters`. Average encoded weight is about 7KB.

**Type.** Titles set in a face chosen by genre, the way real key art does:
prestige drama and romance in a didone (Bodoni Moda), thrillers and crime in
heavy condensed (Big Shoulders Display), sci-fi and fantasy in a wide tracked
grotesk (Space Grotesk). The `MARQUEE` wordmark and the outlined Top 10 numerals
use the didone; UI runs in Archivo. See `.f-serif` / `.f-cond` / `.f-tech` in
`styles.css` and `faceOf()` in `app.js`.

**Routing.** Hash-based: `#/browse`, `#/series`, `#/films`, `#/new`, `#/list`,
`#/search/<query>`. `parseHash()` returns `{view, arg}` and `V[view]()` returns
an HTML string.

**Events.** Fully delegated at `document`. Markup carries `data-act="name"`,
handled by `A["name"]`; navigation uses `data-go="#/route"`. Adding a control is
one attribute plus one function.

**Player.** `P` holds playback state and a one-second interval advances it,
writing progress back to `S.progress` so the Continue watching row stays honest.
Skip intro appears in the first stretch, the next-episode card in the last
thirty seconds.

**Profiles and persistence.** Each profile keeps its own list, progress, and
ratings, stored under `marquee:<profileId>` through the artifact storage API
when it's available and silently session-only when it isn't.

## Keyboard

| Key | Does |
|---|---|
| `/` | open search |
| `Esc` | close sheet, player, or menu |
| `Space` / `k` | play–pause (in player) |
| `←` `→` | skip 10s back / forward |
| `m` | mute |
| `f` | fullscreen |

## Where to change things

| I want to… | Go to |
|---|---|
| change colors | token block, top of `styles.css` |
| change fonts | `--ui` / `--display` / `--brand` tokens, plus the link in `index.html` |
| repoint a title's artwork | its entry in `LOOKS`, or give it `poster`/`backdrop` URLs |
| connect real films | `TMDB_KEY` at the top of `app.js` |
| add a new scene type | add to `SCENES`, reference it from `LOOKS` |
| add or edit titles | `CATALOG` in `app.js` |
| change which rows appear on Home | `V.browse` |
| add a page | add `V.myView`, add an entry to `ROUTES` |
| add a control | add `A["my-action"]`, use `data-act="my-action"` |
| plug in real video | replace the `P` interval in section 8 with a `<video>` element |

## Notes

This is a front-end demo. There's no backend, no accounts, and no video files —
playback is simulated. Every title, synopsis, cast name, and piece of artwork is
invented for this project.
