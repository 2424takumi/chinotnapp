/**
 * Optimized Inventory Calculator
 *
 * ## Performance Optimization
 * - Complexity: O(n³) → O(n)
 * - Uses Map-based indexing instead of nested array.filter() calls
 * - Pre-computes aggregations for constant-time lookups
 *
 * ## Algorithm
 * 1. Build index maps in O(n) time
 * 2. Calculate totals using map lookups in O(1) per operation
 * 3. Group variant data using Map for efficient aggregation
 *
 * @see /app/admin/inventory/page.tsx:185-431 (original implementation)
 */

import type { Part, Operation } from '@/lib/types/database';

// ========================================
// Type Definitions
// ========================================

export interface WorkLog {
  log_id: string;
  worker_id: string;
  part_id: string;
  operation_id: string;
  duration_minutes: number;
  quantity: number;
  loss_quantity: number;
  note: string | null;
  is_deleted: boolean;
  variant_id: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  work_log_attributes?: WorkLogAttribute[];
}

export interface WorkLogAttribute {
  value_id: string;
  variant_attribute_values?: {
    value_id: string;
    name: string;
    attribute_id: string;
    variant_attributes?: {
      attribute_id: string;
      name: string;
    };
  };
}

export interface InventoryAdjustment {
  adjustment_id: string;
  operation_id: string;
  adjustment_quantity: number;
  inventory_adjustment_attributes?: InventoryAdjustmentAttribute[];
}

export interface InventoryAdjustmentAttribute {
  value_id: string;
  variant_attribute_values?: {
    value_id: string;
    name: string;
    attribute_id: string;
    variant_attributes?: {
      attribute_id: string;
      name: string;
    };
  };
}

export interface BomConsumption {
  consumed_part_id: string;
  consumed_quantity: number;
}

export interface ProcessConsumption {
  consumed_operation_id: string;
  consumed_quantity: number;
  consumed_attribute_values?: Record<string, string>;
}

export interface OrderConsumption {
  operation_id: string;
  consumed_quantity: number;
  consumed_attribute_values?: Record<string, string>;
}

export interface OperationAttribute {
  operation_id: string;
  attribute_id: string;
}

export interface ProductVariant {
  variant_id: string;
  base_part_id: string;
  display_name: string;
}

export interface VariantInventory {
  variant_id: string;
  variant_name: string;
  inventory: number;
}

export interface OperationInventory {
  operation_id: string;
  operation_name: string;
  order_index: number;
  inventory: number;
  variants?: VariantInventory[];
}

export interface PartInventory {
  part_id: string;
  part_name: string;
  operations: OperationInventory[];
}

// ========================================
// Index Map Types
// ========================================

interface OperationTotal {
  operation_id: string;
  operation_name: string;
  order_index: number;
  goodTotal: number;
  totalQuantity: number;
}

// ========================================
// Inventory Calculator Class
// ========================================

export class InventoryCalculator {
  // Pre-computed index maps for O(1) lookups
  private logsByOperation: Map<string, WorkLog[]>;
  private adjustmentsByOperation: Map<string, InventoryAdjustment[]>;
  private consumptionsByPart: Map<string, number>;
  private processConsumptionsByOperation: Map<string, ProcessConsumption[]>;
  private orderConsumptionsByOperation: Map<string, OrderConsumption[]>;
  private operationsByPart: Map<string, Operation[]>;
  private variantsByPart: Map<string, ProductVariant[]>;
  private operationAttributesByOperation: Map<string, OperationAttribute[]>;

  constructor(
    private logs: WorkLog[],
    private adjustments: InventoryAdjustment[],
    private bomConsumptions: BomConsumption[],
    private processConsumptions: ProcessConsumption[],
    private orderConsumptions: OrderConsumption[],
    private operations: Operation[],
    private variants: ProductVariant[],
    private operationAttributes: OperationAttribute[]
  ) {
    // Build all index maps once during construction (O(n) total)
    this.logsByOperation = this.buildLogIndex();
    this.adjustmentsByOperation = this.buildAdjustmentIndex();
    this.consumptionsByPart = this.buildConsumptionIndex();
    this.processConsumptionsByOperation = this.buildProcessConsumptionIndex();
    this.orderConsumptionsByOperation = this.buildOrderConsumptionIndex();
    this.operationsByPart = this.buildOperationIndex();
    this.variantsByPart = this.buildVariantIndex();
    this.operationAttributesByOperation = this.buildOperationAttributeIndex();
  }

