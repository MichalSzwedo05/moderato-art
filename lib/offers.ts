export const offers = [
  {
    audience: "Dla dzieci w wieku przedszkolnym",
    description: "Śpiew, ruch i twórcza zabawa rozwijające słuch muzyczny, rytm i wyobraźnię.",
    id: "rytmisolki",
    number: "01",
    subtitle: "Zajęcia muzyczno-rytmiczne",
    title: "Rytmisolki",
  },
  {
    audience: "Dla dzieci w wieku przedszkolnym",
    description: "Bezpieczne odkrywanie głosu, śpiew przy fortepianie i pierwsze doświadczenia sceniczne.",
    id: "junior-voice",
    number: "02",
    subtitle: "Grupowe lekcje śpiewu",
    title: "Junior Voice",
  },
  {
    audience: "Dla dzieci, młodzieży i dorosłych",
    description: "Świadoma praca nad oddechem, emisją głosu, dykcją i interpretacją utworów.",
    id: "studio-wokalne",
    number: "03",
    subtitle: "Indywidualne lekcje śpiewu",
    title: "Studio Wokalne",
  },
] as const;

export type OfferId = (typeof offers)[number]["id"];
