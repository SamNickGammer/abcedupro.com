-- CreateEnum
CREATE TYPE "course_status" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "marksheet_stage" AS ENUM ('started', 'pending', 'verified');

-- CreateEnum
CREATE TYPE "performance" AS ENUM ('Excellent', 'Very Good', 'Good', 'Failure');

-- CreateEnum
CREATE TYPE "booking_status" AS ENUM ('confirmed', 'secured');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('pending', 'paid');

-- CreateTable
CREATE TABLE "branch" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "phone" TEXT NOT NULL,
    "email_id" TEXT NOT NULL,
    "branch_code" TEXT NOT NULL,
    "branch_name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'branch',
    "address_line1" TEXT NOT NULL,
    "address_line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" INTEGER NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "image" TEXT,
    "password" TEXT NOT NULL,
    "center_creation_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "credit" INTEGER NOT NULL DEFAULT 0,
    "credit_per_certificate" INTEGER NOT NULL DEFAULT 200,

    CONSTRAINT "branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "course_id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "course_name" TEXT NOT NULL,
    "short_form" VARCHAR(10) NOT NULL,
    "course_duration" INTEGER NOT NULL,
    "course_status" "course_status" NOT NULL DEFAULT 'active',
    "course_fees" DECIMAL(10,2) NOT NULL,
    "subjects" TEXT NOT NULL DEFAULT 'Written Marks, Practical Marks, Project Marks, Viva Marks',

    CONSTRAINT "courses_pkey" PRIMARY KEY ("course_id")
);

-- CreateTable
CREATE TABLE "student" (
    "student_id" BIGSERIAL NOT NULL,
    "student_name" TEXT NOT NULL,
    "registration_number" TEXT NOT NULL,
    "student_email" TEXT,
    "student_phone" TEXT NOT NULL,
    "student_father_name" TEXT,
    "student_mother_name" TEXT,
    "branch_id" BIGINT NOT NULL,
    "student_course_id" BIGINT NOT NULL,
    "dob" DATE NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" VARCHAR(10),
    "admission_date" DATE NOT NULL,
    "relieving_date" DATE NOT NULL,
    "is_student_active" BOOLEAN NOT NULL DEFAULT true,
    "is_student_deleted" BOOLEAN NOT NULL DEFAULT false,
    "student_photo" TEXT,
    "total_fees" DECIMAL(10,2),
    "paid_fees" DECIMAL(10,2),
    "due_fees" DECIMAL(10,2),
    "marksheet_id" TEXT,
    "marks" TEXT,
    "marksheet_stage" "marksheet_stage" NOT NULL DEFAULT 'started',
    "overall_percent" DECIMAL(5,2),
    "performance" "performance",
    "certified_date" DATE,
    "is_certificate_approve" BOOLEAN NOT NULL DEFAULT false,
    "aadhaar_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_pkey" PRIMARY KEY ("student_id")
);

-- CreateTable
CREATE TABLE "certificate_charge" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "branch_id" BIGINT NOT NULL,

    CONSTRAINT "certificate_charge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_config" (
    "id" BIGSERIAL NOT NULL,
    "config_key" TEXT NOT NULL,
    "config_value" TEXT NOT NULL,
    "value_type" VARCHAR(20) NOT NULL DEFAULT 'json',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_members" (
    "member_id" BIGSERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" VARCHAR(20),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_admin_branch_id" BIGINT,
    "updated_by_admin_branch_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_members_pkey" PRIMARY KEY ("member_id")
);

-- CreateTable
CREATE TABLE "library_bookings" (
    "booking_id" BIGSERIAL NOT NULL,
    "booking_group_id" VARCHAR(64) NOT NULL,
    "member_id" BIGINT NOT NULL,
    "booking_year" SMALLINT NOT NULL,
    "booking_month" SMALLINT NOT NULL,
    "status" "booking_status" NOT NULL DEFAULT 'confirmed',
    "block_code" VARCHAR(20) NOT NULL,
    "seat_id" VARCHAR(100) NOT NULL,
    "seat_label" VARCHAR(50) NOT NULL,
    "note" TEXT,
    "monthly_price" DECIMAL(10,2) NOT NULL,
    "payment_status" "payment_status" NOT NULL DEFAULT 'pending',
    "payment_method" VARCHAR(50),
    "payment_collected_by" TEXT,
    "payment_note" TEXT,
    "payment_paid_at" TIMESTAMP(3),
    "created_by_admin_branch_id" BIGINT,
    "updated_by_admin_branch_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_bookings_pkey" PRIMARY KEY ("booking_id")
);

