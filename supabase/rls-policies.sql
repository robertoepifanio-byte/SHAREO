-- ============================================================
-- ShareO — Row Level Security (RLS) Policies
-- Versão: 1.2 | Data: 2026-05-22
-- Executar via: pnpm rls  (scripts/apply-rls.ts)
-- ============================================================
--
-- NOTAS DE IMPLEMENTAÇÃO:
-- 1. Prisma gera colunas camelCase no PostgreSQL sem @map,
--    portanto referências SQL precisam de aspas: "isActive", etc.
-- 2. IDs são TEXT (cuid), mas auth.uid() retorna uuid —
--    necessário cast explícito: auth.uid()::text em comparações.
-- 3. Prisma usa postgres user (superuser) → bypassa RLS.
--    As políticas protegem conexões via Supabase client (anon key).
--
-- PRÉ-REQUISITO: configurar JWT do NextAuth no Supabase
-- (Settings → API → JWT Settings → colar AUTH_SECRET)
-- ============================================================

-- ─── Funções auxiliares ──────────────────────────────────────

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL SECURITY DEFINER STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()::text
      AND role = 'ADMIN'
      AND "isActive" = true
      AND "deletedAt" IS NULL
  )
$$;

CREATE OR REPLACE FUNCTION is_item_owner(p_item_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL SECURITY DEFINER STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM items
    WHERE id = p_item_id AND "ownerId" = auth.uid()::text
  )
$$;

CREATE OR REPLACE FUNCTION is_conversation_participant(conv_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL SECURITY DEFINER STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE "conversationId" = conv_id
      AND "userId" = auth.uid()::text
  )
$$;

CREATE OR REPLACE FUNCTION is_booking_party(p_booking_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL SECURITY DEFINER STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bookings
    WHERE id = p_booking_id
      AND ("borrowerId" = auth.uid()::text OR "ownerId" = auth.uid()::text)
  )
$$;


-- ─── Ativar RLS em todas as tabelas ──────────────────────────

ALTER TABLE users                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_tokens       ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories                ENABLE ROW LEVEL SECURITY;
ALTER TABLE items                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_images               ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications             ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens     ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbound_webhooks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_credits          ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_photos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_acceptances      ENABLE ROW LEVEL SECURITY;


-- ════════════════════════════════════════════════════════════
-- TABELA: users
-- ════════════════════════════════════════════════════════════
CREATE POLICY "users_select_public"
ON users FOR SELECT
USING (
  "isActive" = true AND "deletedAt" IS NULL
);

CREATE POLICY "users_select_own"
ON users FOR SELECT
USING (id = auth.uid()::text);

CREATE POLICY "users_update_own"
ON users FOR UPDATE
USING (id = auth.uid()::text)
WITH CHECK (
  id = auth.uid()::text
  AND role = (SELECT role FROM users WHERE id = auth.uid()::text)
);

CREATE POLICY "users_update_admin"
ON users FOR UPDATE
USING (is_admin());


-- ════════════════════════════════════════════════════════════
-- TABELA: accounts (NextAuth — service role apenas para escrita)
-- ════════════════════════════════════════════════════════════
CREATE POLICY "accounts_select_own"
ON accounts FOR SELECT
USING ("userId" = auth.uid()::text);


-- ════════════════════════════════════════════════════════════
-- TABELA: sessions (NextAuth)
-- ════════════════════════════════════════════════════════════
CREATE POLICY "sessions_select_own"
ON sessions FOR SELECT
USING ("userId" = auth.uid()::text);


-- ════════════════════════════════════════════════════════════
-- TABELA: categories
-- ════════════════════════════════════════════════════════════
CREATE POLICY "categories_select_public"
ON categories FOR SELECT
USING (true);

CREATE POLICY "categories_insert_admin"
ON categories FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "categories_update_admin"
ON categories FOR UPDATE
USING (is_admin());

CREATE POLICY "categories_delete_admin"
ON categories FOR DELETE
USING (is_admin());


-- ════════════════════════════════════════════════════════════
-- TABELA: items
-- ════════════════════════════════════════════════════════════
CREATE POLICY "items_select_public"
ON items FOR SELECT
USING (
  "isActive" = true
  AND "isApproved" = true
  AND "deletedAt" IS NULL
);

CREATE POLICY "items_select_owner"
ON items FOR SELECT
USING ("ownerId" = auth.uid()::text);

CREATE POLICY "items_select_admin"
ON items FOR SELECT
USING (is_admin());

