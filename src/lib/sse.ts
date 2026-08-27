// Server-Sent Events utility

export type SSEEvent = {
  event?: string;
  data: unknown;
  id?: string;
};

/**
 * Format an SSE message string.
 */
export function formatSSE(event: SSEEvent): string {
  let msg = "";
  if (event.id) msg += `id: ${event.id}\n`;
  if (event.event) msg += `event: ${event.event}\n`;
  msg += `data: ${JSON.stringify(event.data)}\n\n`;
  return msg;
}

/**
 * Global SSE subscriber registry keyed by shopId.
 * Each entry is a Set of response writer functions.
 */
type SSEWriter = (data: string) => void;

const shopSubscribers = new Map<string, Set<SSEWriter>>();
const orderSubscribers = new Map<string, Set<SSEWriter>>();

export function subscribeToShop(shopId: string, writer: SSEWriter): () => void {
  if (!shopSubscribers.has(shopId)) {
    shopSubscribers.set(shopId, new Set());
  }
  shopSubscribers.get(shopId)!.add(writer);
  return () => {
    shopSubscribers.get(shopId)?.delete(writer);
  };
}

export function subscribeToOrder(orderId: string, writer: SSEWriter): () => void {
  if (!orderSubscribers.has(orderId)) {
    orderSubscribers.set(orderId, new Set());
  }
  orderSubscribers.get(orderId)!.add(writer);
  return () => {
    orderSubscribers.get(orderId)?.delete(writer);
  };
}

export function notifyShop(shopId: string, event: SSEEvent): void {
  const subscribers = shopSubscribers.get(shopId);
  if (!subscribers) return;
  const msg = formatSSE(event);
  subscribers.forEach((write) => {
    try {
      write(msg);
    } catch {
      // Client disconnected
    }
  });
}

export function notifyOrder(orderId: string, event: SSEEvent): void {
  const subscribers = orderSubscribers.get(orderId);
  if (!subscribers) return;
  const msg = formatSSE(event);
  subscribers.forEach((write) => {
    try {
      write(msg);
    } catch {
      // Client disconnected
    }
  });
}
