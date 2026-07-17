# About Page — Required Image Assets

The About page (`frontend/src/pages/About.jsx` and `components/about/*`) is dark-themed
and image-led. SVG illustrations (Africa map + 3 collaboration illustrations) are already
present and render correctly. The **photographs** below are referenced by path but must be
supplied as real files — drop them into the matching path. Until then those tiles show a
broken image; the layout, sliders and animations all still work (copy is real AngiSoft
content, not placeholder copy).

Use WebP/AVIF where possible. Recommended size: 1200–1600px wide, 4:3 or 16:9.

## Hero slider — `/images/about/hero/`
- `prof-angera-founder.jpg` — Portrait of Prof Angera Silas, founder.
- `angisoft-engineering.jpg` — Founder/team working on software.
- `angisoft-team.jpg` — Collaborative or team-working scene.
- `angisoft-product-work.jpg` — Branded workspace / product development.

## Number stories — `/images/about/numbers/`
- `founded-2024.jpg` — Earliest AngiSoft / founder working environment.
- `projects.jpg` — Websites, dashboards or management platforms.
- `product-ecosystems.jpg` — PetroFlow / DukaFlow / KejaLink / AngiTunes interfaces.
- `digital-empowerment.jpg` — Learner, client support or community using a system.

## Highlights timeline — `/images/about/highlights/`
- `grassroots-origin.jpg` — Grassroots tech work (coding support, documents, training).
- `founding-2024.jpg` — AngiSoft founding moment / founder.
- `systems-growth-2025.jpg` — Software / web / mobile growth.
- `ecosystems-2026.jpg` — Product ecosystems in development.

## Industries — `/images/about/industries/`
- `retail.jpg` `education.jpg` `real-estate.jpg` `oil-gas.jpg` `creative-industry.jpg`
- `professional-services.jpg` `hospitality.jpg` `transport.jpg` `community.jpg` `startups.jpg`
  Each: a contextual photograph (or branded illustration) relevant to that industry.

## Clients / products logos — `/images/about/clients/`
- `kingsway.png` `primestack.png` `petroflow.png` `dukaflow.png` `kejalink.png` `angitunes.png`
  Transparent PNG logos, ~200x60, monochrome-friendly.

## Geography (already present)
- `geography/africa-map-dark.svg` ✅ supplied
- `collaboration/*.svg` ✅ supplied (3 illustrations)

## Testimonials
- Client/project images come from the `/testimonials` API (`imageUrl` field). Ensure seeded
  testimonials have real `imageUrl` values (e.g. `/uploads/...` from CMS) for the carousel.
