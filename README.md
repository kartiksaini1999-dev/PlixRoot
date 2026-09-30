# Plix ROOT — Vercel handoff

This package contains the updated consumer website, a Node.js backend, database schema, private upload integration, and human-review workspace. It is prepared for Vercel; it has not been deployed to your Vercel account.

## Changes requested

| Request | Implementation |
| --- | --- |
| Gender | Questionnaire options: Woman, Man, Non-binary, Self-describe, Prefer not to say |
| No WhatsApp authentication | Questionnaire goes directly to optional photos and recommendations; browser-scoped sessions protect saved records |
| Optional initial images | Skip all photos and receive recommendations; selected photos can be uploaded |
| Missing recommendations | Immediate recommendation summary; product cards remain visible with professional-review guidance when flagged |
| Backend capture | Browser journeys, profiles, questionnaires, reports, bookings, intakes, media metadata, consent and review notes |
| Personalised report | Booking creates a new intake requiring four fresh photo angles and one 5–60 second video |
| Gut health | Digestive comfort, bowel regularity, fibre, fermented foods and recent antibiotics; no causal gut diagnosis |
| Vercel hosting | Static frontend plus `/api/index.mjs` serverless backend, `vercel.json`, locked dependencies and environment template |

## Run locally

Requires Node.js 24. Local development uses SQLite and local private files, so no cloud account is needed to exercise the flow.

```sh
npm ci
npm run build
npm run dev
```

Open http://localhost:3000. No phone number, OTP or sign-in is required. Local WhatsApp delivery is a preview and sends no message. All local records are stored in `.data/`. Use test information locally. Report-delivery preview is disabled on Vercel and when `NODE_ENV=production`.

For the reviewer screen, copy `.env.example` to `.env.local`, set `REVIEWER_API_KEY` to a strong random secret, restart the server, and open http://localhost:3000/review.html. Enter that key only in the reviewer workspace. Do not give it to consumers.

## Deploy to Vercel

1. Extract this folder and place its contents in a Git repository. Do not commit `.env.local`, `.data/` or `node_modules/`.
2. In Vercel, import that repository. Use the folder containing `package.json` as the Root Directory. Framework preset: **Other**. The included `vercel.json` sets Build Command `npm run build`, Output Directory `public`, and routes `/api/*` to the Node.js function. Node version: **24.x**.
3. Connect a **Neon Postgres** database to the project. Set `DATABASE_URL` to its Neon connection URL. This implementation uses Neon's HTTP client; it is not a generic TCP Postgres client.
4. Create and connect a **private Vercel Blob** store. Set `BLOB_READ_WRITE_TOKEN`. Do not use a public store for user media.
5. For optional WhatsApp report delivery, configure a Twilio WhatsApp sender and approved Content template. Twilio is not required to complete an assessment or see recommendations. No Verify service is used.
6. Leave `APP_URL` unset to detect the current Vercel hostname automatically. Optionally set it to an exact HTTPS origin to restrict requests to that domain. Set `REVIEWER_API_KEY` to a strong unique secret.
7. Deploy. The server applies the idempotent schema on first database use. You can also run `npm run db:migrate` with the deployment's `DATABASE_URL` configured locally. `GET /api/health` returns database readiness.
8. Test optional WhatsApp delivery, upload callbacks, private media playback, browser journey access and reviewer completion on the deployed origin. These external integrations cannot be exercised without your credentials.

Optional CLI deployment from this folder:

```sh
npx vercel
# After configuring production env vars and verifying the preview:
npx vercel --prod
```

The request origin check compares the browser Origin to the HTTPS hostname Vercel forwards, covering both the production alias and preview deployment URL. It rejects cross-site requests and does not trust the browser Origin to select the allowed host. An optional `APP_URL` pins access to that exact origin; clear it for previews or set it to the preview origin. Keep Preview and Production databases/stores separate when handling real user information.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `APP_URL` | Optional origin override. Leave unset for automatic Vercel domain detection; no trailing path |
| `DATABASE_URL` | Neon database connection URL; required on Vercel |
| `BLOB_READ_WRITE_TOKEN` | Token for a **private** Vercel Blob store |
| `WHATSAPP_MODE` | Optional `preview` locally only; real delivery on Vercel requires messaging credentials |
| `TWILIO_ACCOUNT_SID` | Twilio account ID; optional, for report delivery only |
| `TWILIO_AUTH_TOKEN` | Twilio account secret |
| `TWILIO_WHATSAPP_FROM` | Approved sender, e.g. `whatsapp:+...`, for report messages |
| `TWILIO_REPORT_CONTENT_SID` | Approved report template; variables `1` = first name, `2` = browser-protected report URL |
| `REVIEWER_API_KEY` | Secret for the human-review workspace |

Keep all secrets server-side. There are no `NEXT_PUBLIC_*` secrets and no credentials in this package. `.env.example` contains empty placeholders only. Missing database or requested messaging configuration produces a clear error, not a fabricated success.

## Consumer flow

Questionnaire → optional photo submission or skip → backend-generated recommendations and report. No authentication screen or required WhatsApp number appears after the questionnaire.

A browser session is created silently when the user generates their report. Returning users access their journey using the same browser cookie for 7 days. Reports, assessment history, media comparisons and personalised-report requests come from the backend; a browser refresh does not erase them. Clearing cookies, session expiry or using a different browser/device starts a separate journey; there is no phone-based recovery or cross-device sign-in. Download the PDF to retain a portable copy. A reassessment prefills previous answers and records comfort/adherence changes.

