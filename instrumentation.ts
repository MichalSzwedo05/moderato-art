import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerLangfuse } = await import("./instrumentation.node");

    registerLangfuse();
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { traceServerError } = await import("./instrumentation.node");

  await traceServerError(error, request, context);
};
