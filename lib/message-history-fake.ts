import { messageHistoryPreviewLength, type MessageHistoryChannel, type MessageHistoryEntry } from "./message-history-channels";

export const fakeMessageHistoryEnvVar = "SMS_HISTORY_FAKE_DATA";

const samples: Array<{ channel: MessageHistoryChannel; message: string; recipientCount: number; subject?: string }> = [
  { channel: "SMS", message: "Przypomnienie o próbie generalnej w sobotę o 10:00.", recipientCount: 12 },
  { channel: "SMS", message: "Dzień dobry, przypominam o opłacenie zajęć za wrzesień. Pozdrawiamy serdecznie, zespół Moderato.", recipientCount: 48 },
  { channel: "MMS", message: "Szanowni Państwo, serdeczne zaproszenie na koncert Moderato Art. W programie pieśni, arie i muzyka rozrywkowa. Serdecznie zapraszamy.", recipientCount: 120 },
  { channel: "EMAIL", message: "Dzień dobry, przesyłamy harmonogram sezonu wraz z informacją o wolnych terminach. W razie pytań prosimy o kontakt.", recipientCount: 35, subject: "Harmonogram sezonu 2026/2027" },
  { channel: "SMS", message: "Krótka wiadomość", recipientCount: 3 },
  { channel: "MMS", message: "MMS z długą treścią: ".repeat(12), recipientCount: 64 },
  { channel: "EMAIL", message: "Zawartość wiadomości e-mail.", recipientCount: 7, subject: "Zdjęcia z koncertu" },
  { channel: "SMS", message: "Prosimy o potwierdzenie obecności do końca tygodnia.", recipientCount: 21 },
  { channel: "EMAIL", message: "Pierwsza linia wiadomości.\nDruga linia wiadomości.\nTrzecia linia wiadomości.", recipientCount: 2, subject: "Test wielolinijkowy" },
  { channel: "MMS", message: "Wiadomość MMS wysłana do wszystkich zgłoszonych osób.", recipientCount: 96 },
  { channel: "SMS", message: "Zmiana godziny zajęć: wtorek 17:00 zamiast 16:00.", recipientCount: 15 },
  { channel: "EMAIL", message: "Podsumowanie miesiąca z listą obecności.", recipientCount: 41, subject: "Podsumowanie" },
];

export function isFakeMessageHistoryEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.NODE_ENV !== "production" && env[fakeMessageHistoryEnvVar] === "1";
}

export function createFakeMessageHistory(channels?: MessageHistoryChannel[], now = new Date()): MessageHistoryEntry[] {
  const selected = channels?.length ? samples.filter((sample) => channels.includes(sample.channel)) : samples;

  return selected.map((sample, index) => {
    const createdAt = new Date(now.getTime() - index * 5 * 60 * 60 * 1000);
    return {
      createdAt: createdAt.toISOString(),
      messagePreview: sample.message.slice(0, messageHistoryPreviewLength),
      recipientCount: sample.recipientCount,
      subject: sample.subject ?? null,
      truncated: sample.message.length > messageHistoryPreviewLength,
    };
  });
}