-- CreateTable
CREATE TABLE "library_booking_slots" (
    "id" BIGSERIAL NOT NULL,
    "booking_id" BIGINT NOT NULL,
    "booking_year" SMALLINT NOT NULL,
    "booking_month" SMALLINT NOT NULL,
    "seat_id" VARCHAR(100) NOT NULL,
    "slot_code" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_booking_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_booking_lockers" (
    "id" BIGSERIAL NOT NULL,
    "booking_id" BIGINT NOT NULL,
    "booking_year" SMALLINT NOT NULL,
    "booking_month" SMALLINT NOT NULL,
    "locker_number" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_booking_lockers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_payment_logs" (
    "id" BIGSERIAL NOT NULL,
    "booking_id" BIGINT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_method" VARCHAR(50),
    "collected_by" TEXT,
    "note" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_by_admin_branch_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_payment_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "branch_branch_code_key" ON "branch"("branch_code");

-- CreateIndex
CREATE UNIQUE INDEX "courses_course_name_key" ON "courses"("course_name");

-- CreateIndex
CREATE UNIQUE INDEX "courses_short_form_key" ON "courses"("short_form");

-- CreateIndex
CREATE UNIQUE INDEX "student_registration_number_key" ON "student"("registration_number");

-- CreateIndex
CREATE UNIQUE INDEX "student_marksheet_id_key" ON "student"("marksheet_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_aadhaar_number_key" ON "student"("aadhaar_number");

-- CreateIndex
CREATE INDEX "student_branch_id_idx" ON "student"("branch_id");

-- CreateIndex
CREATE INDEX "student_student_course_id_idx" ON "student"("student_course_id");

-- CreateIndex
CREATE INDEX "student_marksheet_stage_idx" ON "student"("marksheet_stage");

-- CreateIndex
CREATE INDEX "student_updated_at_idx" ON "student"("updated_at");

-- CreateIndex
CREATE INDEX "certificate_charge_branch_id_idx" ON "certificate_charge"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "library_config_config_key_key" ON "library_config"("config_key");

-- CreateIndex
CREATE INDEX "library_bookings_booking_group_id_idx" ON "library_bookings"("booking_group_id");

-- CreateIndex
CREATE INDEX "library_bookings_booking_year_booking_month_idx" ON "library_bookings"("booking_year", "booking_month");

-- CreateIndex
CREATE UNIQUE INDEX "library_bookings_group_month_unique" ON "library_bookings"("booking_group_id", "booking_year", "booking_month");

-- CreateIndex
CREATE INDEX "library_booking_slots_booking_id_idx" ON "library_booking_slots"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "library_slot_seat_unique" ON "library_booking_slots"("booking_year", "booking_month", "seat_id", "slot_code");

-- CreateIndex
CREATE INDEX "library_booking_lockers_booking_id_idx" ON "library_booking_lockers"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "library_locker_month_unique" ON "library_booking_lockers"("booking_year", "booking_month", "locker_number");

-- CreateIndex
CREATE INDEX "library_payment_logs_booking_id_idx" ON "library_payment_logs"("booking_id");

-- AddForeignKey
ALTER TABLE "student" ADD CONSTRAINT "student_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student" ADD CONSTRAINT "student_student_course_id_fkey" FOREIGN KEY ("student_course_id") REFERENCES "courses"("course_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_charge" ADD CONSTRAINT "certificate_charge_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_members" ADD CONSTRAINT "library_members_created_by_admin_branch_id_fkey" FOREIGN KEY ("created_by_admin_branch_id") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_members" ADD CONSTRAINT "library_members_updated_by_admin_branch_id_fkey" FOREIGN KEY ("updated_by_admin_branch_id") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_bookings" ADD CONSTRAINT "library_bookings_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "library_members"("member_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_bookings" ADD CONSTRAINT "library_bookings_created_by_admin_branch_id_fkey" FOREIGN KEY ("created_by_admin_branch_id") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_bookings" ADD CONSTRAINT "library_bookings_updated_by_admin_branch_id_fkey" FOREIGN KEY ("updated_by_admin_branch_id") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_booking_slots" ADD CONSTRAINT "library_booking_slots_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "library_bookings"("booking_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_booking_lockers" ADD CONSTRAINT "library_booking_lockers_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "library_bookings"("booking_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_payment_logs" ADD CONSTRAINT "library_payment_logs_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "library_bookings"("booking_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_payment_logs" ADD CONSTRAINT "library_payment_logs_created_by_admin_branch_id_fkey" FOREIGN KEY ("created_by_admin_branch_id") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
