# AngiSoft Design Provenance Register

This register records the design inspiration for every public page, admin screen, shared component, and component family. It is a standing requirement: any new or substantially redesigned page/component must be added here before it is considered complete.

## Provenance policy

- **Inspiration, not copying.** No proprietary source code, design files, illustrations, fonts, videos, screenshots, or brand assets are copied from Vercel, Stripe, Linear, Apple, Microsoft, Radix, shadcn, Figma, Pinterest, or Behance.
- **Borrowed attributes are structural and behavioral**, such as grid discipline, state clarity, motion restraint, data density, focus behavior, and hierarchy.
- **AngiSoft remains the visual author.** Colors, copy, media, section composition, brand marks, and component implementation are AngiSoft-specific.
- The original marketing layout restored in the new TypeScript structure is sourced from AngiSoft commit **`9d6c9da`**. It is the baseline source of truth, not an external design.
- External references consulted for the current design pass:
  - **Vercel Geist** — color scales, materials, grid, typography rhythm, restraint.
  - **Radix Themes Spinner** — accessible loading state and size behavior.
  - **shadcn/ui Skeleton and Empty** — content-shaped placeholders and action-led empty states.
  - **Apple Human Interface Guidelines** — progress semantics, motion restraint, and reduced-motion expectations.
  - **Anthropic frontend-design skill** — anti-generic design review, distinctive typography, and motion discipline.
  - **Microsoft Fluent** — enterprise information architecture and dense admin surfaces.
  - **Stripe/Linear** — product proof, trust presentation, and focused app-shell patterns.

## Public pages

| Page / route | Primary inspiration | Pattern borrowed | AngiSoft-specific implementation |
|---|---|---|---|
| `/` — Home | AngiSoft `9d6c9da`; Stripe/Apple product storytelling | Original section order and media-first hero; Stripe-style proof and Apple-style staged media | Exact restored section sequence, AngiSoft media, CMS/API data, brand tokens |
| `/about` | AngiSoft `9d6c9da`; Apple storytelling; Vercel Geist hierarchy | Narrative-first section rhythm and quiet supporting typography | AngiSoft history, geography, values, team, and API-driven content |
| `/services` | AngiSoft `9d6c9da`; Stripe service clarity; Vercel grid | Outcome-first service grouping and controlled card density | AngiSoft service taxonomy, API data, local legacy CSS |
| `/services/:slug` | Stripe product/service detail; shadcn/Radix primitives | Breadcrumb hierarchy, sections, FAQ behavior, clear CTA | AngiSoft service content model and original layout |
| `/products` | Apple product pages; Stripe product proof | Visual-first product hierarchy and status clarity | AngiSoft product ecosystem and API-driven media |
| `/products/:slug` | Apple product detail; Linear restraint | Focused hero, capability sections, gallery rhythm | AngiSoft product data, media, and status model |
| `/projects` and `/project/:slug` | AngiSoft `9d6c9da`; Stripe case-study structure | Evidence-first project cards and detail narrative | AngiSoft project records and original media treatment |
| `/industries` and `/industries/:slug` | Microsoft enterprise IA; Stripe sector pages | Sector taxonomy, capability grids, enterprise trust | AngiSoft industry data and original section styling |
| `/solutions` and `/solutions/:slug` | Microsoft solutions IA; Vercel Geist materials | Grouped solution cards, restrained surfaces, clear routes | AngiSoft solution taxonomy and original background panels |
| `/pricing` | Stripe pricing clarity; Vercel type rhythm | Comparable pricing rows and direct CTA hierarchy | AngiSoft pricing model, currencies, and engagement options |
| `/blog` | Vercel editorial hierarchy; shadcn skeleton/empty states | Reading rhythm, card hierarchy, content-shaped placeholders | AngiSoft blog taxonomy, author presentation, and CMS data |
| `/blog/:slug` | Vercel editorial pages; Apple media handling | Long-form typography, stable media layout, table of contents | AngiSoft article renderer and brand styles |
| `/staff` and `/staff/:usernameOrId` | Linear team clarity; Apple profile storytelling | Compact directory cards and profile hierarchy | AngiSoft staff records, portfolios, and media |
| `/testimonials` | Stripe trust proof; Radix/shadcn card semantics | Quotation hierarchy and author attribution | AngiSoft testimonial records and original slider |
| `/careers` | Microsoft careers structure; Vercel clarity | Role taxonomy, filters, and direct application flow | AngiSoft vacancy data and application workflow |
| `/contact` | Stripe contact flow; shadcn/Radix form semantics | Field grouping, visible labels, inline errors, response guidance | AngiSoft contact methods and enquiry API |
| `/booking`, `/book`, `/booking/:id` | Stripe checkout-style progress; Apple motion restraint | Step clarity, validation, saved context, progress semantics | AngiSoft booking model, payment state, and API workflow |
| `/bookings`, `/bookings/:reference`, `/track-booking` | Stripe customer status pages; Linear app focus | Compact status cards, timeline, and accessible action hierarchy | AngiSoft booking stage machine and public-reference tracking |
| `/newsletter/confirm`, `/newsletter/unsubscribe` | Vercel minimal system pages | Quiet status-first layout and one clear action | AngiSoft newsletter API and brand styling |
| `/privacy`, `/terms` | Vercel legal-page hierarchy | Long-form readability and section indexing | AngiSoft legal content |
| `404` | Vercel/Linear 404 restraint | Clear route recovery and minimal copy | AngiSoft brand illustration and navigation options |

