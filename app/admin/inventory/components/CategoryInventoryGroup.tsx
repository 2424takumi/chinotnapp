/**
 * CategoryInventoryGroup Component
 *
 * ## Purpose
 * Display inventory grouped by category (e.g., 胴, 棹, etc.)
 *
 * ## Performance Optimization
 * - Wrapped with React.memo to prevent unnecessary re-renders
 * - Only re-renders when category data changes
 * - Part of Phase 2: Performance Improvements
 */

import { memo } from 'react';
import type { PartInventory, VariantInventory } from '@/lib/utils/inventoryCalculator';
import PartInventoryGroup from './PartInventoryGroup';

interface CategoryInventoryGroupProps {
  categoryName: string;
  parts: PartInventory[];
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

const CategoryInventoryGroup = memo<CategoryInventoryGroupProps>(
  ({ categoryName, parts, onOpenModal, onOpenDetailModal, getShamisen組Count }) => {
    if (parts.length === 0) {
      return null;
    }

    return (
      <div className="bg-gray-100 rounded-lg p-3 md:p-6 shadow-sm">
        <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-3 md:mb-4 text-balance">
          【{categoryName}】
        </h2>

        {parts.map((partData) => (
          <PartInventoryGroup
            key={partData.part_id}
            partData={partData}
            onOpenModal={onOpenModal}
            onOpenDetailModal={onOpenDetailModal}
            getShamisen組Count={getShamisen組Count}
          />
        ))}
      </div>
    );
  }
);

CategoryInventoryGroup.displayName = 'CategoryInventoryGroup';

export default CategoryInventoryGroup;
