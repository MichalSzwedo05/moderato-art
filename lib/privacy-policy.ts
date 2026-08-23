export type PrivacyPolicyStatus = "draft" | "published";

export const privacyPolicy: {
  address: string;
  controller: string;
  privacyContact: string;
  retentionMonths: number;
  status: PrivacyPolicyStatus;
  updatedAt: string;
  version: string;
} = {
  address: "[ADRES ADMINISTRATORA – UZUPEŁNIĆ]",
  controller: "[ADMINISTRATOR DANYCH – UZUPEŁNIĆ]",
  privacyContact: "[KONTAKT DS. PRYWATNOŚCI – UZUPEŁNIĆ]",
  retentionMonths: 12,
  status: "draft",
  updatedAt: "23 sierpnia 2026",
  version: "draft-db-only-2026-08-23",
};

export const privacyNoticeVersion = privacyPolicy.version;
