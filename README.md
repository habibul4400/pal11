# জান, কিছু খাবা? — with backend + admin panel

A small full-stack demo: customer-facing "will you eat something" site with a
food menu and mock bKash-style payment, plus a real backend that saves every
order and an admin panel to view them.

## What's inside

```
food-order-app/
├── server.js          ← the backend (plain Node.js, zero npm packages needed)
├── data/
│   └── orders.json    ← every order gets saved here automatically
└── public/
    ├── index.html      ← customer site (question → menu → payment)
    ├── style.css
    ├── script.js
    ├── admin.html      ← admin login + dashboard
    ├── admin.css
    └── admin.js
```

## How to run it

You need [Node.js](https://nodejs.org) installed (v16+ is fine, no other
packages needed — nothing to `npm install`).

```bash
cd food-order-app
node server.js
```

You'll see:

```
💗 Jaan Kichu Khaba server running
   Storefront:  http://localhost:3000
   Admin panel: http://localhost:3000/admin
   Admin login: admin / love123
```

- Open **http://localhost:3000** — this is the site your customers use.
- Open **http://localhost:3000/admin** — this is your admin panel.

## Admin login

Default credentials (please change them):

- **ID:** `admin`
- **Password:** `love123`

To change them, set environment variables before starting the server:

```bash
ADMIN_USER=myshopname ADMIN_PASS=a-strong-password node server.js
```

## What the admin panel shows

Once logged in you'll see, for every order:

- Order number (`ORD-0001`, `ORD-0002`, …)
- Date & time
- Food item ordered
- Price
- Phone number used for payment (partially masked)
- Transaction ID
- Status

The dashboard also auto-refreshes every 5 seconds, and there's a manual
"রিফ্রেশ" (refresh) button too.

## Important notes

- **This is a demo payment flow**, styled like bKash but not actually
  connected to bKash. No real money moves. To take real payments you'd need
  bKash's actual merchant API credentials (from their business/PGW
  onboarding) wired into `server.js` server-side — that part can't be faked,
  since it requires a real merchant account.
- Orders are stored in a plain JSON file (`data/orders.json`) — perfectly
  fine for a small shop or demo, but if this ever needs to handle serious
  volume, swap that for a real database (e.g. SQLite or Postgres).
- The admin session token is stored in the browser's `sessionStorage`, so
  logging out or closing the tab clears it. Sessions also auto-expire after
  4 hours server-side.
- If you plan to put this on the public internet, run it behind HTTPS (e.g.
  via a reverse proxy like Caddy or Nginx) so the login password isn't sent
  in plain text.