  // ========================================
  // Index Building Methods (O(n) each)
  // ========================================

  private buildLogIndex(): Map<string, WorkLog[]> {
    const map = new Map<string, WorkLog[]>();
    for (const log of this.logs) {
      if (!map.has(log.operation_id)) {
        map.set(log.operation_id, []);
      }
      map.get(log.operation_id)!.push(log);
    }
    return map;
  }

  private buildAdjustmentIndex(): Map<string, InventoryAdjustment[]> {
    const map = new Map<string, InventoryAdjustment[]>();
    for (const adj of this.adjustments) {
      if (!map.has(adj.operation_id)) {
        map.set(adj.operation_id, []);
      }
      map.get(adj.operation_id)!.push(adj);
    }
    return map;
  }

  private buildConsumptionIndex(): Map<string, number> {
    const map = new Map<string, number>();
    for (const cons of this.bomConsumptions) {
      const current = map.get(cons.consumed_part_id) || 0;
      map.set(cons.consumed_part_id, current + cons.consumed_quantity);
    }
    return map;
  }

  private buildProcessConsumptionIndex(): Map<string, ProcessConsumption[]> {
    const map = new Map<string, ProcessConsumption[]>();
    for (const cons of this.processConsumptions) {
      if (!map.has(cons.consumed_operation_id)) {
        map.set(cons.consumed_operation_id, []);
      }
      map.get(cons.consumed_operation_id)!.push(cons);
    }
    return map;
  }

  private buildOrderConsumptionIndex(): Map<string, OrderConsumption[]> {
    const map = new Map<string, OrderConsumption[]>();
    for (const cons of this.orderConsumptions) {
      if (!map.has(cons.operation_id)) {
        map.set(cons.operation_id, []);
      }
      map.get(cons.operation_id)!.push(cons);
    }
    return map;
  }

  private buildOperationIndex(): Map<string, Operation[]> {
    const map = new Map<string, Operation[]>();
    for (const op of this.operations) {
      if (!map.has(op.part_id)) {
        map.set(op.part_id, []);
      }
      map.get(op.part_id)!.push(op);
    }
    return map;
  }

  private buildVariantIndex(): Map<string, ProductVariant[]> {
    const map = new Map<string, ProductVariant[]>();
    for (const variant of this.variants) {
      if (!map.has(variant.base_part_id)) {
        map.set(variant.base_part_id, []);
      }
      map.get(variant.base_part_id)!.push(variant);
    }
    return map;
  }

  private buildOperationAttributeIndex(): Map<string, OperationAttribute[]> {
    const map = new Map<string, OperationAttribute[]>();
    for (const attr of this.operationAttributes) {
      if (!map.has(attr.operation_id)) {
        map.set(attr.operation_id, []);
      }
      map.get(attr.operation_id)!.push(attr);
    }
    return map;
  }

  // ========================================
  // Calculation Methods
  // ========================================

  /**
   * Calculate operation totals using pre-built indexes (O(1) per operation)
   */
  private calculateOperationTotals(partOperations: Operation[]): OperationTotal[] {
    return partOperations.map(op => {
      const opLogs = this.logsByOperation.get(op.operation_id) || [];

      const goodTotal = opLogs.reduce(
        (sum, log) => sum + (log.quantity - log.loss_quantity),
        0
      );

      const totalQuantity = opLogs.reduce(
        (sum, log) => sum + log.quantity,
        0
      );

      return {
        operation_id: op.operation_id,
        operation_name: op.name,
        order_index: op.order_index,
        goodTotal,
        totalQuantity,
      };
    });
  }

  /**
   * Calculate variant inventories using Map for efficient grouping
   */
  private calculateVariantInventories(
    operationId: string,
    partId: string
  ): VariantInventory[] {
    const opAttrs = this.operationAttributesByOperation.get(operationId) || [];

    if (opAttrs.length > 0) {
      // New system: attribute-based variants
      return this.calculateAttributeBasedVariants(operationId);
    } else {
      // Legacy system: old product_variants table
      return this.calculateLegacyVariants(operationId, partId);
    }
  }

