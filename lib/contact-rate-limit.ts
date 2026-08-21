const rateLimitWindowMs = 10 * 60 * 1000;
const maxRequestsPerWindow = 3;

let testRequestWindow: { count: number; expiresAt: number } | undefined;

export function isContactRateLimited() {
  const now = Date.now();

  if (!testRequestWindow || testRequestWindow.expiresAt <= now) {
    testRequestWindow = { count: 1, expiresAt: now + rateLimitWindowMs };
    return false;
  }

  if (testRequestWindow.count >= maxRequestsPerWindow) {
    return true;
  }

  testRequestWindow.count += 1;
  return false;
}

export function resetContactTestRateLimitForTests() {
  testRequestWindow = undefined;
}
