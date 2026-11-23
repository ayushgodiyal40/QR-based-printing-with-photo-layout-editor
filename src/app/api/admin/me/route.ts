import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name || "Owner",
      email: user.email,
      role: user.role || "owner",
      shopId: user.shopId,
      shopName: user.shopName || "Print Shop",
    },
  });
}
