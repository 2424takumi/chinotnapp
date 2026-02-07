/**
 * Inventory System Type Definitions
 *
 * ## Purpose
 * Extended type definitions for inventory management
 * Replaces 'any' types with proper TypeScript interfaces
 *
 * ## Part of
 * Phase 3: Code Quality Improvements
 */

import type {
  WorkLog,
  InventoryAdjustment,
  OperationVariantAttribute,
  VariantAttribute,
  VariantAttributeValue,
  ProcessConsumption,
  BOMConsumption,
  BOM,
} from './database';

// ========================================
// Extended Work Log Types
// ========================================

/**
 * Work log attribute with nested relations
 */
export interface WorkLogAttributeNested {
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

/**
 * Work log with nested attributes (from Supabase query)
 */
export interface WorkLogWithAttributes extends WorkLog {
  work_log_attributes?: WorkLogAttributeNested[];
}

// ========================================
// Extended Inventory Adjustment Types
// ========================================

/**
 * Inventory adjustment attribute with nested relations
 */
export interface InventoryAdjustmentAttributeNested {
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

/**
 * Inventory adjustment with nested attributes (from Supabase query)
 */
export interface InventoryAdjustmentWithAttributes extends InventoryAdjustment {
  inventory_adjustment_attributes?: InventoryAdjustmentAttributeNested[];
}

// ========================================
// Order Inventory Consumption Types
// ========================================

/**
 * Order inventory consumption record
 * Tracks inventory consumed when orders are completed
 */
export interface OrderInventoryConsumption {
  consumption_id: string;
  order_id: string;
  operation_id: string;
  consumed_quantity: number;
  consumed_attribute_values?: Record<string, string>;
  is_deleted: boolean;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string | null;
}

// ========================================
// Process Consumption Extended Types
// ========================================

/**
 * Process consumption with attribute values
 */
export interface ProcessConsumptionWithAttributes extends ProcessConsumption {
  consumed_attribute_values?: Record<string, string>;
}

// ========================================
// Aggregated Types for State Management
// ========================================

/**
 * All operation attributes data
 */
export type OperationAttributeData = OperationVariantAttribute;

/**
 * All variant attributes data
 */
export type VariantAttributeData = VariantAttribute;

/**
 * All variant attribute values data
 */
export type VariantAttributeValueData = VariantAttributeValue;

/**
 * BOM data type
 */
export type BOMData = BOM;

/**
 * BOM consumption data type
 */
export type BOMConsumptionData = BOMConsumption;

// ========================================
// Utility Types
// ========================================

/**
 * Attribute value combination for variant inventory
 */
export interface AttributeValueCombination {
  valueIds: string[];
  valueName: string;
  inventory: number;
}

/**
 * Variant inventory entry
 */
export interface VariantInventoryEntry {
  variant_id: string;
  variant_name: string;
  inventory: number;
}

/**
 * Operation inventory entry
 */
export interface OperationInventoryEntry {
  operation_id: string;
  operation_name: string;
  order_index: number;
  inventory: number;
  variants?: VariantInventoryEntry[];
}

/**
 * Part inventory summary
 */
export interface PartInventorySummary {
  part_id: string;
  part_name: string;
  operations: OperationInventoryEntry[];
}
