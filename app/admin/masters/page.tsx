'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  Worker,
  Part,
  Operation,
  SkinDesign,
  ProductVariant,
  Database
} from '@/lib/types/database';
import { VariantAttributesTab, VariantAttributeValuesTab, ProductVariantsV2Tab } from './variant-tabs';

export default function MastersPage() {
  const [activeTab, setActiveTab] = useState<'workers' | 'parts' | 'operations' | 'skin_designs' | 'variant_attributes' | 'variant_attribute_values' | 'product_variants_v2'>('workers');

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
            onClick={() => setActiveTab('skin_designs')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'skin_designs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            皮デザイン
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
        {activeTab === 'skin_designs' && <SkinDesignsTab />}
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
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
              >
                キャンセル
              </button>
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
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
              >
                キャンセル
              </button>
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

  useEffect(() => {
    fetchParts();
    fetchOperations();
  }, []);

  const fetchParts = async () => {
    const { data } = await supabase.from('parts').select('*').order('order_index');
    if (data) setParts(data);
  };

  const fetchOperations = async () => {
    const { data } = await supabase.from('operations').select('*, parts(name)').order('order_index');
    if (data) setOperations(data as any);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
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
          })
          .eq('operation_id', editing.operation_id);
        if (error) throw error;
      } else {
        // @ts-ignore
        const { error } = await supabase
          .from('operations')
          .insert({
            part_id: partId,
            name,
            order_index: parseInt(orderIndex),
            category: category || null,
            active,
          });
        if (error) throw error;
      }

      setPartId('');
      setName('');
      setOrderIndex('0');
      setCategory('');
      setActive(true);
      setEditing(null);
      fetchOperations();
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました');
    }
  };

  const handleEdit = (operation: Operation) => {
    setEditing(operation);
    setPartId(operation.part_id);
    setName(operation.name);
    setOrderIndex(operation.order_index.toString());
    setCategory(operation.category || '');
    setActive(operation.active);
  };

  const handleCancel = () => {
    setEditing(null);
    setPartId('');
    setName('');
    setOrderIndex('0');
    setCategory('');
    setActive(true);
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
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {editing ? '更新' : '追加'}
            </button>
            {editing && (
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
              >
                キャンセル
              </button>
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
            {filteredOperations.map((operation: any) => (
              <tr key={operation.operation_id}>
                <td className="px-4 py-3">{operation.parts?.name || getPartName(operation.part_id)}</td>
                <td className="px-4 py-3">{operation.name}</td>
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SkinDesignsTab() {
  const [designs, setDesigns] = useState<SkinDesign[]>([]);
  const [editing, setEditing] = useState<SkinDesign | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [orderIndex, setOrderIndex] = useState('0');
  const [active, setActive] = useState(true);

  useEffect(() => {
    fetchDesigns();
  }, []);

  const fetchDesigns = async () => {
    const { data } = await supabase.from('skin_designs').select('*').order('order_index');
    if (data) setDesigns(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editing) {
        const { error } = await supabase
          .from('skin_designs')
          .update({
            name,
            description: description || null,
            order_index: parseInt(orderIndex),
            active
          })
          .eq('skin_design_id', editing.skin_design_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('skin_designs')
          .insert({
            name,
            description: description || null,
            order_index: parseInt(orderIndex),
            active
          });
        if (error) throw error;
      }

      setName('');
      setDescription('');
      setOrderIndex('0');
      setActive(true);
      setEditing(null);
      fetchDesigns();
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました');
    }
  };

  const handleEdit = (design: SkinDesign) => {
    setEditing(design);
    setName(design.name);
    setDescription(design.description || '');
    setOrderIndex(design.order_index.toString());
    setActive(design.active);
  };

  const handleCancel = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setOrderIndex('0');
    setActive(true);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-medium mb-4">
          {editing ? '編集' : '新規皮デザイン'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {editing ? '更新' : '追加'}
            </button>
            {editing && (
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
              >
                キャンセル
              </button>
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
            {designs.map((design) => (
              <tr key={design.skin_design_id}>
                <td className="px-4 py-3">{design.name}</td>
                <td className="px-4 py-3">{design.description || '—'}</td>
                <td className="px-4 py-3">{design.order_index}</td>
                <td className="px-4 py-3">
                  <span className={'px-2 py-1 rounded text-xs ' + (design.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')}>
                    {design.active ? '有効' : '無効'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleEdit(design)}
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

function ProductVariantsTab() {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [designs, setDesigns] = useState<SkinDesign[]>([]);
  const [editing, setEditing] = useState<ProductVariant | null>(null);
  const [basePartId, setBasePartId] = useState('');
  const [skinDesignId, setSkinDesignId] = useState('');
  const [variantCode, setVariantCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [orderIndex, setOrderIndex] = useState('0');
  const [active, setActive] = useState(true);

  useEffect(() => {
    fetchParts();
    fetchDesigns();
    fetchVariants();
  }, []);

  const fetchParts = async () => {
    const { data } = await supabase.from('parts').select('*').order('order_index');
    if (data) setParts(data);
  };

  const fetchDesigns = async () => {
    const { data } = await supabase.from('skin_designs').select('*').order('order_index');
    if (data) setDesigns(data);
  };

  const fetchVariants = async () => {
    const { data} = await supabase
      .from('product_variants')
      .select('*, parts(name), skin_designs(name)')
      .order('order_index');
    if (data) setVariants(data as any);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editing) {
        const { error } = await supabase
          .from('product_variants')
          .update({
            base_part_id: basePartId,
            skin_design_id: skinDesignId || null,
            variant_code: variantCode,
            display_name: displayName,
            description: description || null,
            order_index: parseInt(orderIndex),
            active
          })
          .eq('variant_id', editing.variant_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('product_variants')
          .insert({
            base_part_id: basePartId,
            skin_design_id: skinDesignId || null,
            variant_code: variantCode,
            display_name: displayName,
            description: description || null,
            order_index: parseInt(orderIndex),
            active
          });
        if (error) throw error;
      }

      setBasePartId('');
      setSkinDesignId('');
      setVariantCode('');
      setDisplayName('');
      setDescription('');
      setOrderIndex('0');
      setActive(true);
      setEditing(null);
      fetchVariants();
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました');
    }
  };

  const handleEdit = (variant: ProductVariant) => {
    setEditing(variant);
    setBasePartId(variant.base_part_id);
    setSkinDesignId(variant.skin_design_id || '');
    setVariantCode(variant.variant_code);
    setDisplayName(variant.display_name);
    setDescription(variant.description || '');
    setOrderIndex(variant.order_index.toString());
    setActive(variant.active);
  };

  const handleCancel = () => {
    setEditing(null);
    setBasePartId('');
    setSkinDesignId('');
    setVariantCode('');
    setDisplayName('');
    setDescription('');
    setOrderIndex('0');
    setActive(true);
  };

  const getPartName = (partId: string) => {
    return parts.find((p) => p.part_id === partId)?.name || '';
  };

  const getDesignName = (designId: string | null) => {
    if (!designId) return '—';
    return designs.find((d) => d.skin_design_id === designId)?.name || '';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-medium mb-4">
          {editing ? '編集' : '新規商品バリエーション'}
        </h3>
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
              <label className="block text-sm mb-1">皮デザイン</label>
              <select
                value={skinDesignId}
                onChange={(e) => setSkinDesignId(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">なし</option>
                {designs.map((design) => (
                  <option key={design.skin_design_id} value={design.skin_design_id}>
                    {design.name}
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
                placeholder="例: DOU-HANA-001"
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
                placeholder="例: 胴（花柄）"
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
          </div>
          <div className="flex items-center gap-4">
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
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {editing ? '更新' : '追加'}
            </button>
            {editing && (
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
              >
                キャンセル
              </button>
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
              <th className="px-4 py-3 text-left">皮デザイン</th>
              <th className="px-4 py-3 text-left">説明</th>
              <th className="px-4 py-3 text-left">表示順</th>
              <th className="px-4 py-3 text-left">状態</th>
              <th className="px-4 py-3 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {variants.map((variant: any) => (
              <tr key={variant.variant_id}>
                <td className="px-4 py-3">{variant.variant_code}</td>
                <td className="px-4 py-3">{variant.display_name}</td>
                <td className="px-4 py-3">{variant.parts?.name || getPartName(variant.base_part_id)}</td>
                <td className="px-4 py-3">{variant.skin_designs?.name || getDesignName(variant.skin_design_id)}</td>
                <td className="px-4 py-3">{variant.description || '—'}</td>
                <td className="px-4 py-3">{variant.order_index}</td>
                <td className="px-4 py-3">
                  <span className={'px-2 py-1 rounded text-xs ' + (variant.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')}>
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
