-- 階層型バリエーション管理システムの移行
-- 2段階以上のバリエーション分岐に対応

-- 1. バリエーション属性マスタ（例: "整形タイプ", "皮デザイン"）
CREATE TABLE variant_attributes (
  attribute_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. バリエーション属性値マスタ（例: "通常版", "島村版", "花柄", "無地（黒）"）
CREATE TABLE variant_attribute_values (
  value_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_id UUID NOT NULL REFERENCES variant_attributes(attribute_id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(attribute_id, name)
);

-- 3. 商品バリエーションv2（属性値の組み合わせで定義）
CREATE TABLE product_variants_v2 (
  variant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_part_id UUID NOT NULL REFERENCES parts(part_id) ON DELETE CASCADE,
  variant_code VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. バリエーション属性値の割り当て（N:N関係）
CREATE TABLE variant_attribute_assignments (
  assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES product_variants_v2(variant_id) ON DELETE CASCADE,
  value_id UUID NOT NULL REFERENCES variant_attribute_values(value_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(variant_id, value_id)
);

-- 5. 工程とバリエーション属性の紐付け（どの工程でどの属性が決まるか）
CREATE TABLE operation_variant_attributes (
  operation_id UUID NOT NULL REFERENCES operations(operation_id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES variant_attributes(attribute_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (operation_id, attribute_id)
);

-- 6. 自動更新トリガーの追加
CREATE TRIGGER update_variant_attributes_updated_at
  BEFORE UPDATE ON variant_attributes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_variant_attribute_values_updated_at
  BEFORE UPDATE ON variant_attribute_values
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_product_variants_v2_updated_at
  BEFORE UPDATE ON product_variants_v2
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 7. インデックスの追加
CREATE INDEX idx_variant_attribute_values_attribute ON variant_attribute_values(attribute_id);
CREATE INDEX idx_variant_attribute_values_active ON variant_attribute_values(active);
CREATE INDEX idx_product_variants_v2_base_part ON product_variants_v2(base_part_id);
CREATE INDEX idx_product_variants_v2_active ON product_variants_v2(active);
CREATE INDEX idx_variant_attribute_assignments_variant ON variant_attribute_assignments(variant_id);
CREATE INDEX idx_variant_attribute_assignments_value ON variant_attribute_assignments(value_id);
CREATE INDEX idx_operation_variant_attributes_operation ON operation_variant_attributes(operation_id);
CREATE INDEX idx_operation_variant_attributes_attribute ON operation_variant_attributes(attribute_id);

-- 8. コメント追加
COMMENT ON TABLE variant_attributes IS 'バリエーション属性マスタ（整形タイプ、皮デザインなど）';
COMMENT ON TABLE variant_attribute_values IS 'バリエーション属性値マスタ（通常版、島村版、花柄など）';
COMMENT ON TABLE product_variants_v2 IS '商品バリエーションv2（属性値の組み合わせで定義）';
COMMENT ON TABLE variant_attribute_assignments IS 'バリエーション属性値の割り当て';
COMMENT ON TABLE operation_variant_attributes IS '工程とバリエーション属性の紐付け';

-- 9. 既存データの移行準備：皮デザインをバリエーション属性として登録
DO $$
DECLARE
  v_skin_design_attr_id UUID;
  v_skin_design_record RECORD;
  v_value_id UUID;
  v_variant_record RECORD;
BEGIN
  -- 「皮デザイン」属性を作成
  INSERT INTO variant_attributes (name, description, order_index, active)
  VALUES ('皮デザイン', '胴の皮のデザイン', 2, true)
  RETURNING attribute_id INTO v_skin_design_attr_id;

  -- 既存の skin_designs を variant_attribute_values に移行
  FOR v_skin_design_record IN
    SELECT * FROM skin_designs ORDER BY order_index
  LOOP
    INSERT INTO variant_attribute_values (
      attribute_id, name, description, order_index, active
    )
    VALUES (
      v_skin_design_attr_id,
      v_skin_design_record.name,
      v_skin_design_record.description,
      v_skin_design_record.order_index,
      v_skin_design_record.active
    )
    RETURNING value_id INTO v_value_id;

    -- 既存の product_variants を product_variants_v2 に移行
    -- skin_design_id が一致するバリエーションを探して移行
    FOR v_variant_record IN
      SELECT * FROM product_variants
      WHERE skin_design_id = v_skin_design_record.skin_design_id
    LOOP
      -- product_variants_v2 に挿入（既存のvariant_idを維持）
      INSERT INTO product_variants_v2 (
        variant_id, base_part_id, variant_code, display_name,
        description, order_index, active, created_at, updated_at
      )
      VALUES (
        v_variant_record.variant_id,
        v_variant_record.base_part_id,
        v_variant_record.variant_code,
        v_variant_record.display_name,
        v_variant_record.description,
        v_variant_record.order_index,
        v_variant_record.active,
        v_variant_record.created_at,
        v_variant_record.updated_at
      )
      ON CONFLICT (variant_id) DO NOTHING;

      -- 属性値を割り当て
      INSERT INTO variant_attribute_assignments (variant_id, value_id)
      VALUES (v_variant_record.variant_id, v_value_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- 10. サンプルデータ：整形タイプ属性を追加
DO $$
DECLARE
  v_forming_attr_id UUID;
  v_normal_value_id UUID;
  v_shimamura_value_id UUID;
  v_dou_part_id UUID;
  v_forming_operation_id UUID;
  v_kawabari_operation_id UUID;
  v_skin_design_attr_id UUID;
BEGIN
  -- 「整形タイプ」属性を作成
  INSERT INTO variant_attributes (name, description, order_index, active)
  VALUES ('整形タイプ', '帯鋸での整形の種類', 1, true)
  RETURNING attribute_id INTO v_forming_attr_id;

  -- 整形タイプの値を作成
  INSERT INTO variant_attribute_values (attribute_id, name, description, order_index, active)
  VALUES
    (v_forming_attr_id, '通常版', '通常の整形', 1, true)
  RETURNING value_id INTO v_normal_value_id;

  INSERT INTO variant_attribute_values (attribute_id, name, description, order_index, active)
  VALUES
    (v_forming_attr_id, '島村版', '島村楽器用の整形', 2, true)
  RETURNING value_id INTO v_shimamura_value_id;

  -- 胴のpart_idを取得
  SELECT part_id INTO v_dou_part_id
  FROM parts
  WHERE name = '胴'
  LIMIT 1;

  -- 整形（帯鋸）工程のIDを取得
  SELECT operation_id INTO v_forming_operation_id
  FROM operations
  WHERE part_id = v_dou_part_id AND name = '整形（帯鋸）'
  LIMIT 1;

  -- 皮張り工程のIDを取得
  SELECT operation_id INTO v_kawabari_operation_id
  FROM operations
  WHERE part_id = v_dou_part_id AND name = '皮張り'
  LIMIT 1;

  -- 皮デザイン属性のIDを取得
  SELECT attribute_id INTO v_skin_design_attr_id
  FROM variant_attributes
  WHERE name = '皮デザイン'
  LIMIT 1;

  -- 工程と属性を紐付け
  IF v_forming_operation_id IS NOT NULL THEN
    INSERT INTO operation_variant_attributes (operation_id, attribute_id)
    VALUES (v_forming_operation_id, v_forming_attr_id)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_kawabari_operation_id IS NOT NULL AND v_skin_design_attr_id IS NOT NULL THEN
    INSERT INTO operation_variant_attributes (operation_id, attribute_id)
    VALUES (v_kawabari_operation_id, v_skin_design_attr_id)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 11. work_logs.variant_id は既存のままで使用可能（product_variants_v2のvariant_idと互換性あり）
-- 既存の外部キー制約を更新
ALTER TABLE work_logs DROP CONSTRAINT IF EXISTS work_logs_variant_id_fkey;
ALTER TABLE work_logs ADD CONSTRAINT work_logs_variant_id_fkey
  FOREIGN KEY (variant_id) REFERENCES product_variants_v2(variant_id) ON DELETE SET NULL;
