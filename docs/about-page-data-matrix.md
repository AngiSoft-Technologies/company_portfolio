# About Page — Data Matrix

The canonical Read contract between `frontend/src/hooks/useAboutPage.js`
(`defaultAbout` / `ABOUT_SECTION_KEYS`) and the `AboutSection` table.

Legend:
- **Sort** — `sortOrder` in the DB / page order in `About.jsx`.
- **Component** — `frontend/src/components/about/*` consuming the key.
- **Content shape** — `content` payload stored in the JSONB column.
- **Images** — image paths inside `content` (served from `/uploads/public/...`
  or `/images/...`). (P) present on disk, (M) missing.

---

| Sort | Key                    | Component                          | Consumed as (About.jsx)        | Content shape (key fields)                                                    | Images (present / missing) |
|------|------------------------|------------------------------------|--------------------------------|-------------------------------------------------------------------------------|----------------------------|
| 0    | heroSlides             | AboutHeroSlider                    | `slides`, `intro`              | `slides[]: { image, mobileImage, alt, heading, subheading, cta }`              | 3 hero (P) + 3 mobile (M)  |
| 1    | intro                  | AboutHeroSlider                    | `intro` (company intro)        | `heading`, `paragraph`, `highlights[]`, `cta`                                  | 0                          |
| 2    | numbersHeading         | AboutNumberStory                   | `title`                        | `heading`, `subheading`                                                        | 0                          |
| 3    | numberStories          | AboutNumberStory                   | `stories`                      | `stories[]: { value, label, image, alt, description }`                         | 4 numbers (P)              |
| 4    | geography              | AboutGeographyMap                  | `content`                      | `heading`, `intro`, `regions[]`, `mapImage`, `mapAlt`                          | 1 map svg (M)              |
| 5    | sustainability         | AboutSustainability                | `content`                      | `heading`, `intro`, `pillars[]`, `image`, `alt`                                | 1 (P)                      |
| 6    | collaboration          | AboutCollaboration                 | `content`                      | `heading`, `intro`, `items[]: { icon, title, points[] }`                       | 3 icons svg (P)            |
| 7    | timelineHeading        | AboutHighlightsSlider              | `heading`                      | `heading`, `subheading`                                                        | 0                          |
| 8    | timeline               | AboutHighlightsSlider              | `items`                        | `items[]: { year, title, image, alt, description }`                            | 4 highlights (P)           |
| 9    | industriesHeading      | AboutIndustriesGrid                | `heading`                      | `heading`, `subheading`                                                        | 0                          |
| 10   | industries             | AboutIndustriesGrid                | `industries`                   | `industries[]: { name, image, alt, blurb }`                                    | 8 industries (P)           |
| 11   | clientsHeading         | AboutClientsSlider                 | `heading`                      | `heading`, `subheading`                                                        | 0                          |
| 12   | clients                | AboutClientsSlider                 | `clients`                      | `clients[]: { name, logo, alt, url? }`                                         | 1 logo svg (P)             |
| 13   | clientStats            | AboutClientsSlider                 | `clientStats`                  | `items[]: { value, label, icon? }`                                             | 0                          |
| 14   | clientHighlights       | AboutClientsSlider                 | `clientHighlights`             | `items[]: { value, label, description }`                                        | 0                          |
| 15   | testimonialsHeading    | AboutTestimonialsSlider            | `heading`                      | `heading`, `subheading`                                                        | 0                          |
| 16   | serviceMap             | AboutServiceMap                    | `content`                      | `categories[]: { name, icon?, services[] }`                                    | 8 service imgs (P)         |
| 17   | transparency           | AboutTransparency                  | `content`                      | `heading`, `intro`, `video? { cover, src }`, `points[]`                        | 1 video cover (M)          |
| 18   | partnerships           | AboutPartnerships                  | `content`                      | `heading`, `items[]: { name, logo, alt, note? }`                              | (partners as listed)       |
| 19   | solutionTypes          | AboutSolutionTypes                 | `content`                      | `heading`, `groups[]: { title, solutions[] }`                                  | 0                          |
| 20   | technologies           | AboutTechnologies                  | `content`                      | `categories[]: { name, technologies[]: { name, logo, alt } }`                  | 9 base (P) + 14 (M)        |
| 21   | specializedCapabilities| AboutSpecializedCapabilities        | `content`                      | `heading`, `intro`, `capabilities[]: { title, description, icon? }`            | 0                          |
| 22   | whyGuarantee           | AboutWhyGuarantee                  | `content`                      | `heading`, `intro`, `practices[]: { title, description }`                      | 0                          |
| 23   | pricing                | AboutPricing                       | `pricing`                      | `models[]: { name, price, features[] }`, `note`                                | 0                          |
| 24   | pricingQuotation       | AboutPricingQuotation              | `content`                      | `quote`, `author`, `role`, `image`, `investments[]`                            | 1 leadership (M)           |
| 25   | cta                    | AboutFinalCTA                      | `content`                      | `heading`, `subheading`, `cta`, `image`, `mobileImage`, `alt`                  | 1 webp (M) + 1 mobile (M)  |

**Totals:** 26 canonical keys · 0 rows missing required fields · 60 image refs
(29 present, **31 missing**).

---

## Notes

- Keys 2, 7, 9, 11, 15 are *heading-only* sections (just a title/subheading the
  component renders above a sibling data section).
- `clientStats`, `clientHighlights` are genuine `AboutSection` rows passed to
  `AboutClientsSlider` — not separate endpoints.
- `testimonials` is read from `/api/testimonials` (its own model) and merged in
  by the hook; it is **not** an `AboutSection` row.
- `heroSlides` + `intro` both feed `AboutHeroSlider`.
- Repeated/relational content (industries, services, clients, technologies,
  timeline, numbers, partnerships, solutions) lives as arrays inside `content`,
  so there are no duplicate tables.
- The `site_about` `Setting` blob (also written by the seed) is a legacy read path
  for `site.ts` / the chatbot; the public page uses the section rows above.
