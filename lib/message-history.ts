import { messageHistoryMaxRecords, messageHistoryPreviewLength, type MessageHistoryChannel, type MessageHistoryEntry } from "./message-history-channels";
import { getPrisma } from "./prisma";

export async function recordMessage(channel: MessageHistoryChannel, message: string, recipientCount: number, subject?: string) {
  await getPrisma().messageLog.create({
    data: { channel, message, recipientCount, subject: subject?.trim() || null },
    select: { id: true },
  });
}

export async function getMessageHistory(channels: MessageHistoryChannel[] = ["SMS", "MMS", "EMAIL"], limit = messageHistoryMaxRecords): Promise<MessageHistoryEntry[]> {
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
