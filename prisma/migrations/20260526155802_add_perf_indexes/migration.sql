-- DropIndex
DROP INDEX "messages_conversationId_idx";

-- CreateIndex
CREATE INDEX "bookings_deletedAt_idx" ON "bookings"("deletedAt");

-- CreateIndex
CREATE INDEX "bookings_itemId_status_startDate_endDate_idx" ON "bookings"("itemId", "status", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "conversation_participants_userId_idx" ON "conversation_participants"("userId");

-- CreateIndex
CREATE INDEX "items_slug_idx" ON "items"("slug");

-- CreateIndex
CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");
