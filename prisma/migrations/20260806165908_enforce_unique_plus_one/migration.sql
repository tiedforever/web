-- DropIndex
DROP INDEX "guests_plus_one_for_guest_id_idx";

-- CreateIndex
CREATE UNIQUE INDEX "guests_plus_one_for_guest_id_key" ON "guests"("plus_one_for_guest_id");
