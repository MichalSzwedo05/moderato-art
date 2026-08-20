import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type GalleryStorageEnvironment = {
  GALLERY_STORAGE_ACCESS_KEY_ID?: string;
  GALLERY_STORAGE_BUCKET?: string;
  GALLERY_STORAGE_ENDPOINT?: string;
  GALLERY_STORAGE_FORCE_PATH_STYLE?: string;
  GALLERY_STORAGE_PREFIX?: string;
  GALLERY_STORAGE_PUBLIC_URL?: string;
  GALLERY_STORAGE_REGION?: string;
  GALLERY_STORAGE_SECRET_ACCESS_KEY?: string;
  NODE_ENV?: string;
};

export type GalleryStorageConfig = {
  accessKeyId: string;
  bucket: string;
  endpoint?: string;
  forcePathStyle: boolean;
  prefix: string;
  publicUrl: string;
  region: string;
  secretAccessKey: string;
};

export class GalleryStorageObjectValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GalleryStorageObjectValidationError";
  }
}

export class GalleryStorageInfrastructureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GalleryStorageInfrastructureError";
  }
}

const globalForGalleryStorage = globalThis as typeof globalThis & {
  galleryStorageClient?: { client: S3Client; configKey: string };
};

function hasUsableValue(value: string | undefined) {
  return Boolean(value && !value.startsWith("replace-with-"));
}

function isAllowedUrl(value: string, environment: GalleryStorageEnvironment) {
  try {
    const parsed = new URL(value);
    const isLocalDevelopmentUrl = environment.NODE_ENV === "development"
      && parsed.protocol === "http:"
      && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1");
    return (parsed.protocol === "https:" || isLocalDevelopmentUrl)
      && !parsed.username
      && !parsed.password
      && !parsed.search
      && !parsed.hash;
  } catch {
    return false;
  }
}

function normalizePrefix(value: string | undefined) {
  const prefix = (value || "gallery").replace(/^\/+|\/+$/g, "");
  return prefix && prefix.length <= 80 && !prefix.includes("..") && !prefix.includes("\\") ? prefix : undefined;
}

export function getGalleryStorageConfig(
  environment: GalleryStorageEnvironment = process.env,
): GalleryStorageConfig | undefined {
  const {
    GALLERY_STORAGE_ACCESS_KEY_ID: accessKeyId,
    GALLERY_STORAGE_BUCKET: bucket,
    GALLERY_STORAGE_ENDPOINT: endpoint,
    GALLERY_STORAGE_FORCE_PATH_STYLE: forcePathStyle = "false",
    GALLERY_STORAGE_PREFIX: prefix,
    GALLERY_STORAGE_PUBLIC_URL: publicUrl,
    GALLERY_STORAGE_REGION: region,
    GALLERY_STORAGE_SECRET_ACCESS_KEY: secretAccessKey,
  } = environment;

  if (!hasUsableValue(accessKeyId) || !hasUsableValue(bucket) || !hasUsableValue(publicUrl)
    || !hasUsableValue(region) || !hasUsableValue(secretAccessKey)
    || (endpoint !== undefined && endpoint !== "" && !hasUsableValue(endpoint))
    || (forcePathStyle !== "true" && forcePathStyle !== "false")) return undefined;

  if (bucket!.length > 255 || region!.length > 100 || accessKeyId!.length > 256 || secretAccessKey!.length > 512) return undefined;
  if (!isAllowedUrl(publicUrl!, environment)) return undefined;
  if (endpoint && !isAllowedUrl(endpoint, environment)) return undefined;

  const normalizedPrefix = normalizePrefix(prefix);
  if (!normalizedPrefix) return undefined;

  return {
    accessKeyId: accessKeyId!,
    bucket: bucket!,
    endpoint: endpoint || undefined,
    forcePathStyle: forcePathStyle === "true",
    prefix: normalizedPrefix,
    publicUrl: publicUrl!.replace(/\/+$/, ""),
    region: region!,
    secretAccessKey: secretAccessKey!,
  };
}

