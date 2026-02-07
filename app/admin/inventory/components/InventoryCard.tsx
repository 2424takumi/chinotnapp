/**
 * InventoryCard Component
 *
 * ## Purpose
 * Display inventory count for a specific operation with variant details
 *
 * ## Performance Optimization
 * - Wrapped with React.memo to prevent unnecessary re-renders
 * - Only re-renders when props change
 * - Part of Phase 2: Performance Improvements
 */

import { memo } from 'react';
import type { VariantInventory } from '@/lib/utils/inventoryCalculator';

interface InventoryCardProps {
  operationId: string;
  operationName: string;
  inventory: number;
  variants?: VariantInventory[];
  shamisenInfo: {
    count: number;
    remainder: number;
    unit: string;
    unitCount: number;
  } | null;
  onCardClick: (operationId: string, operationName: string, inventory: number, variants?: VariantInventory[]) => void;
}

/**
 * Get color class for variant value based on name patterns
 */
function getVariantColor(valueName: string): string {
  if (valueName.includes('島村')) {
    return 'bg-blue-100 text-blue-700';
  } else if (valueName.includes('通常')) {
    return 'bg-emerald-100 text-emerald-700';
  } else if (valueName.includes('赤富士')) {
    return 'bg-rose-100 text-rose-700';
  } else if (valueName.includes('花柄')) {
    return 'bg-purple-100 text-purple-700';
  } else if (valueName.includes('ウォルナット')) {
    return 'bg-amber-100 text-amber-700';
  } else if (valueName.includes('楓')) {
    return 'bg-yellow-100 text-yellow-700';
  } else if (valueName.includes('欅')) {
    return 'bg-orange-100 text-orange-700';
  }
  return 'bg-gray-100 text-gray-700';
}

const InventoryCard = memo<InventoryCardProps>(({
  operationId,
  operationName,
  inventory,
  variants,
  shamisenInfo,
  onCardClick,
}) => {
  return (
    <div
      key={operationId}
      onClick={() => onCardClick(operationId, operationName, inventory, variants)}
      className="bg-white rounded-lg border-2 border-gray-300 p-2 md:p-3 shadow hover:shadow-md transition-shadow cursor-pointer hover:border-blue-400"
    >
      <div className="text-xs text-gray-600 mb-1">
        {operationName}
      </div>

      {/* バリアントがある場合は全体の個数を小さく表示 */}
      {variants && variants.length > 0 ? (
        <>
          <div className="text-xs text-gray-400 mb-2 tabular-nums">
            合計: {inventory}個
          </div>
          <div className="space-y-2">
            {variants.map(v => {
              const tags: { text: string; color: string }[] = [];
              const attributePairs = v.variant_name.split(',').map(pair => pair.trim());

              attributePairs.forEach(pair => {
                const [attrName, valueName] = pair.split(':').map(s => s.trim());
                if (valueName) {
                  const color = getVariantColor(valueName);
                  tags.push({ text: valueName, color });
                }
              });

              return (
                <div key={v.variant_id} className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1 flex-1">
                    {tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className={`text-xs px-2 py-0.5 rounded ${tag.color}`}
                      >
                        {tag.text}
                      </span>
                    ))}
                  </div>
                  <span className="text-sm font-bold text-gray-800 ml-2 tabular-nums">
                    {v.inventory}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="text-2xl font-bold text-blue-600 mb-1 tabular-nums">
            {inventory}
          </div>
          {shamisenInfo && (
            <div className="text-xs text-gray-500 tabular-nums">
              {shamisenInfo.count}
              {shamisenInfo.unit}
              {shamisenInfo.remainder > 0 && ` + ${shamisenInfo.remainder}個`}
            </div>
          )}
        </>
      )}
    </div>
  );
});

InventoryCard.displayName = 'InventoryCard';

export default InventoryCard;
