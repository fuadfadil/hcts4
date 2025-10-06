import { pgTable, serial, varchar, text, timestamp, boolean, integer, decimal, json, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Better Auth Tables
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified"),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull(),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Enums
export const userRoleEnum = ["provider", "insurance", "intermediary"] as const;
export const serviceStatusEnum = ["active", "inactive", "suspended"] as const;
export const serviceTypeEnum = ["individual", "package", "composite"] as const;
export const transactionStatusEnum = ["pending", "completed", "cancelled", "refunded"] as const;
export const paymentStatusEnum = ["pending", "completed", "failed", "refunded"] as const;
export const paymentMethodEnum = ["credit_card", "bank_transfer", "paypal", "crypto", "onepay", "lypay"] as const;
export const guarantorStatusEnum = ["active", "inactive"] as const;
export const licenseVerificationStatusEnum = ["pending", "verified", "rejected", "expired"] as const;
export const certificateStatusEnum = ["valid", "expired", "revoked", "suspended"] as const;

// Custom Users Profile table (extends better-auth user)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  user_id: text("user_id").references(() => user.id, { onDelete: "cascade" }).unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password_hash: text("password_hash").notNull(),
  role: varchar("role", { enum: userRoleEnum }).notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  is_verified: boolean("is_verified").notNull().default(false),
  verification_token: text("verification_token"),
}, (table) => [
  index("users_user_id_idx").on(table.user_id),
  index("users_email_idx").on(table.email),
  index("users_role_idx").on(table.role),
]);

// Profiles table
export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organization_name: text("organization_name").notNull(),
  contact_info: json("contact_info").notNull(),
  address: json("address").notNull(),
  license_info: json("license_info"),
  guarantor_info: json("guarantor_info"),
}, (table) => [
  index("profiles_user_id_idx").on(table.user_id),
]);

// ICD11 Categories table
export const icd11Categories = pgTable("icd11_categories", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  parent_id: integer("parent_id").references(() => icd11Categories.id),
  last_synced: timestamp("last_synced"),
}, (table) => [
  index("icd11_categories_code_idx").on(table.code),
  index("icd11_categories_parent_id_idx").on(table.parent_id),
]);

