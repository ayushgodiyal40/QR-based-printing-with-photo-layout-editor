import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  jsonb,
  pgEnum,
  decimal,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["owner", "operator"]);

export const orderStatusEnum = pgEnum("order_status", [
  "uploading",
  "received",
  "waiting",
  "processing",
  "printing",
  "completed",
  "cancelled",
  "failed",
  "expired",
]);

export const colorModeEnum = pgEnum("color_mode", ["bw", "color"]);

export const paperSizeEnum = pgEnum("paper_size", ["A4", "A3", "Letter", "Legal"]);

export const sidesEnum = pgEnum("sides", ["single", "double"]);

export const orientationEnum = pgEnum("orientation", ["auto", "portrait", "landscape"]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid",
  "paid",
  "refunded",
  "not_required",
]);

export const uploadStatusEnum = pgEnum("upload_status", [
  "pending",
  "uploading",
  "complete",
  "failed",
]);

export const priorityEnum = pgEnum("priority", ["normal", "high"]);

// ─── Shops ───────────────────────────────────────────────────────────────────

export const shops = pgTable("shops", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  logoUrl: text("logo_url"),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  gstNumber: varchar("gst_number", { length: 20 }),
  upiId: text("upi_id"),
  upiName: text("upi_name"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default("operator"),
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Shop Settings ───────────────────────────────────────────────────────────

export const shopSettings = pgTable("shop_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Orders ──────────────────────────────────────────────────────────────────

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 6 }).notNull(),
    orderNumber: varchar("order_number", { length: 20 }).notNull(),
    customerName: text("customer_name"),
    customerPhone: varchar("customer_phone", { length: 20 }),
    status: orderStatusEnum("status").notNull().default("received"),
    priority: priorityEnum("priority").notNull().default("normal"),
    // Print settings (order-level defaults)
    colorMode: colorModeEnum("color_mode").notNull().default("bw"),
    paperSize: paperSizeEnum("paper_size").notNull().default("A4"),
    copies: integer("copies").notNull().default(1),
    sides: sidesEnum("sides").notNull().default("single"),
    orientation: orientationEnum("orientation").notNull().default("auto"),
    pageRange: text("page_range"),
    pagesPerSheet: integer("pages_per_sheet").notNull().default(1),
    scaling: text("scaling").notNull().default("fit"),
    // Counts
    totalFiles: integer("total_files").notNull().default(0),
    totalPages: integer("total_pages").notNull().default(0),
    // Pricing & Payment
    estimatedPrice: decimal("estimated_price", { precision: 10, scale: 2 }),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("unpaid"),
    paymentMethod: varchar("payment_method", { length: 20 }).default("cash"),
    paymentReference: text("payment_reference"),
    // Idempotency
    idempotencyKey: text("idempotency_key").unique(),
    // Lifecycle
    expiresAt: timestamp("expires_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    shopIdIdx: index("orders_shop_id_idx").on(t.shopId),
    tokenIdx: index("orders_token_idx").on(t.token),
    statusIdx: index("orders_status_idx").on(t.status),
    createdAtIdx: index("orders_created_at_idx").on(t.createdAt),
  })
);

// ─── Order Files ─────────────────────────────────────────────────────────────

export const orderFiles = pgTable(
  "order_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    originalName: text("original_name").notNull(),
    storedName: text("stored_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    pageCount: integer("page_count"),
    imageWidth: integer("image_width"),
    imageHeight: integer("image_height"),
    storagePath: text("storage_path").notNull(),
    fileData: text("file_data"),
    uploadStatus: uploadStatusEnum("upload_status").notNull().default("complete"),
    isDeleted: boolean("is_deleted").notNull().default(false),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    orderIdIdx: index("order_files_order_id_idx").on(t.orderId),
  })
);

// ─── Printers ────────────────────────────────────────────────────────────────

export const printers = pgTable("printers", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  model: text("model"),
  connectionType: text("connection_type").default("network"),
  supportsColor: boolean("supports_color").notNull().default(false),
  supportsDuplex: boolean("supports_duplex").notNull().default(false),
  paperSizes: jsonb("paper_sizes").$type<string[]>().default(["A4"]),
  isActive: boolean("is_active").notNull().default(true),
  lastSeen: timestamp("last_seen"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Pricing Rules ───────────────────────────────────────────────────────────

export const pricingRules = pgTable("pricing_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  paperSize: paperSizeEnum("paper_size").notNull().default("A4"),
  colorMode: colorModeEnum("color_mode").notNull().default("bw"),
  sides: sidesEnum("sides").notNull().default("single"),
  pricePerPage: decimal("price_per_page", { precision: 8, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Order Notes ─────────────────────────────────────────────────────────────

export const orderNotes = pgTable("order_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Audit Logs ──────────────────────────────────────────────────────────────

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id").references(() => shops.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    details: jsonb("details"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    shopIdIdx: index("audit_logs_shop_id_idx").on(t.shopId),
    orderIdIdx: index("audit_logs_order_id_idx").on(t.orderId),
    createdAtIdx: index("audit_logs_created_at_idx").on(t.createdAt),
  })
);

// ─── Relations ───────────────────────────────────────────────────────────────

export const shopsRelations = relations(shops, ({ many }) => ({
  users: many(users),
  orders: many(orders),
  printers: many(printers),
  pricingRules: many(pricingRules),
  settings: many(shopSettings),
}));

export const usersRelations = relations(users, ({ one }) => ({
  shop: one(shops, { fields: [users.shopId], references: [shops.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  shop: one(shops, { fields: [orders.shopId], references: [shops.id] }),
  files: many(orderFiles),
  notes: many(orderNotes),
}));

export const orderFilesRelations = relations(orderFiles, ({ one }) => ({
  order: one(orders, { fields: [orderFiles.orderId], references: [orders.id] }),
}));

export const orderNotesRelations = relations(orderNotes, ({ one }) => ({
  order: one(orders, { fields: [orderNotes.orderId], references: [orders.id] }),
  user: one(users, { fields: [orderNotes.userId], references: [users.id] }),
}));
