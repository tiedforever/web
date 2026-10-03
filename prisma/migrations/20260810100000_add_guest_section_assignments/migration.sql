-- CreateTable
CREATE TABLE "guest_section_assignments" (
    "guest_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_section_assignments_pkey" PRIMARY KEY ("guest_id", "section_id")
);

-- CreateIndex
CREATE INDEX "guest_section_assignments_section_id_idx" ON "guest_section_assignments"("section_id");

-- AddForeignKey
ALTER TABLE "guest_section_assignments" ADD CONSTRAINT "guest_section_assignments_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_section_assignments" ADD CONSTRAINT "guest_section_assignments_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "wedding_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