  /**
   * Calculate attribute-based variant inventories
   */
  private calculateAttributeBasedVariants(operationId: string): VariantInventory[] {
    const combinationMap = new Map<string, { valueIds: string[]; valueName: string; inventory: number }>();

    // Aggregate work logs
    const opLogs = this.logsByOperation.get(operationId) || [];
    for (const log of opLogs) {
      this.processWorkLogForVariant(log, combinationMap);
    }

    // Aggregate adjustments
    const opAdjustments = this.adjustmentsByOperation.get(operationId) || [];
    for (const adj of opAdjustments) {
      this.processAdjustmentForVariant(adj, combinationMap);
    }

    // Aggregate process consumptions
    const opConsumptions = this.processConsumptionsByOperation.get(operationId) || [];
    for (const cons of opConsumptions) {
      this.processConsumptionForVariant(cons, combinationMap);
    }

    // Aggregate order consumptions
    const opOrderConsumptions = this.orderConsumptionsByOperation.get(operationId) || [];
    for (const cons of opOrderConsumptions) {
      this.processOrderConsumptionForVariant(cons, combinationMap);
    }

    // Convert Map to array and filter positive inventories
    return Array.from(combinationMap.entries())
      .filter(([_, data]) => data.inventory > 0)
      .map(([key, data]) => ({
        variant_id: key,
        variant_name: data.valueName,
        inventory: data.inventory,
      }));
  }

  /**
   * Process work log for variant calculation
   */
  private processWorkLogForVariant(
    log: WorkLog,
    combinationMap: Map<string, { valueIds: string[]; valueName: string; inventory: number }>
  ): void {
    if (!log.work_log_attributes || log.work_log_attributes.length === 0) {
      // Uncategorized
      const key = 'uncategorized';
      const existing = combinationMap.get(key) || { valueIds: [], valueName: '未分類', inventory: 0 };
      existing.inventory += (log.quantity - log.loss_quantity);
      combinationMap.set(key, existing);
    } else {
      // Categorized by attribute values
      const logValueIds = log.work_log_attributes
        .map(attr => attr.value_id)
        .filter(id => id)
        .sort();

      const key = logValueIds.join('|');

      if (!combinationMap.has(key)) {
        const valueNames = log.work_log_attributes
          .filter(attr => attr.variant_attribute_values)
          .map(attr => {
            const attrData = attr.variant_attribute_values!;
            return `${attrData.variant_attributes?.name || ''}:${attrData.name || ''}`;
          })
          .join(', ');

        combinationMap.set(key, {
          valueIds: logValueIds,
          valueName: valueNames || '不明',
          inventory: 0
        });
      }

      const existing = combinationMap.get(key)!;
      existing.inventory += (log.quantity - log.loss_quantity);
    }
  }

  /**
   * Process adjustment for variant calculation
   */
  private processAdjustmentForVariant(
    adj: InventoryAdjustment,
    combinationMap: Map<string, { valueIds: string[]; valueName: string; inventory: number }>
  ): void {
    if (!adj.inventory_adjustment_attributes || adj.inventory_adjustment_attributes.length === 0) {
      // Uncategorized
      const key = 'uncategorized';
      const existing = combinationMap.get(key) || { valueIds: [], valueName: '未分類', inventory: 0 };
      existing.inventory += adj.adjustment_quantity;
      combinationMap.set(key, existing);
    } else {
      // Categorized
      const adjValueIds = adj.inventory_adjustment_attributes
        .map(attr => attr.value_id)
        .filter(id => id)
        .sort();

      const key = adjValueIds.join('|');

      if (!combinationMap.has(key)) {
        const valueNames = adj.inventory_adjustment_attributes
          .filter(attr => attr.variant_attribute_values)
          .map(attr => {
            const attrData = attr.variant_attribute_values!;
            return `${attrData.variant_attributes?.name || ''}:${attrData.name || ''}`;
          })
          .join(', ');

        combinationMap.set(key, {
          valueIds: adjValueIds,
          valueName: valueNames || '不明',
          inventory: 0
        });
      }

      const existing = combinationMap.get(key)!;
      existing.inventory += adj.adjustment_quantity;
    }
  }

  /**
   * Process consumption for variant calculation
   */
  private processConsumptionForVariant(
    cons: ProcessConsumption,
    combinationMap: Map<string, { valueIds: string[]; valueName: string; inventory: number }>
  ): void {
    if (!cons.consumed_attribute_values || Object.keys(cons.consumed_attribute_values).length === 0) {
      // Uncategorized
      const key = 'uncategorized';
      const existing = combinationMap.get(key);
      if (existing) {
        existing.inventory -= cons.consumed_quantity;
      }
    } else {
      // Categorized
      const consValueIds = Object.values(cons.consumed_attribute_values)
        .filter(id => id)
        .sort();

      const key = consValueIds.join('|');
      const existing = combinationMap.get(key);
      if (existing) {
        existing.inventory -= cons.consumed_quantity;
      }
    }
  }

