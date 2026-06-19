# W2W Fitness & Rehab — Website + Booking + Clinic Admin

A complete rebuild of [w2wfitnessandrehab](https://w2wfitnessandrehab.unaux.com) as a fast,
mobile-first React app with **online appointment booking**, an **enquiry system that emails the
clinic**, and a single-admin **clinic dashboard** (enquiries, appointments, client CRM with unique
IDs, progress charts, and branded PDF reports).

**Stack:** React + Vite + Tailwind CSS · Firebase (Firestore + Auth) · Resend (email) · Vercel
(hosting + cron) · jsPDF (reports) · Recharts (progress charts).

---

## ✨ Features

**Public site** (`/`)
- Redesigned, responsive Home / Services / About / Blog / Contact
- Floating **WhatsApp** (with auto greeting + per-service message), **Instagram**, and **Call** buttons
- **Book an appointment** — popup *and* full page, real-time slot availability, **instant confirmation**
- Contact/enquiry form → saved to Firestore **and** emailed to the clinic
- Testimonials + health-tips blog (admin-managed, with sample content out of the box)

**Admin dashboard** (`/admin`) — one login
- Overview: new enquiries, today's schedule, upcoming, total clients
- **Enquiries** inbox with search, read/delete, click-to-call & WhatsApp
- **Appointments** — today / upcoming / past, add manually, complete / cancel (frees the slot)
- **Clients / Patients CRM** — auto unique IDs (`W2W-0001`), old report text & history, look up by ID,
  **visit notes**, **progress tracking with charts** (pain / ROM / weight), call & WhatsApp icons
- **Reports** — monthly appointments+clients PDF, and per-client PDF — all with the W2W letterhead
  (logo, address, phone, email, website in header/footer)
- **Content** — manage reviews & blog posts
- **Automated day-before email reminders** (Vercel Cron)

---

## 🚀 Setup (step by step)

### 1. Install
```bash
npm install
```

### 2. Create a Firebase project
1. Go to <https://console.firebase.google.com> → **Add project**.
2. **Build → Firestore Database → Create database** (start in *production* mode, region `asia-south1`).
3. **Build → Authentication → Get started → Email/Password → Enable**.
4. **Authentication → Users → Add user** → create the single admin (email + password).
   Use the same email in `VITE_ADMIN_EMAIL`.
5. **Project settings → General → Your apps → Web (`</>`)** → register an app → copy the config values.

### 3. Configure environment
Copy `.env.example` to `.env` and fill in:
```bash
cp .env.example .env
```
- `VITE_FIREBASE_*` — from the Firebase web config above
- `VITE_ADMIN_EMAIL` — the admin login email you created
- `RESEND_API_KEY` — from <https://resend.com> (free) → API Keys
- `ENQUIRY_TO_EMAIL` — currently `ashwinthips@gmail.com` (change to `contact@w2wfitnessandrehab.in` later)

### 4. Publish Firestore security rules & indexes
Install the Firebase CLI (`npm i -g firebase-tools`), then:
```bash
firebase login
firebase use <your-project-id>
firebase deploy --only firestore:rules,firestore:indexes
```
(Or paste `firestore.rules` into **Firestore → Rules** and publish manually. Indexes are also
auto-suggested by a link in the browser console the first time a query needs one.)

### 5. Run locally
```bash
npm run dev        # http://localhost:5173
```
Admin: <http://localhost:5173/admin> (redirects to login).

> Note: the `/api/*` email functions only run on Vercel (or `vercel dev`). Locally, bookings and
> enquiries still save to Firestore and appear in the dashboard — the email is simply skipped.

### 6. Deploy to Vercel
1. Push this repo to GitHub.
2. <https://vercel.com> → **New Project** → import the repo (framework auto-detected as Vite).
3. **Settings → Environment Variables** → add **every** key from `.env`
   (including `RESEND_API_KEY`, `ENQUIRY_FROM_EMAIL`, `ENQUIRY_TO_EMAIL`).
4. For the reminder cron also add `FIREBASE_SERVICE_ACCOUNT` (Firebase → Project settings →
   Service accounts → *Generate new private key* → paste the whole JSON on one line) and a
   random `CRON_SECRET`.
5. **Deploy.**

### 7. Custom domain — `www.w2wfitnessandrehab.in`
The whole codebase already uses `https://www.w2wfitnessandrehab.in` as the canonical origin
(see `BUSINESS.website` / `SITE_URL` in `src/lib/constants.js`, `index.html`, `public/sitemap.xml`,
`public/robots.txt`). To go live:

1. **Buy the domain** at a registrar that sells `.in` (GoDaddy, Namecheap, BigRock, Cloudflare).
   Vercel's domain store does **not** sell `.in`, so purchase it there.
2. **Add it to Vercel** → project **Settings → Domains** → add *both* `www.w2wfitnessandrehab.in`
   and the apex `w2wfitnessandrehab.in`. Set **`www` as the primary** (Vercel auto-301s the apex → www,
   matching our canonical tags).
3. **DNS** (at the registrar) — Vercel shows the exact records; typically:
   - `CNAME  www  → cname.vercel-dns.com`
   - apex `A  @  → 76.76.21.21` (or the ALIAS/ANAME Vercel lists).
   Wait for "Valid Configuration" + SSL to issue.
4. **Firebase Auth** → **Authentication → Settings → Authorized domains** → add
   `www.w2wfitnessandrehab.in` **and** `w2wfitnessandrehab.in` (so admin login works on the live domain).
5. **SEO** → Google **Search Console**: add the property, verify, and submit
   `https://www.w2wfitnessandrehab.in/sitemap.xml`. (robots.txt already points to it.)
6. **Email** (optional) → verify the domain in Resend, then set
   `ENQUIRY_FROM_EMAIL`/`ENQUIRY_TO_EMAIL` to `…@w2wfitnessandrehab.in`.

> Firestore security rules need **no** domain change — access is gated by Firebase Auth
> (`request.auth != null`), not by hostname.

---

## 📧 Email & reminders
- Enquiries/bookings are emailed by `api/send-enquiry.js` via Resend. Until you verify your own
  domain in Resend, keep `ENQUIRY_FROM_EMAIL=…<onboarding@resend.dev>` (delivers to your own inbox).
  After verifying `w2wfitnessandrehab.in`, switch the from-address and set
  `ENQUIRY_TO_EMAIL=contact@w2wfitnessandrehab.in`.
- `api/send-reminders.js` runs daily (see `vercel.json` → `crons`, 12:00 UTC ≈ 17:30 IST) and emails
  each client a reminder for tomorrow's appointment plus a schedule summary to the clinic.

## 🔒 A note on rules
`availability/{date}` is publicly writable because it stores only booked **time strings** (no personal
data) so the booking page can reserve a slot without a backend. All personal data
(`appointments`, `clients`, `enquiries`) is **admin-read-only**. To harden further later, move booking
into a Cloud Function / Vercel function using the Firebase Admin SDK.

## 🧭 Project structure
```
api/                 Vercel serverless functions (email, reminders)
public/logo.jpg      Exact W2W logo (used across site + PDF letterhead)
src/components/       Navbar, Footer, floating buttons, booking, forms, icons
src/context/          Auth + Booking modal providers
src/lib/              firebase, firestore data layer, email, pdf, constants, format
src/pages/            Public pages
src/pages/admin/      Admin dashboard pages
firestore.rules       Security rules
```

## 💡 Ideas for later (not yet built)
Online payments (Razorpay), WhatsApp Business API auto-messaging, home-exercise-program PDFs,
digital intake/consent forms, Tamil/English toggle, Google-reviews import, membership packages.

---
© W2W Fitness & Rehab — Way To Wellness · Mylapore, Chennai
