# Student Finance Tracker

A responsive, accessible finance tracking app built for the Responsive UI summative assignment. The goal was to build something that would actually be useful for tracking student spending — not just a generic CRUD demo.

**Live demo:** [https://Runweztt.github.io/student-finance-tracker](https://Runweztt.github.io/student-finance-tracker)

---

## Overview

Built with plain HTML, CSS, and vanilla JavaScript (ES Modules). No frameworks, no libraries, no build step — just files you can open in a browser.

The app lets you:
- Log and manage transactions across categories
- Search using text or regex patterns
- See a 7-day spending chart and category breakdown
- Set a budget cap that alerts you when you go over
- Switch between USD, EUR, and RWF with manual exchange rates in Settings
- Export your data as JSON and import it back

---

## Features

- **Regex validation** on all four required fields, plus duplicate-word detection
- **Live search** with regex support, case-sensitive toggle, and `<mark>` highlighting
- **Sortable table** — click date, description, or amount column headers
- **Accessible modals** with focus trapping, ESC to close, and focus restoration
- **ARIA live regions** — polite for status, assertive for budget alerts
- **Keyboard navigation** throughout — full tab order, arrow keys on nav tabs
- **LocalStorage** persistence with corruption handling
- **JSON import/export** with per-record validation and error messages
- **Mobile-first layout** at 360px, 768px, and 1024px breakpoints
- **Dark mode** support via `prefers-color-scheme`

---

## Pages

| File | Description |
|------|-------------|
| `index.html` | Landing / home page — hero, features, CTAs |
| `login.html` | Sign-in form |
| `register.html` | Account creation form |
| `app.html` | The protected finance tracker (dashboard, transactions, settings, about) |

Auth is localStorage-based. Passwords are hashed with SHA-256 + random salt via the Web Crypto API (`scripts/auth.js`). No data leaves the browser.

## Folder Structure

```
student-finance-tracker/
├── index.html          ← Home / landing page
├── login.html          ← Sign-in page
├── register.html       ← Account creation page
├── app.html            ← Protected finance tracker
├── tests.html          ← Validation unit tests
├── seed.json           ← 12 sample transactions
├── README.md
│
├── styles/
│   ├── variables.css   ← design tokens
│   ├── reset.css       ← CSS reset + a11y utilities
│   ├── layout.css      ← structural layout
│   ├── components.css  ← buttons, inputs, table, chart, modals, toasts
│   ├── home.css        ← home page + auth page styles
│   └── responsive.css  ← media queries (360/768/1024px)
│
├── scripts/
│   ├── app.js          ← entry point, event wiring
│   ├── auth.js         ← registration, login, logout (Web Crypto SHA-256)
│   ├── state.js        ← reactive store (getState/setState/subscribe)
│   ├── storage.js      ← localStorage with try/catch
│   ├── validators.js   ← all regex patterns + validation functions
│   ├── search.js       ← safe regex compiler, highlight, sort/filter
│   ├── stats.js        ← pure computation (totals, trend, breakdown)
│   ├── settings.js     ← settings form, currency formatting
│   ├── ui.js           ← all DOM rendering
│   └── importExport.js ← JSON round-trip
│
└── docs/
    ├── wireframes.md
    └── accessibility-audit.md
```

---

## Regex Catalog

All patterns live in `scripts/validators.js`.

| Field | Pattern | Notes |
|-------|---------|-------|
| Description | `/^\S(?:.*\S)?$\|^\S$/` | No leading/trailing whitespace |
| Amount | `/^(0\|[1-9]\d*)(\.\d{1,2})?$/` | Non-negative, max 2 decimals |
| Date | `/^\d{4}-(0[1-9]\|1[0-2])-(0[1-9]\|[12]\d\|3[01])$/` | YYYY-MM-DD |
| Category | `/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/` | Letters, spaces, hyphens |
| **Duplicate word** | `/\b(\w+)\s+\1\b/i` | Back-reference — catches "the the" |
| **Cents** | `/\b\d+\.\d{2}\b/` | Used as a demo search pattern |
| Beverage | `/(coffee\|tea\|juice\|drink)/i` | Demo search pattern |

The duplicate-word pattern is the advanced regex (back-reference). It runs on the description field in real time and shows a warning if you accidentally type a word twice.

---

## Accessibility Notes

- Skip-to-content link appears on first Tab keypress
- Navigation uses ARIA `role="tablist"` with arrow key support
- All dialogs have `role="dialog" aria-modal="true"` with focus trapping
- Form fields use `aria-describedby` linking to hints and error messages
- Errors announced via `aria-live="assertive"` regions
- Budget cap status uses two separate live regions — polite (under budget) and assertive (over budget)
- Chart has a visually hidden accessible table as a screen reader alternative
- Color contrast meets WCAG 2.1 AA minimum
- All interactive elements reachable by keyboard

---

## Keyboard Navigation Map

| Key | Action |
|-----|--------|
| `Tab` | Move between interactive elements |
| `Shift+Tab` | Move backwards |
| `Enter` / `Space` | Activate button or link |
| `←` `→` | Move between navigation tabs (when focused) |
| `Home` / `End` | First / last navigation tab |
| `Esc` | Close any open modal |
| `Alt+N` | Open "Add Transaction" from anywhere |
| `Alt+1` | Go to Dashboard |
| `Alt+2` | Go to Finances |
| `Alt+3` | Go to Transactions |
| `Alt+4` | Go to Settings |
| `Alt+5` | Go to About |

---

## Running Tests

Open `tests.html` in a browser. It runs automatically and shows pass/fail for all validators. The page needs to be served (not `file://`) because it uses ES module imports.

Quick way to serve locally:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then visit `http://localhost:8080/tests.html`.

---

## Installation / Running Locally

No build step needed. Needs to be served (not `file://`) because of ES module imports.

```bash
git clone https://github.com/Runweztt/student-finance-tracker
cd student-finance-tracker
npx serve .
```

Open `http://localhost:3000`. You'll land on the home page — create an account or sign in, then you're taken to the tracker.

To load the seed data: Transactions → Import JSON → select `seed.json`.

---

## GitHub Pages Deployment

```bash
git checkout -b gh-pages
git push origin gh-pages
```

Then enable GitHub Pages in repo settings → Pages → Source: `gh-pages` branch, `/ (root)`.

The app uses only relative paths and no server-side dependencies so it works on GitHub Pages without any configuration.

---

## Screenshots

_Add screenshots here after deployment._

| Dashboard | Transactions | Mobile |
|-----------|-------------|--------|
| _(screenshot)_ | _(screenshot)_ | _(screenshot)_ |

---

## Design Decisions

**CSS custom properties instead of a utility class library** — makes theming and dark mode much easier to maintain, and keeps the CSS readable without digging through 30 class names on each element.

**Two separate ARIA live regions for budget alerts** — you can't change `aria-live` dynamically in a reliable way across browsers, so I use a polite region for "under budget" messages and an assertive region for "over budget" alerts.

**ES modules without a bundler** — the module graph is simple enough that bundling isn't needed for a project this size. GitHub Pages serves `type="module"` scripts correctly.

**Storing amounts in USD** — currency conversion is a display concern only. EUR and RWF are derived from the stored USD value using the user-set exchange rate. Switching currencies does not change stored data.

**Savings have no delete button** — this is intentional. The assignment brief asked for a "permanent savings" type that never leaves regardless. Savings rows are locked; only the "Clear all transactions" button in Settings can remove them. Income and expense transactions can be deleted normally.

**Mobile card layout vs. table** — the responsive table uses `display: block` with `data-label` pseudo-elements on mobile instead of forcing horizontal scroll. Easier to read on small screens.

---

## Known Limitations

- Date validation uses regex only — it accepts structurally valid but calendar-invalid dates like `2025-02-31`. A full calendar validation would complicate the regex significantly and the date input type already prevents most of these.
- Exchange rates are manual — there's no API integration, so rates go stale. This was a deliberate assignment constraint.
- The 7-day chart only shows spending, not income (the assignment only covers expense tracking).
- No pagination — all transactions render at once. Fine for student-scale data but would need pagination at hundreds of records.

---

## Commit History (Milestone Map)

For reference, the development followed these milestones:

```
M1: docs: add wireframes and data model sketch
M2: feat: semantic HTML layout and base CSS
M3: feat: form validation with four regex rules
M3: feat: tests.html with validator assertions
M4: feat: transaction table with sort and search
M4: fix: safe regex compiler handles invalid patterns
M5: feat: dashboard stats and 7-day chart
M5: feat: category breakdown with proportional bars
M6: feat: localStorage persistence and import/export
M6: feat: currency settings and budget cap
M7: fix: keyboard focus trap in modals
M7: style: improve focus visibility and animations
M7: docs: complete README with regex catalog
```