Booking a personalised report records a **request**, not an externally confirmed appointment. It creates a new intake. The user must submit freshly captured front, top, crown and lengths images and one short video. Older media IDs cannot be attached to the new intake. Existing exact file hashes from another intake are rejected. The user also attests that the capture is fresh; the system cannot prove capture date or prevent every edited reuse.

Media is uploaded directly from the browser to private Blob storage, bypassing the Vercel function request-body limit for videos. Owner-scoped API reads support streaming and byte ranges. Local development uses the same media ownership checks with local files.

## Human review

Open `/review.html` and supply `REVIEWER_API_KEY`. The reviewer can inspect submitted answers, photos and video, then enter their actual name, qualifications/scope, personal note, agreed changes and follow-up date. Saving creates a new reviewed report and preserves the initial report. No simulated clinician approval is applied to saved journey records.

The included care listings are concept roles, not real verified partners. Replace the `providers` array in `lib/assessment.mjs` and corresponding frontend data in `public/app.js` with verified providers and actual availability before commercial launch. No payment processing or live clinic-calendar integration is included. The shared reviewer key is suitable for a controlled MVP; a public multi-clinic service should add individual reviewer identities and assignments.

## WhatsApp reports

The user explicitly requests a report message and enters a WhatsApp number only in the delivery dialog. Sharing consent and report-delivery consent are separate. The number is never used to authenticate or merge journeys. Production sends a browser-protected report link through the approved Twilio template. The link opens only in the browser containing the original journey cookie; it does not grant another device access. Users can download a portable PDF from the report. Only the recipient's last four digits are retained in message metadata. The response uses the provider's initial state (e.g. queued); it does not claim delivery. This package does not implement delivery-status webhooks or unattended automatic post-review messages. A reviewed report appears in My reports, where the user can request WhatsApp delivery. Local mode previews the request without sending it.

## Assessment and recommendation boundaries

The assessment engine is deterministic and rules-based. Automated AI photo interpretation is **not connected**. ROOT scores are illustrative, equally weighted wellness indicators, not clinical measurements. Gut-health answers provide discussion context; they do not establish dysbiosis, deficiencies or a gut cause of hair loss. Nutrition supplements are optional discussion items and require suitability review.

Clinical referral flags do not erase all recommendations. The report retains its priorities, hair-care suggestions and products for discussion, while clearly advising review before adding scalp actives or supplements. Some products and prices are proposed ROOT modules and illustrative allocations, not a confirmed catalogue.

## Data and API

`db/schema.sql` defines scoped records and persistent rate-limit counters. Browser-session ownership is enforced for reports, uploads, intakes and bookings. Session tokens are random, stored hashed, and issued in HttpOnly/SameSite cookies (Secure on Vercel). New browser sessions are rate-limited by IP; WhatsApp delivery requests are rate-limited separately. Phone numbers are not owner IDs. Journey deletion removes stored media and all owner-scoped records; downloaded PDFs are unaffected.

Key routes:

- `/api/session/start`, `/api/session/end`
- `/api/me`, `/api/assessments`, `/api/reports/media`, `/api/reports/kit`, `/api/reports/whatsapp`
- `/api/media/prepare`, `/api/media/token`, `/api/media/confirm`, `/api/media/read`
- `/api/bookings`, `/api/bookings/cancel`, `/api/intakes/media`, `/api/intakes/submit`
- `/api/admin/queue`, `/api/admin/intake`, `/api/admin/review`
- `DELETE /api/account`

## Fix for the deployment error

The `APP_URL must be configured before saving assessments` failure is fixed: an unset `APP_URL` now uses the request hostname and HTTPS on Vercel. No phone authentication is introduced. Redeploy this updated source to apply the change. To unblock the previous build without changing code, set `APP_URL=https://plixroot.vercel.app` in Vercel Project Settings → Environment Variables for Production, then redeploy.

Persistent saving still requires a connected Neon database and `DATABASE_URL`. A missing database now returns a specific 503 setup message instead of a generic server error. Optional initial uploads and mandatory personalised-report media require the private Blob token.

## Verification

Browser automation could not start in the build environment. Backend integration tests and consumer-screen script rendering were verified; responsive visual QA and real-provider end-to-end checks should be completed on your Vercel preview.

```sh
npm test
npm run build
```

The backend integration test exercises origin auto-detection without APP_URL, cross-site rejection, silent browser-session creation/reuse, removed OTP endpoints, saved reports with no photos, retained recommendations under referral, mandatory photo/video intake, human review with original preservation, cross-browser access rejection, preview message state, and journey deletion. Real Twilio/Neon/Blob operations require credentials and deployment verification.

## Files

- `public/`: consumer interface, report/PDF output, reviewer interface and brand assets
- `api/index.mjs`: Vercel serverless API entrypoint
- `lib/`: browser sessions, persistence, validation, media handling and recommendation engine
- `db/schema.sql`: database schema
- `scripts/`: static build, local server and database setup
- `tests/`: backend integration checks
- `vercel.json`, `package.json`, `package-lock.json`, `.env.example`: deployment configuration

Visual references: official Plix serum/shampoo/hair-gummies imagery. The concept is not an official Plix service.

Primary implementation references: https://vercel.com/docs/headers/request-headers, https://vercel.com/docs/functions/runtimes/node-js, https://vercel.com/docs/vercel-blob/client-upload, https://vercel.com/docs/vercel-blob/private-storage, https://www.twilio.com/docs/whatsapp/api, https://neon.com/docs/serverless/serverless-driver.
