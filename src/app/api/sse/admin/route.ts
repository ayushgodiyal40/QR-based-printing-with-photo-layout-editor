import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { subscribeToShop, formatSSE } from "@/lib/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const shopId = (session.user as any).shopId as string;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      function write(data: string) {
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          // Stream closed
        }
      }

      // Send initial connected event
      write(formatSSE({ event: "connected", data: { shopId } }));

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        write(formatSSE({ event: "heartbeat", data: { ts: Date.now() } }));
      }, 30000);

      // Subscribe to shop updates
      const unsubscribe = subscribeToShop(shopId, write);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
