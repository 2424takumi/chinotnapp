/**
 * Inventory State Management with useReducer
 *
 * ## Purpose
 * Centralize state management for inventory page
 * Replace 34 useState calls with single useReducer
 *
 * ## State Groups
 * 1. Data State - Database entities (parts, operations, logs, etc.)
 * 2. UI State - Modals, loading, selected items
 * 3. Form State - Input values, editing state
 * 4. Variant State - Variant-specific operations
 *
 * ## Performance Benefits
 * - Predictable state updates
 * - Reduced re-render complexity
 * - Better testability
 * - Type-safe actions
 *
 * Part of Phase 2: Performance Improvements (Task 2.5)
 */

import { useReducer, Dispatch } from 'react';
import type { Part, Operation, ProductVariant, Worker, InventoryAdjustment } from '@/lib/types/database';
import type { PartInventory, VariantInventory } from '@/lib/utils/inventoryCalculator';
import type {
  WorkLogWithAttributes,
  InventoryAdjustmentWithAttributes,
  OperationAttributeData,
  VariantAttributeData,
  VariantAttributeValueData,
  ProcessConsumptionWithAttributes,
  OrderInventoryConsumption,
  BOMConsumptionData,
  BOMData,
} from '@/lib/types/inventory';

// ========================================
// State Type Definitions
// ========================================

export interface InventoryState {
  // Data State - Database entities
  data: {
    parts: Part[];
    operations: Operation[];
    logs: WorkLogWithAttributes[];
    variants: ProductVariant[];
    workers: Worker[];
    adjustments: InventoryAdjustmentWithAttributes[];
    operationAttributes: OperationAttributeData[];
    variantAttributes: VariantAttributeData[];
    variantAttributeValues: VariantAttributeValueData[];
    processConsumptions: ProcessConsumptionWithAttributes[];
    orderConsumptions: OrderInventoryConsumption[];
    bomConsumptions: BOMConsumptionData[];
    bomData: BOMData[];
    inventory: PartInventory[];
  };

  // UI State - Modal and loading states
  ui: {
    loading: boolean;
    showModal: boolean;
    showDetailModal: boolean;
    saving: boolean;
  };

  // Selection State - Currently selected items
  selection: {
    selectedPartId: string | null;
    selectedOperationId: string | null;
    selectedInventoryDetail: {
      partId: string;
      partName: string;
      operationId: string;
      operationName: string;
      inventory: number;
      variants?: VariantInventory[];
    } | null;
  };

  // Form State - Input values
  form: {
    adjustmentQuantity: string;
    adjustmentNote: string;
    selectedAdjustmentAttributeValues: Record<string, string>;
  };

  // Edit State - Log editing
  edit: {
    editingLogId: string | null;
    editFormData: {
      quantity: number;
      loss_quantity: number;
      note: string;
    };
  };

  // Inventory Logs State - Detail modal data
  logs: {
    inventoryLogs: WorkLogWithAttributes[];
    inventoryAdjustmentLogs: InventoryAdjustmentWithAttributes[];
  };

  // Variant Operations State - Variant-specific quantities and status
  variantOps: {
    variantAdjustQty: Record<string, string>;
    variantMoveQty: Record<string, string>;
    adjusting: Record<string, boolean>;
    moving: Record<string, boolean>;
  };

  // Message State - Success/error messages
  message: {
    type: 'success' | 'error';
    text: string;
  } | null;
}

// ========================================
// Action Type Definitions
// ========================================

