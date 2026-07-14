import { LangfuseSpanProcessor } from "@langfuse/otel";
import { startActiveObservation, propagateAttributes } from "@langfuse/tracing";
import { NodeSDK } from "@opentelemetry/sdk-node";
import type { Instrumentation } from "next";
import { isLangfuseTracingEnabled, maskSensitiveData } from "./lib/langfuse";

type LangfuseRuntime = {
  processor: LangfuseSpanProcessor;
  sdk: NodeSDK;
  started: boolean;
};

type LangfuseGlobal = typeof globalThis & {
  __moderatoLangfuseRuntime?: LangfuseRuntime;
};

function getRuntime() {
  if (!isLangfuseTracingEnabled()) {
    return undefined;
  }

  const globalForLangfuse = globalThis as LangfuseGlobal;

  if (!globalForLangfuse.__moderatoLangfuseRuntime) {
    const processor = new LangfuseSpanProcessor({ mask: maskSensitiveData });

    globalForLangfuse.__moderatoLangfuseRuntime = {
      processor,
      sdk: new NodeSDK({ spanProcessors: [processor] }),
      started: false,
    };
  }

  return globalForLangfuse.__moderatoLangfuseRuntime;
}

export function registerLangfuse() {
  const runtime = getRuntime();

  if (runtime && !runtime.started) {
    runtime.sdk.start();
    runtime.started = true;
  }
}

export async function traceServerError(
  error: unknown,
  request: Parameters<Instrumentation.onRequestError>[1],
  context: Parameters<Instrumentation.onRequestError>[2],
) {
  const runtime = getRuntime();

  if (!runtime) {
    return;
  }

  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String(error.digest)
      : undefined;
  const errorName = error instanceof Error ? error.name : "UnknownError";

  try {
    await propagateAttributes(
      {
        traceName: "server-error",
        tags: ["nextjs", "server-error"],
        metadata: {
          routerKind: context.routerKind,
          routeType: context.routeType,
        },
      },
      async () =>
        startActiveObservation("handle-server-error", async (span) => {
          span.update({
            input: {
              method: request.method,
              routePath: context.routePath,
            },
            output: {
              digest,
              errorName,
            },
          });
        }),
    );
    await runtime.processor.forceFlush();
  } catch {
    // Observability must never interfere with Next.js error handling.
  }
}
