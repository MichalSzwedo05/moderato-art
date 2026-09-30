import { getPrisma } from "./prisma";

export const messageHistoryPreviewLength = 100;
export const messageHistoryMaxRecords = 200;
export const messageHistoryChannels = ["SMS", "MMS", "EMAIL"] as const;

export type MessageHistoryChannel = (typeof messageHistoryChannels)[number];

export type MessageHistoryEntry = {
  channel: MessageHistoryChannel;
  createdAt: string;
  messagePreview: string;
  recipientCount: number;
  subject: string | null;
  truncated: boolean;
};

export function isMessageHistoryChannel(value: string): value is MessageHistoryChannel {
  return messageHistoryChannels.some((channel) => channel === value);
}

export async function recordMessage(channel: MessageHistoryChannel, message: string, recipientCount: number, subject?: string) {
  await getPrisma().messageLog.create({
    data: { channel, message, recipientCount, subject: subject?.trim() || null },
    select: { id: true },
  });
}

export async function getMessageHistory(limit = messageHistoryMaxRecords): Promise<MessageHistoryEntry[]> {
  const records = await getPrisma().messageLog.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { channel: true, createdAt: true, message: true, recipientCount: true, subject: true },
    take: limit,
  });

  return records.map((record) => ({
    channel: isMessageHistoryChannel(record.channel) ? record.channel : "SMS",
    createdAt: record.createdAt.toISOString(),
    messagePreview: record.message.slice(0, messageHistoryPreviewLength),
    recipientCount: record.recipientCount,
    subject: record.subject,
    truncated: record.message.length > messageHistoryPreviewLength,
  }));
}
