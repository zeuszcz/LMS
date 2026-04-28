# Design System — YES LMS (Master)

> Source of truth for product-wide design decisions. Page-specific overrides live in
> `design-system/yes-lms/pages/*.md`. When building a screen, check that folder first.

**Project:** YES LMS — Russian language school platform
**Audience:** mixed — kids 3+, teens, adults, parents, B2B coordinators, teachers, methodists, branch managers, admins
**Brand:** YES Center · official Cambridge English centre
**Tone:** professional yet warm; never kid-only, never corporate-cold
**Generated:** 2026-04-28 (initial run via ui-ux-pro-max), curated for our mixed audience

> Note: the auto-generator suggested kid-edu fonts (Baloo 2 + Comic Neue) and an
> indigo+green palette. We do **not** adopt those — they're appropriate for kids-only
> products, but we serve adults and B2B alongside kids. The recommendations below
> keep our existing electric-blue + coral foundation and apply only the technical
> guidance (a11y, motion, charts, micro-interactions).

---

## Color Palette (token name → value)

We keep token **names** (`forest`, `gold`, `sage`, `terra`, `ink`, `paper`) for code
stability — values map to a modern edu-tech palette.

| Token        | Hex      | Role                                                 |
|--------------|----------|------------------------------------------------------|
| `forest-600` | `#2563EB` | Primary action (royal blue)                         |
| `forest-700` | `#1D4ED8` | Primary hover                                        |
| `gold-500`   | `#FB7185` | Accent (warm coral) — emphasis, "new"               |
| `sage-500`   | `#10B981` | Success / progress / "completed"                    |
| `terra-500`  | `#E11D48` | Destructive / danger                                 |
| `ink-900`    | `#0F172A` | Headings                                             |
| `ink-600`    | `#475569` | Body                                                 |
| `paper-50`   | `#FFFFFF` | Cards / surface                                      |
| `paper-100`  | `#F8FAFC` | Page background                                      |
| `paper-300`  | `#E2E8F0` | Borders                                              |

**Contrast checks (WCAG AA, body 4.5:1):**
- `ink-900` on `paper-50` → 20.5:1 ✓
- `ink-600` on `paper-50` → 7.4:1 ✓
- White on `forest-600` → 5.9:1 ✓
- White on `gold-500` → 3.4:1 — large text only, not body
- White on `sage-500` → 3.0:1 — large text only, not body

**Color must never be the only signal.** Status pills always include text labels;
SkillBars use icon + text + value alongside color.

## Typography

- **Family:** Onest 300–900, single family for display + UI (Russian-designed,
  native Cyrillic, modern; replaces Fraunces+Manrope).
- **Mono:** JetBrains Mono for tabular numerals (`.num` utility).
- **Display sizes** (clamp-based, balanced):
  - `text-display-2xl` ≈ 3rem → 5.5rem (hero titles)
  - `text-display-xl` ≈ 2.5rem → 4rem (page headlines)
  - `text-display-lg` ≈ 2rem → 2.75rem (section headings)
  - `text-display-md` ≈ 1.5rem → 2rem (card titles)
- **Body:** 14–16px, `leading-relaxed` (1.625) for paragraphs.
- **Labels / eyebrows:** 11px uppercase, `tracking-[0.14em]`, font-bold.
- **Hierarchy via weight + size + color** — never via color alone.

## Layout & Spacing

- **Container:** `max-w-[1200px]` centred, `px-6` gutters.
- **Spacing scale:** Tailwind 4px increments; section spacing 24/32/40/48px.
- **Radii:** `sm 6` · default `8` · `md 10` · `lg 14` · `xl 20` · `2xl 28` · `3xl 36`.
- **Cards:** `rounded-2xl` default (28px); large hero panels `rounded-3xl`.
- **Shadows:** brand-tinted `shadow-pop` / `shadow-pop-lg` for elevated surfaces.

## Motion

- **Durations:** 150–300ms for micro; 400ms max for content transitions.
- **Easing:** `ease-out` for enters, `ease-in` for exits (per skill rec).
- **Stagger:** 30–50ms per item for list/grid reveal (already used: `.stagger-N`).
- **Reduced motion:** global `@media (prefers-reduced-motion: reduce)` in
  `index.css` strips all animation/transition durations to 0.01ms — no UI breaks.
- **Press feedback:** `active:scale-[0.98]` on buttons, `.tappable` utility for cards.

## Charts & Data Viz

For student progress visualisation (per skill recommendation):

- **4-skill bar chart** (`<SkillBars />`): Listening / Reading / Writing / Speaking.
  Each bar carries icon + label + percent + color-coded fill. Has `role=progressbar`
  + `aria-valuenow`. Color is never the only differentiator.
- **Donut/ring** (`<ProgressRing />`): for compact single-metric KPI (e.g.,
  attendance %).
- **Waffle 10×10** (`<Waffle />`): proportional progress (better than pie for
  accessibility — every cell has its own state).
- **Avoid pie charts** for >5 categories.

## Micro-interactions Inventory

- Hover lift: `hover:shadow-pop hover:border-forest-500`
- Pressed scale: `active:scale-[0.98]` (auto on `.btn`)
- Focus ring: `focus-visible:ring-4 focus-visible:ring-{color}/30 ring-offset-2`
- Input focus: 4px ring + border colour shift
- Transitions: 150–200ms standard

## Accessibility — Floor

1. **Contrast 4.5:1** for body text in light mode (verified above).
2. **Focus visible** on every interactive element — implemented globally via `.btn`,
   `.input`; never `outline:none` without ring replacement.
3. **Touch targets** ≥44×44px (button height `h-11` = 44px ✓).
4. **Keyboard navigation** — semantic HTML, no div-buttons.
5. **`aria-label`** on icon-only buttons (Bell, LogOut, profile chip, etc.).
6. **Reduced motion** respected globally.
7. **Tabular numerals** for stat numbers via `.num`.
8. **`aria-live=polite`** for toasts (TODO — currently not announced; track).

## Anti-patterns

- ❌ Emoji as icons — use lucide-react SVGs only
- ❌ Color-only meaning — always pair with icon/label
- ❌ Italic + serif (was tried; doesn't fit this product)
- ❌ Animations longer than 500ms or animating width/height (use transform)
- ❌ Disabling browser zoom or `viewport: user-scalable=no`
- ❌ Decorative-only animation that isn't tied to user action

## Stack-specific notes (React + Vite + Tailwind)

- Single-family typography — Onest loaded via Google Fonts (`subset=cyrillic`).
- Tailwind tokens defined in `frontend/tailwind.config.js`; all values referenced
  through token names, not raw hex.
- Component layer in `frontend/src/index.css` keeps `.btn-*`, `.card-*`, `.pill-*`,
  `.input` consistent.
- TanStack Query handles server state; Zustand for client.
- All pages wrapped in `ProtectedRoute` + `Layout` except `/login`.

## Page-specific overrides

If a page has its own override file at `design-system/yes-lms/pages/<page>.md`,
those rules **replace** the Master values for that page only. List of current
overrides: *(empty — using Master across the product)*.
