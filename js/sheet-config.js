/* ===================================================================
   FEEDBACK DESTINATION — Google Sheet via Apps Script Web App
   ===================================================================
   1. Create a new Google Sheet at https://sheets.new
   2. In the sheet, go to Extensions -> Apps Script.
   3. Delete any starter code and paste the contents of
      apps-script/Code.gs (in this repo) instead.
   4. Click Deploy -> New deployment -> gear icon -> Web app.
        Execute as:  Me
        Who has access:  Anyone
   5. Click Deploy, authorize it when Google asks, then copy the
      "Web app URL" it gives you (ends in /exec).
   6. Paste that URL below, replacing the placeholder.

   Full step-by-step walkthrough is in README.md.

   PRIVACY: this URL is safe to commit publicly — it's write-only (the
   script has no doGet, so it can't be used to read data back). What
   actually keeps feedback private is the Google Sheet's OWN sharing
   setting. Leave it at the default ("Restricted" — only you can open
   it) in Sheet -> Share. If you ever change that to "Anyone with the
   link," every visitor's feedback becomes publicly readable — don't.
   =================================================================== */

const SHEET_WEB_APP_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
