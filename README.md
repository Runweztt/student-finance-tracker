# Student Finance Tracker

This is my summative project for the Responsive UI module. I built a finance tracker where you can log income, expenses and savings, set a budget, search through your transactions and see a spending chart. Everything runs in the browser with no server.

**Live:** [https://Runweztt.github.io/student-finance-tracker](https://Runweztt.github.io/student-finance-tracker)

**Demo video:** [https://youtu.be/E4_IV2eVZuk](https://youtu.be/E4_IV2eVZuk)

Plain HTML, CSS and JavaScript. No frameworks, no build step, no external libraries.

## What it does

- Add income, expenses and savings with a description, amount, category and date
- Set a budget cap and get an alert when you go over it
- Search transactions using plain text or a regex pattern
- See a 7 day spending chart and a breakdown by category on the dashboard
- Switch between USD, EUR and RWF in settings with your own exchange rates
- Export your transactions as JSON and import them back
- Everything saves automatically to localStorage so nothing is lost on refresh

## How to run it

The app needs to be served because it uses ES modules. It won't work if you just open the HTML file directly.

```bash
git clone https://github.com/Runweztt/student-finance-tracker
cd student-finance-tracker
npx serve .
```

Open `http://localhost:3000` and create an account. To load the sample data go to Transactions, click Import JSON and pick `seed.json`.

## Running the tests

With the server running open `http://localhost:3000/tests.html`. The page runs all the validator tests automatically and shows which ones pass or fail.

## File structure

```
├── index.html          home page
├── login.html
├── register.html
├── app.html            the main tracker
├── tests.html          runs all the regex tests
├── seed.json           13 sample transactions to import
│
├── styles/
│   ├── variables.css   colour and spacing tokens
│   ├── reset.css
│   ├── layout.css
│   ├── components.css
│   ├── home.css
│   └── responsive.css
│
├── scripts/
│   ├── app.js          entry point, wires up all the events
│   ├── auth.js         login and registration
│   ├── state.js        stores all the app data
│   ├── storage.js      reads and writes to localStorage
│   ├── validators.js   all the regex patterns
│   ├── search.js       search and sorting
│   ├── stats.js        calculates the dashboard numbers
│   ├── settings.js     settings form and currency conversion
│   ├── ui.js           all the DOM rendering
│   └── importExport.js JSON import and export
│
└── docs/
    ├── wireframes.md
    └── accessibility-audit.md
```

## Regex patterns

All patterns live in `scripts/validators.js` and are imported by `tests.html` to test them directly.

| Field | Pattern | What it rejects |
|-------|---------|-----------------|
| Description | `/^\S(?:.*\S)?$/` | leading or trailing spaces |
| Amount | `/^(0\|[1-9]\d*)(\.\d{1,2})?$/` | negative numbers, leading zeros, more than 2 decimal places |
| Date | `/^\d{4}-(0[1-9]\|1[0-2])-(0[1-9]\|[12]\d\|3[01])$/` | wrong format, month 13, day 0 |
| Category | `/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/` | numbers, symbols, double spaces |
| Duplicate word | `/\b(\w+)\s+\1\b/i` | catches things like "the the" or "at at" |
| Cents | `/\b\d+\.\d{2}\b/` | used as a search demo |
| Beverage | `/(coffee\|tea\|juice\|drink)/i` | used as a search demo |

The duplicate word pattern is the advanced one. It uses a back-reference so `\1` matches whatever `(\w+)` captured. It runs in real time on the description field and shows a small warning if it finds a repeated word.

## Keyboard shortcuts

| Key | What it does |
|-----|-------------|
| Tab / Shift+Tab | move forward and backward |
| Arrow keys | switch between nav tabs |
| Home / End | first or last tab |
| Esc | close any modal |
| Alt+N | open Add Transaction from anywhere |
| Alt+1 to Alt+5 | jump to Dashboard, Finances, Transactions, Settings, About |

## Accessibility

- Skip to content link at the top of every page
- Nav tabs use arrow keys following the ARIA tablist pattern
- Modals trap focus and restore it when closed
- All form errors are announced by screen readers
- Budget cap uses two separate live regions because you can't switch aria-live dynamically
- The spending chart has a hidden table version for screen readers
- Tested for WCAG 2.1 AA colour contrast

## A note on the auth

Passwords are hashed with SHA-256 and a random salt using `crypto.subtle`. That is a browser built-in, not a third party API. It makes no network requests and works offline. The no API rule in the brief is about things like calling a live exchange rate service, not standard browser features.

## Some decisions I made

I stored amounts in USD internally and only convert for display. That way changing currency in settings does not break your existing data.

Savings transactions have no delete button on purpose. The idea was that savings should be permanent and not easy to accidentally remove. The only way to clear them is the Clear all transactions button in Settings.

I used two ARIA live regions for the budget cap instead of one because browsers do not reliably update aria-live if you change it after the element is rendered. One region is polite for when you are under budget and one is assertive for when you go over.

## Known issues

The date regex does not catch impossible dates like 2025-02-31, it only checks the format. The browser date picker handles most of those cases anyway so I left it.

Exchange rates are set manually in settings. They do not update automatically which is what the assignment asked for.
