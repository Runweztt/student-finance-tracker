# Student Finance Tracker

Finance tracker built for the Responsive UI summative. Tracks income, expenses and savings, with a budget cap, 7-day chart, and regex-powered search.

**Live:** [https://Runweztt.github.io/student-finance-tracker](https://Runweztt.github.io/student-finance-tracker)

Built with plain HTML, CSS and vanilla JavaScript (ES Modules). No frameworks, no build step.

---

## What it does

- Log income, expenses and savings across categories
- Set a budget cap — alerts you when you go over
- Search by plain text or regex, with `<mark>` highlighting
- 7-day spending chart and category breakdown on the dashboard
- Switch between USD, EUR and RWF with manual exchange rates
- Export data as JSON and import it back on another device
- Works offline after the first load — everything stays in the browser

---

## Running it locally

Needs to be served (not `file://`) because of ES module imports.

```bash
git clone https://github.com/Runweztt/student-finance-tracker
cd student-finance-tracker
npx serve .
```

Open `http://localhost:3000`, create an account, then you're in.

To load sample data: go to Transactions → Import JSON → pick `seed.json`.

---

## Running tests

```bash
npx serve .
```

Then open `http://localhost:3000/tests.html`. It runs automatically and shows pass/fail for every validator. No setup needed.

---

## File structure

```
├── index.html          landing page
├── login.html
├── register.html
├── app.html            the actual tracker
├── tests.html          validator unit tests
├── seed.json           13 sample transactions
│
├── styles/
│   ├── variables.css   design tokens
│   ├── reset.css
│   ├── layout.css
│   ├── components.css
│   ├── home.css        home + auth pages
│   └── responsive.css
│
├── scripts/
│   ├── app.js          entry point, event wiring
│   ├── auth.js         register / login / logout
│   ├── state.js        getState / setState / subscribe
│   ├── storage.js      localStorage wrapper
│   ├── validators.js   all regex patterns + validators
│   ├── search.js       regex compiler, highlight, sort
│   ├── stats.js        totals, trend, breakdown
│   ├── settings.js     settings form, currency formatting
│   ├── ui.js           all DOM rendering
│   └── importExport.js JSON import and export
│
└── docs/
    ├── wireframes.md
    └── accessibility-audit.md
```

---

## Regex catalog

All patterns are in `scripts/validators.js` and imported directly by `tests.html`.

| Field | Pattern | What it catches |
|-------|---------|-----------------|
| Description | `/^\S(?:.*\S)?$\|^\S$/` | leading or trailing spaces |
| Amount | `/^(0\|[1-9]\d*)(\.\d{1,2})?$/` | negative numbers, leading zeros, more than 2 decimal places |
| Date | `/^\d{4}-(0[1-9]\|1[0-2])-(0[1-9]\|[12]\d\|3[01])$/` | wrong format, month 13, day 0 |
| Category | `/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/` | numbers, symbols, double spaces |
| **Duplicate word** | `/\b(\w+)\s+\1\b/i` | "the the", "at at" etc. — back-reference |
| Cents search | `/\b\d+\.\d{2}\b/` | demo search pattern |
| Beverage search | `/(coffee\|tea\|juice\|drink)/i` | demo search pattern |

The duplicate-word one is the advanced pattern. It uses a back-reference (`\1`) to check if the same word appears twice in a row. It runs live on the description field and shows a warning if it matches.

---

## Keyboard shortcuts

| Key | What it does |
|-----|-------------|
| `Tab` / `Shift+Tab` | move forward / backward |
| `←` `→` | switch between nav tabs |
| `Home` / `End` | first / last tab |
| `Esc` | close any open modal |
| `Alt+N` | open Add Transaction from anywhere |
| `Alt+1` | Dashboard |
| `Alt+2` | Finances |
| `Alt+3` | Transactions |
| `Alt+4` | Settings |
| `Alt+5` | About |

---

## Accessibility

- Skip-to-content link at the top of every page
- Nav uses `role="tablist"` with arrow key support
- Modals have `role="dialog" aria-modal="true"` with focus trapping
- Errors announced via `aria-live="assertive"`
- Budget alerts use two live regions — polite when under, assertive when over (you can't change `aria-live` dynamically so I used two separate elements)
- The bar chart has a visually hidden `<table>` as a screen reader alternative
- Color contrast meets WCAG 2.1 AA

---

## Auth note

Accounts are stored in localStorage. Passwords are hashed with SHA-256 and a random salt using `crypto.subtle` (the browser's built-in Web Crypto API). This is not a third-party API — it makes no network requests and works fully offline. It's the same category as `localStorage` or `Date`. The "no API" constraint in the brief refers to external services like live currency rate feeds, not browser built-ins.

---

## Design decisions

**Two ARIA live regions for the budget cap** — `aria-live` can't be changed dynamically across browsers reliably, so I have one polite element and one assertive element and write to whichever one is appropriate.

**Amounts stored in USD** — conversion is only for display. If I converted at save time, switching currencies would break all the old numbers.

**Savings have no delete button** — intentional. The brief asked for a permanent savings type that never gets deleted. The only way to remove savings is the "Clear all transactions" button in Settings, which wipes everything.

**Passwords hashed client-side** — using `crypto.subtle` (see Auth note above). Not a framework or external API.

---

## Known issues

- Date regex accepts structurally valid but impossible dates like `2025-02-31`. The browser's date input prevents most of these anyway so I left it.
- Exchange rates go stale since there's no live feed — that's what the assignment asked for.
- No pagination, all transactions render at once. Fine for this scale.