CREATE POLICY "items_insert_authenticated"
ON items FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND "ownerId" = auth.uid()::text
);

CREATE POLICY "items_update_owner"
ON items FOR UPDATE
USING ("ownerId" = auth.uid()::text)
WITH CHECK (
  "ownerId" = auth.uid()::text
  AND "isApproved" = (SELECT "isApproved" FROM items WHERE id = items.id)
);

CREATE POLICY "items_update_admin"
ON items FOR UPDATE
USING (is_admin());


-- ════════════════════════════════════════════════════════════
-- TABELA: item_images
-- ════════════════════════════════════════════════════════════
CREATE POLICY "item_images_select_public"
ON item_images FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM items
    WHERE items.id = item_images."itemId"
      AND items."isActive" = true
      AND items."isApproved" = true
      AND items."deletedAt" IS NULL
  )
);

CREATE POLICY "item_images_select_owner"
ON item_images FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM items
    WHERE items.id = item_images."itemId"
      AND items."ownerId" = auth.uid()::text
  )
);

CREATE POLICY "item_images_insert_owner"
ON item_images FOR INSERT
WITH CHECK (is_item_owner("itemId"));

CREATE POLICY "item_images_update_owner"
ON item_images FOR UPDATE
USING (is_item_owner("itemId"));

CREATE POLICY "item_images_delete_owner"
ON item_images FOR DELETE
USING (is_item_owner("itemId"));

CREATE POLICY "item_images_all_admin"
ON item_images FOR ALL
USING (is_admin());


-- ════════════════════════════════════════════════════════════
-- TABELA: bookings
-- ════════════════════════════════════════════════════════════
CREATE POLICY "bookings_select_party"
ON bookings FOR SELECT
USING (
  "borrowerId" = auth.uid()::text
  OR "ownerId" = auth.uid()::text
  OR is_admin()
);

CREATE POLICY "bookings_insert_borrower"
ON bookings FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND "borrowerId" = auth.uid()::text
  AND NOT EXISTS (
    SELECT 1 FROM items
    WHERE items.id = bookings."itemId"
      AND items."ownerId" = auth.uid()::text
  )
);

CREATE POLICY "bookings_update_party"
ON bookings FOR UPDATE
USING (
  "borrowerId" = auth.uid()::text
  OR "ownerId" = auth.uid()::text
);

CREATE POLICY "bookings_update_admin"
ON bookings FOR UPDATE
USING (is_admin());


-- ════════════════════════════════════════════════════════════
-- TABELA: reviews
-- ════════════════════════════════════════════════════════════
CREATE POLICY "reviews_select_public"
ON reviews FOR SELECT
USING (true);

CREATE POLICY "reviews_insert_reviewer"
ON reviews FOR INSERT
WITH CHECK (
  "reviewerId" = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = reviews."bookingId"
      AND (bookings."borrowerId" = auth.uid()::text OR bookings."ownerId" = auth.uid()::text)
      AND bookings.status IN ('RETURNED', 'COMPLETED')
  )
);

CREATE POLICY "reviews_delete_admin"
ON reviews FOR DELETE
USING (is_admin());


-- ════════════════════════════════════════════════════════════
-- TABELA: favorites
-- ════════════════════════════════════════════════════════════
CREATE POLICY "favorites_select_own"
ON favorites FOR SELECT
USING ("userId" = auth.uid()::text);

CREATE POLICY "favorites_insert_own"
ON favorites FOR INSERT
WITH CHECK (
  "userId" = auth.uid()::text
  AND NOT EXISTS (
    SELECT 1 FROM items
    WHERE items.id = favorites."itemId"
      AND items."ownerId" = auth.uid()::text
  )
);

CREATE POLICY "favorites_delete_own"
ON favorites FOR DELETE
USING ("userId" = auth.uid()::text);


-- ════════════════════════════════════════════════════════════
-- TABELA: conversations
-- ════════════════════════════════════════════════════════════
CREATE POLICY "conversations_select_participant"
ON conversations FOR SELECT
USING (is_conversation_participant(id));

CREATE POLICY "conversations_select_admin"
ON conversations FOR SELECT
USING (is_admin());


-- ════════════════════════════════════════════════════════════
-- TABELA: conversation_participants
-- ════════════════════════════════════════════════════════════
CREATE POLICY "conv_participants_select_participant"
ON conversation_participants FOR SELECT
USING (
  "userId" = auth.uid()::text
  OR is_conversation_participant("conversationId")
);


