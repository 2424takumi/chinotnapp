-- システム用の作業者を追加
-- order_index = -1 にすることで、通常の入力画面には表示されないようにする

INSERT INTO workers (name, order_index, active)
VALUES ('システム', -1, true)
ON CONFLICT DO NOTHING;
