-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "AdminAuditAction" AS ENUM (
    'user_soft_deleted',
    'user_restored',
    'user_force_logged_out',
    'user_role_granted',
    'user_role_revoked'
);

-- AlterTable
ALTER TABLE "users"
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'user',
ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedByAdminId" TEXT,
ADD COLUMN "deleteReason" TEXT;

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "action" "AdminAuditAction" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE INDEX "admin_audit_logs_createdAt_idx" ON "admin_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "admin_audit_logs_adminUserId_idx" ON "admin_audit_logs"("adminUserId");

-- CreateIndex
CREATE INDEX "admin_audit_logs_targetUserId_idx" ON "admin_audit_logs"("targetUserId");
