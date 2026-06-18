# Accessibility Audit

Went through the app manually against WCAG 2.1 AA. Used keyboard only (no mouse) for most of this.

## Landmarks

| Element | Role | What it contains |
|---------|------|-----------------|
| `<header>` | banner | brand logo + nav tabs |
| `<nav>` | navigation | tab buttons |
| `<main id="main-content">` | main | all five sections |
| each `<section>` | tabpanel | one section at a time |
| `<footer>` | contentinfo | version + links |

## Heading structure

Only one section is visible at a time, so each section has its own `<h1>`. That's intentional — otherwise the hidden sections would create a weird heading tree. Sub-sections use `<h2>` and `<h3>`.

```
Dashboard (h1)
  Last 7 Days (h2)
  Category Breakdown (h2)

Finances (h1)
  Money In (h3 inside panel header)
  Money Out (h3)
  Savings (h3)

Transactions (h1)

Settings (h1)
  Initial Balance (h2)
  Currency (h2)
  Exchange Rates (h2)
  Budget Cap (h2)
  Categories (h2)

About (h1)
  (sub-sections as h2)
```

## Skip link

At the very top of `<body>`, visually hidden off-screen until focused. When you tab from the browser address bar it slides into view, Enter jumps to `#main-content`. Tested this — works.

## Keyboard navigation

| Thing | Key | What happens |
|-------|-----|-------------|
| Nav tabs | `←` `→` | moves between tabs |
| Nav tabs | `Home` / `End` | first or last tab |
| Open add modal | `Enter` on any add button | modal opens, focus goes to first field |
| Close modal | `Esc` | closes, focus returns to the button that opened it |
| Tab inside modal | `Tab` / `Shift+Tab` | stays inside modal (focus trap) |
| Submit form | `Enter` | validates and saves |
| Sort table | `Enter` on column header button | toggles asc/desc |
| Delete confirm | `Enter` on Delete button | confirms |
| Global shortcut | `Alt+N` | opens add transaction from anywhere |
| Section jump | `Alt+1` through `Alt+5` | goes to Dashboard/Finances/Transactions/Settings/About |

I tested the full keyboard flow without touching the mouse. The only slightly awkward bit is that after closing a toast notification there's nowhere obvious to go next — focus stays where it was which is fine but not ideal.

## ARIA live regions

Four of them, all in `<body>` before the main content:

| ID | Role | Live type | Used for |
|----|------|-----------|---------|
| `status-region` | status | polite | "Dashboard section", "Transaction saved" |
| `alert-region` | alert | assertive | validation errors, delete warnings |
| `budget-polite` | status | polite | "£157 left in budget" |
| `budget-assertive` | alert | assertive | "Budget exceeded by £43" |

The two budget regions exist because you can't reliably change `aria-live` on the fly. Two separate elements (one polite, one assertive) and you write to whichever one applies. Polite for "under budget", assertive for "over budget". I clear the other one when I write to one so screen readers don't announce stale text.

## Forms

- Every input has a `<label for="...">` matching the input's `id`
- Required fields have `aria-required="true"` and a visible `*`
- Error messages: each field has a `<span role="alert">` that gets filled in on blur or input
- `aria-describedby` on each input points to the error span
- `aria-invalid="true"` added when a field fails validation (red border)
- Green border on valid fields so it's not just colour indicating state

## Focus styles

```css
:focus-visible {
  outline: 3px solid #0f62fe;
  outline-offset: 2px;
}
```

IBM Carbon blue (#0f62fe) on white gives about 4.5:1 contrast which just passes AA. I checked this with a contrast checker. Buttons inside the dark hero section on the landing page use white focus rings instead.

## Colour contrast

Checked the main combinations:

| Text | Background | Ratio | Pass? |
|------|------------|-------|-------|
| #161616 (main text) | #ffffff | 16:1 | yes |
| #525252 (secondary text) | #ffffff | 6.5:1 | yes |
| #0f62fe (links/interactive) | #ffffff | 4.5:1 | yes (barely) |
| white text on blue button | #0f62fe | 4.5:1 | yes |
| #0e6027 (success) | #defbe6 (success bg) | 5.4:1 | yes |
| #a2191f (error text) | #fff1f1 (error bg) | 6.5:1 | yes |
| white hero text | #0d1117 (dark hero) | ~14:1 | yes |

The hero chip labels (rgba white at 40% opacity on #0d1117) are decorative/redundant text so contrast there matters less.

## Modals

Both modals (`transaction-modal` and `delete-modal`):

- `role="dialog" aria-modal="true"`
- `aria-labelledby` points to the heading inside the modal
- Tab trap — can't tab out while open
- ESC closes and puts focus back on whatever opened it
- Background scrolling locked (`overflow: hidden` on body)
- Clicking the overlay also closes
- Opens with a slide-up animation, `prefers-reduced-motion` disables it

## Table

- `aria-label` on the `<table>` element
- `<th scope="col">` for all column headers
- Sort buttons inside `<th>` elements with `aria-sort` that JS updates
- Mobile view uses `data-label` attributes + CSS `::before` to label each cell since the header is hidden
- Table wrapper has `tabindex="0"` so keyboard users can scroll horizontally if needed

## Search highlight

Matches get wrapped in `<mark>`, which has semantic meaning in HTML. The text gets HTML-escaped before the regex runs so injecting something like `<img onerror=...>` in the search box does nothing.

## Known issues

- The `type="date"` calendar popup looks different in every browser and I can't really style it. The field still works as a text input with regex validation if the calendar doesn't show.
- `<mark>` announcement is inconsistent across screen readers (VoiceOver vs NVDA). The accessible hidden chart table compensates for the visual bar chart not being readable.
- Colour indicators on the balance card (green = positive, red = over budget) are paired with text labels so it's not colour-only.
