# Nanny Events & Caterers — Node.js Website

Responsive website starter for the Nairobi-based Nanny Events & Caterers business. Branding uses forest green and gold. The website supports event quotation requests, traditional Kenyan menu enquiries, customer accounts, online food-order requests, an admin dashboard, WhatsApp contact links and an M-PESA payment preference field.

## Business photo gallery

The October 29 media collection is shown in the homepage's **Fresh from our events** section (`/#event-gallery`): 23 full-size linked photos in `public/images/events` and six playable MP4 videos in `public/videos/events`. The seven supplied video files contained one byte-identical duplicate, which is included only once. Captions and media order are in `views/partials/event-gallery.ejs`. Photos load lazily; videos use native controls and preload only metadata. Deploy these asset folders alongside the updated views and stylesheet to make the collection available on the hosted website.

The `public/images` folder contains the photos supplied by Nanny Caterers. They are used across the homepage hero, a full photo gallery, menu/service cards and About page; service records seeded by the app point to the local photos. To change a photo, replace the matching file in `public/images` while keeping its filename, or update the image path in `server.js`.

## Important payment status

Food and catering requests are available without an account from Services & Menu. Requesters provide contact details, quantity, delivery address and desired time, and choose M-PESA or credit/debit card. A private order page shows quotation, payment and delivery progress. Keep the link private.

The administrator confirms availability and enters the food/service total and delivery fee under Food orders, then uses **Save and email quotation / update**. Preparation and dispatch are blocked until server-verified payment. Drivers are assigned manually using delivery contact and update fields; no courier booking API is connected. Quotes are locked when checkout starts. Refunds must be managed in the payment provider dashboard; they are not automatically synced here.

To activate checkout, use an approved Paystack Kenya merchant account with card and mobile money enabled. Add PAYSTACK_SECRET_KEY and PUBLIC_BASE_URL (your public HTTPS website URL) to .env, and configure the webhook as PUBLIC_BASE_URL/payments/paystack/webhook in Paystack. SMTP must be configured for order emails. Start with test credentials and validate successful, pending, failed and duplicate notifications before using live credentials. Localhost does not receive public webhooks. The website never collects card numbers or M-PESA PINs; customers authorize at hosted checkout. Checkout availability depends on your merchant account.

Payment confirmation checks the provider's reference, KES currency, exact amount and customer email. Webhooks use HMAC SHA512 validation and payment updates are idempotent. Admins cannot mark an order Paid through the website. Payment links are bearer links: anyone holding the link can view that order, so only share them with the requester or authorized staff.

Official documentation: https://paystack.com/docs/payments/payment-channels/, https://paystack.com/docs/api/transaction/ and https://paystack.com/docs/payments/webhooks/.

## No invented prices

Menu and event services are configured as quotation-led items. No prices are advertised. Confirm menu availability, delivery fees, event scope and final prices directly with the business.

## Windows setup

1. Install Node.js LTS (Node.js 20 or newer): https://nodejs.org/
2. Create a MongoDB Atlas cluster and database user: https://cloud.mongodb.com/
3. In Atlas, add your current IP address to Network Access and copy the Node.js driver connection string. Replace the username/password placeholders and URL-encode special characters in the password.
4. Extract this ZIP to a folder such as `C:\Projects\nanny-events-caterers`.
5. Open the folder in Visual Studio Code. In Terminal → New Terminal run:

   ```powershell
   Copy-Item .env.example .env
   npm install
   ```

6. Open `.env` and set `MONGODB_URI`, `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `ADMIN_NAME`. Use a unique admin email and a strong password of at least 12 characters. Never commit or share `.env`.
7. Start the server:

   ```powershell
   npm run dev
   ```

8. Open http://localhost:3000. Health check: http://localhost:3000/health.
9. Sign in with the admin credentials you configured to open `/admin`. The admin account is created at startup if the email/password are configured and the account does not already exist.

## Booking approvals and email

### Admin email and WhatsApp alerts

New contact enquiries, food orders (including quotation requests) and event booking / quotation requests notify the administrator through two independent channels. `ADMIN_NOTIFICATION_EMAIL` selects the inbox, falling back to `BOOKING_APPROVER_EMAIL` and then `ADMIN_EMAIL`. SMTP must be configured. Admin order emails include the requester, items, phone and delivery details, and link to the admin dashboard. They do not include the customer's private payment link. Customer quotation/update emails continue to use the existing admin buttons.

For automatic WhatsApp alerts, configure a Twilio WhatsApp Business sender and add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `ADMIN_WHATSAPP_NUMBER` and `TWILIO_WHATSAPP_CONTENT_SID` to `.env`. Both phone numbers must use international format, for example `+254723548397`, without a `whatsapp:` prefix. `PUBLIC_BASE_URL` must be the public HTTPS website URL. Keep credentials in `.env` and restart the server after configuration changes.

Create and obtain approval for a WhatsApp text template with these four numbered variables: `1` request type, `2` reference, `3` request summary, `4` admin dashboard URL. Example template: "Nanny Events & Caterers admin alert. Request type: {{1}}. Reference: {{2}}. Request summary: {{3}}. Please sign in to review this request: {{4}}. This is a notification for your catering administration team." Use the resulting HX Content SID. Enrol the admin recipient for these notifications through your provider's WhatsApp setup. Sandbox testing requires joining the Twilio sandbox and a compatible template. Official setup: [Twilio WhatsApp notification templates](https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates).

Each admin record shows Email and WhatsApp status separately. **Accepted** means the provider accepted the message, not that it reached the inbox or phone. Provider delivery callbacks are not connected. **Not configured** indicates missing settings; **Failed** means the attempt failed. Requests remain saved if sending fails. **Retry admin alerts** retries channels that have not been accepted and skips accepted channels. Retries are manual; no background retry queue is configured. These alerts cover newly submitted contact enquiries, bookings and orders; saving an admin quotation does not send a second admin alert. Contact enquiries are saved before alerts are attempted and appear under Client enquiries in the admin dashboard, with a reply-by-email link and notification retry controls.

Booking requests are open to guests without registration or sign-in. Requesters provide their name and email. New requests appear in the admin dashboard and are emailed to `BOOKING_APPROVER_EMAIL` (or `ADMIN_EMAIL` if unset), with Reply-To set to the requester. If the notification fails, the booking remains saved and the admin dashboard shows the failure. Approver decisions are sent to the submitted email; no customer account is needed.

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
- Implement and test Safaricom Daraja M-PESA STK Push and secure payment callbacks before claiming payments are live.
- Add CSRF protection, rate limiting, input validation, monitoring, backups and a privacy notice.
- Review the admin access, session cookie and Content Security Policy settings for your hosting environment.
- Confirm business address, email, exact service area, food safety/allergen disclosures, cancellation policy and delivery fees.
- The supplied Nanny Caterers photos are bundled locally in `public/images`; confirm you have permission to publish all people shown in them.

This is a starter project, not a deployed production system.
