-- 皮デザインマスタと商品バリエーション、塗装工程の追加

-- 1. 皮デザインマスタテーブル
CREATE TABLE skin_designs (
  skin_design_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 商品バリエーションテーブル（胴+皮デザイン）
CREATE TABLE product_variants (
  variant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_part_id UUID NOT NULL REFERENCES parts(part_id) ON DELETE CASCADE,
  skin_design_id UUID REFERENCES skin_designs(skin_design_id) ON DELETE SET NULL,
  variant_code VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. 作業ログに商品バリエーション情報を追加
ALTER TABLE work_logs ADD COLUMN variant_id UUID REFERENCES product_variants(variant_id) ON DELETE SET NULL;

-- 4. 自動更新トリガーの追加
CREATE TRIGGER update_skin_designs_updated_at
  BEFORE UPDATE ON skin_designs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 5. インデックスの追加
CREATE INDEX idx_product_variants_base_part ON product_variants(base_part_id);
CREATE INDEX idx_product_variants_skin_design ON product_variants(skin_design_id);
CREATE INDEX idx_product_variants_active ON product_variants(active);
CREATE INDEX idx_work_logs_variant ON work_logs(variant_id);

-- 6. サンプルデータ：皮デザイン
INSERT INTO skin_designs (name, description, order_index, active) VALUES
  ('花柄', '伝統的な花柄デザイン', 1, true),
  ('無地（黒）', 'シンプルな黒色', 2, true),
  ('無地（茶）', 'シンプルな茶色', 3, true),
  ('古紫', '古典的な紫色', 4, true);

-- 7. 塗装工程の追加

-- 胴の塗装工程を取得または作成するために、まず胴のpart_idを取得
DO $$
DECLARE
  v_dou_part_id UUID;
  v_operation_max_order INTEGER;
BEGIN
  -- 胴のpart_idを取得
  SELECT part_id INTO v_dou_part_id
  FROM parts
  WHERE name = '胴'
  LIMIT 1;

  -- 現在の工程の最大order_indexを取得
  SELECT COALESCE(MAX(order_index), 0) INTO v_operation_max_order
  FROM operations
  WHERE part_id = v_dou_part_id;

  -- 塗装工程が存在しない場合のみ追加
  IF NOT EXISTS (
    SELECT 1 FROM operations
    WHERE part_id = v_dou_part_id AND name = '塗装'
  ) THEN
    INSERT INTO operations (part_id, name, order_index, category, active)
    VALUES (v_dou_part_id, '塗装', v_operation_max_order + 1, '仕上', true);
  END IF;
END $$;

-- 8. コメント追加
COMMENT ON TABLE skin_designs IS '皮のデザインマスタ';
COMMENT ON TABLE product_variants IS '商品バリエーション（胴+皮デザインなど）';
COMMENT ON COLUMN work_logs.variant_id IS '商品バリエーションID（皮張り工程などで使用）';
