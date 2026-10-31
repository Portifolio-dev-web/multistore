import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Qualquer storage compatível com S3: AWS S3, Cloudflare R2, MinIO, DigitalOcean Spaces, Backblaze B2…
let client: S3Client | null = null;

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

function s3(): S3Client {
  client ??= new S3Client({
    region: env("S3_REGION"),
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: { accessKeyId: env("S3_ACCESS_KEY_ID"), secretAccessKey: env("S3_SECRET_ACCESS_KEY") },
  });
  return client;
}

export async function putPublicObject(key: string, body: Uint8Array, contentType: string): Promise<string> {
  await s3().send(
    new PutObjectCommand({
      Bucket: env("S3_BUCKET"),
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return `${env("S3_PUBLIC_URL").replace(/\/$/, "")}/${key}`;
}
