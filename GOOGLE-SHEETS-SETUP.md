# Google Sign-In Setup For EMS Dashboard

The EMS dashboard can read a restricted Google Sheet without publishing it publicly, but it needs a Google OAuth Client ID.

## Setup

1. In Google Cloud Console, create or choose a project.
2. Enable the **Google Sheets API**.
3. Create an **OAuth client ID** for a **Web application**.
4. Add this authorized JavaScript origin:

   `https://kizzymoon.github.io`

5. Copy the client ID.
6. In `ems-dashboard.js`, replace:

   `PASTE_GOOGLE_CLIENT_ID_HERE`

   with that client ID.

The dashboard uses the read-only scope:

`https://www.googleapis.com/auth/spreadsheets.readonly`

Users still need Google permission to the original sheet. If they do not have access, the sync will fail.