function getStorageClient(config: GalleryStorageConfig) {
  const configKey = [config.accessKeyId, config.bucket, config.endpoint, config.forcePathStyle, config.region].join("\u0000");
  if (globalForGalleryStorage.galleryStorageClient?.configKey === configKey) {
    return globalForGalleryStorage.galleryStorageClient.client;
  }

  const clientConfig: S3ClientConfig = {
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    forcePathStyle: config.forcePathStyle,
    region: config.region,
  };
  if (config.endpoint) clientConfig.endpoint = config.endpoint;

  const client = new S3Client(clientConfig);
  globalForGalleryStorage.galleryStorageClient = { client, configKey };
  return client;
}

export function makeGalleryStorageKey(config: GalleryStorageConfig, ...parts: string[]) {
  return [config.prefix, ...parts].join("/");
}

export function makeGalleryPublicUrl(config: GalleryStorageConfig, key: string) {
  return `${config.publicUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export async function createGalleryUploadUrl(config: GalleryStorageConfig, key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    CacheControl: "no-store",
    ContentType: contentType,
    IfNoneMatch: "*",
    Key: key,
  });
  return getSignedUrl(getStorageClient(config), command, { expiresIn: 10 * 60 });
}

export async function readGalleryObjectBody(body: AsyncIterable<Uint8Array | string>, maxBytes: number, expectedBytes?: number) {
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  try {
    for await (const chunk of body) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buffer.byteLength;
      if (totalBytes > maxBytes) throw new GalleryStorageObjectValidationError("Gallery storage object exceeds the configured upload limit.");
      chunks.push(buffer);
    }
  } catch (error) {
    if (error instanceof GalleryStorageObjectValidationError || error instanceof GalleryStorageInfrastructureError) throw error;
    throw new GalleryStorageInfrastructureError("Gallery storage stream could not be read.");
  }
  if (totalBytes === 0) throw new GalleryStorageObjectValidationError("Gallery storage returned an empty object.");
  if (expectedBytes !== undefined && totalBytes !== expectedBytes) {
    throw new GalleryStorageInfrastructureError("Gallery storage returned a truncated object.");
  }
  return Buffer.concat(chunks, totalBytes);
}

export async function getGalleryObject(config: GalleryStorageConfig, key: string, maxBytes: number, expectedBytes?: number) {
  const head = await getStorageClient(config).send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }));
  if (!head.ETag) throw new GalleryStorageInfrastructureError("Gallery storage did not return an object ETag.");
  if (typeof head.ContentLength !== "number" || head.ContentLength <= 0 || head.ContentLength > maxBytes
    || (expectedBytes !== undefined && head.ContentLength !== expectedBytes)) {
    throw new GalleryStorageObjectValidationError("Gallery storage object exceeds the configured upload limit.");
  }
  const response = await getStorageClient(config).send(new GetObjectCommand({ Bucket: config.bucket, IfMatch: head.ETag, Key: key }));
  if (!response.Body) throw new GalleryStorageInfrastructureError("Gallery storage returned an empty response body.");
  return readGalleryObjectBody(response.Body as unknown as AsyncIterable<Uint8Array | string>, maxBytes, head.ContentLength);
}

export async function putGalleryObject(config: GalleryStorageConfig, key: string, body: Buffer) {
  await getStorageClient(config).send(new PutObjectCommand({
    Body: body,
    Bucket: config.bucket,
    CacheControl: "public, max-age=31536000, immutable",
    ContentLength: body.byteLength,
    ContentType: "image/webp",
    Key: key,
  }));
}

export async function deleteGalleryObjects(config: GalleryStorageConfig, keys: readonly (string | null | undefined)[]) {
  const uniqueKeys = [...new Set(keys.filter((key): key is string => Boolean(key)))];
  if (uniqueKeys.length === 0) return;

  const response = await getStorageClient(config).send(new DeleteObjectsCommand({
    Bucket: config.bucket,
    Delete: { Objects: uniqueKeys.map((Key) => ({ Key })), Quiet: true },
  }));
  if (response.Errors?.length) {
    throw new Error(`Gallery storage failed to delete ${response.Errors.length} object(s).`);
  }
}
