# Nova Tracker — Landing Page

Static download/marketing site for **Nova Tracker**, a Flutter + Firebase expense
tracker. Visitors can browse a Play-Store-style screenshot carousel, download
the APK, and submit feedback that lands in a **private Google Sheet only you
can open** — visitors can send feedback but never read anyone's, including
their own past submissions (aside from a same-device local echo, exportable
as a CSV file, purely as a safety net — see § 4–5 for the full privacy model).

No backend server, no build step, no third-party JS libraries required — this
is a plain HTML/CSS/JS site that runs entirely on GitHub Pages.

```
nova-tracker-site/
├── index.html                     ← the whole page
├── local-feedback-backup.html     ← per-device safety-net copy — NOT the shared inbox (see § 4)
├── css/style.css
├── js/script.js                   ← carousel + rating + feedback logic (no dependencies)
├── js/sheet-config.js             ← YOUR Google Sheet Web App URL goes here
├── apps-script/Code.gs            ← paste this into your Google Sheet's Apps Script
├── assets/screenshots/            ← 5 app screenshots used in the carousel
├── apk/
│   ├── NovaTracker.apk            ← put your real APK here (see apk/PUT_APK_HERE.txt)
│   └── PUT_APK_HERE.txt
├── package.json                    ← optional, not required for GitHub Pages
└── README.md
```

---

## 1. Put this on GitHub

```bash
cd nova-tracker-site
git init
git add .
git commit -m "Nova Tracker landing page"
git branch -M main
git remote add origin https://github.com/<your-username>/nova-tracker-site.git
git push -u origin main
```

## 2. Turn on GitHub Pages

1. On GitHub, open your repo → **Settings** → **Pages**.
2. Under "Build and deployment", set **Source** to `Deploy from a branch`.
3. Branch: `main`, folder: `/ (root)` → **Save**.
4. GitHub gives you a URL like:
   `https://<your-username>.github.io/nova-tracker-site/`
   It usually goes live in 1–2 minutes.

Nothing on this site needs to build or install — the screenshot carousel is
plain vanilla JS (no Swiper, no npm package required at runtime), so there's
one less thing that can silently fail.

---

## 3. Add the real APK

Drop your built APK into `apk/NovaTracker.apk` (exact filename), then delete
`apk/PUT_APK_HERE.txt`. The **Download APK** button already points at
`apk/NovaTracker.apk`.

If your APK is large, upload it as a **GitHub Release** asset instead of
committing the binary — see `apk/PUT_APK_HERE.txt` for the exact steps and
what to change in `index.html`.

---

## 4. Set up feedback storage — a Google Sheet

Every feedback submission is sent to a **Google Apps Script Web App**, which
appends it as a new row in a Google Sheet you own. You open that sheet any
time to read, sort, filter, or download all feedback as a `.csv`/`.xlsx` file.

> **Who can see feedback?** Only you (or anyone you explicitly share the
> Sheet with) — never other visitors. Visitors can only *submit* to the
> endpoint; there's no way to read data back through it (the Apps Script has
> no `doGet`). The one thing that actually controls visibility is the
> Sheet's own **Share** setting — leave it at the default ("Restricted",
> only people you add), and never switch it to "Anyone with the link," or
> everyone's name/email/message becomes publicly viewable.

**Setup (about 5 minutes, no billing account needed):**

1. Create a new sheet at [sheets.new](https://sheets.new). Name it something
   like "Nova Tracker Feedback".
2. In the sheet, go to **Extensions → Apps Script**.
3. Delete the placeholder `myFunction() {}` code, and paste in the contents
   of `apps-script/Code.gs` from this repo instead. Save (the disk icon).
4. Click **Deploy → New deployment**. Click the gear icon next to "Select
   type" and choose **Web app**.
   - Description: anything, e.g. "Feedback receiver"
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click **Deploy**. Google will ask you to authorize the script the first
   time — click through the "unverified app" warning (it's your own script)
   and allow it.
6. Copy the **Web app URL** it gives you — it ends in `/exec`.
7. Paste that URL into `js/sheet-config.js`, replacing the placeholder:

   ```js
   const SHEET_WEB_APP_URL = "https://script.google.com/macros/s/AKfycb.../exec";
   ```

8. Commit and push. This URL is safe to commit — by itself it can only
   append rows to that one script's sheet; it can't read your other files or
   Google account data.

**Where do I see the feedback?**
Open the Google Sheet — a tab called **Feedback** is created automatically on
the first submission, with columns for received time, name, email, type,
rating, message, page, and browser. Sort/filter like any spreadsheet, or
`File → Download` to get a `.csv` or `.xlsx` copy any time.

If a visitor submits before you've configured `SHEET_WEB_APP_URL`, the site
tells them their feedback was saved locally only (see below) — nothing is
silently lost.

---

## 5. Local backup — `local-feedback-backup.html`

Every submission is *also* written to that visitor's own browser
`localStorage`, regardless of whether the Google Sheet is configured — purely
so a submission is never silently lost if the network request to the Sheet
fails. Opening **`local-feedback-backup.html`** shows a table of feedback
stored on that specific device, with buttons to:

- **Export as CSV** — downloads a `.csv` file of everything logged locally
- **Clear local log** — wipes the local copy on that device

**This page is not a shared admin panel.** It only ever shows what was
submitted from that one browser — it cannot show what anyone else sent, and
a random visitor opening it just sees their own (or no) submissions. It's
also marked `noindex` so search engines won't list it. For feedback
collected across *all* your visitors — the actual inbox — the private
Google Sheet from step 4 is the one and only source of truth.

---

## 6. Screenshots used in the carousel

Five screens are shown, matching a Play-Store-style preview:
`login.png`, `dashboard.png`, `expenses.png`, `analytics.png`, `profile.png`
— all in `assets/screenshots/`. Swap any of them out for updated app
screenshots any time; keep the same filenames, or update the `<img src>`
paths in `index.html`.

The carousel itself (`.carousel__track` + `initCarousel()` in `js/script.js`)
is plain HTML/CSS scroll-snap with a small vanilla-JS layer for the arrows,
dots, and autoplay — swipe on mobile and trackpad, click-drag on desktop, or
use the ‹ › arrows / dots. No external slider library, so there's nothing
that can fail to load from a CDN.

---

## 7. What was fixed from the first version

- **Screenshot carousel** previously loaded Swiper.js from a CDN. If that
  script didn't load in time (offline testing, blocked CDN, slow network),
  the page-load script threw an error on its very first line — which
  silently stopped *every other* script below it on the page, including the
  star rating. It's now a dependency-free carousel, and every feature
  (carousel, rating, feedback form) initialises independently in its own
  `try/catch`, so one failing can never take another down with it.
- **Star rating** — was a real bug, caused by the above; now fixed and
  isolated in its own init function.
- **Feedback storage** — moved from Firebase (needs a Firebase project, and
  its default rules can accidentally expose submissions publicly) to a
  Google Sheet, which is private by default and only readable by you, plus
  an always-on local CSV backup via `local-feedback-backup.html`.

---

## 8. Local preview before pushing

Just open `index.html` in a browser — the carousel, rating, and local
feedback backup all work with zero setup, even completely offline. Only the
Google Sheet part needs an internet connection and the URL from step 4.

If your browser blocks requests from a `file://` path, serve it locally
instead:

```bash
npx serve .
# or
python3 -m http.server 8080
```

---

## Credits

Nova Tracker — Flutter + Firebase expense tracker.
Research project by Prasann Teradal (226KT04).
