# sessions.guide — Design System

All UI work must follow these rules without exception. Check here before writing any component.

---

## CSS Variables

Defined in `src/app/globals.css`:

```css
:root {
  --color-bg:      #F4F1ED;   /* Warm Sand — page background */
  --color-olive:   #444732;   /* Olive — buttons, accents, logo, h1 color */
  --color-dark:    #111111;   /* Near-black — body text */
  --color-light:   #ffffff;   /* White */
  --color-border:  #D9D5CF;   /* Warm grey — borders, dividers */
  --color-surface: #EDEAE5;   /* Slightly darker sand — cards, input backgrounds */

  --font-display:  "SessionsGuide", Arial, sans-serif;
  --font-heading:  "itc-avant-garde-gothic-pro", Arial, sans-serif;
  --font-ui:       "dm-mono", "DM Mono", monospace;
}
```

**Never hardcode hex values. Always use CSS variables or Tailwind tokens.**

---

## Typography

### Font Loading
Adobe Fonts via Typekit CDN in `<head>`:
```html
<link rel="stylesheet" href="https://use.typekit.net/[kit-id].css" />
```
Fonts: `minerva-modern` (mapped as SessionsGuide display), `itc-avant-garde-gothic-pro`, `barlow-condensed`
DM Mono via Google Fonts.

### Type Scale

```css
h1 {
  font-family: var(--font-display);   /* SessionsGuide — h1 ONLY */
  font-size: clamp(2.25rem, 5vw, 4rem);
  line-height: 1.05;
  color: var(--color-olive);          /* h1 is always olive */
  letter-spacing: -0.02em;
}

h2 {
  font-family: var(--font-heading);   /* ITC Avant Garde — weight 300 */
  font-weight: 300;
  font-size: clamp(1.5rem, 3vw, 2.5rem);
  line-height: 1.1;
  letter-spacing: -0.01em;
}

h3 {
  font-family: var(--font-heading);
  font-weight: 300;
  font-size: clamp(1.1rem, 2vw, 1.75rem);
  line-height: 1.15;
}

h4 {
  font-family: var(--font-heading);
  font-weight: 300;
  font-size: 1.1rem;
  line-height: 1.2;
}

h5, h6 {
  font-family: var(--font-ui);        /* DM Mono */
  font-size: 0.8rem;
  line-height: 1.4;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

p {
  font-family: var(--font-heading);
  font-weight: 300;
  font-size: 0.95rem;
  line-height: 1.65;
}

.caption, .label {
  font-family: var(--font-ui);
  font-size: 0.75rem;
  line-height: 1.4;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
```

### Font Usage Rules
- `SessionsGuide` (display): **h1 only** and the word "SESSIONS" in the practitioner profile header
- `ITC Avant Garde Gothic Pro` (weight 300): h2, h3, h4, body paragraphs
- `DM Mono`: h5, h6, captions, UI labels, session names and durations on cards, button text, nav items

---

## Practitioner Profile Page Layout

From approved design mockup:

### Header
- Full-width hero banner image (Cloudinary, focal point auto-crop)
- Circular practitioner logo/photo centered and overlapping the banner bottom edge
- Practitioner name + tagline in `var(--font-heading)` weight 300, centered below banner

### Info Strip (below hero, above about)
Three columns of equal width, left-aligned within each:
- **Modalities** — h5 label + modality names in body text
- **Locations** — h5 label + city names derived from availability blocks
- **Links** — h5 label + Website, Instagram, YouTube links
- **Rating** — star rating display + numeric average + "SEE ALL REVIEWS >" link (DM Mono)

### About Section
Two-column layout:
- Left (~60%): "ABOUT" label (h5/DM Mono) + bio paragraph
- Right (~40%): BOOK button (filled olive) + INQUIRE button (outlined)

### Sessions Section
- "[Practitioner Name]" in `var(--font-heading)` weight 300, centered
- "SESSIONS" in `var(--font-display)` (SessionsGuide), large, olive, centered
- 2-column grid of session type cards:
  - Full-width session photo (Cloudinary)
  - Session name in DM Mono uppercase
  - Duration in DM Mono uppercase (e.g. "90 MINUTES")
  - Description in body text
  - "BOOK SESSION" button (filled olive, DM Mono)

---

## Buttons

```css
/* Primary — olive filled */
.btn-primary {
  background-color: var(--color-olive);
  color: var(--color-light);
  font-family: var(--font-ui);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.75rem 1.5rem;
  border: none;
  cursor: pointer;
}

/* Secondary — outlined */
.btn-secondary {
  background-color: transparent;
  color: var(--color-olive);
  font-family: var(--font-ui);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.75rem 1.5rem;
  border: 1.5px solid var(--color-olive);
  cursor: pointer;
}
```

No border-radius on buttons (square/sharp corners). No shadow.

---

## Navigation

Top bar: `SESSIONS.GUIDE` logo (left) × `PRACTITIONER NAME` (center) + `+` icon (right)
- Logo and name in DM Mono uppercase
- Clean, minimal — no heavy nav chrome

---

## Spacing + Layout

- Generous whitespace — editorial rhythm, not dense SaaS
- Max content width: ~1200px, centered
- Mobile and desktop given equal design attention
- Section dividers: `var(--color-border)` hairline — no heavy rules

---

## Cards (Practitioner / Search Results)

- Background: `var(--color-surface)`
- Border: 1px `var(--color-border)`
- No border-radius (or very subtle: 2px max)
- Photo at top, full width of card
- Text below: practitioner name (h4), primary modality (DM Mono label), location (DM Mono label), rating

---

## Aesthetic Principles

- Refined, editorial, grounded. High-end wellness publication, not SaaS dashboard.
- Warm neutrals throughout — no bright colors, no gradients
- Discovery feels exploratory, not transactional
- Booking UI is frictionless and low-anxiety — sensitive context
- DM Mono used for all UI chrome (labels, buttons, captions) — creates the editorial/utilitarian contrast against the soft heading font
- No em dashes in any copy
- No rounded pill buttons — sharp or very subtly rounded only

