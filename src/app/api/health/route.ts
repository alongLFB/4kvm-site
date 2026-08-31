import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "4kvm-site",
    timestamp: new Date().toISOString(),
  });
}
