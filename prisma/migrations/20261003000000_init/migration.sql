
-- Initial migration for LocaMed
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "company_id" TEXT REFERENCES "Company"("id"),
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT NOT NULL REFERENCES "Company"("id"),
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "document" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP WITH TIME ZONE
);

CREATE TABLE "Chair" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT NOT NULL REFERENCES "Company"("id"),
    "code" TEXT NOT NULL,
    "model" TEXT,
    "manufacturer" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP WITH TIME ZONE
);

CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT NOT NULL REFERENCES "Company"("id"),
    "client_id" TEXT NOT NULL REFERENCES "Client"("id"),
    "chair_id" TEXT NOT NULL REFERENCES "Chair"("id"),
    "startDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "endDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalDays" INTEGER NOT NULL,
    "totalAmount" DECIMAL NOT NULL,
    "finalAmount" DECIMAL NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "FinancialTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT NOT NULL REFERENCES "Company"("id"),
    "reservation_id" TEXT REFERENCES "Reservation"("id"),
    "type" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "due_date" TIMESTAMP WITH TIME ZONE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "description" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "uq_company_slug" ON "Company"("slug");
CREATE INDEX "idx_client_company" ON "Client"("company_id");
CREATE INDEX "idx_chair_company" ON "Chair"("company_id");
CREATE INDEX "idx_res_company" ON "Reservation"("company_id");
CREATE INDEX "idx_fin_company" ON "FinancialTransaction"("company_id");
