-- RLSポリシーを認証ユーザー限定に修正

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Anyone can view product prices" ON product_prices;
DROP POLICY IF EXISTS "Authenticated users can insert product prices" ON product_prices;
DROP POLICY IF EXISTS "Authenticated users can update product prices" ON product_prices;
DROP POLICY IF EXISTS "Authenticated users can delete product prices" ON product_prices;

DROP POLICY IF EXISTS "Anyone can view orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can update orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can delete orders" ON orders;

DROP POLICY IF EXISTS "Anyone can view order items" ON order_items;
DROP POLICY IF EXISTS "Authenticated users can insert order items" ON order_items;
DROP POLICY IF EXISTS "Authenticated users can update order items" ON order_items;
DROP POLICY IF EXISTS "Authenticated users can delete order items" ON order_items;

-- product_pricesのポリシー（認証ユーザーのみ）
CREATE POLICY "Authenticated users can view product prices"
  ON product_prices FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert product prices"
  ON product_prices FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update product prices"
  ON product_prices FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete product prices"
  ON product_prices FOR DELETE
  USING (auth.role() = 'authenticated');

-- ordersのポリシー（認証ユーザーのみ）
CREATE POLICY "Authenticated users can view orders"
  ON orders FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert orders"
  ON orders FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update orders"
  ON orders FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete orders"
  ON orders FOR DELETE
  USING (auth.role() = 'authenticated');

-- order_itemsのポリシー（認証ユーザーのみ）
CREATE POLICY "Authenticated users can view order items"
  ON order_items FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert order items"
  ON order_items FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update order items"
  ON order_items FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete order items"
  ON order_items FOR DELETE
  USING (auth.role() = 'authenticated');

-- 複合インデックスを追加（パフォーマンス改善）
CREATE INDEX IF NOT EXISTS idx_orders_customer_status ON orders(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_status_date ON orders(status, order_date DESC);