export type InventoryAction =
  // Data Actions
  | { type: 'SET_DATA'; payload: Partial<InventoryState['data']> }
  | { type: 'SET_INVENTORY'; payload: PartInventory[] }

  // UI Actions
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'OPEN_MODAL'; payload: string }
  | { type: 'CLOSE_MODAL' }
  | { type: 'OPEN_DETAIL_MODAL'; payload: InventoryState['selection']['selectedInventoryDetail'] }
  | { type: 'CLOSE_DETAIL_MODAL' }

  // Form Actions
  | { type: 'SET_ADJUSTMENT_QUANTITY'; payload: string }
  | { type: 'SET_ADJUSTMENT_NOTE'; payload: string }
  | { type: 'SET_ADJUSTMENT_ATTRIBUTE_VALUE'; payload: { attributeId: string; valueId: string } }
  | { type: 'RESET_FORM' }

  // Edit Actions
  | { type: 'START_EDIT_LOG'; payload: { logId: string; quantity: number; loss_quantity: number; note: string } }
  | { type: 'CANCEL_EDIT_LOG' }
  | { type: 'UPDATE_EDIT_FORM'; payload: Partial<InventoryState['edit']['editFormData']> }

  // Logs Actions
  | { type: 'SET_INVENTORY_LOGS'; payload: { logs: WorkLogWithAttributes[]; adjustments: InventoryAdjustmentWithAttributes[] } }

  // Variant Operations Actions
  | { type: 'SET_VARIANT_ADJUST_QTY'; payload: { key: string; value: string } }
  | { type: 'SET_VARIANT_MOVE_QTY'; payload: { key: string; value: string } }
  | { type: 'SET_ADJUSTING'; payload: { key: string; value: boolean } }
  | { type: 'SET_MOVING'; payload: { key: string; value: boolean } }

  // Message Actions
  | { type: 'SET_MESSAGE'; payload: { type: 'success' | 'error'; text: string } | null }
  | { type: 'CLEAR_MESSAGE' };

// ========================================
// Initial State
// ========================================

export const initialState: InventoryState = {
  data: {
    parts: [],
    operations: [],
    logs: [],
    variants: [],
    workers: [],
    adjustments: [],
    operationAttributes: [],
    variantAttributes: [],
    variantAttributeValues: [],
    processConsumptions: [],
    orderConsumptions: [],
    bomConsumptions: [],
    bomData: [],
    inventory: [],
  },
  ui: {
    loading: true,
    showModal: false,
    showDetailModal: false,
    saving: false,
  },
  selection: {
    selectedPartId: null,
    selectedOperationId: null,
    selectedInventoryDetail: null,
  },
  form: {
    adjustmentQuantity: '',
    adjustmentNote: '',
    selectedAdjustmentAttributeValues: {},
  },
  edit: {
    editingLogId: null,
    editFormData: {
      quantity: 0,
      loss_quantity: 0,
      note: '',
    },
  },
  logs: {
    inventoryLogs: [],
    inventoryAdjustmentLogs: [],
  },
  variantOps: {
    variantAdjustQty: {},
    variantMoveQty: {},
    adjusting: {},
    moving: {},
  },
  message: null,
};

// ========================================
// Reducer Function
// ========================================

