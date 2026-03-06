import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

function s3Client() {
  return new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY || "minioadmin",
      secretAccessKey: process.env.S3_SECRET_KEY || "minioadmin",
    },
    forcePathStyle: true,
  });
}

export async function uploadFile(file: File, folder: "headshots" | "logos") {
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const key = `${folder}/${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  if (!process.env.S3_ENDPOINT) {
    const uploadDir = path.join(process.cwd(), "tmp", folder);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, key.split("/")[1]), bytes);
    return `/tmp/${folder}/${key.split("/")[1]}`;
  }

  const bucket = process.env.S3_BUCKET || "kross-assets";
  await s3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bytes,
      ContentType: file.type || "application/octet-stream",
    }),
  );

  const endpoint = process.env.S3_ENDPOINT || "http://localhost:9000";
  return `${endpoint}/${bucket}/${key}`;
}
