import { getPrisma } from "./prisma";

const dispatchRetentionMs = 7 * 24 * 60 * 60 * 1000;

export const dispatchStatuses = ["IN_PROGRESS", "COMPLETED", "PARTIAL"] as const;
export type DispatchStatus = (typeof dispatchStatuses)[number];
export type DispatchChannel = "MMS";

export type DispatchRecipient = {
  phone: string;
  state: "pending" | "sending" | "sent" | "failed";
};

type DispatchRow = {
  channel: string;
  createdAt: Date;
  expiresAt: Date;
  failedCount: number;
  id: string;
  key: string;
  message: string;
  recipients: unknown;
  sentCount: number;
  status: string;
  totalCount: number;
  updatedAt: Date;
};

export type MessageDispatch = {
  channel: DispatchChannel;
  expiresAt: Date;
  failedCount: number;
  id: string;
  key: string;
  message: string;
  recipients: DispatchRecipient[];
  sentCount: number;
  status: DispatchStatus;
  totalCount: number;
};

export type DispatchReuse =
  | { kind: "created"; dispatch: MessageDispatch }
  | { kind: "resumed"; dispatch: MessageDispatch }
  | { kind: "completed"; dispatch: MessageDispatch }
  | { kind: "conflict"; dispatch: MessageDispatch }
  | { kind: "expired"; dispatch: MessageDispatch };

export function dispatchExpiresAt(now = new Date()) {
  return new Date(now.getTime() + dispatchRetentionMs);
}

const dispatchStates = new Set(["pending", "sending", "sent", "failed"]);

function toDispatch(row: DispatchRow): MessageDispatch {
  const recipients: DispatchRecipient[] = Array.isArray(row.recipients)
    ? row.recipients.flatMap((recipient) => {
      if (typeof recipient !== "object" || recipient === null) return [];
      const { phone, state } = recipient as { phone?: unknown; state?: unknown };
      if (typeof phone !== "string" || typeof state !== "string" || !dispatchStates.has(state)) return [];
      return [{ phone, state: state as DispatchRecipient["state"] }];
    })
    : [];

  return {
    channel: "MMS",
    expiresAt: row.expiresAt,
    failedCount: row.failedCount,
    id: row.id,
    key: row.key,
    message: row.message,
    recipients,
    sentCount: row.sentCount,
    status: row.status as DispatchStatus,
    totalCount: row.totalCount,
  };
}

function sameRecipients(a: DispatchRecipient[], b: DispatchRecipient[]) {
  if (a.length !== b.length) return false;
  return a.every((recipient, index) => recipient.phone === b[index]?.phone);
}

function mismatch(dispatch: MessageDispatch, input: { channel: DispatchChannel; message: string; recipients: string[] }) {
  return dispatch.message !== input.message
    || dispatch.channel !== input.channel
    || !sameRecipients(dispatch.recipients, input.recipients.map((phone) => ({ phone, state: "pending" as const })));
}

/**
 * A dispatch may only be sent again for the very same key, message, channel and
 * recipient list, in the same order. A finished dispatch is never resent, a
 * partial one only requeues recipients that did not reach the provider, and any
 * other mismatch is a conflict, so a stale key can never deliver a second copy.
 */
export async function getOrCreateDispatch(input: {
  channel: DispatchChannel;
  key: string;
  message: string;
  recipients: string[];
  now?: Date;
}): Promise<DispatchReuse> {
  const prisma = getPrisma();
  const now = input.now ?? new Date();
  const existing = await prisma.messageDispatch.findUnique({ where: { key: input.key } });

  if (existing) {
    return reuseDispatch(toDispatch(existing as DispatchRow), input, now);
  }

  try {
    const created = await prisma.messageDispatch.create({
      data: {
        channel: input.channel,
        expiresAt: dispatchExpiresAt(now),
        key: input.key,
        message: input.message,
        recipients: input.recipients.map((phone) => ({ phone, state: "pending" })),
        sentCount: 0,
        failedCount: 0,
        status: "IN_PROGRESS",
        totalCount: input.recipients.length,
      },
    });
    return { dispatch: toDispatch(created as DispatchRow), kind: "created" };
  } catch (error) {
    const raced = await prisma.messageDispatch.findUnique({ where: { key: input.key } });
    if (!raced) throw error;
    return reuseDispatch(toDispatch(raced as DispatchRow), input, now);
  }
}

async function reuseDispatch(
  dispatch: MessageDispatch,
  input: { channel: DispatchChannel; message: string; recipients: string[] },
  now: Date,
): Promise<DispatchReuse> {
  if (dispatch.expiresAt <= now) return { dispatch, kind: "expired" };
  if (mismatch(dispatch, input)) return { dispatch, kind: "conflict" };
  if (dispatch.status === "COMPLETED") return { dispatch, kind: "completed" };
  if (dispatch.status === "IN_PROGRESS") return { dispatch, kind: "resumed" };

  const requeued = dispatch.recipients.map((recipient) => (
    recipient.state === "sent" ? recipient : { phone: recipient.phone, state: "pending" as const }
  ));
  const reopened = await getPrisma().messageDispatch.update({
    data: { failedCount: 0, recipients: requeued, status: "IN_PROGRESS" },
    where: { id: dispatch.id },
  });

  return { dispatch: toDispatch(reopened as DispatchRow), kind: "resumed" };
}

async function currentRecipients(id: string) {
  const current = await getPrisma().messageDispatch.findUnique({ select: { recipients: true }, where: { id } });
  return Array.isArray(current?.recipients)
    ? current.recipients.flatMap((recipient) => {
      if (typeof recipient !== "object" || recipient === null) return [];
      const { phone, state } = recipient as { phone?: unknown; state?: unknown };
      if (typeof phone !== "string" || typeof state !== "string" || !dispatchStates.has(state)) return [];
      return [{ phone, state: state as DispatchRecipient["state"] }];
    })
    : [];
}

/**
 * The recipient is marked as in flight before the provider call, so a crash
 * between the call and the outcome update leaves a recipient that is never
 * retried blindly, which is the only way to keep a paid send from being billed
 * twice for the same message.
 */
export async function markRecipientInFlight(id: string, phone: string) {
  const recipients = (await currentRecipients(id)).map((recipient) => (
    recipient.phone === phone && recipient.state !== "sent" ? { ...recipient, state: "sending" as const } : recipient
  ));

  await getPrisma().messageDispatch.update({ data: { recipients }, select: { id: true }, where: { id } });
}

export async function markRecipientSent(id: string, phone: string, sentCount: number) {
  const recipients = (await currentRecipients(id))
    .map((recipient) => recipient.phone === phone ? { ...recipient, state: "sent" as const } : recipient);

  return getPrisma().messageDispatch.update({
    data: { recipients, sentCount },
    select: { failedCount: true, sentCount: true, totalCount: true },
    where: { id },
  });
}

export async function markRecipientFailed(id: string, phone: string, sentCount: number, failedCount: number) {
  const recipients = (await currentRecipients(id))
    .map((recipient) => recipient.phone === phone ? { ...recipient, state: "failed" as const } : recipient);

  return getPrisma().messageDispatch.update({
    data: { failedCount, recipients, sentCount },
    select: { failedCount: true, sentCount: true, totalCount: true },
    where: { id },
  });
}

export function finishDispatchStatus(failedCount: number): DispatchStatus {
  return failedCount === 0 ? "COMPLETED" : "PARTIAL";
}

export function pendingRecipients(dispatch: MessageDispatch) {
  return dispatch.recipients.filter((recipient) => recipient.state !== "sent" && recipient.state !== "sending");
}
