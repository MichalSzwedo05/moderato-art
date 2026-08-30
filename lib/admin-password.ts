import argon2 from "argon2";
import { createHash, timingSafeEqual } from "node:crypto";

const dummyPasswordHash = "$argon2id$v=19$m=65536,p=1,t=3$ETdYhIUIkF40eV6NvGO6JQ$hqQk98eP56MPYwc+6+nw27zSRivAosDwzGPmem1sC/s";

export const minimumAdminPasswordLength = 12;

export async function hashAdminPassword(password: string) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
}

function equalUsername(expected: string, received: string) {
  const expectedHash = createHash("sha256").update(expected).digest();
  const receivedHash = createHash("sha256").update(received).digest();
  return timingSafeEqual(expectedHash, receivedHash);
}

export async function verifyAdminPassword(expectedUsername: string, passwordHash: string, username: string, password: string) {
  const usernameMatches = equalUsername(expectedUsername, username);
  try {
    const passwordMatches = await argon2.verify(usernameMatches ? passwordHash : dummyPasswordHash, password);
    return usernameMatches && passwordMatches;
  } catch {
    return false;
  }
}
