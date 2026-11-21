import { handlers } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    return await handlers.GET(req);
  } catch (err: any) {
    console.error("NextAuth GET error:", err);
    return NextResponse.json(
      {
        error: "AuthServerError",
        message: err?.message || "Internal auth error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    return await handlers.POST(req);
  } catch (err: any) {
    console.error("NextAuth POST error:", err);
    return NextResponse.json(
      {
        error: "AuthServerError",
        message: err?.message || "Internal auth error",
      },
      { status: 500 }
    );
  }
}