// Service Components table (for composite services)
export const serviceComponents = pgTable("service_components", {
  id: serial("id").primaryKey(),
  composite_service_id: integer("composite_service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  component_service_id: integer("component_service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
}, (table) => [
  index("service_components_composite_service_id_idx").on(table.composite_service_id),
  index("service_components_component_service_id_idx").on(table.component_service_id),
]);

// Services table
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  provider_id: integer("provider_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  icd11_code: varchar("icd11_code", { length: 10 }).notNull(),
  service_type: varchar("service_type", { enum: serviceTypeEnum }).notNull().default("individual"),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  profit_margin: decimal("profit_margin", { precision: 5, scale: 2 }),
  base_price: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  discount_tiers: json("discount_tiers"),
  quantity_available: integer("quantity_available").notNull().default(0),
  status: varchar("status", { enum: serviceStatusEnum }).notNull().default("active"),
  specifications: json("specifications"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("services_provider_id_idx").on(table.provider_id),
  index("services_icd11_code_idx").on(table.icd11_code),
  index("services_status_idx").on(table.status),
  index("services_service_type_idx").on(table.service_type),
]);

// Transactions table
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  buyer_id: integer("buyer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  seller_id: integer("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  service_id: integer("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  unit_price: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  total_price: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { enum: transactionStatusEnum }).notNull().default("pending"),
  created_at: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("transactions_buyer_id_idx").on(table.buyer_id),
  index("transactions_seller_id_idx").on(table.seller_id),
  index("transactions_service_id_idx").on(table.service_id),
  index("transactions_status_idx").on(table.status),
  index("transactions_created_at_idx").on(table.created_at),
]);

// Payments table
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  transaction_id: integer("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  commission_amount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  payment_method: varchar("payment_method", { enum: paymentMethodEnum }).notNull(),
  gateway_response: json("gateway_response"),
  status: varchar("status", { enum: paymentStatusEnum }).notNull().default("pending"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("payments_transaction_id_idx").on(table.transaction_id),
  index("payments_status_idx").on(table.status),
]);

// Certificates table
export const certificates = pgTable("certificates", {
  id: serial("id").primaryKey(),
  transaction_id: integer("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  certificate_number: varchar("certificate_number", { length: 50 }).notNull().unique(),
  qr_code_data: text("qr_code_data").notNull(),
  encrypted_pdf_path: text("encrypted_pdf_path").notNull(),
  pdf_hash: varchar("pdf_hash", { length: 64 }).notNull(), // SHA-256 hash
  verification_hash: varchar("verification_hash", { length: 64 }).notNull(), // For public verification
  digital_signature: text("digital_signature"), // Base64 encoded signature
  status: varchar("status", { enum: certificateStatusEnum }).notNull().default("valid"),
  issued_at: timestamp("issued_at").notNull().defaultNow(),
  expires_at: timestamp("expires_at").notNull(),
  revoked_at: timestamp("revoked_at"),
  revocation_reason: text("revocation_reason"),
  metadata: json("metadata"), // Additional certificate data
}, (table) => [
  index("certificates_transaction_id_idx").on(table.transaction_id),
  index("certificates_certificate_number_idx").on(table.certificate_number),
  index("certificates_status_idx").on(table.status),
  index("certificates_issued_at_idx").on(table.issued_at),
  index("certificates_expires_at_idx").on(table.expires_at),
  index("certificates_verification_hash_idx").on(table.verification_hash),
]);

// Guarantors table
export const guarantors = pgTable("guarantors", {
  id: serial("id").primaryKey(),
  provider_id: integer("provider_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  contact_info: json("contact_info").notNull(),
  guarantee_amount: decimal("guarantee_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { enum: guarantorStatusEnum }).notNull().default("active"),
}, (table) => [
  index("guarantors_provider_id_idx").on(table.provider_id),
  index("guarantors_status_idx").on(table.status),
]);

// Licenses table
export const licenses = pgTable("licenses", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  document_path: text("document_path").notNull(),
  expiry_date: timestamp("expiry_date").notNull(),
  verification_status: varchar("verification_status", { enum: licenseVerificationStatusEnum }).notNull().default("pending"),
}, (table) => [
  index("licenses_user_id_idx").on(table.user_id),
  index("licenses_type_idx").on(table.type),
  index("licenses_verification_status_idx").on(table.verification_status),
  index("licenses_expiry_date_idx").on(table.expiry_date),
]);

// Shopping Cart table
export const cart = pgTable("cart", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  service_id: integer("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
  added_at: timestamp("added_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("cart_user_id_idx").on(table.user_id),
  index("cart_service_id_idx").on(table.service_id),
  index("cart_user_service_idx").on(table.user_id, table.service_id),
]);

// Analytics table for trading metrics
export const tradingAnalytics = pgTable("trading_analytics", {
  id: serial("id").primaryKey(),
  service_id: integer("service_id").references(() => services.id, { onDelete: "cascade" }),
  provider_id: integer("provider_id").references(() => users.id, { onDelete: "cascade" }),
  metric_type: varchar("metric_type", { length: 50 }).notNull(), // 'views', 'purchases', 'revenue', etc.
  value: decimal("value", { precision: 10, scale: 2 }),
  count: integer("count").notNull().default(1),
  date: timestamp("date").notNull().defaultNow(),
}, (table) => [
  index("analytics_service_id_idx").on(table.service_id),
  index("analytics_provider_id_idx").on(table.provider_id),
  index("analytics_metric_type_idx").on(table.metric_type),
  index("analytics_date_idx").on(table.date),
]);

// Audit Logs table
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  user_id: text("user_id").references(() => user.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  details: json("details"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (table) => [
  index("audit_logs_user_id_idx").on(table.user_id),
  index("audit_logs_action_idx").on(table.action),
  index("audit_logs_timestamp_idx").on(table.timestamp),
]);

// Roles Permissions table
export const rolesPermissions = pgTable("roles_permissions", {
  id: serial("id").primaryKey(),
  role: varchar("role", { length: 50 }).notNull(),
  permission: varchar("permission", { length: 100 }).notNull(),
  resource: varchar("resource", { length: 100 }).notNull(),
}, (table) => [
  index("roles_permissions_role_idx").on(table.role),
  index("roles_permissions_permission_idx").on(table.permission),
  index("roles_permissions_resource_idx").on(table.resource),
]);

// Security Events table (for monitoring failed logins, suspicious activity)
export const securityEvents = pgTable("security_events", {
  id: serial("id").primaryKey(),
  user_id: text("user_id").references(() => user.id, { onDelete: "set null" }),
  event_type: varchar("event_type", { length: 50 }).notNull(), // 'failed_login', 'suspicious_activity', 'rate_limit_exceeded', etc.
  severity: varchar("severity", { length: 20 }).notNull().default("medium"), // 'low', 'medium', 'high', 'critical'
  ip_address: varchar("ip_address", { length: 45 }), // IPv4/IPv6
  user_agent: text("user_agent"),
  details: json("details"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  resolved: boolean("resolved").notNull().default(false),
  resolved_at: timestamp("resolved_at"),
  resolved_by: text("resolved_by").references(() => user.id),
}, (table) => [
  index("security_events_user_id_idx").on(table.user_id),
  index("security_events_event_type_idx").on(table.event_type),
  index("security_events_severity_idx").on(table.severity),
  index("security_events_timestamp_idx").on(table.timestamp),
  index("security_events_resolved_idx").on(table.resolved),
]);

// User Consent table (for GDPR compliance)
export const userConsents = pgTable("user_consents", {
  id: serial("id").primaryKey(),
  user_id: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  consent_type: varchar("consent_type", { length: 50 }).notNull(), // 'data_processing', 'marketing', 'analytics', etc.
  consented: boolean("consented").notNull(),
  consent_date: timestamp("consent_date").notNull().defaultNow(),
  consent_expiry: timestamp("consent_expiry"),
  ip_address: varchar("ip_address", { length: 45 }),
  user_agent: text("user_agent"),
  details: json("details"), // Additional consent details
}, (table) => [
  index("user_consents_user_id_idx").on(table.user_id),
  index("user_consents_consent_type_idx").on(table.consent_type),
  index("user_consents_consented_idx").on(table.consented),
  index("user_consents_consent_date_idx").on(table.consent_date),
]);

// Data Processing Records table (for GDPR/HIPAA compliance)
export const dataProcessingRecords = pgTable("data_processing_records", {
  id: serial("id").primaryKey(),
  user_id: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  data_type: varchar("data_type", { length: 50 }).notNull(), // 'personal', 'health', 'financial', etc.
  processing_purpose: text("processing_purpose").notNull(),
  legal_basis: varchar("legal_basis", { length: 50 }).notNull(), // 'consent', 'contract', 'legitimate_interest', etc.
  data_location: varchar("data_location", { length: 100 }), // Where data is stored
  retention_period: integer("retention_period"), // Days
  processed_at: timestamp("processed_at").notNull().defaultNow(),
  processed_by: text("processed_by").references(() => user.id),
  encrypted: boolean("encrypted").notNull().default(false),
  consent_id: integer("consent_id").references(() => userConsents.id),
}, (table) => [
  index("data_processing_records_user_id_idx").on(table.user_id),
  index("data_processing_records_data_type_idx").on(table.data_type),
  index("data_processing_records_legal_basis_idx").on(table.legal_basis),
  index("data_processing_records_processed_at_idx").on(table.processed_at),
]);

// Security Incidents table
export const securityIncidents = pgTable("security_incidents", {
  id: serial("id").primaryKey(),
  incident_type: varchar("incident_type", { length: 50 }).notNull(), // 'breach', 'unauthorized_access', 'data_leak', etc.
  severity: varchar("severity", { length: 20 }).notNull().default("medium"),
  description: text("description").notNull(),
  affected_users: integer("affected_users"),
  reported_by: text("reported_by").references(() => user.id),
  reported_at: timestamp("reported_at").notNull().defaultNow(),
  status: varchar("status", { length: 20 }).notNull().default("open"), // 'open', 'investigating', 'resolved', 'closed'
  resolution: text("resolution"),
  resolved_at: timestamp("resolved_at"),
  resolved_by: text("resolved_by").references(() => user.id),
  details: json("details"),
}, (table) => [
  index("security_incidents_incident_type_idx").on(table.incident_type),
  index("security_incidents_severity_idx").on(table.severity),
  index("security_incidents_status_idx").on(table.status),
  index("security_incidents_reported_at_idx").on(table.reported_at),
]);

// Rate Limiting table (for persistent rate limiting across sessions)
export const rateLimitRecords = pgTable("rate_limit_records", {
  id: serial("id").primaryKey(),
  identifier: varchar("identifier", { length: 255 }).notNull(), // IP, user_id, or API key
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  request_count: integer("request_count").notNull().default(1),
  window_start: timestamp("window_start").notNull(),
  window_end: timestamp("window_end").notNull(),
  blocked: boolean("blocked").notNull().default(false),
  blocked_until: timestamp("blocked_until"),
}, (table) => [
  index("rate_limit_records_identifier_idx").on(table.identifier),
  index("rate_limit_records_endpoint_idx").on(table.endpoint),
  index("rate_limit_records_window_start_idx").on(table.window_start),
  index("rate_limit_records_blocked_idx").on(table.blocked),
]);

// Better Auth Relations
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  profiles: many(profiles),
  services: many(services),
  transactionsAsBuyer: many(transactions, { relationName: "buyer" }),
  transactionsAsSeller: many(transactions, { relationName: "seller" }),
  guarantors: many(guarantors),
  licenses: many(licenses),
  auditLogs: many(auditLogs),
  securityEvents: many(securityEvents),
  userConsents: many(userConsents),
  dataProcessingRecords: many(dataProcessingRecords),
  reportedIncidents: many(securityIncidents, { relationName: "reportedBy" }),
  resolvedIncidents: many(securityIncidents, { relationName: "resolvedBy" }),
  resolvedSecurityEvents: many(securityEvents, { relationName: "resolvedBy" }),
  processedDataRecords: many(dataProcessingRecords, { relationName: "processedBy" }),
  cart: many(cart),
  analytics: many(tradingAnalytics),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

// Custom Users Profile Relations
export const usersRelations = relations(users, ({ one }) => ({
  user: one(user, { fields: [users.user_id], references: [user.id] }),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, { fields: [profiles.user_id], references: [users.id] }),
}));

export const icd11CategoriesRelations = relations(icd11Categories, ({ one, many }) => ({
  parent: one(icd11Categories, { fields: [icd11Categories.parent_id], references: [icd11Categories.id] }),
  children: many(icd11Categories, { relationName: "children" }),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  provider: one(users, { fields: [services.provider_id], references: [users.id] }),
  transactions: many(transactions),
  compositeServices: many(serviceComponents, { relationName: "composite" }),
  componentServices: many(serviceComponents, { relationName: "component" }),
  cart: many(cart),
  analytics: many(tradingAnalytics),
}));

export const serviceComponentsRelations = relations(serviceComponents, ({ one }) => ({
  compositeService: one(services, { fields: [serviceComponents.composite_service_id], references: [services.id], relationName: "composite" }),
  componentService: one(services, { fields: [serviceComponents.component_service_id], references: [services.id], relationName: "component" }),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  buyer: one(users, { fields: [transactions.buyer_id], references: [users.id], relationName: "buyer" }),
  seller: one(users, { fields: [transactions.seller_id], references: [users.id], relationName: "seller" }),
  service: one(services, { fields: [transactions.service_id], references: [services.id] }),
  payments: many(payments),
  certificates: many(certificates),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  transaction: one(transactions, { fields: [payments.transaction_id], references: [transactions.id] }),
}));

export const certificatesRelations = relations(certificates, ({ one }) => ({
  transaction: one(transactions, { fields: [certificates.transaction_id], references: [transactions.id] }),
}));

export const guarantorsRelations = relations(guarantors, ({ one }) => ({
  provider: one(users, { fields: [guarantors.provider_id], references: [users.id] }),
}));

export const licensesRelations = relations(licenses, ({ one }) => ({
  user: one(users, { fields: [licenses.user_id], references: [users.id] }),
}));

export const cartRelations = relations(cart, ({ one }) => ({
  user: one(users, { fields: [cart.user_id], references: [users.id] }),
  service: one(services, { fields: [cart.service_id], references: [services.id] }),
}));

export const analyticsRelations = relations(tradingAnalytics, ({ one }) => ({
  service: one(services, { fields: [tradingAnalytics.service_id], references: [services.id] }),
  provider: one(users, { fields: [tradingAnalytics.provider_id], references: [users.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.user_id], references: [users.id] }),
}));

export const securityEventsRelations = relations(securityEvents, ({ one }) => ({
  user: one(users, { fields: [securityEvents.user_id], references: [users.id] }),
  resolvedBy: one(users, { fields: [securityEvents.resolved_by], references: [users.id], relationName: "resolvedBy" }),
}));

export const userConsentsRelations = relations(userConsents, ({ one }) => ({
  user: one(users, { fields: [userConsents.user_id], references: [users.id] }),
}));

export const dataProcessingRecordsRelations = relations(dataProcessingRecords, ({ one }) => ({
  user: one(users, { fields: [dataProcessingRecords.user_id], references: [users.id] }),
  processedBy: one(users, { fields: [dataProcessingRecords.processed_by], references: [users.id], relationName: "processedBy" }),
  consent: one(userConsents, { fields: [dataProcessingRecords.consent_id], references: [userConsents.id] }),
}));

export const securityIncidentsRelations = relations(securityIncidents, ({ one }) => ({
  reportedBy: one(users, { fields: [securityIncidents.reported_by], references: [users.id], relationName: "reportedBy" }),
  resolvedBy: one(users, { fields: [securityIncidents.resolved_by], references: [users.id], relationName: "resolvedBy" }),
}));
