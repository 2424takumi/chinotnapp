/**
 * PartInventoryGroup Component
 *
 * ## Purpose
 * Display all operations for a single part with add inventory button
 *
 * ## Performance Optimization
 * - Wrapped with React.memo to prevent unnecessary re-renders
 * - Only re-renders when part data changes
 * - Part of Phase 2: Performance Improvements
 */

import { memo } from 'react';
import type { PartInventory, VariantInventory } from '@/lib/utils/inventoryCalculator';
import InventoryCard from './InventoryCard';

interface PartInventoryGroupProps {
  partData: PartInventory;
  onOpenModal: (partId: string) => void;
  onOpenDetailModal: (
    partId: string,
    partName: string,
    operationId: string,
    operationName: string,
    inventory: number,
    variants?: VariantInventory[]
  ) => void;
  getShamisen組Count: (
    partId: string,
    inventory: number
  ) => {
    count: number;
    remainder: number;
    unit: string;
    unitCount: number;
  } | null;
}

const PartInventoryGroup = memo<PartInventoryGroupProps>(
  ({ partData, onOpenModal, onOpenDetailModal, getShamisen組Count }) => {
    return (
      <div className="mb-6 last:mb-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-700 text-balance">
            {partData.part_name}
          </h3>
          <button
            onClick={() => onOpenModal(partData.part_id)}
            className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700 transition-colors"
          >
            + 在庫追加
          </button>
        </div>

        {partData.operations.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3">
            {partData.operations.map((op) => {
              const shamisenInfo = getShamisen組Count(partData.part_id, op.inventory);
              return (
                <InventoryCard
                  key={op.operation_id}
                  operationId={op.operation_id}
                  operationName={op.operation_name}
                  inventory={op.inventory}
                  variants={op.variants}
                  shamisenInfo={shamisenInfo}
                  onCardClick={(opId, opName, inv, vars) =>
                    onOpenDetailModal(partData.part_id, partData.part_name, opId, opName, inv, vars)
                  }
                />
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-gray-500 bg-white rounded-lg p-4 border-2 border-dashed border-gray-300">
            現在、在庫がありません
          </div>
        )}
      </div>
    );
  }
);

PartInventoryGroup.displayName = 'PartInventoryGroup';

export default PartInventoryGroup;
