import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">管理画面</h1>
            <Link
              href="/"
              className="text-sm text-blue-600 hover:underline"
            >
              入力画面へ戻る
            </Link>
          </div>
        </div>
      </header>

      {/* ナビゲーション */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            <Link
              href="/admin"
              className="py-4 px-2 border-b-2 border-transparent hover:border-blue-500 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              実績一覧
            </Link>
            <Link
              href="/admin/charts"
              className="py-4 px-2 border-b-2 border-transparent hover:border-blue-500 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              グラフ
            </Link>
            <Link
              href="/admin/inventory"
              className="py-4 px-2 border-b-2 border-transparent hover:border-blue-500 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              在庫状況
            </Link>
            <Link
              href="/admin/masters"
              className="py-4 px-2 border-b-2 border-transparent hover:border-blue-500 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              マスタ管理
            </Link>
          </div>
        </div>
      </nav>

      {/* コンテンツ */}
      <main className="max-w-7xl mx-auto px-4 py-8 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
