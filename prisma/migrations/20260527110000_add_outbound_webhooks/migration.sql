-- CreateTable
CREATE TABLE "outbound_webhooks" (
    "id"             TEXT NOT NULL,
    "userId"         TEXT NOT NULL,
    "url"            TEXT NOT NULL,
    "events"         TEXT[],
    "secret"         TEXT NOT NULL,
    "isActive"       BOOLEAN NOT NULL DEFAULT true,
    "lastFiredAt"    TIMESTAMP(3),
    "lastStatusCode" INTEGER,
    "failureCount"   INTEGER NOT NULL DEFAULT 0,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbound_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outbound_webhooks_userId_idx" ON "outbound_webhooks"("userId");

-- AddForeignKey
ALTER TABLE "outbound_webhooks"
    ADD CONSTRAINT "outbound_webhooks_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
