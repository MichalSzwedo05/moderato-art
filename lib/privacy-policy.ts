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
  address: "Żołędowo, ul. Krokusowa, 86-021",
  controller: "Magdalena Warzecha-Hiller",
  privacyContact: "moderato.art@wp.pl",
  retentionMonths: 12,
  status: "published",
  updatedAt: "30 sierpnia 2026",
  version: "2026-08-30",
};

export const privacyNoticeVersion = privacyPolicy.version;
