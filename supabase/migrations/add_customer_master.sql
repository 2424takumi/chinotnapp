-- 顧客マスタテーブルを作成

CREATE TABLE IF NOT EXISTS customers (
  customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code VARCHAR(50) UNIQUE NOT NULL,
  customer_name VARCHAR(200) NOT NULL,
  customer_name_kana VARCHAR(200),
  company_name VARCHAR(300),
  postal_code VARCHAR(20),
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(200),
  contact_person VARCHAR(100),
  note TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_customers_customer_code ON customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_customers_customer_name ON customers(customer_name);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(active);
CREATE INDEX IF NOT EXISTS idx_customers_order_index ON customers(order_index);

-- RLSを有効化
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- ポリシー作成
CREATE POLICY "Anyone can view customers"
  ON customers FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert customers"
  ON customers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON customers FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete customers"
  ON customers FOR DELETE
  USING (true);

-- updated_at自動更新トリガー
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ordersテーブルに顧客IDカラムを追加
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(customer_id) ON DELETE SET NULL;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
