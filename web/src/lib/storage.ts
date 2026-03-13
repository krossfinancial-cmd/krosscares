import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getNormalizedEnv, isProduction, requireConfiguredInProduction } from "@/lib/env";

function s3Client() {
  const endpoint = requireConfiguredInProduction("S3_ENDPOINT", getNormalizedEnv("S3_ENDPOINT"));
  const accessKeyId =
    requireConfiguredInProduction("S3_ACCESS_KEY", getNormalizedEnv("S3_ACCESS_KEY")) || "minioadmin";
  const secretAccessKey =
    requireConfiguredInProduction("S3_SECRET_KEY", getNormalizedEnv("S3_SECRET_KEY")) || "minioadmin";

  return new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  });
}

export async function uploadFile(file: File, folder: "headshots" | "logos") {
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const key = `${folder}/${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const endpoint = getNormalizedEnv("S3_ENDPOINT");

  if (!endpoint) {
    if (isProduction) {
      throw new Error("S3_ENDPOINT is not configured.");
    }

    const uploadDir = path.join(process.cwd(), "tmp", folder);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, key.split("/")[1]), bytes);
    return `/tmp/${folder}/${key.split("/")[1]}`;
  }

  const bucket = requireConfiguredInProduction("S3_BUCKET", getNormalizedEnv("S3_BUCKET")) || "kross-assets";
  await s3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bytes,
      ContentType: file.type || "application/octet-stream",
    }),
  );

  return `${endpoint}/${bucket}/${key}`;
}
