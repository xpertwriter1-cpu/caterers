# Nanny Events & Caterers - Next.js + TypeScript

A Next.js Pages Router application with strict TypeScript for the Nairobi-based Nanny Events & Caterers business. Branding uses forest green and gold. The website supports event quotation requests, traditional Kenyan menu enquiries, customer accounts, online food-order requests, an admin dashboard, WhatsApp contact links and an M-PESA payment preference field.

## Next.js, Prisma and MongoDB Atlas

The project uses Next.js 16, React 19 and strict TypeScript. All pages are React TSX components; there is no Express server or EJS runtime. Prisma 6.19.3 connects to MongoDB Atlas using MONGODB_URI from .env. The Prisma schema maps to the existing collection names and record fields; no database reset or record copy is needed. Keep your existing .env; never put secrets in NEXT_PUBLIC_ variables.

- src/pages: file-system routes, server-side page loaders and the Next API entry point.
- src/components: React pages, shared navigation and notification controls.
- prisma/schema.prisma: MongoDB models, embedded notification/order item types and existing collection mappings.
- src/lib/prisma.ts: shared Prisma Client and Atlas URL validation.
- src/lib/models.ts: generated Prisma type exports.
- src/lib/controllers.ts: booking, enquiry, order, account and admin business handlers.
- src/lib/next-handler.ts: Next request/response handling, raw webhook bodies and server-side props.
- src/lib/session.ts: encrypted, HTTP-only cookie sessions with an eight-hour lifetime. Existing Express sessions are replaced, so sign in again after upgrading.
- src/lib/admin-notifications.ts, booking-email.ts and payments.ts: server-only Twilio, SMTP and Paystack integrations.
- public: original styles, logo, photos and videos.

Run these from PowerShell:

```powershell
pnpm install
pnpm dev
```

The launcher reads PORT from .env (currently 3001). Keep a single app instance running on that port. The development server uses Webpack for consistent Windows support.

```powershell
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

Production requires a Node.js host with MongoDB Atlas connectivity; this app cannot be deployed as a static HTML export. Build before running start. Set NODE_ENV=production and serve over HTTPS so secure session cookies work.

Public page URLs are unchanged. Forms submit to /api paths, for example /api/contact, /api/book and /api/login. Everyone uses the same sign-in form at /login; the old /admin/login URL redirects there. /health and /payments/paystack/webhook retain their existing URLs through Next rewrites. Paystack return URLs still use /requests/:token/verify. API request bodies are limited to 100 KB; webhook HMAC verification uses the original bytes. Internal booking notes are stripped before customer data enters serialized page props. Quotation writes use atomic Prisma updateMany filters with the existing __v version and payment-reference lock.

Tests compile TypeScript and use Node's built-in test runner. They mock MongoDB and external providers; no live email, WhatsApp message or payment is sent. Live provider delivery still requires your configured credentials and a separate end-to-end check.

## Prisma and Atlas setup

Use pnpm exclusively. The repository pins pnpm 12.11.2 and commits pnpm-lock.yaml. On Windows, pnpm.cmd can be used if PowerShell blocks the pnpm.ps1 shim.

Keep your existing MONGODB_URI in .env. It must use the Atlas SRV format and name the same database as before:

```dotenv
MONGODB_URI=mongodb+srv://USER:URL_ENCODED_PASSWORD@CLUSTER.mongodb.net/nanny_events_caterers?retryWrites=true&w=majority
```

Do not replace real credentials with placeholders. Allow the hosting machine's IP in Atlas Network Access and use a database user with read/write access. Atlas supplies the replica set required by Prisma's MongoDB connector.

```powershell
pnpm install
pnpm prisma:validate
pnpm db:check
# On first setup, ensure indexes and create missing catalogue/admin records:
pnpm db:setup
pnpm db:seed
pnpm dev
```

Installation and builds generate Prisma Client automatically. After editing prisma/schema.prisma, run pnpm prisma:generate. Prisma 6.19 is used for its MongoDB connector; Prisma 7 does not support MongoDB. See the [Prisma MongoDB connector documentation](https://www.prisma.io/docs/orm/v6/overview/databases/mongodb).

Prisma maps id to MongoDB _id and customerId to the existing customer ObjectId field. It reads users, services, bookings, orders and inquiries directly. Existing passwords remain bcrypt hashes. Optional order tokens and payment references keep the existing sparse unique indexes, configured by db:setup. Do not replace them with non-sparse unique indexes. db:setup only ensures these indexes; it never drops collections or rewrites records. Seeding inserts absent records without overwriting existing services or accounts.

MongoDB does not use Prisma Migrate. Do not run migrate dev, migrate reset, or db push --force-reset against Atlas. This migration deliberately does not reset the database or run db push. /health returns the actual Prisma database ping status (503 if Atlas is unavailable). db:check is read-only and does not print credentials.

## Business photo gallery

The October 29 media collection is shown in the homepage's **Fresh from our events** section (`/#event-gallery`): 23 full-size linked photos in `public/images/events` and six playable MP4 videos in `public/videos/events`. The seven supplied video files contained one byte-identical duplicate, which is included only once. Captions and media order are in `src/components/EventGallery.tsx`. Photos load lazily; videos use native controls and preload only metadata. Deploy these asset folders alongside the React components and stylesheet to make the collection available on the hosted website.