## Marketing component families

Every file inside each family inherits the mapping below. No component family is omitted.

| Component family | Inspiration | Pattern borrowed | AngiSoft-specific implementation |
|---|---|---|---|
| `about/*` | Apple storytelling, Vercel Geist typography, AngiSoft `9d6c9da` | Narrative pacing, number emphasis, image reveal, section headings | AngiSoft story, media, team, geography, and capability content |
| `backgrounds/*` | Apple layered media; Vercel Geist materials | Stable media layers and restrained section surfaces | AngiSoft backgrounds and brand gradient discipline |
| `blog/*` | Vercel editorial design; shadcn skeleton/empty states | Reading hierarchy, card/grid rhythm, placeholders, pagination, TOC | AngiSoft blog content model, media handling, and CMS data |
| `brand/*` | AngiSoft original brand system | Logo and footer-wave semantics | Original AngiSoft logo assets, colors, and wave treatment |
| `buttons/*` | Vercel Geist button states; shadcn/Radix focus behavior | Variant clarity, focus rings, active feedback | AngiSoft brand colors, sizes, and legacy styling |
| `cards/*` | Stripe/Linear card hierarchy; Vercel material scales | One focal card action, consistent radii/elevation | AngiSoft card content, imagery, and category structure |
| `charts/*` | Microsoft Fluent data visualization; Vercel data color rules | Accessible chart color and labeling | AngiSoft dataset presentation |
| `common/*` | Vercel Geist primitives | Section badges and reusable section structure | AngiSoft copy hierarchy and spacing |
| `contact/*` | Stripe form flow; shadcn/Radix field semantics | Field grouping, visible labels, inline validation, intent selection | AngiSoft contact API, channels, and success/retry flow |
| `containers/*` | Radix Accordion; shadcn composition | Accessible disclosure and panel composition | AngiSoft spacing, typography, and content |
| `industries/*` | Microsoft enterprise grids; Stripe sector proof | Taxonomy cards, capability grouping, related-industry routing | AngiSoft industry records and imagery |
| `inputs/*` | shadcn/Radix inputs; Vercel form controls | Visible labels, focus behavior, compact controls | AngiSoft form layout and brand styling |
| `landing/*` | AngiSoft `9d6c9da`; Apple cinematic motion; Linear restraint | Hero slider, CTA hierarchy, proof slider, brand carousel | AngiSoft hero/media/CTA content and API-driven behavior |
| `modals/*` | Radix Dialog semantics; shadcn modal states | Focus, escape behavior, notification clarity | AngiSoft modal copy and layout |
| `modern/*` | AngiSoft `9d6c9da` “modern” layer; Apple/Emil motion patterns | Scroll reveal, parallax, glass card, media player, counter | Original implementation and AngiSoft brand media |
| `pricing/*` | Stripe pricing; Vercel type/table rhythm | Comparable ranges, engagement models, pricing FAQ | AngiSoft pricing service data and currency handling |
| `product/*` | Apple product detail; Stripe product proof | Product hero, capability blocks, gallery, related product routing | AngiSoft product records and status taxonomy |
| `sections/*` | AngiSoft `9d6c9da`; Stripe/Apple/Linear composition | Homepage section order, proof sections, header/footer, trust hierarchy | Exact restored section implementations and API-driven content |
| `services/*` | Stripe service pages; Vercel hierarchy | Service catalog, process, deliverables, outcomes, FAQs | AngiSoft service records and related-service logic |
| `solutions/*` | Microsoft solution IA; Stripe outcome pages | Solution grouping, feature panels, related solution routing | AngiSoft solution taxonomy and original panels |

