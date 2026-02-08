import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { Part, VariantAttribute, VariantAttributeValue } from '@/lib/types/database';

// Extended types for query results with joins
interface VariantAttributeValueWithAttribute extends VariantAttributeValue {
  variant_attributes?: { name: string } | null;
}

interface VariantAttributeAssignment {
  value_id: string;
  variant_attribute_values?: {
    name: string;
    variant_attributes?: { name: string } | null;
  } | null;
}

interface ProductVariantV2Extended {
  variant_id: string;
  base_part_id: string;
  variant_code: string;
  display_name: string;
  description: string | null;
  order_index: number;
  active: boolean;
  parts?: { name: string } | null;
  attributes: VariantAttributeAssignment[];
}

// バリエーション属性タブ
export function VariantAttributesTab() {
  const [attributes, setAttributes] = useState<VariantAttribute[]>([]);
  const [editing, setEditing] = useState<VariantAttribute | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [orderIndex, setOrderIndex] = useState('0');
  const [active, setActive] = useState(true);

  useEffect(() => {
    fetchAttributes();
  }, []);

  const fetchAttributes = async () => {
    const { data } = await supabase.from('variant_attributes').select('*').order('order_index');
    if (data) setAttributes(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editing) {
        const { error } = await supabase
          .from('variant_attributes')
          .update({
            name,
            description: description || null,
            order_index: parseInt(orderIndex),
            active,
          })
          .eq('attribute_id', editing.attribute_id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('variant_attributes').insert({
          name,
          description: description || null,
          order_index: parseInt(orderIndex),
          active,
        });
        if (error) throw error;
      }

      setName('');
      setDescription('');
      setOrderIndex('0');
      setActive(true);
      setEditing(null);
      fetchAttributes();
    } catch (error) {
      console.error('保存エラー:', error);
      toast.error('保存に失敗しました');
    }
  };

  const handleEdit = (attribute: VariantAttribute) => {
    setEditing(attribute);
    setName(attribute.name);
    setDescription(attribute.description || '');
    setOrderIndex(attribute.order_index.toString());
    setActive(attribute.active);
  };

  const handleCancel = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setOrderIndex('0');
    setActive(true);
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!confirm(`バリエーション属性「${editing.name}」を削除しますか？`)) return;

    try {
      const { error } = await supabase
        .from('variant_attributes')
        .delete()
        .eq('attribute_id', editing.attribute_id);

      if (error) throw error;

      toast.success('削除しました');
      handleCancel();
      fetchAttributes();
    } catch (error) {
      console.error('削除エラー:', error);
      toast.error('削除に失敗しました');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-blue-800">
          バリエーション属性は、商品を分類する軸です（例: 整形タイプ、皮デザイン）。
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-medium mb-4">{editing ? '編集' : '新規バリエーション属性'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm mb-1">名前</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="例: 整形タイプ"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">説明</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="例: 帯鋸での整形の種類"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">表示順</label>
              <input
                type="number"
                value={orderIndex}
                onChange={(e) => setOrderIndex(e.target.value)}
                required
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">有効</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {editing ? '更新' : '追加'}
            </button>
            {editing && (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  削除
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">名前</th>
              <th className="px-4 py-3 text-left">説明</th>
              <th className="px-4 py-3 text-left">表示順</th>
              <th className="px-4 py-3 text-left">状態</th>
              <th className="px-4 py-3 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {attributes.map((attribute) => (
              <tr key={attribute.attribute_id}>
                <td className="px-4 py-3 font-medium">{attribute.name}</td>
                <td className="px-4 py-3">{attribute.description || '—'}</td>
                <td className="px-4 py-3">{attribute.order_index}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      'px-2 py-1 rounded text-xs ' +
                      (attribute.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800')
                    }
                  >
                    {attribute.active ? '有効' : '無効'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleEdit(attribute)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    編集
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 属性値タブ
export function VariantAttributeValuesTab() {
  const [values, setValues] = useState<VariantAttributeValueWithAttribute[]>([]);
  const [attributes, setAttributes] = useState<VariantAttribute[]>([]);
  const [editing, setEditing] = useState<VariantAttributeValue | null>(null);
  const [attributeId, setAttributeId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [orderIndex, setOrderIndex] = useState('0');
  const [active, setActive] = useState(true);

  useEffect(() => {
    fetchAttributes();
    fetchValues();
  }, []);

  const fetchAttributes = async () => {
    const { data } = await supabase.from('variant_attributes').select('*').order('order_index');
    if (data) setAttributes(data);
  };

  const fetchValues = async () => {
    const { data } = await supabase
      .from('variant_attribute_values')
      .select('*, variant_attributes(name)')
      .order('order_index');
    if (data) setValues(data as VariantAttributeValueWithAttribute[]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editing) {
        const { error } = await supabase
          .from('variant_attribute_values')
          .update({
            attribute_id: attributeId,
            name,
            description: description || null,
            order_index: parseInt(orderIndex),
            active,
          })
          .eq('value_id', editing.value_id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('variant_attribute_values').insert({
          attribute_id: attributeId,
          name,
          description: description || null,
          order_index: parseInt(orderIndex),
          active,
        });
        if (error) throw error;
      }

      setAttributeId('');
      setName('');
      setDescription('');
      setOrderIndex('0');
      setActive(true);
      setEditing(null);
      fetchValues();
    } catch (error) {
      console.error('保存エラー:', error);
      toast.error('保存に失敗しました');
    }
  };

  const handleEdit = (value: VariantAttributeValue) => {
    setEditing(value);
    setAttributeId(value.attribute_id);
    setName(value.name);
    setDescription(value.description || '');
    setOrderIndex(value.order_index.toString());
    setActive(value.active);
  };

  const handleCancel = () => {
    setEditing(null);
    setAttributeId('');
    setName('');
    setDescription('');
    setOrderIndex('0');
    setActive(true);
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!confirm(`属性値「${editing.name}」を削除しますか？`)) return;

    try {
      const { error } = await supabase
        .from('variant_attribute_values')
        .delete()
        .eq('value_id', editing.value_id);

      if (error) throw error;

      toast.success('削除しました');
      handleCancel();
      fetchValues();
    } catch (error) {
      console.error('削除エラー:', error);
      toast.error('削除に失敗しました');
    }
  };

  const getAttributeName = (attributeId: string) => {
    return attributes.find((a) => a.attribute_id === attributeId)?.name || '';
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-blue-800">
          属性値は、バリエーション属性の具体的な選択肢です（例: 通常版、島村版、花柄、無地（黒））。
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-medium mb-4">{editing ? '編集' : '新規属性値'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm mb-1">属性</label>
              <select
                value={attributeId}
                onChange={(e) => setAttributeId(e.target.value)}
                required
                className="w-full border rounded px-3 py-2"
              >
                <option value="">選択してください</option>
                {attributes.map((attr) => (
                  <option key={attr.attribute_id} value={attr.attribute_id}>
                    {attr.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">名前</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="例: 通常版"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">説明</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="例: 通常の整形"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">表示順</label>
              <input
                type="number"
                value={orderIndex}
                onChange={(e) => setOrderIndex(e.target.value)}
                required
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">有効</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {editing ? '更新' : '追加'}
            </button>
            {editing && (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  削除
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">属性</th>
              <th className="px-4 py-3 text-left">名前</th>
              <th className="px-4 py-3 text-left">説明</th>
              <th className="px-4 py-3 text-left">表示順</th>
              <th className="px-4 py-3 text-left">状態</th>
              <th className="px-4 py-3 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {values.map((value) => (
              <tr key={value.value_id}>
                <td className="px-4 py-3 font-medium">
                  {value.variant_attributes?.name || getAttributeName(value.attribute_id)}
                </td>
                <td className="px-4 py-3">{value.name}</td>
                <td className="px-4 py-3">{value.description || '—'}</td>
                <td className="px-4 py-3">{value.order_index}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      'px-2 py-1 rounded text-xs ' +
                      (value.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')
                    }
                  >
                    {value.active ? '有効' : '無効'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleEdit(value)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    編集
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 商品バリエーションV2タブ
export function ProductVariantsV2Tab() {
  const [variants, setVariants] = useState<ProductVariantV2Extended[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [attributes, setAttributes] = useState<VariantAttribute[]>([]);
  const [attributeValues, setAttributeValues] = useState<VariantAttributeValue[]>([]);
  const [editing, setEditing] = useState<ProductVariantV2Extended | null>(null);
  const [basePartId, setBasePartId] = useState('');
  const [variantCode, setVariantCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [orderIndex, setOrderIndex] = useState('0');
  const [active, setActive] = useState(true);
  const [selectedValueIds, setSelectedValueIds] = useState<string[]>([]);

  useEffect(() => {
    fetchParts();
    fetchAttributes();
    fetchAttributeValues();
    fetchVariants();
  }, []);

  const fetchParts = async () => {
    const { data } = await supabase.from('parts').select('*').order('order_index');
    if (data) setParts(data);
  };

  const fetchAttributes = async () => {
    const { data } = await supabase.from('variant_attributes').select('*').order('order_index');
    if (data) setAttributes(data);
  };

  const fetchAttributeValues = async () => {
    const { data } = await supabase
      .from('variant_attribute_values')
      .select('*')
      .order('order_index');
    if (data) setAttributeValues(data);
  };

  const fetchVariants = async () => {
    const { data } = await supabase
      .from('product_variants_v2')
      .select('*, parts(name)')
      .order('order_index');

    if (data) {
      // 各バリエーションの属性値を取得
      const variantsWithAttributes = await Promise.all(
        data.map(async (variant) => {
          const { data: assignments } = await supabase
            .from('variant_attribute_assignments')
            .select('*, variant_attribute_values(*, variant_attributes(name))')
            .eq('variant_id', variant.variant_id);

          return {
            ...variant,
            attributes: assignments || [],
          };
        })
      );
      setVariants(variantsWithAttributes);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editing) {
        // 更新
        const { error: variantError } = await supabase
          .from('product_variants_v2')
          .update({
            base_part_id: basePartId,
            variant_code: variantCode,
            display_name: displayName,
            description: description || null,
            order_index: parseInt(orderIndex),
            active,
          })
          .eq('variant_id', editing.variant_id);
        if (variantError) throw variantError;

        // 既存の属性値割り当てを削除
        const { error: deleteError } = await supabase
          .from('variant_attribute_assignments')
          .delete()
          .eq('variant_id', editing.variant_id);
        if (deleteError) throw deleteError;

        // 新しい属性値を割り当て
        if (selectedValueIds.length > 0) {
          const assignments = selectedValueIds.map((valueId) => ({
            variant_id: editing.variant_id,
            value_id: valueId,
          }));
          const { error: assignError } = await supabase
            .from('variant_attribute_assignments')
            .insert(assignments);
          if (assignError) throw assignError;
        }
      } else {
        // 新規作成
        const { data: variantData, error: variantError } = await supabase
          .from('product_variants_v2')
          .insert({
            base_part_id: basePartId,
            variant_code: variantCode,
            display_name: displayName,
            description: description || null,
            order_index: parseInt(orderIndex),
            active,
          })
          .select()
          .single();
        if (variantError) throw variantError;

        // 属性値を割り当て
        if (selectedValueIds.length > 0 && variantData) {
          const assignments = selectedValueIds.map((valueId) => ({
            variant_id: variantData.variant_id,
            value_id: valueId,
          }));
          const { error: assignError } = await supabase
            .from('variant_attribute_assignments')
            .insert(assignments);
          if (assignError) throw assignError;
        }
      }

      setBasePartId('');
      setVariantCode('');
      setDisplayName('');
      setDescription('');
      setOrderIndex('0');
      setActive(true);
      setSelectedValueIds([]);
      setEditing(null);
      fetchVariants();
    } catch (error) {
      console.error('保存エラー:', error);
      toast.error('保存に失敗しました');
    }
  };

  const handleEdit = (variant: ProductVariantV2Extended) => {
    setEditing(variant);
    setBasePartId(variant.base_part_id);
    setVariantCode(variant.variant_code);
    setDisplayName(variant.display_name);
    setDescription(variant.description || '');
    setOrderIndex(variant.order_index.toString());
    setActive(variant.active);

    // 既存の属性値IDを設定
    const valueIds = variant.attributes.map((a) => a.value_id);
    setSelectedValueIds(valueIds);
  };

  const handleCancel = () => {
    setEditing(null);
    setBasePartId('');
    setVariantCode('');
    setDisplayName('');
    setDescription('');
    setOrderIndex('0');
    setActive(true);
    setSelectedValueIds([]);
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!confirm(`商品バリエーション「${editing.display_name}」を削除しますか？`)) return;

    try {
      // まず関連する属性値割り当てを削除
      const { error: assignmentError } = await supabase
        .from('variant_attribute_assignments')
        .delete()
        .eq('variant_id', editing.variant_id);

      if (assignmentError) throw assignmentError;

      // 次にバリエーション本体を削除
      const { error: variantError } = await supabase
        .from('product_variants_v2')
        .delete()
        .eq('variant_id', editing.variant_id);

      if (variantError) throw variantError;

      toast.success('削除しました');
      handleCancel();
      fetchVariants();
    } catch (error) {
      console.error('削除エラー:', error);
      toast.error('削除に失敗しました');
    }
  };

  const toggleValueSelection = (valueId: string) => {
    setSelectedValueIds((prev) =>
      prev.includes(valueId) ? prev.filter((id) => id !== valueId) : [...prev, valueId]
    );
  };

  const getPartName = (partId: string) => {
    return parts.find((p) => p.part_id === partId)?.name || '';
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-blue-800">
          商品バリエーションは、属性値の組み合わせで定義されます（例:
          通常版-花柄、島村版-無地（黒））。
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-medium mb-4">{editing ? '編集' : '新規商品バリエーション'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">ベース部品</label>
              <select
                value={basePartId}
                onChange={(e) => setBasePartId(e.target.value)}
                required
                className="w-full border rounded px-3 py-2"
              >
                <option value="">選択してください</option>
                {parts.map((part) => (
                  <option key={part.part_id} value={part.part_id}>
                    {part.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">バリエーションコード</label>
              <input
                type="text"
                value={variantCode}
                onChange={(e) => setVariantCode(e.target.value)}
                required
                placeholder="例: DOU-NORMAL-HANA"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">表示名</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                placeholder="例: 胴（通常版-花柄）"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">説明</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">表示順</label>
              <input
                type="number"
                value={orderIndex}
                onChange={(e) => setOrderIndex(e.target.value)}
                required
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">有効</span>
              </label>
            </div>
          </div>

          {/* 属性値選択 */}
          <div>
            <label className="block text-sm mb-2 font-medium">属性値を選択</label>
            <div className="space-y-3">
              {attributes.map((attr) => (
                <div key={attr.attribute_id} className="border rounded p-3">
                  <div className="text-sm font-medium mb-2">{attr.name}</div>
                  <div className="flex flex-wrap gap-2">
                    {attributeValues
                      .filter((val) => val.attribute_id === attr.attribute_id)
                      .map((value) => (
                        <button
                          key={value.value_id}
                          type="button"
                          onClick={() => toggleValueSelection(value.value_id)}
                          className={`px-3 py-1 rounded text-sm ${
                            selectedValueIds.includes(value.value_id)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {value.name}
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {editing ? '更新' : '追加'}
            </button>
            {editing && (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  削除
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">コード</th>
              <th className="px-4 py-3 text-left">表示名</th>
              <th className="px-4 py-3 text-left">ベース部品</th>
              <th className="px-4 py-3 text-left">属性値</th>
              <th className="px-4 py-3 text-left">説明</th>
              <th className="px-4 py-3 text-left">表示順</th>
              <th className="px-4 py-3 text-left">状態</th>
              <th className="px-4 py-3 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {variants.map((variant) => (
              <tr key={variant.variant_id}>
                <td className="px-4 py-3">{variant.variant_code}</td>
                <td className="px-4 py-3">{variant.display_name}</td>
                <td className="px-4 py-3">
                  {variant.parts?.name || getPartName(variant.base_part_id)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {variant.attributes.map((assignment) => (
                      <span
                        key={assignment.value_id}
                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                      >
                        {assignment.variant_attribute_values?.variant_attributes?.name}:{' '}
                        {assignment.variant_attribute_values?.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">{variant.description || '—'}</td>
                <td className="px-4 py-3">{variant.order_index}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      'px-2 py-1 rounded text-xs ' +
                      (variant.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')
                    }
                  >
                    {variant.active ? '有効' : '無効'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleEdit(variant)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    編集
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
