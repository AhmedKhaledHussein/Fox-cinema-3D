<p align="center">
  <img src="public/favicon.svg" width="76" height="76" alt="FOX CINEMA icon">
</p>

<h1 align="center">FOX CINEMA 3D</h1>

<p align="center"><strong>Cinematic movie discovery, interactive seat selection, and a real-time 3D auditorium preview.</strong></p>

<p align="center">
  <a href="https://fox-cinema-3d.vercel.app/#/home">Live demo</a> ·
  <a href="https://fox-cinema-3d.vercel.app/#/movies">Explore movies</a> ·
  <a href="./README_AR.md">التوثيق بالعربية</a>
</p>

> [!IMPORTANT]
> **Prototype / demonstration, not a live ticketing service.** Showtimes, venue availability, prices, seat inventory, checkout, and issued tickets are illustrative. **No real payment is processed**, and the deployed site does not provide a shared, production booking database.

## Overview

FOX CINEMA 3D is an independently recreated cinema web experience based on user-provided visual references. It combines a responsive, bilingual movie website with a procedural Three.js auditorium that lets visitors preview the perspective from individual seats before completing a **demo** booking flow.

The original website source code and 3D assets were not recovered; this repository contains a new implementation, not an exact source-code copy or an official cinema integration.

## Features

- **Movie discovery:** curated demo movies plus live movie/TV discovery from TMDb; now-playing, upcoming, Arabic titles, search, and filters.
- **Movie detail pages:** metadata, synopsis, poster, cast photos, character names, voice-acting labels where indicated by TMDb, and YouTube trailer links/embeds when available.
- **Bilingual interface:** Arabic/English switching with right-to-left layout support and responsive typography.
- **2D seat picker:** rows A–M, selection states, formats, sample showtimes, and mobile-focused fit-to-screen layout.
- **3D auditorium:** Three.js/WebGL, procedural seating, configurable screen formats, smooth camera changes from seat to seat, zoom, and touch controls.
- **Cinematic playback:** YouTube IFrame Player API for playback state/time/volume, with mute control; optional authorized local video playback.
- **Reactive screen lighting:** approximate artwork/timeline-driven lighting for YouTube, and frame-sampled lighting for local videos that may legally be sampled.
- **Seat-aware audio preview:** relative volume by screen distance; stereo panning only when playing a local, authorized video through Web Audio.
- **Demo checkout:** selection, summary, customer details, simulated payment, and a non-valid demo ticket.

Actual feature availability can depend on TMDb records, external poster hosts, YouTube embed permissions, browser audio policies, and WebGL support.

## Technology stack

| Layer | Technologies | How they are used |
| --- | --- | --- |
| Frontend | HTML5, CSS3, vanilla JavaScript (ES modules) | Responsive SPA, transitions, navigation, forms, accessibility helpers |
| Routing | Hash-based routes (`#/home`, `#/movies`, `#/movie/...`) | Client-side navigation without a frontend framework |
| 3D | **Three.js 0.170.0**, WebGL | Procedural geometry, InstancedMesh seats, camera, materials, cinema lighting |
| Video / audio | YouTube IFrame Player API, HTML5 video, Web Audio API | Trailers, playback events, volume, optional local-video stereo panning |
| Content | **TMDb API v3** | Catalog, posters, film/TV metadata, cast and trailer lookup |
| Hosting / API | **Vercel** static output and Node.js Serverless Functions | Serves `public/` and protected TMDb endpoints under `api/` |
| Local demo backend | Node.js 20+ (`server.js`, built-in modules) | Demo accounts, seat holds, checkout and test bookings |
| Fonts | DM Sans, Instrument Serif, Alexandria, Aref Ruqaa, IBM Plex Sans Arabic, Noto Naskh Arabic; Lyon Arabic word artwork | Bilingual UI, fallback typography and Arabic editorial accent |
| Testing | Node.js built-in `node:test` | Automated tests for APIs, catalog, booking and visual logic |

**No React, Next.js, or build-tool framework is used.** Three.js is imported as an ES module from a CDN rather than installed through `package.json`; a network connection is required to load it.

## Typography

| Language | Typeface | Use |
| --- | --- | --- |
| English | **DM Sans** | Navigation, UI labels, forms, body and movie cards |
| English | **Instrument Serif** | Italic and editorial title accents |
| English | Arial, Inter, Georgia | Platform fallbacks |
| Arabic | **Alexandria** | Main Arabic UI and headings |
| Arabic | **Aref Ruqaa** | Decorative Arabic emphasis in other headings |
| Arabic | **IBM Plex Sans Arabic**, **Noto Naskh Arabic** | Arabic alternatives and fallback typography |
| Arabic decorative headline accents | **Lyon Arabic Slanted Display Light** (Commercial Type) | Vector art for «الآن», «المشاهدة», «الأفلام», «المسلسلات», «العروض», «السينما», «مسبقًا» and other highlighted Arabic words in `public/assets/lyon-*.svg`; **no commercial font file is bundled or redistributed** |

Web fonts load from Google Fonts when available. Broader use of the commercial Lyon typeface as a hosted font requires the appropriate license.

## Architecture