## Shared `@angisoft/ui` components

| Component | Inspiration | Pattern borrowed | AngiSoft-specific implementation |
|---|---|---|---|
| `Button` | Vercel Geist; shadcn/Radix | Variant semantics, focus ring, active scale | AngiSoft palette and sizing |
| `Card` | Vercel materials; Stripe/Linear hierarchy | Material, radius, hover lift | AngiSoft dark/light surfaces |
| `Section` | Vercel Geist grid | Stable container and section rhythm | AngiSoft spacing scale |
| `Hero` | Vercel Geist hero grid; Apple hierarchy | Left-aligned headline/action/visual split | AngiSoft brand badge and typography |
| `Testimonial` | Stripe trust layout | Quote/author attribution hierarchy | AngiSoft testimonial data and avatar fallback |
| `LogoCloud` | Stripe/Vercel logo strips | Quiet repeated peer logos | AngiSoft client records |
| `LoadingIndicator` | Radix Spinner; shadcn Skeleton; Apple progress; Vercel motion restraint | Accessible `aria-busy` status, size scale, content-shaped skeleton, reduced-motion behavior | Ten original AngiSoft variants: spinner, dots, orbit, pulse, progress, skeleton, bars, grid, cube, wave |
| `VisualState` | shadcn Empty; Apple HIG; Vercel restraint | Action-led non-text state and quiet retry affordance | Original AngiSoft status mark, pulse, and icon-only retry |

## Client portal and booking components

| Area | Inspiration | Pattern borrowed | AngiSoft-specific implementation |
|---|---|---|---|
| Client dashboard | Stripe customer dashboard; Linear workspace | Compact KPI hierarchy and project status grouping | AngiSoft client project data and portal API |
| Project tracking | Linear project focus; Stripe status pages | Milestone, deliverable, file, and message grouping | AngiSoft project model and realtime updates |
| Booking form | Stripe checkout; Apple step motion | Context restoration, step validation, clear progress | AngiSoft service/package/pricing model |
| Booking history/progress | Stripe order status; Linear timeline | Public-reference lookup, timeline, action authorization | AngiSoft booking stage machine and access rules |
| Booking attachments/messages | Stripe customer file flow | Upload state and message thread clarity | Tigris upload storage and authenticated access |

## Admin and staff screens

| Area | Inspiration | Pattern borrowed | AngiSoft-specific implementation |
|---|---|---|---|
| `app.tsx` | Vercel/Linear dedicated app routing | Clean domain-root routes and legacy redirect handling | `admin.angisoft.co.ke` route model |
| `AdminLayout` | Linear/Vercel app shell; Microsoft Fluent density | Sidebar grouping, sticky header, theme toggle | AngiSoft navigation taxonomy and brand |
| `AdminLogin` | Vercel login restraint | Centered credential card and focused state | AngiSoft auth API and brand |
| `AdminUI` CRUD primitives | shadcn Data Table; Radix primitives; Microsoft Fluent tables | Sort/filter/pagination/modal semantics | AngiSoft entity APIs and permission model |
| CMS screens | Microsoft enterprise admin IA | Entity grouping and focused edit surfaces | AngiSoft CMS models and API-driven content |
| CRM screens | Linear conversation focus; Stripe customer records | Contact and conversation hierarchy | AngiSoft CRM API and chat state |
| Projects/bookings screens | Linear project management; Stripe operations | Status, assignment, and action grouping | AngiSoft project/booking workflows |
| Finance/payments | Stripe payment reporting | Amount/state clarity and reconciliation | AngiSoft payment providers and records |
| HR/staff screens | Microsoft Fluent enterprise people views | Role, access, and staff-record hierarchy | AngiSoft RBAC and staff data |
| AI/system settings | Vercel system settings; Microsoft admin panels | Configuration grouping and safe destructive actions | AngiSoft AI config, files, monitoring, and system APIs |
| `Badge`, `Modal`, shared form controls | shadcn/Radix semantics | Status, dialog, and control behavior | AngiSoft tokens and admin layout |

## Non-negotiables for future UI work

1. Add or update this register whenever a page or component is created or substantially changed.
2. State the external reference, the exact structural/behavioral pattern, and the AngiSoft-specific result.
3. Never copy third-party assets or source code.
4. Every loading state uses `LoadingIndicator`, not text.
5. Empty/error/offline states use `VisualState` or a content-shaped skeleton and remain action-led.
6. Motion must respect `prefers-reduced-motion`.
7. Data-displayed content must come from AngiSoft APIs or CDN-backed storage; hardcoded business content is not allowed.
