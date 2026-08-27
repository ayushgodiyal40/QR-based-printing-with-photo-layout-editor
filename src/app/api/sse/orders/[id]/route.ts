import { NextRequest } from "next/server";
import { subscribeToOrder, formatSSE } from "@/lib/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      function write(data: string) {
        controller.enqueue(encoder.encode(data));
      }

      // Send initial connected event
      write(formatSSE({ event: "connected", data: { orderId } }));

      // Subscribe to order updates
      const unsubscribe = subscribeToOrder(orderId, write);

      // Handle disconnect
      req.signal.addEventListener("abort", () => {
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
