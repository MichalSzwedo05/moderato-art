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
  group?: string;
  imageConsent: string;
  lessonType: ContactLessonType;
  paymentAccepted?: boolean;
  postalCode?: string;
  preschool?: string;
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
  const isChildLesson = submission.lessonType === "junior-voice";
  const row = isChildLesson
    ? [
        submission.submittedAt.toISOString(),
        submission.childName ?? "",
        submission.birthDate,
        submission.preschool ?? "",
        submission.group ?? "",
        submission.addressStreet ?? "",
        submission.postalCode ?? "",
        submission.city ?? "",
        submission.phone ?? "",
        submission.email,
        submission.paymentAccepted ? "Akceptuje warunki" : "",
        submission.imageConsent,
      ]
    : [
        submission.submittedAt.toISOString(),
        submission.childName ?? "",
        submission.birthDate,
        submission.addressStreet ?? "",
        submission.postalCode ?? "",
        submission.city ?? "",
        submission.phone ?? "",
        submission.email,
        submission.imageConsent,
      ];

  const values = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: `'${tabTitle}'!A:A`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  const existing = (values.data.values ?? []).map((cell) => (typeof cell[0] === "string" ? cell[0] : ""));
  const firstEmptyRow = existing.findIndex((value) => value.length === 0);
  const targetRow = firstEmptyRow === -1 ? existing.length + 1 : firstEmptyRow + 1;

  await sheets.spreadsheets.values.update({
    spreadsheetId: config.spreadsheetId,
    range: `'${tabTitle}'!A${targetRow}`,
    valueInputOption: "RAW",
    requestBody: {
      majorDimension: "ROWS",
      values: [row],
    },
  });
}
