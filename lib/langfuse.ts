import { propagateAttributes, startActiveObservation } from "@langfuse/tracing";

type TraceContext = {
  metadata?: Record<string, string>;
  sessionId?: string;
  tags?: string[];
  traceName: string;
  userId?: string;
};

type TraceOperationOptions<Result> = {
  input: unknown;
  name: string;
  toOutput: (result: Result) => unknown;
  trace: TraceContext;
};

const cardNumberPattern = /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g;
const emailPattern = /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g;
const phoneNumberPattern = /\+?\d[\d .()-]{7,}\d/g;

export function isLangfuseTracingEnabled() {
  return Boolean(
    process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY,
  );
}

export function maskSensitiveData({ data }: { data: unknown }) {
  if (typeof data !== "string") {
    return data;
  }

  return data
    .replace(cardNumberPattern, "[CARD_REDACTED]")
    .replace(emailPattern, "[EMAIL_REDACTED]")
    .replace(phoneNumberPattern, "[PHONE_REDACTED]");
}

export async function traceAiOperation<Result>(
  options: TraceOperationOptions<Result>,
  operation: () => Promise<Result>,
) {
  if (!isLangfuseTracingEnabled()) {
    return operation();
  }

  return propagateAttributes(options.trace, async () =>
    startActiveObservation(options.name, async (span) => {
      span.update({ input: options.input });

      const result = await operation();

      span.update({ output: options.toOutput(result) });

      return result;
    }),
  );
}
