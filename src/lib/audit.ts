import { db } from "./db";
import { auditLogs } from "./db/schema";

export type AuditAction =
  | "order.created"
  | "order.viewed"
  | "order.status_changed"
  | "order.settings_changed"
  | "order.cancelled"
  | "order.completed"
  | "order.deleted"
  | "order.expired"
  | "file.uploaded"
  | "file.downloaded"
  | "file.deleted"
  | "pricing.changed"
  | "settings.changed"
  | "user.login"
  | "user.logout"
  | "user.created"
  | "shop.created"
  | "payment.reported_by_customer"
  | "payment.status_changed";

export async function audit(params: {
  shopId?: string;
  orderId?: string;
  userId?: string;
  action: AuditAction;
  details?: Record<string, unknown>;
  ipAddress?: string;
}) {
  try {
    await db.insert(auditLogs).values({
      shopId: params.shopId,
      orderId: params.orderId,
      userId: params.userId,
      action: params.action,
      details: params.details,
      ipAddress: params.ipAddress,
    });
  } catch {
    // Non-critical — don't break the main flow if audit fails
    console.error("Audit log failed:", params.action);
  }
}
