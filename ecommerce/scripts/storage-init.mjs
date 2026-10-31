// Cria o bucket de mídia e libera leitura pública das imagens (idempotente).
// Rodado pelo serviço "migrate" quando S3_INIT_BUCKET=true (storage local RustFS).
import { CreateBucketCommand, PutBucketPolicyCommand, S3Client } from "@aws-sdk/client-s3";

if (process.env.S3_INIT_BUCKET !== "true") {
  console.log("[storage-init] S3_INIT_BUCKET != true — pulando");
  process.exit(0);
}

const Bucket = process.env.S3_BUCKET;
const s3 = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY },
});

for (let attempt = 1; ; attempt++) {
  try {
    await s3.send(new CreateBucketCommand({ Bucket }));
    console.log(`[storage-init] bucket "${Bucket}" criado`);
    break;
  } catch (err) {
    if (["BucketAlreadyOwnedByYou", "BucketAlreadyExists"].includes(err.name)) break;
    if (attempt >= 10) throw err;
    await new Promise((r) => setTimeout(r, 2000));
  }
}

await s3.send(
  new PutBucketPolicyCommand({
    Bucket,
    Policy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [{ Effect: "Allow", Principal: { AWS: ["*"] }, Action: ["s3:GetObject"], Resource: [`arn:aws:s3:::${Bucket}/*`] }],
    }),
  }),
);
console.log(`[storage-init] leitura pública habilitada em "${Bucket}"`);
