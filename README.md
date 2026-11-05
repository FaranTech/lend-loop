# LendLoop

LendLoop is a neighborhood tool-lending board: **Borrow what you need. Lend what you don’t.** The app uses the Next.js App Router, Clerk, Convex, and n8n.

## What’s included

- Public landing page with a Convex-powered, read-only list of currently available tools (name and category only).
- Clerk sign-in and member views for all tools, category search, personal listings, borrow requests, incoming requests, and loan return.
- Convex server-side authorization for ownership, lender/borrower participation, and administrator actions. Admin role is a signed Clerk JWT claim, not a client-provided flag.
- Signed Convex-to-n8n request/status events and signed n8n-to-Convex overdue fetch/write-back endpoints.
- Daily overdue workflow with retry behavior, idempotency keys, activity entries, and a separate n8n error workflow.
- Docker Compose for a local n8n + PostgreSQL setup. Email/chat delivery is a logged mock notification; connect a provider credential and delivery node to send real notifications.

## Local setup

Prerequisites: Node.js 20.9+, npm, Docker Compose, a Clerk application, and a Convex deployment.

1. Install the app dependencies and configure Clerk:

   ```powershell
   npm install
   Copy-Item .env.example .env.local
   ```

   Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CONVEX_URL`, and `CLERK_JWT_ISSUER_DOMAIN` in `.env.local`.

2. Link and deploy Convex:

   ```powershell
   npx convex dev
   ```

   In Clerk, create a JWT template named `convex`, using the Convex issuer/audience setup. Include a top-level `role` claim derived from `user.public_metadata.role` (for example `"role": "{{user.public_metadata.role}}"`). Configure `convex/auth.config.ts` with the Clerk issuer domain and keep the template application ID as `convex`. Assign `role: "admin"` to designated administrators in Clerk **public metadata**. All other authenticated members are treated as users. Only a trusted Clerk administrator should edit roles.

   Set the backend-only signing secret:

   ```powershell
   npx convex env set LENDLOOP_N8N_SECRET "<at-least-32-random-bytes>"
   ```

3. Configure n8n:

   ```powershell
   Copy-Item n8n/.env.example n8n/.env
   ```

   Set unique random values for `POSTGRES_PASSWORD`, `N8N_ENCRYPTION_KEY`, and `LENDLOOP_N8N_SECRET`. The shared signing secret must exactly match the Convex value. Set `CONVEX_HTTP_ACTIONS_URL` to the deployment’s HTTP actions origin (the `https://<deployment>.convex.site` URL). Then start the services from the repository root:

   ```powershell
   docker compose --env-file n8n/.env up -d
   ```

   Open `http://localhost:5678`, complete n8n’s initial owner setup, and import the three JSON exports under `n8n/workflows/`. Activate **LendLoop - automation error visibility** first. Then set the error workflow to that workflow in the settings of each business workflow. Activate the request and overdue workflows. The request production webhook URL is `http://localhost:5678/webhook/lendloop-request`; set that URL as `N8N_REQUEST_WEBHOOK_URL` in the Convex deployment:

   ```powershell
   npx convex env set N8N_REQUEST_WEBHOOK_URL "https://<public-n8n-host>/webhook/lendloop-request"
   ```

   For local Convex-to-n8n webhook delivery, n8n must be reachable from Convex; `localhost` is not reachable from a hosted Convex deployment. Use a publicly reachable HTTPS n8n host or a secure development tunnel. The schedule runs at 9am in `GENERIC_TIMEZONE`.

   The workflow Code nodes use Node’s built-in `crypto` module. Compose allows only that built-in module. They read the signing secret from the n8n container environment; the exported JSON contains no credentials or secret values. As a result, keep this n8n instance dedicated to trusted LendLoop workflows and do not give untrusted users permission to author workflows. For production, prefer a dedicated n8n credential-backed HMAC verification/signing node or an isolated signing service rather than broadening workflow access to environment variables.

