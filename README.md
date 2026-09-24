# AS Logistics Solutions

**Developed by Rohail Asad**  
📧 [rohailasad23@icloud.com](mailto:rohailasad23@icloud.com)

## Overview

AS Logistics Solutions is a local web application that scans MC-number ranges against the FMCSA SAFER Company Snapshot and filters results to show only active, authorized carriers. The app provides a commercial-grade carrier discovery tool for logistics professionals.

### Filter Criteria

Results are filtered to match all of these criteria:

- Entity Type contains `Carrier` (not broker or freight forwarder)
- USDOT Status is `ACTIVE`
- Operating Authority Status is `AUTHORIZED`
- The carrier is authorized for property
- Physical address is in the United States
- Cargo Carried marks `General Freight` with an X

### Features

- ✅ **Bulk MC Range Scanning** - Scan up to 500 MC numbers at once
- ✅ **License-Based Access** - Secure authentication and device-based licensing
- ✅ **CSV Export** - Download filtered results as CSV
- ✅ **Google Sheets Integration** - Create Google Sheets directly from scan results
- ✅ **Email Enrichment** - Automatic email lookup via LoadGuard integration
- ✅ **Admin Dashboard** - License key management and device authorization
- ✅ **Rate Limiting** - Respectful 1.1s delay between requests to FMCSA

The results include MC number, USDOT number, legal name, phone, physical address, statuses, and email column. Note: FMCSA SAFER usually does not publish email addresses, so enrichment is needed.

- Entity Type contains `Carrier` (not broker or freight forwarder)
- USDOT Status is `ACTIVE`
- Operating Authority Status is `AUTHORIZED`
- The carrier is authorized for property
- Physical address is in the United States
- Cargo Carried marks `General Freight` with an X

The results include MC number, USDOT number, legal name, phone, physical address, statuses, and an Email column. SAFER Company Snapshot usually does not publish email addresses, so most email cells will be blank.

## Run on Windows

1. Install Node.js 22 or later from https://nodejs.org/
2. Unzip this project and open PowerShell inside its folder.
3. Run `npm.cmd install`
4. Run `npm.cmd run dev`
5. Open the Local URL shown in the window (normally http://localhost:3000).

On macOS or Linux, use `npm install` and `npm run dev` instead.

The scanner waits a little over one second between requests and permits at most 500 MC numbers per run. Keep this delay in place and use the public service responsibly.

## Optional Google Sheets setup

CSV export works immediately and can be imported into Google Sheets. For the **Create Google Sheet** button:

1. In Google Cloud Console, create or select a project.
2. Enable **Google Sheets API**.
3. Create a service account and download its JSON key.
4. Copy `.env.example` to `.env.local`.
5. Put the JSON file's `client_email` into `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
6. Put its `private_key` into `GOOGLE_PRIVATE_KEY`, keeping the `\n` characters.
7. Restart the app.

Sheets created by a service account belong to that service account. Open the resulting sheet and use Share to give your normal Google account access. Never put `.env.local` or the downloaded JSON key in the ZIP or source control.

## Architecture

- **Frontend:** Next.js 16 with React 19, TypeScript
- **Backend:** Cloudflare Workers with D1 SQLite database
- **Auth:** Session-based with device fingerprinting
- **ORM:** Drizzle with SQLite
- **Styling:** Tailwind CSS
- **Deployment:** Cloudflare Pages & Workers

## Important Notes

- FMCSA can change its page layout or temporarily limit requests. If that happens, stop and retry later.
- Always verify important carrier decisions directly in the official FMCSA record.
- This project does not bypass CAPTCHA, access controls, or rate limits.
- The scanner waits 1.1 seconds between requests and caps at 500 MC numbers per run to respect rate limits.

## Support

For issues, questions, or feature requests, contact:  
📧 [rohailasad23@icloud.com](mailto:rohailasad23@icloud.com)

---

**© All rights reserved | Developed by Rohail Asad**
