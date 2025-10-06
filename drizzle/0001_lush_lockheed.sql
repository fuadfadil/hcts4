CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"details" json,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cart" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_id" integer NOT NULL,
	"certificate_number" varchar(50) NOT NULL,
	"qr_code_data" text NOT NULL,
	"encrypted_pdf_path" text NOT NULL,
	"pdf_hash" varchar(64) NOT NULL,
	"verification_hash" varchar(64) NOT NULL,
	"digital_signature" text,
	"status" varchar DEFAULT 'valid' NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"revocation_reason" text,
	"metadata" json,
	CONSTRAINT "certificates_certificate_number_unique" UNIQUE("certificate_number")
);
--> statement-breakpoint
CREATE TABLE "data_processing_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"data_type" varchar(50) NOT NULL,
	"processing_purpose" text NOT NULL,
	"legal_basis" varchar(50) NOT NULL,
	"data_location" varchar(100),
	"retention_period" integer,
	"processed_at" timestamp DEFAULT now() NOT NULL,
	"processed_by" text,
	"encrypted" boolean DEFAULT false NOT NULL,
	"consent_id" integer
);
--> statement-breakpoint
CREATE TABLE "guarantors" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"name" text NOT NULL,
	"contact_info" json NOT NULL,
	"guarantee_amount" numeric(10, 2) NOT NULL,
	"status" varchar DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "icd11_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(10) NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"parent_id" integer,
	"last_synced" timestamp,
	CONSTRAINT "icd11_categories_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "licenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"document_path" text NOT NULL,
	"expiry_date" timestamp NOT NULL,
	"verification_status" varchar DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"commission_amount" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"payment_method" varchar NOT NULL,
	"gateway_response" json,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"organization_name" text NOT NULL,
	"contact_info" json NOT NULL,
	"address" json NOT NULL,
	"license_info" json,
	"guarantor_info" json
);
--> statement-breakpoint
CREATE TABLE "rate_limit_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"identifier" varchar(255) NOT NULL,
	"endpoint" varchar(255) NOT NULL,
	"request_count" integer DEFAULT 1 NOT NULL,
	"window_start" timestamp NOT NULL,
	"window_end" timestamp NOT NULL,
	"blocked" boolean DEFAULT false NOT NULL,
	"blocked_until" timestamp
);
--> statement-breakpoint
CREATE TABLE "roles_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" varchar(50) NOT NULL,
	"permission" varchar(100) NOT NULL,
	"resource" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"event_type" varchar(50) NOT NULL,
	"severity" varchar(20) DEFAULT 'medium' NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"details" json,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" text
);
--> statement-breakpoint
CREATE TABLE "security_incidents" (
	"id" serial PRIMARY KEY NOT NULL,
	"incident_type" varchar(50) NOT NULL,
	"severity" varchar(20) DEFAULT 'medium' NOT NULL,
	"description" text NOT NULL,
	"affected_users" integer,
	"reported_by" text,
	"reported_at" timestamp DEFAULT now() NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"resolution" text,
	"resolved_at" timestamp,
	"resolved_by" text,
	"details" json
);
--> statement-breakpoint
CREATE TABLE "service_components" (
	"id" serial PRIMARY KEY NOT NULL,
	"composite_service_id" integer NOT NULL,
	"component_service_id" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icd11_code" varchar(10) NOT NULL,
	"service_type" varchar DEFAULT 'individual' NOT NULL,
	"cost" numeric(10, 2),
	"profit_margin" numeric(5, 2),
	"base_price" numeric(10, 2) NOT NULL,
	"discount_tiers" json,
	"quantity_available" integer DEFAULT 0 NOT NULL,
	"status" varchar DEFAULT 'active' NOT NULL,
	"specifications" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trading_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_id" integer,
	"provider_id" integer,
	"metric_type" varchar(50) NOT NULL,
	"value" numeric(10, 2),
	"count" integer DEFAULT 1 NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"buyer_id" integer NOT NULL,
	"seller_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_consents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"consent_type" varchar(50) NOT NULL,
	"consented" boolean NOT NULL,
	"consent_date" timestamp DEFAULT now() NOT NULL,
	"consent_expiry" timestamp,
	"ip_address" varchar(45),
	"user_agent" text,
	"details" json
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verification_token" text,
	CONSTRAINT "users_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "account" DROP CONSTRAINT "account_userId_user_id_fk";
--> statement-breakpoint
ALTER TABLE "session" DROP CONSTRAINT "session_userId_user_id_fk";
--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "createdAt" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "updatedAt" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart" ADD CONSTRAINT "cart_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart" ADD CONSTRAINT "cart_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_processing_records" ADD CONSTRAINT "data_processing_records_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_processing_records" ADD CONSTRAINT "data_processing_records_processed_by_user_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_processing_records" ADD CONSTRAINT "data_processing_records_consent_id_user_consents_id_fk" FOREIGN KEY ("consent_id") REFERENCES "public"."user_consents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guarantors" ADD CONSTRAINT "guarantors_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "icd11_categories" ADD CONSTRAINT "icd11_categories_parent_id_icd11_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."icd11_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_incidents" ADD CONSTRAINT "security_incidents_reported_by_user_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_incidents" ADD CONSTRAINT "security_incidents_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_components" ADD CONSTRAINT "service_components_composite_service_id_services_id_fk" FOREIGN KEY ("composite_service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_components" ADD CONSTRAINT "service_components_component_service_id_services_id_fk" FOREIGN KEY ("component_service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_analytics" ADD CONSTRAINT "trading_analytics_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_analytics" ADD CONSTRAINT "trading_analytics_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "cart_user_id_idx" ON "cart" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cart_service_id_idx" ON "cart" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "cart_user_service_idx" ON "cart" USING btree ("user_id","service_id");--> statement-breakpoint
CREATE INDEX "certificates_transaction_id_idx" ON "certificates" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "certificates_certificate_number_idx" ON "certificates" USING btree ("certificate_number");--> statement-breakpoint
CREATE INDEX "certificates_status_idx" ON "certificates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "certificates_issued_at_idx" ON "certificates" USING btree ("issued_at");--> statement-breakpoint
CREATE INDEX "certificates_expires_at_idx" ON "certificates" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "certificates_verification_hash_idx" ON "certificates" USING btree ("verification_hash");--> statement-breakpoint
CREATE INDEX "data_processing_records_user_id_idx" ON "data_processing_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "data_processing_records_data_type_idx" ON "data_processing_records" USING btree ("data_type");--> statement-breakpoint
CREATE INDEX "data_processing_records_legal_basis_idx" ON "data_processing_records" USING btree ("legal_basis");--> statement-breakpoint
CREATE INDEX "data_processing_records_processed_at_idx" ON "data_processing_records" USING btree ("processed_at");--> statement-breakpoint
CREATE INDEX "guarantors_provider_id_idx" ON "guarantors" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "guarantors_status_idx" ON "guarantors" USING btree ("status");--> statement-breakpoint
CREATE INDEX "icd11_categories_code_idx" ON "icd11_categories" USING btree ("code");--> statement-breakpoint
CREATE INDEX "icd11_categories_parent_id_idx" ON "icd11_categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "licenses_user_id_idx" ON "licenses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "licenses_type_idx" ON "licenses" USING btree ("type");--> statement-breakpoint
CREATE INDEX "licenses_verification_status_idx" ON "licenses" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "licenses_expiry_date_idx" ON "licenses" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "payments_transaction_id_idx" ON "payments" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "profiles_user_id_idx" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rate_limit_records_identifier_idx" ON "rate_limit_records" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "rate_limit_records_endpoint_idx" ON "rate_limit_records" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "rate_limit_records_window_start_idx" ON "rate_limit_records" USING btree ("window_start");--> statement-breakpoint
CREATE INDEX "rate_limit_records_blocked_idx" ON "rate_limit_records" USING btree ("blocked");--> statement-breakpoint
CREATE INDEX "roles_permissions_role_idx" ON "roles_permissions" USING btree ("role");--> statement-breakpoint
CREATE INDEX "roles_permissions_permission_idx" ON "roles_permissions" USING btree ("permission");--> statement-breakpoint
CREATE INDEX "roles_permissions_resource_idx" ON "roles_permissions" USING btree ("resource");--> statement-breakpoint
CREATE INDEX "security_events_user_id_idx" ON "security_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "security_events_event_type_idx" ON "security_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "security_events_severity_idx" ON "security_events" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "security_events_timestamp_idx" ON "security_events" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "security_events_resolved_idx" ON "security_events" USING btree ("resolved");--> statement-breakpoint
CREATE INDEX "security_incidents_incident_type_idx" ON "security_incidents" USING btree ("incident_type");--> statement-breakpoint
CREATE INDEX "security_incidents_severity_idx" ON "security_incidents" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "security_incidents_status_idx" ON "security_incidents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "security_incidents_reported_at_idx" ON "security_incidents" USING btree ("reported_at");--> statement-breakpoint
CREATE INDEX "service_components_composite_service_id_idx" ON "service_components" USING btree ("composite_service_id");--> statement-breakpoint
CREATE INDEX "service_components_component_service_id_idx" ON "service_components" USING btree ("component_service_id");--> statement-breakpoint
CREATE INDEX "services_provider_id_idx" ON "services" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "services_icd11_code_idx" ON "services" USING btree ("icd11_code");--> statement-breakpoint
CREATE INDEX "services_status_idx" ON "services" USING btree ("status");--> statement-breakpoint
CREATE INDEX "services_service_type_idx" ON "services" USING btree ("service_type");--> statement-breakpoint
CREATE INDEX "analytics_service_id_idx" ON "trading_analytics" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "analytics_provider_id_idx" ON "trading_analytics" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "analytics_metric_type_idx" ON "trading_analytics" USING btree ("metric_type");--> statement-breakpoint
CREATE INDEX "analytics_date_idx" ON "trading_analytics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "transactions_buyer_id_idx" ON "transactions" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "transactions_seller_id_idx" ON "transactions" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "transactions_service_id_idx" ON "transactions" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "transactions_status_idx" ON "transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "transactions_created_at_idx" ON "transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_consents_user_id_idx" ON "user_consents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_consents_consent_type_idx" ON "user_consents" USING btree ("consent_type");--> statement-breakpoint
CREATE INDEX "user_consents_consented_idx" ON "user_consents" USING btree ("consented");--> statement-breakpoint
CREATE INDEX "user_consents_consent_date_idx" ON "user_consents" USING btree ("consent_date");--> statement-breakpoint
CREATE INDEX "users_user_id_idx" ON "users" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");