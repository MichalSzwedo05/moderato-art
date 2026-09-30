import { getPrisma } from "./prisma";

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

export async function recordMessage(channel: MessageHistoryChannel, message: string, recipientCount: number, subject?: string) {
  await getPrisma().messageLog.create({
    data: { channel, message, recipientCount, subject: subject?.trim() || null },
    select: { id: true },
  });
}

export async function getMessageHistory(channels: MessageHistoryChannel[] = [...messageHistoryChannels], limit = messageHistoryMaxRecords): Promise<MessageHistoryEntry[]> {
  const records = await getPrisma().messageLog.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { createdAt: true, message: true, recipientCount: true, subject: true },
    take: limit,
    where: { channel: { in: channels } },
  });

  return records.map((record) => ({
    createdAt: record.createdAt.toISOString(),
    messagePreview: record.message.slice(0, messageHistoryPreviewLength),
    recipientCount: record.recipientCount,
    subject: record.subject,
    truncated: record.message.length > messageHistoryPreviewLength,
  }));
}
