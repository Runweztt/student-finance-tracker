# M1 Wireframes and Data Model

I'm building a single-page app with five sections, all on the same page. No reloads, just show/hide.

Nav tabs across the top:

```
[Dashboard] [Finances] [Transactions] [Settings] [About]
```

## Dashboard

The main overview. Four stat cards at the top, then the 7-day chart and category breakdown below.

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Balance  │ │ Money In │ │Money Out │ │ Savings  │
│ £3,200   │ │ £1,500   │ │  £300    │ │  £200    │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

┌──────────────────────────┐  ┌────────────────────┐
│  Last 7 days             │  │  Category breakdown│
│                          │  │                    │
│  █                       │  │  Food      ████ £  │
│  █   █                   │  │  Books     ██   £  │
│  █   █  █  █             │  │  Transport ██   £  │
└──────────────────────────┘  └────────────────────┘
```

Budget cap alert shows below the cards when spending gets close or goes over.

## Finances

This is where you actually move money around. Three panels: Money In, Money Out, Savings. Each panel groups transactions by category.

```
[+ In]  [- Out]  [🏦 Save]      ← quick-add buttons

Balance  £3,200   In  £1,500   Out  £300   Savings  £200

Money In ↑
  Student loan
    Student loan  Jun 2025  £1,200
    Bar work      Jun 2025  £300

Money Out ↓
  Food
    Lunch         Jun 2025  £6.50  [edit] [delete]
    Groceries     Jun 2025  £34    [edit] [delete]
```

Savings rows don't have a delete button — once saved, it stays.

## Transactions

Full table of all transactions, all types, with search and sort.

```
┌──────────────────────────────────────────────────────────┐
│ Transactions     24 records             [Add Transaction] │
├──────────────────────────────────────────────────────────┤
│ [search...] [case ○] [all categories ▼]                  │
│ [Import JSON] [Export JSON]                              │
├──────────────────────────────────────────────────────────┤
│ Type │ Date ↓ │ Description ↕ │ Category │ Amount ↕ │    │
├──────┼────────┼───────────────┼──────────┼──────────┼────┤
│  ↑   │ Jun 25 │ Student loan  │ Income   │ £1,200   │ ✎  │
│  ↓   │ Jun 25 │ Lunch         │ Food     │ £6.50    │ ✎ 🗑│
│  🏦  │ Jun 25 │ Emergency fund│ Savings  │ £200     │ ✎  │
└──────────────────────────────────────────────────────────┘
```

Mobile collapses to stacked rows with labels on the left.

## Settings

```
Initial Balance
  £ [10,000.00]   ← your starting amount before any transactions

Currency
  ● GBP  ○ USD  ○ EUR  ○ RWF

Exchange Rates (to GBP)
  1 GBP = [1.27] USD
  1 GBP = [1.17] EUR
  1 GBP = [1,450] RWF

Budget Cap (monthly spending limit)
  £ [500.00]

Categories (editable)
  [Food] [Books] [Transport] [Entertainment] [Fees] [Other] [Housing ×]
  Add: [________] [Add]

[Save Settings]  [Reset to Defaults]
```

## About

Project purpose, my GitHub link, email, keyboard shortcuts table, and tech stack.

## Data Model

Each transaction looks like this:

```js
{
  id:          "txn_abc123",
  type:        "expense",          // "income", "expense", or "savings"
  description: "Lunch at cafe",
  amount:      6.50,               // always stored in GBP
  category:    "Food",
  date:        "2025-09-25",
  createdAt:   "2025-09-25T12:00:00.000Z",
  updatedAt:   "2025-09-25T12:00:00.000Z"
}
```

Savings type has no delete — it's permanent. When you spend money (expense) you have to give a reason in the description field.

The balance works like: `initialBalance + totalIncome - totalExpenses`. Savings don't affect it.

Everything goes into localStorage under `sft:v1`:

```js
{
  v: 1,
  data: {
    transactions: [...],
    settings: {
      baseCurrency: "GBP",
      initialBalance: 10000,
      rates: { USD: 1.27, EUR: 1.17, RWF: 1450 },
      budgetCap: 500,
      categories: ["Food", "Books", "Transport", "Entertainment", "Fees", "Other"]
    }
  }
}
```

UI state (what tab you're on, search query, sort order) is not saved — resets on reload which is fine.

## Accessibility plan

- Proper landmarks: `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`
- Nav tabs use `role="tablist"` with arrow key navigation
- Modals: `role="dialog" aria-modal="true"` with focus trap and ESC to close
- Two separate ARIA live regions for budget (one polite, one assertive) because you can't change live dynamically
- Skip link at top
- `<mark>` for search highlights
- All inputs need visible labels and inline error messages

## File structure plan

```
index.html         ← landing page
app.html           ← main app (SPA)
login.html
register.html
tests.html
seed.json
docs/
styles/
  variables.css    ← tokens first, everything else imports from here
  reset.css
  layout.css
  components.css
  responsive.css
  home.css
scripts/
  storage.js       ← localStorage, no other deps
  validators.js    ← regex patterns, no other deps
  state.js         ← imports storage
  search.js        ← no deps
  stats.js         ← no deps
  settings.js      ← imports state, validators
  ui.js            ← imports state, stats, search, settings
  importExport.js  ← imports state, storage, validators
  app.js           ← imports everything, wires up events
```

Kept the dependency graph acyclic so there are no circular import issues.