-- ════════════════════════════════════════════════════════════
-- TABELA: messages — CRÍTICO para o Supabase Realtime
-- ════════════════════════════════════════════════════════════
CREATE POLICY "messages_select_participant"
ON messages FOR SELECT
USING (is_conversation_participant("conversationId"));

CREATE POLICY "messages_insert_participant"
ON messages FOR INSERT
WITH CHECK (
  "senderId" = auth.uid()::text
  AND is_conversation_participant("conversationId")
);

CREATE POLICY "messages_update_sender"
ON messages FOR UPDATE
USING ("senderId" = auth.uid()::text)
WITH CHECK (
  "senderId" = auth.uid()::text
  AND content = (SELECT content FROM messages WHERE id = messages.id)
);

CREATE POLICY "messages_update_read_participant"
ON messages FOR UPDATE
USING (
  "senderId" != auth.uid()::text
  AND is_conversation_participant("conversationId")
)
WITH CHECK (
  content    = (SELECT content    FROM messages WHERE id = messages.id)
  AND "senderId" = (SELECT "senderId" FROM messages WHERE id = messages.id)
);


-- ════════════════════════════════════════════════════════════
-- TABELA: notifications
-- ════════════════════════════════════════════════════════════
CREATE POLICY "notifications_select_own"
ON notifications FOR SELECT
USING ("userId" = auth.uid()::text);

CREATE POLICY "notifications_update_own"
ON notifications FOR UPDATE
USING ("userId" = auth.uid()::text)
WITH CHECK (
  "userId" = auth.uid()::text
  AND type  = (SELECT type  FROM notifications WHERE id = notifications.id)
  AND title = (SELECT title FROM notifications WHERE id = notifications.id)
  AND body  = (SELECT body  FROM notifications WHERE id = notifications.id)
);

CREATE POLICY "notifications_delete_own"
ON notifications FOR DELETE
USING (
  "userId" = auth.uid()::text
  AND "readAt" IS NOT NULL
);


-- ════════════════════════════════════════════════════════════
-- TABELA: admin_logs
-- ════════════════════════════════════════════════════════════
CREATE POLICY "admin_logs_select_admin"
ON admin_logs FOR SELECT
USING (is_admin());


-- ════════════════════════════════════════════════════════════
-- TABELA: password_reset_tokens (NextAuth-only — sem políticas)
-- Bloqueio total via anon é intencional. Apenas Prisma superuser acessa.
-- ════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════
-- TABELA: outbound_webhooks
-- ════════════════════════════════════════════════════════════
CREATE POLICY "outbound_webhooks_select_own"
ON outbound_webhooks FOR SELECT
USING ("userId" = auth.uid()::text);

CREATE POLICY "outbound_webhooks_all_admin"
ON outbound_webhooks FOR ALL
USING (is_admin());


-- ════════════════════════════════════════════════════════════
-- TABELA: referral_credits
-- ════════════════════════════════════════════════════════════
CREATE POLICY "referral_credits_select_own"
ON referral_credits FOR SELECT
USING ("userId" = auth.uid()::text);

CREATE POLICY "referral_credits_all_admin"
ON referral_credits FOR ALL
USING (is_admin());


-- ════════════════════════════════════════════════════════════
-- TABELA: booking_photos — participantes da reserva veem, uploader insere
-- ════════════════════════════════════════════════════════════
CREATE POLICY "booking_photos_select_party"
ON booking_photos FOR SELECT
USING (is_booking_party("bookingId") OR is_admin());

CREATE POLICY "booking_photos_insert_party"
ON booking_photos FOR INSERT
WITH CHECK (
  "uploadedBy" = auth.uid()::text
  AND is_booking_party("bookingId")
);

CREATE POLICY "booking_photos_delete_admin"
ON booking_photos FOR DELETE
USING (is_admin());


-- ════════════════════════════════════════════════════════════
-- TABELA: contract_acceptances — participantes leem, insert via Prisma
-- ════════════════════════════════════════════════════════════
CREATE POLICY "contract_acceptances_select_party"
ON contract_acceptances FOR SELECT
USING (is_booking_party("bookingId") OR is_admin());


-- ════════════════════════════════════════════════════════════
-- VERIFICAÇÃO — execute no Supabase SQL Editor após aplicar
-- ════════════════════════════════════════════════════════════
-- SELECT schemaname, tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, cmd;
--
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
-- ============================================================
