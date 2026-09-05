-- AlterTable
ALTER TABLE "certificate_charge" ADD COLUMN     "amount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "student_id" BIGINT;

-- CreateIndex
CREATE INDEX "certificate_charge_student_id_idx" ON "certificate_charge"("student_id");
