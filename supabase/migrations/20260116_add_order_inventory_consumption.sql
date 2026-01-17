-- 受注納品完了時の在庫消費を記録するテーブル

CREATE TABLE IF NOT EXISTS order_inventory_consumption (
  consumption_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items(order_item_id) ON DELETE CASCADE,
  operation_id UUID NOT NULL REFERENCES operations(operation_id),
  consumed_quantity INTEGER NOT NULL,
  consumed_attribute_values JSONB,  -- 属性値の組み合わせ {"attr_id": "value_id", ...}
  is_deleted BOOLEAN NOT NULL DEFAULT false,  -- 論理削除フラグ（納品取り消し時）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES workers(worker_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_order_inventory_consumption_order_id
  ON order_inventory_consumption(order_id);

CREATE INDEX IF NOT EXISTS idx_order_inventory_consumption_order_item_id
  ON order_inventory_consumption(order_item_id);

CREATE INDEX IF NOT EXISTS idx_order_inventory_consumption_operation_id
  ON order_inventory_consumption(operation_id);

CREATE INDEX IF NOT EXISTS idx_order_inventory_consumption_is_deleted
  ON order_inventory_consumption(is_deleted);

-- コメント追加
COMMENT ON TABLE order_inventory_consumption IS '受注納品完了時に最終工程の在庫を消費した記録';
COMMENT ON COLUMN order_inventory_consumption.consumed_attribute_values IS '消費した在庫の属性値（例: {"色": "赤", "サイズ": "M"}のようなJSON形式）';
COMMENT ON COLUMN order_inventory_consumption.is_deleted IS '納品完了を取り消した場合にtrueにする（物理削除しない）';
