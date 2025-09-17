-- CreateTable
CREATE TABLE IF NOT EXISTS "synced_records" (
    "id" SERIAL NOT NULL,
    "bubble_id" TEXT NOT NULL,
    "data_type" TEXT NOT NULL,
    "raw_data" JSONB NOT NULL,
    "processed_data" JSONB,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "synced_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "sync_status" (
    "id" SERIAL NOT NULL,
    "data_type" TEXT NOT NULL,
    "last_sync" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "records_synced" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "admin_users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMP(3),

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "dashboard_settings" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "setting_key" TEXT NOT NULL,
    "setting_value" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "activity_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "agent_monthly_commission" (
    "id" SERIAL NOT NULL,
    "bubble_id" TEXT NOT NULL,
    "last_synced_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "agent_id" TEXT,
    "agent_name" TEXT,
    "month_year" TEXT,
    "total_amount" DECIMAL(65,30),
    "commission_rate" DECIMAL(65,30),
    "commission_amount" DECIMAL(65,30),
    "bonus_commission" DECIMAL(65,30),
    "total_commission" DECIMAL(65,30),
    "payment_status" TEXT,
    "created_date" TIMESTAMP(3),
    "modified_date" TIMESTAMP(3),
    "synced_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_monthly_commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "commission_adjustment" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "agent_id" TEXT NOT NULL,
    "agent_name" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "description" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "report_id" TEXT,
    "adjustment_month" TEXT,

    CONSTRAINT "commission_adjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "generated_commission_report" (
    "report_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "agent_name" TEXT NOT NULL,
    "month_period" TEXT NOT NULL,
    "total_basic_commission" DECIMAL(65,30) NOT NULL,
    "total_bonus_commission" DECIMAL(65,30) NOT NULL,
    "total_adjustments" DECIMAL(65,30) NOT NULL,
    "final_total_commission" DECIMAL(65,30) NOT NULL,
    "commission_paid" BOOLEAN NOT NULL,
    "invoice_bubble_ids" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "paid_at" TIMESTAMP(3),
    "paid_by" TEXT,

    CONSTRAINT "generated_commission_report_pkey" PRIMARY KEY ("report_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "package_model" (
    "id" SERIAL NOT NULL,
    "bubble_id" TEXT NOT NULL,
    "last_synced_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "price" DECIMAL(65,30),
    "package_name" TEXT,
    "benefits" TEXT,
    "annual_coverage_limit" DECIMAL(65,30),
    "max_age_entry" DECIMAL(65,30),
    "max_age_renewal" DECIMAL(65,30),
    "waiting_period_accidents" DECIMAL(65,30),
    "waiting_period_general_illness" DECIMAL(65,30),
    "waiting_period_special_conditions" DECIMAL(65,30),
    "deductible_per_disability" DECIMAL(65,30),
    "room_board_limit" DECIMAL(65,30),
    "room_board_description" TEXT,
    "overseas_coverage" BOOLEAN,
    "overseas_coverage_description" TEXT,
    "covid_coverage" BOOLEAN,
    "covid_coverage_description" TEXT,
    "optional_maternity" BOOLEAN,
    "optional_maternity_description" TEXT,
    "optional_dental" BOOLEAN,
    "optional_dental_description" TEXT,
    "prescription_drugs" BOOLEAN,
    "outpatient_limit" DECIMAL(65,30),
    "additional_benefits" TEXT,
    "special_features" TEXT,
    "created_date" TIMESTAMP(3),
    "modified_date" TIMESTAMP(3),
    "synced_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_model_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "synced_records_bubble_id_key" ON "synced_records"("bubble_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "synced_records_data_type_idx" ON "synced_records"("data_type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "synced_records_synced_at_idx" ON "synced_records"("synced_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "sync_status_data_type_key" ON "sync_status"("data_type");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_username_key" ON "admin_users"("username");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "dashboard_settings_user_id_setting_key_key" ON "dashboard_settings"("user_id", "setting_key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "activity_logs_user_id_idx" ON "activity_logs"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "activity_logs_created_at_idx" ON "activity_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "agent_monthly_commission_bubble_id_key" ON "agent_monthly_commission"("bubble_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "package_model_bubble_id_key" ON "package_model"("bubble_id");

-- AddForeignKey
ALTER TABLE "dashboard_settings" ADD CONSTRAINT "dashboard_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_adjustment" ADD CONSTRAINT "commission_adjustment_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "generated_commission_report"("report_id") ON DELETE SET NULL ON UPDATE CASCADE;