  /**
   * Process order consumption for variant calculation
   */
  private processOrderConsumptionForVariant(
    cons: OrderConsumption,
    combinationMap: Map<string, { valueIds: string[]; valueName: string; inventory: number }>
  ): void {
    if (!cons.consumed_attribute_values || Object.keys(cons.consumed_attribute_values).length === 0) {
      // Uncategorized
      const key = 'uncategorized';
      const existing = combinationMap.get(key);
      if (existing) {
        existing.inventory -= cons.consumed_quantity;
      }
    } else {
      // Categorized
      const consValueIds = Object.values(cons.consumed_attribute_values)
        .filter(id => id)
        .sort();

      const key = consValueIds.join('|');
      const existing = combinationMap.get(key);
      if (existing) {
        existing.inventory -= cons.consumed_quantity;
      }
    }
  }

  /**
   * Calculate legacy variant inventories (product_variants table)
   */
  private calculateLegacyVariants(operationId: string, partId: string): VariantInventory[] {
    const partVariants = this.variantsByPart.get(partId) || [];
    const opLogs = this.logsByOperation.get(operationId) || [];

    return partVariants
      .map(variant => {
        const variantLogs = opLogs.filter(
          log => log.variant_id === variant.variant_id
        );

        const variantGood = variantLogs.reduce(
          (sum, log) => sum + (log.quantity - log.loss_quantity),
          0
        );

        return {
          variant_id: variant.variant_id,
          variant_name: variant.display_name,
          inventory: variantGood,
        };
      })
      .filter(v => v.inventory > 0);
  }

  /**
   * Main calculation method: O(n) complexity
   */
  public calculate(parts: Part[]): PartInventory[] {
    const inventoryData: PartInventory[] = [];

    for (const part of parts) {
      // O(1) lookup instead of array.filter()
      const partOperations = this.operationsByPart.get(part.part_id) || [];

      // Calculate operation totals
      const operationTotals = this.calculateOperationTotals(partOperations);

      // Sort by order_index
      operationTotals.sort((a, b) => a.order_index - b.order_index);

      // Calculate inventories for each operation
      const operationInventories: OperationInventory[] = operationTotals.map((op, index) => {
        const nextOp = operationTotals[index + 1];

        // Base inventory: previous operation good - next operation total
        let inventory = nextOp ? op.goodTotal - nextOp.totalQuantity : op.goodTotal;

        // BOM consumption (only from final operation)
        if (!nextOp) {
          const consumed = this.consumptionsByPart.get(part.part_id) || 0;
          inventory -= consumed;
        }

        // Inventory adjustments
        const opAdjustments = this.adjustmentsByOperation.get(op.operation_id) || [];
        const adjustmentTotal = opAdjustments.reduce((sum, adj) => sum + adj.adjustment_quantity, 0);
        inventory += adjustmentTotal;

        // Order consumptions
        const opOrderConsumptions = this.orderConsumptionsByOperation.get(op.operation_id) || [];
        const orderConsumedTotal = opOrderConsumptions.reduce((sum, cons) => sum + cons.consumed_quantity, 0);
        inventory -= orderConsumedTotal;

        // Calculate variant inventories
        const variantInventories = this.calculateVariantInventories(op.operation_id, part.part_id);

        return {
          operation_id: op.operation_id,
          operation_name: op.operation_name,
          order_index: op.order_index,
          inventory,
          variants: variantInventories.length > 0 ? variantInventories : undefined,
        };
      });

      // Filter operations with inventory > 0, sort by order_index
      const inventoryOperations = operationInventories
        .filter(op => op.inventory > 0)
        .sort((a, b) => a.order_index - b.order_index);

      // Add all parts (even with empty operations)
      inventoryData.push({
        part_id: part.part_id,
        part_name: part.name,
        operations: inventoryOperations,
      });
    }

    return inventoryData;
  }
}

/**
 * Factory function for creating inventory calculator
 */
export function createInventoryCalculator(
  logs: WorkLog[],
  adjustments: InventoryAdjustment[],
  bomConsumptions: BomConsumption[],
  processConsumptions: ProcessConsumption[],
  orderConsumptions: OrderConsumption[],
  operations: Operation[],
  variants: ProductVariant[],
  operationAttributes: OperationAttribute[]
): InventoryCalculator {
  return new InventoryCalculator(
    logs,
    adjustments,
    bomConsumptions,
    processConsumptions,
    orderConsumptions,
    operations,
    variants,
    operationAttributes
  );
}
