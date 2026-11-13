# FOX CINEMA artwork policy — V6

- All `*-original.webp` auditorium, snack and lobby images are original scene artwork created for this rebuild. They are not screenshots from the deleted reference site.
- Offer SVGs include only decorative geometry and no baked-in words. Descriptions and headings are HTML to enable proper Arabic translation and accessibility.
- `posters/<movie-id>.webp`: **original, non-official concept artwork** for every film in the demo catalogue. Each is a local, reliable fallback and is clearly labeled as concept art in the image.
- True film promotional posters are referenced via `posterUrl` and `posterSource` in `catalog.js` when a direct promotional source is available. They load at runtime from the original image host or a CORS-compatible proxy where allowed. They are NOT locally bundled, and their availability/licensing cannot be guaranteed. Secure appropriate promotional artwork rights before real commercial operation.
- No original font binaries are included; fonts are requested from Google Fonts with system fallbacks.
