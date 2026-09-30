import { getPrisma } from "./prisma";

export const smsHistoryPreviewLength = 100;
export const smsHistoryMaxRecords = 200;
export const smsHistoryChannels = ["SMS", "MMS"] as const;

export type SmsHistoryChannel = (typeof smsHistoryChannels)[number];

export type SmsHistoryEntry = {
  createdAt: string;
  messagePreview: string;
  recipientCount: number;
  truncated: boolean;
};

export function isSmsHistoryChannel(value: string): value is SmsHistoryChannel {
  return smsHistoryChannels.some((channel) => channel === value);
}

export async function recordSmsMessage(channel: SmsHistoryChannel, message: string, recipientCount: number) {
  await getPrisma().smsMessage.create({
    data: { channel, message, recipientCount },
    select: { id: true },
  });
}

export async function getSmsHistory(limit = smsHistoryMaxRecords): Promise<SmsHistoryEntry[]> {
  const records = await getPrisma().smsMessage.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { createdAt: true, message: true, recipientCount: true },
    take: limit,
  });

  return records.map((record) => ({
    createdAt: record.createdAt.toISOString(),
    messagePreview: record.message.slice(0, smsHistoryPreviewLength),
    recipientCount: record.recipientCount,
    truncated: record.message.length > smsHistoryPreviewLength,
  }));
}