```text
Browser (HTML/CSS/JS SPA)
    ├── Movie pages and demo booking UI
    ├── Three.js / WebGL auditorium
    ├── YouTube IFrame Player API
    └── Vercel Functions (/api/*)
            └── TMDb API (server-side token)

Local development (node server.js)
    └── Separate Node demo server with local JSON storage
        for sample accounts, holds, and test bookings
```

**Deployment distinction:** Vercel serves the static site and the four TMDb functions. It does **not** run the demo booking server from `server.js`. On Vercel, the client has an in-browser demo fallback for booking; it does not reserve inventory across users.

### Serverless endpoints

| Route | Purpose |
| --- | --- |
| `GET /api/catalog` | Movie/TV discovery; cached at the Vercel edge for up to 60 minutes, then refreshed on request |
| `GET /api/title?id=...` | Strict TMDb match and official poster lookup for a curated movie |
| `GET /api/cast?curated=...` or `?type=movie&id=...` | Cast and character details |
| `GET /api/trailer?curated=...` or `?type=movie&id=...` | Eligible TMDb YouTube trailer/teaser metadata |

The API responses are **discovery data**, not verified Egyptian cinema showtime or ticket availability.

## Run locally

Requires **Node.js 20 or newer** and a modern browser with WebGL.

```bash
git clone https://github.com/AhmedKhaledHussein/Fox-cinema-3D.git
cd Fox-cinema-3D
npm start
```

Open **http://localhost:4173/#/home**. The local server uses illustrative booking data. No `npm install` is required for the current package, which has no runtime npm dependencies.

Run the tests:

```bash
npm test
```

For a local test of the Vercel Functions rather than the standalone demo server, use a compatible Vercel development environment and configure the TMDb token securely.

## Deploy on Vercel

1. Import the GitHub repository into Vercel.
2. Select **Other** as the framework, repository root `./`, and output directory `public` (no build command).
3. Add a **Production** environment variable named `TMDB_READ_ACCESS_TOKEN` containing your TMDb API Read Access Token.
4. Deploy (or redeploy after adding/changing the environment variable).

The token must **never** be committed to Git or placed in client-side JavaScript. The repository configuration is in `vercel.json`.

`GET /api/catalog` uses a **60-minute request-driven CDN cache** (`s-maxage=3600`), not a guaranteed background hourly fetch. The repository also contains an **optional** GitHub Actions snapshot workflow (`.github/workflows/tmdb-hourly.yml`), but this is not required for the Vercel API integration and can be blocked by GitHub account/Actions restrictions.

## Project structure

```text
api/                    TMDb Vercel Functions: catalog, title, cast, trailer
lib/                    TMDb and cast normalization helpers
public/
  index.html            Browser entry point
  app.js                Pages, SPA routing, demo booking interactions
  styles.css            Design system and responsive/mobile styles
  i18n.js               Arabic/English translations
  catalog.js            Curated films, cinemas, formats, seat geometry
  catalog-live.js       Live catalogue merge/deduplication
  cast-ui.js            Cast/character presentation
  theater-three.js      Three.js auditorium and playback
  theater-presets.js    Screen/format presets
  screen-lighting.js    Permitted video-frame lighting analysis
  youtube-light-sync.js YouTube playback-time light synchronization
  seat-audio.js         Seat-relative audio profile
  hall3d.js             Legacy WebGL fallback
  assets/               Local artwork and fallbacks
server.js               Local-only demo HTTP server
scripts/                Optional TMDb snapshot refresh
tests/                  Node test suite
vercel.json             Vercel deployment configuration
```

## Production readiness / known gaps

The site demonstrates the **experience**, not a real ticketing business:

| Area | Current limitation / next step |
| --- | --- |
| Showtimes and locations | Replace sample schedule/pricing with authoritative cinema and screening management |
| Seat reservations | Add shared transactional database, server-side seat locks, idempotency, expiry, conflict protection |
| Checkout/payments | Integrate a compliant payment provider, callbacks/webhooks, refunds and reconciliation |
| User accounts | Build production authentication, verification, password recovery, session controls and abuse protection |
| Admin operations | Add a CMS for films, venues, auditoriums, sessions, pricing, offers and ticket operations |
| Mobile and 3D | Validate on real iOS Safari/Android devices; accessibility and WebGL performance budgets |
| Media and rights | Verify poster/trailer availability, usage rights, and film-to-TMDb matching |
| Reliability and compliance | Add monitoring, audit trails, backup strategy, privacy/terms, security and load testing |
| SEO and accessibility | Add crawlable metadata or SSR/prerendering strategy, keyboard/screen-reader audits |

See [Arabic documentation](./README_AR.md) for the same status and an ordered roadmap.

## Attribution and important notes

- **TMDb:** This product uses the TMDB API but is not endorsed or certified by TMDB. Film metadata and images belong to their respective owners.
- **YouTube:** Videos remain hosted by YouTube; cross-origin embedded frames cannot be sampled for pixel-perfect lighting. A permitted local video source is required for frame-derived light sampling.
- **Artwork:** Local concept posters are **not official movie posters**. See [artwork notes](./public/assets/ABOUT.md).
- **Source:** Independently reconstructed from visual references; not the original recovered website or a verified official production integration.
- **License:** `package.json` specifies `UNLICENSED`. No permission to reuse third-party media is granted by this repository.

---

**FOX CINEMA 3D** — a cinematic prototype built for exploration, experimentation, and iterative UX/3D development.
