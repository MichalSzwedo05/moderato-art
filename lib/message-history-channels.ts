export const messageHistoryPreviewLength = 100;
export const messageHistoryMaxRecords = 200;
export const messageHistoryChannels = ["SMS", "MMS", "EMAIL"] as const;

export type MessageHistoryChannel = (typeof messageHistoryChannels)[number];

export type MessageHistoryEntry = {
  createdAt: string;
  messagePreview: string;
  recipientCount: number;
  subject: string | null;
  truncated: boolean;
};

export const smsHistoryChannels: MessageHistoryChannel[] = ["SMS", "MMS"];
export const emailHistoryChannels: MessageHistoryChannel[] = ["EMAIL"];

export function isMessageHistoryChannel(value: string): value is MessageHistoryChannel {
  return messageHistoryChannels.some((channel) => channel === value);
}

export function parseMessageHistoryChannels(value: string | null): MessageHistoryChannel[] | undefined {
  if (value === null) return undefined;
  const requested = value.split(",").map((channel) => channel.trim()).filter(isMessageHistoryChannel);
  return requested.length > 0 ? requested : [];
}
