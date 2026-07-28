/**
 * Nova Tracker feedback receiver.
 *
 * Paste this into: your Google Sheet -> Extensions -> Apps Script.
 * Then Deploy -> New deployment -> Web app
 *   Execute as: Me
 *   Who has access: Anyone
 * Copy the resulting /exec URL into js/sheet-config.js.
 *
 * Every POST from the website's feedback form becomes one new row in
 * a sheet tab called "Feedback" (created automatically on first use).
 *
 * PRIVACY MODEL — read this before deploying:
 *   "Who has access: Anyone" only means anyone can SEND a submission to
 *   this endpoint (doPost, below) — it does NOT make the Sheet itself
 *   public. There is no doGet() here, so the URL cannot be used to read
 *   data back, by design.
 *   The Sheet's own sharing setting is what actually controls who can
 *   VIEW submissions. Leave it at the default ("Restricted" — only you)
 *   in Sheet -> Share. Do NOT change it to "Anyone with the link," or
 *   every visitor's feedback (including names/emails) becomes public.
 */
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Feedback');
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Feedback');
    sheet.appendRow(['Received At', 'Name', 'Email', 'Type', 'Rating', 'Message', 'Page URL', 'User Agent']);
  }

  var data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    new Date(),
    data.name || '',
    data.email || '',
    data.type || '',
    data.rating || '',
    data.message || '',
    data.page || '',
    data.userAgent || ''
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ result: 'success' }))
    .setMimeType(ContentService.MimeType.JSON);
}