The `public/images` folder contains the photos supplied by Nanny Caterers. They are used across the homepage hero, a full photo gallery, menu/service cards and About page; service records seeded by the app point to the local photos. To change a photo, replace the matching file in `public/images` while keeping its filename, or update the image path in `src/lib/db.ts`.

## Important payment status

Food and catering requests are available without an account from Services & Menu. Requesters provide contact details, quantity, delivery address and desired time, and choose M-PESA or credit/debit card. A private order page shows quotation, payment and delivery progress. Keep the link private.

The administrator confirms availability and enters the food/service total and delivery fee under Food orders, then uses **Save and email quotation / update**. Preparation and dispatch are blocked until server-verified payment. Drivers are assigned manually using delivery contact and update fields; no courier booking API is connected. Quotes are locked when checkout starts. Refunds must be managed in the payment provider dashboard; they are not automatically synced here.

To activate checkout, use an approved Paystack Kenya merchant account with card and mobile money enabled. Add PAYSTACK_SECRET_KEY and PUBLIC_BASE_URL (your public HTTPS website URL) to .env, and configure the webhook as PUBLIC_BASE_URL/payments/paystack/webhook in Paystack. SMTP must be configured for order emails. Start with test credentials and validate successful, pending, failed and duplicate notifications before using live credentials. Localhost does not receive public webhooks. The website never collects card numbers or M-PESA PINs; customers authorize at hosted checkout. Checkout availability depends on your merchant account.

Payment confirmation checks the provider's reference, KES currency, exact amount and customer email. Webhooks use HMAC SHA512 validation and payment updates are idempotent. Admins cannot mark an order Paid through the website. Payment links are bearer links: anyone holding the link can view that order, so only share them with the requester or authorized staff.

Official documentation: https://paystack.com/docs/payments/payment-channels/, https://paystack.com/docs/api/transaction/ and https://paystack.com/docs/payments/webhooks/.

## No invented prices

Menu and event services are configured as quotation-led items. No prices are advertised. Confirm menu availability, delivery fees, event scope and final prices directly with the business.

## Windows setup

1. Install Node.js LTS (Node.js 20.9 or newer): https://nodejs.org/
2. Create a MongoDB Atlas cluster and database user: https://cloud.mongodb.com/
3. In Atlas, add your current IP address to Network Access and copy the Node.js driver connection string. Replace the username/password placeholders and URL-encode special characters in the password.
4. Extract this ZIP to a folder such as `C:\Projects\nanny-events-caterers`.
5. Open the folder in Visual Studio Code. In Terminal → New Terminal run:

   ```powershell
   Copy-Item .env.example .env
   pnpm install
   ```

