'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  Worker,
  Part,
  Operation,
  Database
} from '@/lib/types/database';
import { VariantAttributesTab, VariantAttributeValuesTab, ProductVariantsV2Tab } from './variant-tabs';

export default function MastersPage() {
  const [activeTab, setActiveTab] = useState<'workers' | 'parts' | 'operations' | 'variant_attributes' | 'variant_attribute_values' | 'product_variants_v2'>('workers');

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">マスタ管理</h2>

      {/* タブ */}
      <div className="border-b">
        <div className="flex space-x-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('workers')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'workers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            作業者
          </button>
          <button
            onClick={() => setActiveTab('parts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'parts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            部品
          </button>
          <button
            onClick={() => setActiveTab('operations')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'operations'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            工程
          </button>
          <button
            onClick={() => setActiveTab('variant_attributes')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'variant_attributes'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            バリエーション属性
          </button>
          <button
            onClick={() => setActiveTab('variant_attribute_values')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'variant_attribute_values'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            属性値
          </button>
          <button
            onClick={() => setActiveTab('product_variants_v2')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'product_variants_v2'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            商品バリエーション
          </button>
        </div>
      </div>

      {/* タブコンテンツ */}
      <div>
        {activeTab === 'workers' && <WorkersTab />}
        {activeTab === 'parts' && <PartsTab />}
        {activeTab === 'operations' && <OperationsTab />}
        {activeTab === 'variant_attributes' && <VariantAttributesTab />}
        {activeTab === 'variant_attribute_values' && <VariantAttributeValuesTab />}
        {activeTab === 'product_variants_v2' && <ProductVariantsV2Tab />}
      </div>
    </div>
  );
}

function WorkersTab() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [editing, setEditing] = useState<Worker | null>(null);
  const [name, setName] = useState('');
  const [orderIndex, setOrderIndex] = useState('0');
  const [active, setActive] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authWorker, setAuthWorker] = useState<Worker | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    const { data } = await supabase.from('workers').select('*').order('order_index');
    if (data) setWorkers(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editing) {
        // @ts-ignore
        const { error } = await supabase
          .from('workers')
          .update({
            name,
            order_index: parseInt(orderIndex),
            active
          })
          .eq('worker_id', editing.worker_id);
        if (error) throw error;
      } else {
        // @ts-ignore
        const { error } = await supabase
          .from('workers')
          .insert({
            name,
            order_index: parseInt(orderIndex),
            active
          });
        if (error) throw error;
      }

      setName('');
      setOrderIndex('0');
      setActive(true);
      setEditing(null);
      fetchWorkers();
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました');
    }
  };

  const handleEdit = (worker: Worker) => {
    setEditing(worker);
    setName(worker.name);
    setOrderIndex(worker.order_index.toString());
    setActive(worker.active);
  };

  const handleCancel = () => {
    setEditing(null);
    setName('');
    setOrderIndex('0');
    setActive(true);
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!confirm(`作業者「${editing.name}」を削除しますか？`)) return;

    try {
      const { error } = await supabase
        .from('workers')
        .delete()
        .eq('worker_id', editing.worker_id);

      if (error) throw error;

      alert('削除しました');
      handleCancel();
      fetchWorkers();
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  const handleSetupAuth = (worker: Worker) => {
    setAuthWorker(worker);
    setEmail(worker.email || '');
    setPassword('');
    setShowAuthModal(true);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!authWorker) return;

    try {
      // APIルートを呼び出してアカウントを作成
      const response = await fetch('/api/admin/create-worker-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workerId: authWorker.worker_id,
          email,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'アカウント作成に失敗しました');
      }

      alert('アカウントを設定しました');
      setShowAuthModal(false);
      setAuthWorker(null);
      setEmail('');
      setPassword('');
      fetchWorkers();
    } catch (error: any) {
      console.error('アカウント設定エラー:', error);
      alert(`アカウント設定に失敗しました: ${error.message}`);
    }
  };

  const handleAuthCancel = () => {
    setShowAuthModal(false);
    setAuthWorker(null);
    setEmail('');
    setPassword('');
  };

  return (
    <div className="space-y-6">
      {/* フォーム */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-medium mb-4">
          {editing ? '編集' : '新規作業者'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">名前</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
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

      {/* 一覧 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">名前</th>
              <th className="px-4 py-3 text-left">表示順</th>
              <th className="px-4 py-3 text-left">メールアドレス</th>
              <th className="px-4 py-3 text-left">認証</th>
              <th className="px-4 py-3 text-left">状態</th>
              <th className="px-4 py-3 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {workers.map((worker) => (
              <tr key={worker.worker_id}>
                <td className="px-4 py-3">{worker.name}</td>
                <td className="px-4 py-3">{worker.order_index}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {worker.email || '-'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      worker.is_authenticated
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {worker.is_authenticated ? 'ログイン可' : '未設定'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      worker.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {worker.active ? '有効' : '無効'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center space-x-2">
                  <button
                    onClick={() => handleEdit(worker)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    編集
                  </button>
                  {!worker.is_authenticated && (
                    <button
                      onClick={() => handleSetupAuth(worker)}
                      className="text-green-600 hover:text-green-800 text-sm"
                    >
                      アカウント設定
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* アカウント設定モーダル */}
      {showAuthModal && authWorker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium mb-4">
              ログインアカウント設定: {authWorker.name}
            </h3>
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border rounded px-3 py-2"
                  placeholder="worker@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  初期パスワード
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full border rounded px-3 py-2"
                  placeholder="6文字以上"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleAuthCancel}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  設定
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function PartsTab() {
  const [parts, setParts] = useState<Part[]>([]);
  const [editing, setEditing] = useState<Part | null>(null);
  const [name, setName] = useState('');
  const [orderIndex, setOrderIndex] = useState('0');
  const [active, setActive] = useState(true);

  useEffect(() => {
    fetchParts();
  }, []);

  const fetchParts = async () => {
    const { data } = await supabase.from('parts').select('*').order('order_index');
    if (data) setParts(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editing) {
        // @ts-ignore
        const { error } = await supabase
          .from('parts')
          .update({
            name,
            order_index: parseInt(orderIndex),
            active
          })
          .eq('part_id', editing.part_id);
        if (error) throw error;
      } else {
        // @ts-ignore
        const { error } = await supabase
          .from('parts')
          .insert({
            name,
            order_index: parseInt(orderIndex),
            active
          });
        if (error) throw error;
      }

      setName('');
      setOrderIndex('0');
      setActive(true);
      setEditing(null);
      fetchParts();
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました');
    }
  };

  const handleEdit = (part: Part) => {
    setEditing(part);
    setName(part.name);
    setOrderIndex(part.order_index.toString());
    setActive(part.active);
  };

  const handleCancel = () => {
    setEditing(null);
    setName('');
    setOrderIndex('0');
    setActive(true);
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!confirm(`部品「${editing.name}」を削除しますか？`)) return;

    try {
      const { error } = await supabase
        .from('parts')
        .delete()
        .eq('part_id', editing.part_id);

      if (error) throw error;

      alert('削除しました');
      handleCancel();
      fetchParts();
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  return (
    <div className="space-y-6">
      {/* フォーム */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-medium mb-4">
          {editing ? '編集' : '新規部品'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">名前</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
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

      {/* 一覧 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">名前</th>
              <th className="px-4 py-3 text-left">表示順</th>
              <th className="px-4 py-3 text-left">状態</th>
              <th className="px-4 py-3 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {parts.map((part) => (
              <tr key={part.part_id}>
                <td className="px-4 py-3">{part.name}</td>
                <td className="px-4 py-3">{part.order_index}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      part.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {part.active ? '有効' : '無効'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleEdit(part)}
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

function OperationsTab() {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [editing, setEditing] = useState<Operation | null>(null);
  const [partId, setPartId] = useState('');
  const [name, setName] = useState('');
  const [orderIndex, setOrderIndex] = useState('0');
  const [category, setCategory] = useState('');
  const [active, setActive] = useState(true);
  const [selectedPartFilter, setSelectedPartFilter] = useState<string>('all');
  const [attributes, setAttributes] = useState<any[]>([]);
  const [selectedAttributeIds, setSelectedAttributeIds] = useState<string[]>([]);
  const [consumesPreviousOperation, setConsumesPreviousOperation] = useState(true);
  const [consumptionQuantityPerUnit, setConsumptionQuantityPerUnit] = useState('1');
  const [inheritAttributes, setInheritAttributes] = useState(true);

  useEffect(() => {
    fetchParts();
    fetchOperations();
    fetchAttributes();
  }, []);

  const fetchParts = async () => {
    const { data } = await supabase.from('parts').select('*').order('order_index');
    if (data) setParts(data);
  };

  const fetchOperations = async () => {
    const { data } = await supabase.from('operations').select('*, parts(name)').order('order_index');
    if (data) setOperations(data as any);
  };

  const fetchAttributes = async () => {
    const { data } = await supabase.from('variant_attributes').select('*').eq('active', true).order('order_index');
    if (data) setAttributes(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let operationId = editing?.operation_id;

      // 数値変換（安全に）
      const consumptionQty = parseInt(consumptionQuantityPerUnit) || 1;

      if (editing) {
        // @ts-ignore
        const { error } = await supabase
          .from('operations')
          .update({
            part_id: partId,
            name,
            order_index: parseInt(orderIndex),
            category: category || null,
            active,
            consumes_previous_operation: consumesPreviousOperation,
            consumption_quantity_per_unit: consumptionQty,
            inherit_attributes: inheritAttributes,
          })
          .eq('operation_id', editing.operation_id);
        if (error) {
          console.error('Supabase更新エラー:', error);
          throw error;
        }
      } else {
        // @ts-ignore
        const { data, error } = await supabase
          .from('operations')
          .insert({
            part_id: partId,
            name,
            order_index: parseInt(orderIndex),
            category: category || null,
            active,
            consumes_previous_operation: consumesPreviousOperation,
            consumption_quantity_per_unit: consumptionQty,
            inherit_attributes: inheritAttributes,
          })
          .select()
          .single();
        if (error) {
          console.error('Supabase挿入エラー:', error);
          throw error;
        }
        operationId = data.operation_id;
      }

      // 属性の紐付けを更新
      if (operationId) {
        // 既存の紐付けを削除
        await supabase
          .from('operation_variant_attributes')
          .delete()
          .eq('operation_id', operationId);

        // 新しい紐付けを追加
        if (selectedAttributeIds.length > 0) {
          const inserts = selectedAttributeIds.map(attributeId => ({
            operation_id: operationId,
            attribute_id: attributeId,
          }));
          const { error: attrError } = await supabase
            .from('operation_variant_attributes')
            .insert(inserts);
          if (attrError) throw attrError;
        }
      }

      setPartId('');
      setName('');
      setOrderIndex('0');
      setCategory('');
      setActive(true);
      setSelectedAttributeIds([]);
      setConsumesPreviousOperation(false);
      setConsumptionQuantityPerUnit('1');
      setInheritAttributes(true);
      setEditing(null);
      fetchOperations();
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました');
    }
  };

  const handleEdit = async (operation: Operation) => {
    setEditing(operation);
    setPartId(operation.part_id);
    setName(operation.name);
    setOrderIndex(operation.order_index.toString());
    setCategory(operation.category || '');
    setActive(operation.active);
    setConsumesPreviousOperation(operation.consumes_previous_operation || false);
    setConsumptionQuantityPerUnit((operation.consumption_quantity_per_unit || 1).toString());
    setInheritAttributes(operation.inherit_attributes !== false);

    // この工程に紐付いている属性を取得
    const { data: operationAttrs } = await supabase
      .from('operation_variant_attributes')
      .select('attribute_id')
      .eq('operation_id', operation.operation_id);

    if (operationAttrs) {
      setSelectedAttributeIds(operationAttrs.map(a => a.attribute_id));
    } else {
      setSelectedAttributeIds([]);
    }
  };

  const handleCancel = () => {
    setEditing(null);
    setPartId('');
    setName('');
    setOrderIndex('0');
    setCategory('');
    setActive(true);
    setSelectedAttributeIds([]);
    setConsumesPreviousOperation(true);
    setConsumptionQuantityPerUnit('1');
    setInheritAttributes(true);
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!confirm(`工程「${editing.name}」を削除しますか？`)) return;

    try {
      const { error } = await supabase
        .from('operations')
        .delete()
        .eq('operation_id', editing.operation_id);

      if (error) throw error;

      alert('削除しました');
      handleCancel();
      fetchOperations();
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  const getPartName = (partId: string) => {
    return parts.find((p) => p.part_id === partId)?.name || '';
  };

  // フィルタリングされた工程リスト
  const filteredOperations = selectedPartFilter === 'all'
    ? operations
    : operations.filter((op) => op.part_id === selectedPartFilter);

  // 部品ごとの工程数を計算
  const getOperationCountByPart = (partId: string) => {
    return operations.filter((op) => op.part_id === partId).length;
  };

  return (
    <div className="space-y-6">
      {/* フォーム */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-medium mb-4">
          {editing ? '編集' : '新規工程'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm mb-1">部品</label>
              <select
                value={partId}
                onChange={(e) => setPartId(e.target.value)}
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
              <label className="block text-sm mb-1">工程名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
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
            <div>
              <label className="block text-sm mb-1">カテゴリ</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">なし</option>
                <option value="加工">加工</option>
                <option value="組立">組立</option>
                <option value="仕上">仕上</option>
                <option value="付帯">付帯</option>
              </select>
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

          {/* 前工程在庫消費設定 */}
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">前工程在庫消費設定</h4>
            <div className="space-y-3">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={consumesPreviousOperation}
                  onChange={(e) => setConsumesPreviousOperation(e.target.checked)}
                  className="mt-1 mr-2"
                />
                <div>
                  <span className="text-sm font-medium">前工程在庫を消費する</span>
                  <p className="text-xs text-gray-600 mt-1">
                    この工程で作業を記録すると、前工程の在庫が自動的に減ります<br />
                    例: 「皮はり」で5個作成 → 「帯鋸整形」の在庫が5個減る
                  </p>
                </div>
              </label>

              {consumesPreviousOperation && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      1個あたりの消費数量
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={consumptionQuantityPerUnit}
                      onChange={(e) => setConsumptionQuantityPerUnit(e.target.value)}
                      className="w-32 border rounded px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      通常は「1」のままで問題ありません
                    </p>
                  </div>

                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={inheritAttributes}
                      onChange={(e) => setInheritAttributes(e.target.checked)}
                      className="mt-1 mr-2"
                    />
                    <div>
                      <span className="text-sm font-medium">属性値を引き継ぐ</span>
                      <p className="text-xs text-gray-600 mt-1">
                        ONの場合、同じ属性値の在庫のみ消費します<br />
                        例: 「通常版」で作業 → 「通常版」の在庫のみ減る
                      </p>
                    </div>
                  </label>
                </>
              )}
            </div>
          </div>

          {/* 属性選択 */}
          {attributes.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">
                使用する属性（この工程で記録する属性を選択）
              </label>
              <div className="bg-gray-50 p-3 rounded border flex flex-wrap gap-3">
                {attributes.map((attr) => (
                  <label key={attr.attribute_id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedAttributeIds.includes(attr.attribute_id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAttributeIds([...selectedAttributeIds, attr.attribute_id]);
                        } else {
                          setSelectedAttributeIds(selectedAttributeIds.filter(id => id !== attr.attribute_id));
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">{attr.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                例: 「皮はり」工程では「皮デザイン」属性を選択すると、作業記録時に皮デザインを選択できます
              </p>
            </div>
          )}

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

      {/* 部品フィルタタブ */}
      <div className="bg-white border-b">
        <div className="flex overflow-x-auto">
          <button
            onClick={() => setSelectedPartFilter('all')}
            className={`py-3 px-4 border-b-2 text-sm font-medium whitespace-nowrap ${
              selectedPartFilter === 'all'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            すべて ({operations.length})
          </button>
          {parts.map((part) => (
            <button
              key={part.part_id}
              onClick={() => setSelectedPartFilter(part.part_id)}
              className={`py-3 px-4 border-b-2 text-sm font-medium whitespace-nowrap ${
                selectedPartFilter === part.part_id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              {part.name} ({getOperationCountByPart(part.part_id)})
            </button>
          ))}
        </div>
      </div>

      {/* 一覧 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">部品</th>
              <th className="px-4 py-3 text-left">工程名</th>
              <th className="px-4 py-3 text-left">表示順</th>
              <th className="px-4 py-3 text-left">カテゴリ</th>
              <th className="px-4 py-3 text-left">状態</th>
              <th className="px-4 py-3 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredOperations.map((operation: any) => {
              const partName = operation.parts?.name || getPartName(operation.part_id);
              // 部品ごとの色を定義
              const partColors: Record<string, string> = {
                '棹': 'bg-blue-100 text-blue-800',
                '胴': 'bg-green-100 text-green-800',
                '糸巻き': 'bg-purple-100 text-purple-800',
              };
              const partColorClass = partColors[partName] || 'bg-gray-100 text-gray-800';

              return (
                <tr key={operation.operation_id}>
                  <td className="px-4 py-3">{partName}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${partColorClass}`}>
                        {partName}
                      </span>
                      <span>{operation.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{operation.order_index}</td>
                  <td className="px-4 py-3">{operation.category || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        operation.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {operation.active ? '有効' : '無効'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleEdit(operation)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      編集
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