4. Run the web app:

   ```powershell
   npm run dev
   ```

   Visit `http://localhost:3000`. If only Convex is configured, the public board loads live data while authentication remains unavailable. Without a Convex URL, the landing page explains which services need to be configured and does not invent sample listings.

The n8n Compose image is pinned to the reviewed `2.46.6` release digest. Upgrade it deliberately by verifying the official release and registry digest, then updating both the version and digest.

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Next.js | Clerk browser SDK |
| `CLERK_SECRET_KEY` | Next.js | Clerk server SDK |
| `NEXT_PUBLIC_CONVEX_URL` | Next.js | Convex deployment URL |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex config | Clerk JWT issuer allowed by Convex |
| `LENDLOOP_N8N_SECRET` | Convex + n8n | Shared HMAC-SHA256 key; never put in workflow exports |
| `N8N_REQUEST_WEBHOOK_URL` | Convex | n8n production request webhook URL |
| `CONVEX_HTTP_ACTIONS_URL` | n8n | Convex `.convex.site` HTTP actions origin |
| `POSTGRES_PASSWORD`, `N8N_ENCRYPTION_KEY` | n8n Compose | Local n8n database and credential encryption |

Use separate, unique secrets per environment. Do not commit `.env.local`, `n8n/.env`, Clerk secrets, JWT templates, or n8n credential exports.

## Architecture and security decisions

- **Public/private boundary:** `tools.publicAvailable` is intentionally unauthenticated and projects only tool ID, name, and category. It excludes owner IDs, names, descriptions, condition, and request data. `tools.allForMember` requires a verified Clerk identity and powers member views.
- **Authorization at the data boundary:** every mutation obtains identity from Convex auth. Owners can manage their own listings; only the lender can approve/decline; either participant can mark an approved loan returned; admin-only operations check the signed `role` claim. Never rely on button visibility for access control.
- **Listing deletion:** listings are archived rather than physically deleted. This lets administrators remove any listing while retaining loan and reminder history. Members cannot remove a listing with a pending request or an active loan.
- **Webhook signatures:** both directions sign `timestamp + "." + raw JSON body` with HMAC-SHA256 and reject timestamps outside a five-minute window. The GET fetch signs an empty body as `timestamp + "."`. Convex compares signatures in constant-time. Use HTTPS in deployment.
- **Retries and idempotency:** Convex schedules webhook delivery outside the mutation transaction and throws on non-2xx webhook responses so scheduler retries remain visible. n8n HTTP nodes retry transient failures up to five times and save failed executions. Daily reminder keys are `loanId:UTC-date`; Convex enforces uniqueness before writing an activity event, so repeated POSTs on retries do not duplicate that day’s reminder.
- **Data minimization:** no email addresses, phone numbers, street addresses, or auth tokens are sent to n8n. The request event includes only loan/tool/date/status data and opaque participant IDs for future delivery routing. The daily endpoint returns only overdue loans and the IDs necessary for notification and idempotent write-back. Successful n8n executions are not retained by default; failures are.
- **Authentication setup:** Convex validates Clerk-issued JWTs, with `role` included as a custom claim from Clerk public metadata. Do not let end users control that metadata. Convex deployment variables and n8n environment values stay out of source control and workflow exports.

## Production improvements

- Replace mock log delivery with a real email or chat provider credential, add per-channel opt-in/preferences, delivery receipts, and rate limiting.
- Isolate HMAC signing/verification in a dedicated service or n8n credential integration; restrict n8n workflow authoring, enable SSO/MFA, configure TLS/reverse proxy, and rotate secrets.
- Add abuse controls (listing/request quotas, moderation, spam reporting), audit administrator actions, and establish retention/deletion policies for borrower history.
- Add pagination and indexes for large neighborhoods, a timezone-aware due-date policy, integration/e2e tests, monitoring and alerting on Convex scheduler and n8n failures, backups, and disaster recovery.
- Use managed PostgreSQL with backups and pinned container versions rather than `latest`; use HTTPS and a reachable hosted n8n endpoint.
