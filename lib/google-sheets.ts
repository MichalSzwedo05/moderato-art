import { google } from "googleapis";
import { lessonTypeTabs, type ContactLessonType } from "./offers";

export type GoogleSheetsConfig = {
  clientEmail: string;
  privateKey: string;
  range: string;
  spreadsheetId: string;
};

export type ContactSheetRow = {
  addressStreet?: string;
  birthDate: string;
  childName?: string;
  city?: string;
  email: string;
  group: string;
  imageConsent: string;
  lessonType: ContactLessonType;
  paymentAccepted: boolean;
  postalCode?: string;
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
  const tabTitle = lessonTypeTabs[submission.lessonType] ?? submission.lessonType;

  await sheets.spreadsheets.values.append({
    spreadsheetId: config.spreadsheetId,
    range: `'${tabTitle}'!A:L`,
    valueInputOption: "RAW",
    requestBody: {
      majorDimension: "ROWS",
      values: [[
        submission.submittedAt.toISOString(),
        submission.childName ?? "",
        submission.birthDate,
        submission.preschool,
        submission.group,
        submission.addressStreet ?? "",
        submission.postalCode ?? "",
        submission.city ?? "",
        submission.phone ?? "",
        submission.email,
        submission.paymentAccepted ? "Akceptuje warunki" : "",
        submission.imageConsent,
      ]],
    },
  });
}
