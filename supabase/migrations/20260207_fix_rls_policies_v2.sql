-- ========================================
-- RLSポリシーの修正 v2
-- ========================================
-- 作成日: 2026-02-07
-- 目的: 適切なアクセス制御の実装（CWE-639: Authorization Bypass Through User-Controlled Key）
--
-- 問題: 現在のRLSポリシーは `auth.role() = 'authenticated'` のみでチェックされており、
--       ユーザー個別の所有権チェックが欠如している。
--
-- 対策: 作成者または管理者のみがアクセス可能なポリシーに変更

-- ========================================
-- 1. Product Prices（商品価格）
-- ========================================

-- 既存の緩いポリシーを削除
DROP POLICY IF EXISTS "Authenticated users can view product prices" ON product_prices;
DROP POLICY IF EXISTS "Authenticated users can delete product prices" ON product_prices;
DROP POLICY IF EXISTS "Authenticated users can insert product prices" ON product_prices;
DROP POLICY IF EXISTS "Authenticated users can update product prices" ON product_prices;

-- 全ユーザーが閲覧可能（価格情報は公開情報として扱う）
CREATE POLICY "Anyone can view product prices"
  ON product_prices FOR SELECT
  USING (true);

-- 管理者のみが変更可能
CREATE POLICY "Only admins can modify product prices"
  ON product_prices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workers
      WHERE auth_user_id = auth.uid()
      AND is_admin = true
    )
  );

COMMENT ON POLICY "Only admins can modify product prices" ON product_prices IS
  '価格情報は管理者のみが変更可能。全ユーザーは閲覧可能。';

-- ========================================
-- 2. Orders（受注）
-- ========================================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Authenticated users can view orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can update orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can delete orders" ON orders;

-- 自分が作成した注文または管理者は閲覧可能
CREATE POLICY "Users can view own orders or admins can view all"
  ON orders FOR SELECT
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM workers
      WHERE auth_user_id = auth.uid()
      AND is_admin = true
    )
  );

-- 認証済みユーザーは注文作成可能（created_byは自動設定）
CREATE POLICY "Authenticated users can create orders"
  ON orders FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    created_by = auth.uid()
  );

-- 自分の注文または管理者のみが更新可能
CREATE POLICY "Users can update own orders or admins can update all"
  ON orders FOR UPDATE
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM workers
      WHERE auth_user_id = auth.uid()
      AND is_admin = true
    )
  )
  WITH CHECK (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM workers
      WHERE auth_user_id = auth.uid()
      AND is_admin = true
    )
  );

-- 管理者のみが削除可能
CREATE POLICY "Only admins can delete orders"
  ON orders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workers
      WHERE auth_user_id = auth.uid()
      AND is_admin = true
    )
  );

COMMENT ON POLICY "Users can view own orders or admins can view all" ON orders IS
  '注文は作成者または管理者のみが閲覧可能。';

-- ========================================
-- 3. Order Items（受注明細）
-- ========================================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Authenticated users can view order items" ON order_items;
DROP POLICY IF EXISTS "Authenticated users can insert order items" ON order_items;
DROP POLICY IF EXISTS "Authenticated users can update order items" ON order_items;
DROP POLICY IF EXISTS "Authenticated users can delete order items" ON order_items;

-- 自分の注文の明細または管理者は閲覧可能
CREATE POLICY "Users can view own order items or admins can view all"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.order_id = order_items.order_id
      AND (
        orders.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM workers
          WHERE auth_user_id = auth.uid()
          AND is_admin = true
        )
      )
    )
  );

-- 自分の注文の明細は追加可能
CREATE POLICY "Users can insert own order items"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.order_id = order_items.order_id
      AND orders.created_by = auth.uid()
    )
  );

-- 自分の注文の明細または管理者は更新可能
CREATE POLICY "Users can update own order items or admins can update all"
  ON order_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.order_id = order_items.order_id
      AND (
        orders.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM workers
          WHERE auth_user_id = auth.uid()
          AND is_admin = true
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.order_id = order_items.order_id
      AND (
        orders.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM workers
          WHERE auth_user_id = auth.uid()
          AND is_admin = true
        )
      )
    )
  );

-- 管理者のみが削除可能
CREATE POLICY "Only admins can delete order items"
  ON order_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workers
      WHERE auth_user_id = auth.uid()
      AND is_admin = true
    )
  );

COMMENT ON POLICY "Users can view own order items or admins can view all" ON order_items IS
  '注文明細は親の注文と同じアクセス制御。作成者または管理者のみが閲覧可能。';

-- ========================================
-- 4. 既存ポリシーの確認
-- ========================================

-- work_logs, work_sessions などの既存ポリシーが適切か確認
-- （これらは既に適切なRLSポリシーが設定されているため、変更不要）

-- ========================================
-- 5. インデックスの追加（パフォーマンス最適化）
-- ========================================

-- created_by カラムにインデックスを追加（存在しない場合のみ）
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- ========================================
-- 検証クエリ
-- ========================================

-- RLSポリシーが正しく設定されているか確認するクエリ
-- SELECT schemaname, tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('product_prices', 'orders', 'order_items')
-- ORDER BY tablename, policyname;
