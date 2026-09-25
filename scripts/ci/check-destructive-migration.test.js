/**
 * @jest-environment node
 *
 * Testes para scripts/ci/check-destructive-migration.js
 *
 * Regra de guarda de ausencia: cada teste que espera que um padrao NAO seja
 * detectado verifica explicitamente que o array esta vazio (toBe([])) para
 * que a guarda "morda" se o detector regredir.
 */

'use strict';

const { findDestructiveStatements } = require('./check-destructive-migration');

describe('findDestructiveStatements', () => {
  // ── Deve DETECTAR ─────────────────────────────────────────────────────────

  it('detecta DROP TABLE', () => {
    const sql = 'DROP TABLE "Item";';
    expect(findDestructiveStatements(sql)).toContain('DROP TABLE');
  });

  it('detecta DROP COLUMN', () => {
    const sql = 'ALTER TABLE "User" DROP COLUMN "legacyField";';
    expect(findDestructiveStatements(sql)).toContain('DROP COLUMN');
  });

  it('detecta ALTER COLUMN ... TYPE', () => {
    const sql = 'ALTER TABLE "Booking" ALTER COLUMN "amount" TYPE BIGINT;';
    expect(findDestructiveStatements(sql)).toContain('ALTER COLUMN ... TYPE');
  });

  it('detecta TRUNCATE', () => {
    const sql = 'TRUNCATE TABLE "AuditLog";';
    expect(findDestructiveStatements(sql)).toContain('TRUNCATE');
  });

  it('detecta DELETE FROM sem WHERE', () => {
    const sql = 'DELETE FROM "TempData";';
    expect(findDestructiveStatements(sql)).toContain('DELETE FROM sem WHERE');
  });

  it('detecta DELETE FROM sem WHERE em SQL multi-linha', () => {
    const sql = `
      -- limpar tabela
      DELETE FROM "TempData"
      ;
    `;
    expect(findDestructiveStatements(sql)).toContain('DELETE FROM sem WHERE');
  });

  it('detecta RENAME TABLE', () => {
    const sql = 'ALTER TABLE "OldName" RENAME TO "NewName";';
    expect(findDestructiveStatements(sql)).toContain('RENAME TABLE/COLUMN/TO');
  });

  it('detecta RENAME COLUMN', () => {
    const sql = 'ALTER TABLE "User" RENAME COLUMN "name" TO "fullName";';
    expect(findDestructiveStatements(sql)).toContain('RENAME TABLE/COLUMN/TO');
  });

  it('detecta multiplos padroes na mesma migration', () => {
    const sql = `
      DROP TABLE "OldFeature";
      TRUNCATE "Cache";
    `;
    const result = findDestructiveStatements(sql);
    expect(result).toContain('DROP TABLE');
    expect(result).toContain('TRUNCATE');
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it('detecta em SQL case-insensitive (DROP table minusculo)', () => {
    const sql = 'drop table "Legacy";';
    expect(findDestructiveStatements(sql)).toContain('DROP TABLE');
  });

  // ── NAO deve detectar ──────────────────────────────────────────────────────

  it('nao detecta CREATE TABLE como destrutivo', () => {
    const sql = 'CREATE TABLE "NewFeature" (id UUID PRIMARY KEY);';
    expect(findDestructiveStatements(sql)).toHaveLength(0);
  });

  it('nao detecta ADD COLUMN como destrutivo', () => {
    const sql = 'ALTER TABLE "User" ADD COLUMN "phone" TEXT;';
    expect(findDestructiveStatements(sql)).toHaveLength(0);
  });

  it('nao detecta INSERT como destrutivo', () => {
    const sql = "INSERT INTO \"Category\" (id, name) VALUES ('cat1', 'Ferramentas');";
    expect(findDestructiveStatements(sql)).toHaveLength(0);
  });

  it('nao detecta UPDATE com WHERE como destrutivo', () => {
    const sql = 'UPDATE "User" SET "active" = true WHERE id = \'abc\';';
    expect(findDestructiveStatements(sql)).toHaveLength(0);
  });

  it('nao detecta DELETE FROM com WHERE como destrutivo', () => {
    const sql = "DELETE FROM \"TempData\" WHERE \"createdAt\" < NOW() - INTERVAL '30 days';";
    expect(findDestructiveStatements(sql)).toHaveLength(0);
  });

  it('nao detecta DELETE FROM com WHERE em SQL multi-linha como destrutivo', () => {
    const sql = `
      DELETE FROM "Session"
      WHERE "expiresAt" < NOW();
    `;
    expect(findDestructiveStatements(sql)).toHaveLength(0);
  });

  it('nao detecta CREATE INDEX como destrutivo', () => {
    const sql = 'CREATE INDEX CONCURRENTLY "Item_ownerId_idx" ON "Item"("ownerId");';
    expect(findDestructiveStatements(sql)).toHaveLength(0);
  });

  it('nao detecta ALTER TABLE ADD CONSTRAINT como destrutivo', () => {
    const sql = 'ALTER TABLE "Booking" ADD CONSTRAINT "booking_amount_check" CHECK ("amount" > 0);';
    expect(findDestructiveStatements(sql)).toHaveLength(0);
  });

  it('migration tipica aditiva retorna array vazio', () => {
    const sql = `
      -- CreateTable
      CREATE TABLE "StripeEventQueue" (
        "id" TEXT NOT NULL,
        "stripeEventId" TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "StripeEventQueue_pkey" PRIMARY KEY ("id")
      );

      -- CreateIndex
      CREATE UNIQUE INDEX "StripeEventQueue_stripeEventId_key" ON "StripeEventQueue"("stripeEventId");
    `;
    expect(findDestructiveStatements(sql)).toHaveLength(0);
  });

  it('migration de remocao de campo (DROP COLUMN) com comentario SQL nao falha a deteccao', () => {
    const sql = `
      -- Este e um comentario: nao cria DROP COLUMN
      ALTER TABLE "User"
        DROP COLUMN "mercadoPagoId";
    `;
    expect(findDestructiveStatements(sql)).toContain('DROP COLUMN');
  });
});
