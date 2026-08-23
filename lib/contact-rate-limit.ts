const rateLimitWindowMs = 10 * 60 * 1000;
const maxRequestsPerWindow = 3;
const maxTrackedIdentifiers = 10_000;

const requestWindows = new Map<string, { count: number; expiresAt: number }>();

export function isContactRateLimited(identifier = "global") {
  const now = Date.now();
  for (const [key, window] of requestWindows) {
    if (window.expiresAt <= now) requestWindows.delete(key);
  }

  const current = requestWindows.get(identifier);

  if (!current || current.expiresAt <= now) {
    if (!current && requestWindows.size >= maxTrackedIdentifiers) {
      const oldest = [...requestWindows.entries()].sort(([, left], [, right]) => left.expiresAt - right.expiresAt)[0];
      if (oldest) requestWindows.delete(oldest[0]);
    }
    requestWindows.set(identifier, { count: 1, expiresAt: now + rateLimitWindowMs });
    return false;
  }

  if (current.count >= maxRequestsPerWindow) {
    return true;
  }

  current.count += 1;
  return false;
}

export function resetContactRateLimitForTests() {
  requestWindows.clear();
}
