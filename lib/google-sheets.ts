import { google } from "googleapis";

export type GoogleSheetsConfig = {
  clientEmail: string;
  privateKey: string;
  range: string;
  spreadsheetId: string;
};

export type ContactSheetRow = {
  address?: string;
  birthDate: string;
  childName?: string;
  email: string;
  group: string;
  imageConsent: string;
  paymentAccepted: boolean;
  preschool: string;
  phone?: string;
  submittedAt: Date;
};

export async function appendContactSubmissionToSheet(
  config: GoogleSheetsConfig,
  submission: ContactSheetRow,
) {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: config.clientEmail,
      private_key: config.privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId: config.spreadsheetId,
    range: config.range,
    valueInputOption: "RAW",
    requestBody: {
      majorDimension: "ROWS",
      values: [[
        submission.submittedAt.toISOString(),
        submission.childName ?? "",
        submission.birthDate,
        submission.preschool,
        submission.group,
        submission.address ?? "",
        submission.phone ?? "",
        submission.email,
        submission.paymentAccepted ? "Akceptuje warunki" : "",
        submission.imageConsent,
      ]],
    },
  });
}
