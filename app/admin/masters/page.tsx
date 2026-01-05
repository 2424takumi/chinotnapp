'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Worker, Part, Operation, Database } from '@/lib/types/database';

export default function MastersPage() {
  const [activeTab, setActiveTab] = useState<'workers' | 'parts' | 'operations'>('workers');

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">マスタ管理</h2>

      {/* タブ */}
      <div className="border-b">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('workers')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'workers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            作業者
          </button>
          <button
            onClick={() => setActiveTab('parts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'parts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            部品
          </button>
          <button
            onClick={() => setActiveTab('operations')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'operations'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            工程
          </button>
        </div>
      </div>

      {/* タブコンテンツ */}
      <div>
        {activeTab === 'workers' && <WorkersTab />}
        {activeTab === 'parts' && <PartsTab />}
        {activeTab === 'operations' && <OperationsTab />}
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
              <th className="px-4 py-3 text-left">状態</th>
              <th className="px-4 py-3 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {workers.map((worker) => (
              <tr key={worker.worker_id}>
                <td className="px-4 py-3">{worker.name}</td>
                <td className="px-4 py-3">{worker.order_index}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      worker.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {worker.active ? '有効' : '無効'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleEdit(worker)}
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
            {operations.map((operation: any) => (
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
