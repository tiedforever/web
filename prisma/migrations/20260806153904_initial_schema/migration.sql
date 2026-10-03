-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "wedding_member_role" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "membership_status" AS ENUM ('INVITED', 'ACTIVE', 'LEFT', 'REMOVED');

-- CreateEnum
CREATE TYPE "wedding_invitation_status" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "guest_age_group" AS ENUM ('ADULT', 'CHILD', 'INFANT');

-- CreateEnum
CREATE TYPE "task_status" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'WAITING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "task_priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "task_recurrence_frequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "auth_provider_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "profile_image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "active_wedding_id" UUID,
    "theme" TEXT NOT NULL,
    "timezone" TEXT,
    "email_notifications_enabled" BOOLEAN NOT NULL,
    "task_notifications_enabled" BOOLEAN NOT NULL,
    "payment_notifications_enabled" BOOLEAN NOT NULL,
    "additional_preferences" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weddings" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "partner_one_name" TEXT NOT NULL,
    "partner_two_name" TEXT NOT NULL,
    "wedding_date" DATE NOT NULL,
    "ceremony_location" TEXT,
    "reception_location" TEXT,
    "timezone" TEXT NOT NULL,
    "currency_code" TEXT NOT NULL,
    "total_budget_minor" BIGINT,
    "meal_choices_enabled" BOOLEAN NOT NULL,
    "dietary_requirements_enabled" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wedding_members" (
    "id" UUID NOT NULL,
    "wedding_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "wedding_member_role" NOT NULL,
    "status" "membership_status" NOT NULL,
    "joined_at" TIMESTAMP(3),
    "left_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wedding_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wedding_invitations" (
    "id" UUID NOT NULL,
    "wedding_id" UUID NOT NULL,
    "invited_email" TEXT NOT NULL,
    "role" "wedding_member_role" NOT NULL DEFAULT 'OWNER',
    "status" "wedding_invitation_status" NOT NULL DEFAULT 'PENDING',
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "invited_by_user_id" UUID NOT NULL,
    "accepted_by_user_id" UUID,
    "accepted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wedding_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "households" (
    "id" UUID NOT NULL,
    "wedding_id" UUID NOT NULL,
    "primary_guest_id" UUID,
    "name" TEXT NOT NULL,
    "address_line_one" TEXT NOT NULL,
    "address_line_two" TEXT,
    "town_city" TEXT NOT NULL,
    "county_region" TEXT,
    "postcode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "households_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guests" (
    "id" UUID NOT NULL,
    "wedding_id" UUID NOT NULL,
    "household_id" UUID,
    "plus_one_for_guest_id" UUID,
    "title" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "age_group" "guest_age_group" NOT NULL DEFAULT 'ADULT',
    "dietary_requirements" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_tags" (
    "id" UUID NOT NULL,
    "wedding_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "colour" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_tag_assignments" (
    "guest_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_tag_assignments_pkey" PRIMARY KEY ("guest_id","tag_id")
);

-- CreateTable
CREATE TABLE "wedding_sections" (
    "id" UUID NOT NULL,
    "wedding_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wedding_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_categories" (
    "id" UUID NOT NULL,
    "wedding_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "colour" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "wedding_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "assignee_id" UUID,
    "parent_task_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "task_status" NOT NULL DEFAULT 'NOT_STARTED',
    "priority" "task_priority" NOT NULL DEFAULT 'MEDIUM',
    "due_date" DATE,
    "completed_at" TIMESTAMP(3),
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_links" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "label" TEXT,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_recurrences" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "frequency" "task_recurrence_frequency" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "starts_on" DATE,
    "ends_on" DATE,
    "next_occurrence_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_recurrences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_provider_id_key" ON "users"("auth_provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_name_idx" ON "users"("last_name", "first_name");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- CreateIndex
CREATE INDEX "weddings_wedding_date_idx" ON "weddings"("wedding_date");

-- CreateIndex
CREATE INDEX "wedding_members_wedding_id_idx" ON "wedding_members"("wedding_id");

-- CreateIndex
CREATE INDEX "wedding_members_user_id_idx" ON "wedding_members"("user_id");

-- CreateIndex
CREATE INDEX "wedding_members_wedding_id_role_status_idx" ON "wedding_members"("wedding_id", "role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "wedding_members_wedding_id_user_id_key" ON "wedding_members"("wedding_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "wedding_invitations_token_hash_key" ON "wedding_invitations"("token_hash");

-- CreateIndex
CREATE INDEX "wedding_invitations_wedding_id_idx" ON "wedding_invitations"("wedding_id");

-- CreateIndex
CREATE INDEX "wedding_invitations_invited_email_idx" ON "wedding_invitations"("invited_email");

-- CreateIndex
CREATE INDEX "wedding_invitations_status_idx" ON "wedding_invitations"("status");

-- CreateIndex
CREATE INDEX "wedding_invitations_expires_at_idx" ON "wedding_invitations"("expires_at");

-- CreateIndex
CREATE INDEX "wedding_invitations_wedding_id_invited_email_idx" ON "wedding_invitations"("wedding_id", "invited_email");

-- CreateIndex
CREATE UNIQUE INDEX "households_primary_guest_id_key" ON "households"("primary_guest_id");

-- CreateIndex
CREATE INDEX "households_wedding_id_idx" ON "households"("wedding_id");

-- CreateIndex
CREATE INDEX "households_wedding_id_name_idx" ON "households"("wedding_id", "name");

-- CreateIndex
CREATE INDEX "households_postcode_idx" ON "households"("postcode");

-- CreateIndex
CREATE INDEX "guests_wedding_id_idx" ON "guests"("wedding_id");

-- CreateIndex
CREATE INDEX "guests_household_id_idx" ON "guests"("household_id");

-- CreateIndex
CREATE INDEX "guests_plus_one_for_guest_id_idx" ON "guests"("plus_one_for_guest_id");

-- CreateIndex
CREATE INDEX "guests_last_name_idx" ON "guests"("last_name");

-- CreateIndex
CREATE INDEX "guests_email_idx" ON "guests"("email");

-- CreateIndex
CREATE INDEX "guests_wedding_id_last_name_idx" ON "guests"("wedding_id", "last_name");

-- CreateIndex
CREATE INDEX "guests_wedding_id_household_id_idx" ON "guests"("wedding_id", "household_id");

-- CreateIndex
CREATE INDEX "guest_tags_wedding_id_idx" ON "guest_tags"("wedding_id");

-- CreateIndex
CREATE INDEX "guest_tags_name_idx" ON "guest_tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "guest_tags_wedding_id_name_key" ON "guest_tags"("wedding_id", "name");

-- CreateIndex
CREATE INDEX "guest_tag_assignments_tag_id_idx" ON "guest_tag_assignments"("tag_id");

-- CreateIndex
CREATE INDEX "wedding_sections_wedding_id_idx" ON "wedding_sections"("wedding_id");

-- CreateIndex
CREATE INDEX "wedding_sections_wedding_id_position_idx" ON "wedding_sections"("wedding_id", "position");

-- CreateIndex
CREATE INDEX "wedding_sections_active_idx" ON "wedding_sections"("active");

-- CreateIndex
CREATE UNIQUE INDEX "wedding_sections_wedding_id_name_key" ON "wedding_sections"("wedding_id", "name");

-- CreateIndex
CREATE INDEX "task_categories_wedding_id_idx" ON "task_categories"("wedding_id");

-- CreateIndex
CREATE INDEX "task_categories_position_idx" ON "task_categories"("position");

-- CreateIndex
CREATE UNIQUE INDEX "task_categories_wedding_id_name_key" ON "task_categories"("wedding_id", "name");

-- CreateIndex
CREATE INDEX "tasks_wedding_id_idx" ON "tasks"("wedding_id");

-- CreateIndex
CREATE INDEX "tasks_category_id_idx" ON "tasks"("category_id");

-- CreateIndex
CREATE INDEX "tasks_assignee_id_idx" ON "tasks"("assignee_id");

-- CreateIndex
CREATE INDEX "tasks_parent_task_id_idx" ON "tasks"("parent_task_id");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "tasks_priority_idx" ON "tasks"("priority");

-- CreateIndex
CREATE INDEX "tasks_due_date_idx" ON "tasks"("due_date");

-- CreateIndex
CREATE INDEX "tasks_wedding_id_status_idx" ON "tasks"("wedding_id", "status");

-- CreateIndex
CREATE INDEX "tasks_wedding_id_due_date_idx" ON "tasks"("wedding_id", "due_date");

-- CreateIndex
CREATE INDEX "task_links_task_id_idx" ON "task_links"("task_id");

-- CreateIndex
CREATE INDEX "task_links_task_id_position_idx" ON "task_links"("task_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "task_recurrences_task_id_key" ON "task_recurrences"("task_id");

-- CreateIndex
CREATE INDEX "task_recurrences_next_occurrence_at_idx" ON "task_recurrences"("next_occurrence_at");

-- CreateIndex
CREATE INDEX "task_recurrences_frequency_idx" ON "task_recurrences"("frequency");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_active_wedding_id_fkey" FOREIGN KEY ("active_wedding_id") REFERENCES "weddings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_members" ADD CONSTRAINT "wedding_members_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_members" ADD CONSTRAINT "wedding_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_invitations" ADD CONSTRAINT "wedding_invitations_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_invitations" ADD CONSTRAINT "wedding_invitations_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_invitations" ADD CONSTRAINT "wedding_invitations_accepted_by_user_id_fkey" FOREIGN KEY ("accepted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "households" ADD CONSTRAINT "households_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "households" ADD CONSTRAINT "households_primary_guest_id_fkey" FOREIGN KEY ("primary_guest_id") REFERENCES "guests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guests" ADD CONSTRAINT "guests_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guests" ADD CONSTRAINT "guests_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guests" ADD CONSTRAINT "guests_plus_one_for_guest_id_fkey" FOREIGN KEY ("plus_one_for_guest_id") REFERENCES "guests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_tags" ADD CONSTRAINT "guest_tags_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_tag_assignments" ADD CONSTRAINT "guest_tag_assignments_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_tag_assignments" ADD CONSTRAINT "guest_tag_assignments_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "guest_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_sections" ADD CONSTRAINT "wedding_sections_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_categories" ADD CONSTRAINT "task_categories_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "task_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "wedding_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_links" ADD CONSTRAINT "task_links_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_recurrences" ADD CONSTRAINT "task_recurrences_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

