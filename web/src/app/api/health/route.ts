import { NextResponse } from "next/server";
import { callBackendApi } from "@/lib/backend-api";

export async function GET() {
  try {
    await callBackendApi("health");
    return NextResponse.json({
      status: "ok",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