6. Open `.env` and set `MONGODB_URI`, `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `ADMIN_NAME`. Use a unique admin email and a strong password of at least 12 characters. Never commit or share `.env`.
7. Start the server:

   ```powershell
   pnpm dev
   ```

8. Open http://localhost:3001. Health check: http://localhost:3001/health.
9. Sign in with the admin credentials you configured to open `/admin`. Run pnpm db:seed to create the configured admin if it does not already exist; existing accounts and catalogue edits are preserved.

## Booking approvals and email

### Admin email and WhatsApp alerts

New contact enquiries, food orders (including quotation requests) and event booking / quotation requests notify the administrator through two independent channels. Email alerts go to the one or two comma-separated addresses in `ADMIN_EMAILS` (falls back to `ADMIN_EMAIL`). The legacy `ADMIN_NOTIFICATION_EMAIL` and `BOOKING_APPROVER_EMAIL` settings no longer select separate recipients. SMTP must be configured. Admin order emails include the requester, items, phone and delivery details, and link to the admin dashboard. They do not include the customer's private payment link. Customer quotation/update emails continue to use the existing admin buttons.

### Account verification and admin roles

Set `ADMIN_EMAILS=mandela3168@gmail.com` for the initial owner. Add the second owner after a comma when ready; more than two initial addresses is rejected. Users with these addresses become admins when they sign up and verify their email. Existing accounts also use this allowlist. Other accounts get customer access unless an authenticated admin grants them admin access through **Manage user roles**. Old admin roles outside the allowlist need to be explicitly reassigned there. Additional assigned admins can access the dashboard but do not automatically become email alert recipients. Owner roles are controlled by `.env`; other roles can be revoked in the dashboard, and sessions are checked against the database on each request.

Signup creates an unverified account and emails a six-digit code to that account's address. `/verify-email` accepts the code, then redirects to `/login`. Successful login redirects to `/`; admins can open the dashboard with the navigation's Admin link. Existing and seeded accounts must also verify before signing in. Login with the existing password sends their verification code. Codes expire after 15 minutes, allow five guesses and can be resent after 60 seconds. Failed email delivery leaves the account unverified and offers a resend. Codes are stored as bcrypt hashes and cleared after verification.

The mailer accepts both `SMTP_HOST/PORT/USER/PASS/FROM` and the existing `MAIL_HOST/PORT/USERNAME/PASSWORD/FROM_ADDRESS` settings. `SMTP_*` values take precedence. Restart the server after changing `.env`. The added MongoDB user fields are optional or have defaults; no destructive migration or replacement of existing accounts is needed.

For automatic WhatsApp alerts, configure a Twilio WhatsApp Business sender and add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `ADMIN_WHATSAPP_NUMBER` and `TWILIO_WHATSAPP_CONTENT_SID` to `.env`. Both phone numbers must use international format, for example `+254723548397`, without a `whatsapp:` prefix. `PUBLIC_BASE_URL` must be the public HTTPS website URL. Keep credentials in `.env` and restart the server after configuration changes.

Create and obtain approval for a WhatsApp text template with these four numbered variables: `1` request type, `2` reference, `3` request summary, `4` admin dashboard URL. Example template: "Nanny Events & Caterers admin alert. Request type: {{1}}. Reference: {{2}}. Request summary: {{3}}. Please sign in to review this request: {{4}}. This is a notification for your catering administration team." Use the resulting HX Content SID. Enrol the admin recipient for these notifications through your provider's WhatsApp setup. Sandbox testing requires joining the Twilio sandbox and a compatible template. Official setup: [Twilio WhatsApp notification templates](https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates).

Each admin record shows Email and WhatsApp status separately. **Accepted** means the provider accepted the message, not that it reached the inbox or phone. Provider delivery callbacks are not connected. **Not configured** indicates missing settings; **Failed** means the attempt failed. Requests remain saved if sending fails. **Retry admin alerts** retries channels that have not been accepted and skips accepted channels. Retries are manual; no background retry queue is configured. These alerts cover newly submitted contact enquiries, bookings and orders; saving an admin quotation does not send a second admin alert. Contact enquiries are saved before alerts are attempted and appear under Client enquiries in the admin dashboard, with a reply-by-email link and notification retry controls.

Booking requests are open to guests without registration or sign-in. Requesters provide their name and email. New requests appear in the admin dashboard and are emailed to `ADMIN_EMAILS` (or `ADMIN_EMAIL` if unset), with Reply-To set to the requester. If the notification fails, the booking remains saved and the admin dashboard shows the failure. Approver decisions are sent to the submitted email; no customer account is needed.

Booking requests require a requester email (Gmail and other providers are accepted). Administrators can choose Accepted, Approved, Declined or Reschedule Requested, add comments visible under **Your bookings**, and propose a new date. A proposed date does not change the original event date; agree the new date with the requester first. Internal admin notes remain private. Existing bookings use the customer's account email when no booking email was saved.

In `/admin`, use **Save without emailing** to publish an update in the requester's account, or **Save and email requester** to also send it. Rescheduling requires a proposed future date and comments. Email status reports whether the provider accepted the latest update, not whether it reached the inbox. Failed messages can be retried with **Save and email requester**.

To enable sending, add the `SMTP_*` settings from `.env.example` to your `.env` and restart. For Gmail, set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER` to the business Gmail address and `SMTP_PASS` to a Google App Password. App Passwords require 2-Step Verification and availability depends on the Google account. See https://support.google.com/accounts/answer/185833 and https://nodemailer.com/usage/using-gmail/. Never share credentials in chat. `SMTP_FROM` defaults to `SMTP_USER`; `SMTP_REPLY_TO` can specify the business inbox for customer replies. Use your provider's authorized sender address.

## Main routes

- `/` — home page
- `/services` — services and Kenyan menu catalogue
- `/book` — event catering quotation form (no account needed)
- `/register` and `/login` — customer accounts
- `/account` — customer's booking and order requests
- `/contact` — contact details and social media
- `/admin` — admin dashboard (admin login required)

## Business contact and links

- WhatsApp / phone: 0723 548 397 (`+254 723 548 397`)
- Alternate phone: 0733 548 397
- Facebook: https://www.facebook.com/NannyCaterersServices/
- Instagram: https://www.instagram.com/nannycaterers/
- Service area wording: Nairobi and surrounding areas; confirm delivery/event availability directly.

## Before production launch

- Configure and verify booking email delivery; verify order quotation and update emails.
- Configure and test Paystack Kenya card/mobile money checkout and the signed webhook before accepting live payments.
- Add CSRF protection, rate limiting, input validation, monitoring, backups and a privacy notice.
- Review the admin access, session cookie and Content Security Policy settings for your hosting environment.
- Confirm business address, email, exact service area, food safety/allergen disclosures, cancellation policy and delivery fees.
- The supplied Nanny Caterers photos are bundled locally in `public/images`; confirm you have permission to publish all people shown in them.

This is a starter project, not a deployed production system.
