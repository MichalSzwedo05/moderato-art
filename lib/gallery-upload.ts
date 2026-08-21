import { galleryUploadChunkBytes } from "./gallery-validation";

export class GalleryUploadBodyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GalleryUploadBodyError";
  }
}

export function toDatabaseBytes(value: Buffer) {
  return new Uint8Array(value) as Uint8Array<ArrayBuffer>;
}

export async function readGalleryUploadBody(request: Request, maxBytes: number) {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null && (!/^\d+$/.test(contentLength) || Number(contentLength) > maxBytes)) {
    throw new GalleryUploadBodyError("Gallery upload body exceeds the configured limit.");
  }

  if (!request.body) return Buffer.alloc(0);

  const reader = request.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      totalBytes += result.value.byteLength;
      if (totalBytes > maxBytes) throw new GalleryUploadBodyError("Gallery upload body exceeds the configured limit.");
      chunks.push(Buffer.from(result.value));
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks, totalBytes);
}

export function getExpectedGalleryChunkSize(totalBytes: number, chunkIndex: number) {
  const offset = chunkIndex * galleryUploadChunkBytes;
  return Math.max(0, Math.min(galleryUploadChunkBytes, totalBytes - offset));
}
