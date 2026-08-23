export const offers = [
  {
    audience: "Dla dzieci w wieku przedszkolnym",
    contactMode: "contact-only",
    description: "Śpiew, ruch i twórcza zabawa rozwijające słuch muzyczny, rytm i wyobraźnię.",
    id: "rytmisolki",
    lessonType: "rytmika",
    number: "01",
    subtitle: "Zajęcia muzyczno-rytmiczne",
    title: "Rytmisolki",
  },
  {
    audience: "Dla dzieci w wieku przedszkolnym",
    contactMode: "form",
    description: "Bezpieczne odkrywanie głosu, śpiew przy fortepianie i pierwsze doświadczenia sceniczne.",
    id: "junior-voice",
    lessonType: "junior-voice",
    number: "02",
    subtitle: "Grupowe lekcje śpiewu",
    title: "Junior Voice",
  },
  {
    audience: "Dla dzieci, młodzieży i dorosłych",
    contactMode: "form",
    description: "Świadoma praca nad oddechem, emisją głosu, dykcją i interpretacją utworów.",
    id: "studio-wokalne",
    lessonType: "studio-wokalne",
    number: "03",
    subtitle: "Indywidualne lekcje śpiewu",
    title: "Studio Wokalne",
  },
] as const;

export type OfferId = (typeof offers)[number]["id"];
export type ContactLessonType = (typeof offers)[number]["lessonType"];