export function inventoryReducer(
  state: InventoryState,
  action: InventoryAction
): InventoryState {
  switch (action.type) {
    // Data Actions
    case 'SET_DATA':
      return {
        ...state,
        data: {
          ...state.data,
          ...action.payload,
        },
      };

    case 'SET_INVENTORY':
      return {
        ...state,
        data: {
          ...state.data,
          inventory: action.payload,
        },
      };

    // UI Actions
    case 'SET_LOADING':
      return {
        ...state,
        ui: {
          ...state.ui,
          loading: action.payload,
        },
      };

    case 'SET_SAVING':
      return {
        ...state,
        ui: {
          ...state.ui,
          saving: action.payload,
        },
      };

    case 'OPEN_MODAL':
      return {
        ...state,
        ui: {
          ...state.ui,
          showModal: true,
        },
        selection: {
          ...state.selection,
          selectedPartId: action.payload,
          selectedOperationId: null,
        },
        form: {
          adjustmentQuantity: '',
          adjustmentNote: '',
          selectedAdjustmentAttributeValues: {},
        },
        message: null,
      };

    case 'CLOSE_MODAL':
      return {
        ...state,
        ui: {
          ...state.ui,
          showModal: false,
        },
        selection: {
          ...state.selection,
          selectedPartId: null,
          selectedOperationId: null,
        },
        form: {
          adjustmentQuantity: '',
          adjustmentNote: '',
          selectedAdjustmentAttributeValues: {},
        },
      };

    case 'OPEN_DETAIL_MODAL':
      return {
        ...state,
        ui: {
          ...state.ui,
          showDetailModal: true,
        },
        selection: {
          ...state.selection,
          selectedInventoryDetail: action.payload,
        },
      };

    case 'CLOSE_DETAIL_MODAL':
      return {
        ...state,
        ui: {
          ...state.ui,
          showDetailModal: false,
        },
        selection: {
          ...state.selection,
          selectedInventoryDetail: null,
        },
        logs: {
          inventoryLogs: [],
          inventoryAdjustmentLogs: [],
        },
        edit: {
          editingLogId: null,
          editFormData: {
            quantity: 0,
            loss_quantity: 0,
            note: '',
          },
        },
      };

    // Form Actions
    case 'SET_ADJUSTMENT_QUANTITY':
      return {
        ...state,
        form: {
          ...state.form,
          adjustmentQuantity: action.payload,
        },
      };

    case 'SET_ADJUSTMENT_NOTE':
      return {
        ...state,
        form: {
          ...state.form,
          adjustmentNote: action.payload,
        },
      };

    case 'SET_ADJUSTMENT_ATTRIBUTE_VALUE':
      return {
        ...state,
        form: {
          ...state.form,
          selectedAdjustmentAttributeValues: {
            ...state.form.selectedAdjustmentAttributeValues,
            [action.payload.attributeId]: action.payload.valueId,
          },
        },
      };

    case 'RESET_FORM':
      return {
        ...state,
        form: {
          adjustmentQuantity: '',
          adjustmentNote: '',
          selectedAdjustmentAttributeValues: {},
        },
      };

    // Edit Actions
    case 'START_EDIT_LOG':
      return {
        ...state,
        edit: {
          editingLogId: action.payload.logId,
          editFormData: {
            quantity: action.payload.quantity,
            loss_quantity: action.payload.loss_quantity,
            note: action.payload.note,
          },
        },
      };

    case 'CANCEL_EDIT_LOG':
      return {
        ...state,
        edit: {
          editingLogId: null,
          editFormData: {
            quantity: 0,
            loss_quantity: 0,
            note: '',
          },
        },
      };

    case 'UPDATE_EDIT_FORM':
      return {
        ...state,
        edit: {
          ...state.edit,
          editFormData: {
            ...state.edit.editFormData,
            ...action.payload,
          },
        },
      };

    // Logs Actions
    case 'SET_INVENTORY_LOGS':
      return {
        ...state,
        logs: {
          inventoryLogs: action.payload.logs,
          inventoryAdjustmentLogs: action.payload.adjustments,
        },
      };

    // Variant Operations Actions
    case 'SET_VARIANT_ADJUST_QTY':
      return {
        ...state,
        variantOps: {
          ...state.variantOps,
          variantAdjustQty: {
            ...state.variantOps.variantAdjustQty,
            [action.payload.key]: action.payload.value,
          },
        },
      };

    case 'SET_VARIANT_MOVE_QTY':
      return {
        ...state,
        variantOps: {
          ...state.variantOps,
          variantMoveQty: {
            ...state.variantOps.variantMoveQty,
            [action.payload.key]: action.payload.value,
          },
        },
      };

    case 'SET_ADJUSTING':
      return {
        ...state,
        variantOps: {
          ...state.variantOps,
          adjusting: {
            ...state.variantOps.adjusting,
            [action.payload.key]: action.payload.value,
          },
        },
      };

    case 'SET_MOVING':
      return {
        ...state,
        variantOps: {
          ...state.variantOps,
          moving: {
            ...state.variantOps.moving,
            [action.payload.key]: action.payload.value,
          },
        },
      };

    // Message Actions
    case 'SET_MESSAGE':
      return {
        ...state,
        message: action.payload,
      };

    case 'CLEAR_MESSAGE':
      return {
        ...state,
        message: null,
      };

    default:
      return state;
  }
}

// ========================================
// Custom Hook
// ========================================

export function useInventoryState(): [InventoryState, Dispatch<InventoryAction>] {
  return useReducer(inventoryReducer, initialState);
}
