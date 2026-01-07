// Supabaseのデータベース型定義
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      workers: {
        Row: {
          worker_id: string
          name: string
          order_index: number
          active: boolean
          auth_user_id: string | null
          email: string | null
          is_authenticated: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          worker_id?: string
          name: string
          order_index?: number
          active?: boolean
          auth_user_id?: string | null
          email?: string | null
          is_authenticated?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          worker_id?: string
          name?: string
          order_index?: number
          active?: boolean
          auth_user_id?: string | null
          email?: string | null
          is_authenticated?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      parts: {
        Row: {
          part_id: string
          name: string
          order_index: number
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          part_id?: string
          name: string
          order_index?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          part_id?: string
          name?: string
          order_index?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      operations: {
        Row: {
          operation_id: string
          part_id: string
          name: string
          order_index: number
          active: boolean
          category: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          operation_id?: string
          part_id: string
          name: string
          order_index?: number
          active?: boolean
          category?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          operation_id?: string
          part_id?: string
          name?: string
          order_index?: number
          active?: boolean
          category?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      work_logs: {
        Row: {
          log_id: string
          worker_id: string
          part_id: string
          operation_id: string
          duration_minutes: number
          quantity: number
          loss_quantity: number
          note: string | null
          is_deleted: boolean
          work_date: string
          variant_id: string | null
          session_id: string | null
          created_at: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          log_id?: string
          worker_id: string
          part_id: string
          operation_id: string
          duration_minutes: number
          quantity: number
          loss_quantity?: number
          note?: string | null
          is_deleted?: boolean
          work_date?: string
          variant_id?: string | null
          session_id?: string | null
          created_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          log_id?: string
          worker_id?: string
          part_id?: string
          operation_id?: string
          duration_minutes?: number
          quantity?: number
          loss_quantity?: number
          note?: string | null
          is_deleted?: boolean
          work_date?: string
          variant_id?: string | null
          session_id?: string | null
          created_at?: string
          updated_at?: string
          updated_by?: string | null
        }
      }
      skin_designs: {
        Row: {
          skin_design_id: string
          name: string
          description: string | null
          order_index: number
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          skin_design_id?: string
          name: string
          description?: string | null
          order_index?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          skin_design_id?: string
          name?: string
          description?: string | null
          order_index?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      product_variants: {
        Row: {
          variant_id: string
          base_part_id: string
          skin_design_id: string | null
          variant_code: string
          display_name: string
          description: string | null
          order_index: number
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          variant_id?: string
          base_part_id: string
          skin_design_id?: string | null
          variant_code: string
          display_name: string
          description?: string | null
          order_index?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          variant_id?: string
          base_part_id?: string
          skin_design_id?: string | null
          variant_code?: string
          display_name?: string
          description?: string | null
          order_index?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      bom: {
        Row: {
          bom_id: string
          operation_id: string
          consumed_part_id: string
          quantity_per_unit: number
          created_at: string
          updated_at: string
        }
        Insert: {
          bom_id?: string
          operation_id: string
          consumed_part_id: string
          quantity_per_unit: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          bom_id?: string
          operation_id?: string
          consumed_part_id?: string
          quantity_per_unit?: number
          created_at?: string
          updated_at?: string
        }
      }
      bom_consumption: {
        Row: {
          consumption_id: string
          work_log_id: string
          consumed_part_id: string
          consumed_quantity: number
          created_at: string
        }
        Insert: {
          consumption_id?: string
          work_log_id: string
          consumed_part_id: string
          consumed_quantity: number
          created_at?: string
        }
        Update: {
          consumption_id?: string
          work_log_id?: string
          consumed_part_id?: string
          consumed_quantity?: number
          created_at?: string
        }
      }
      variant_attributes: {
        Row: {
          attribute_id: string
          name: string
          description: string | null
          order_index: number
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          attribute_id?: string
          name: string
          description?: string | null
          order_index?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          attribute_id?: string
          name?: string
          description?: string | null
          order_index?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      variant_attribute_values: {
        Row: {
          value_id: string
          attribute_id: string
          name: string
          description: string | null
          order_index: number
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          value_id?: string
          attribute_id: string
          name: string
          description?: string | null
          order_index?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          value_id?: string
          attribute_id?: string
          name?: string
          description?: string | null
          order_index?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      product_variants_v2: {
        Row: {
          variant_id: string
          base_part_id: string
          variant_code: string
          display_name: string
          description: string | null
          order_index: number
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          variant_id?: string
          base_part_id: string
          variant_code: string
          display_name: string
          description?: string | null
          order_index?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          variant_id?: string
          base_part_id?: string
          variant_code?: string
          display_name?: string
          description?: string | null
          order_index?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      variant_attribute_assignments: {
        Row: {
          assignment_id: string
          variant_id: string
          value_id: string
          created_at: string
        }
        Insert: {
          assignment_id?: string
          variant_id: string
          value_id: string
          created_at?: string
        }
        Update: {
          assignment_id?: string
          variant_id?: string
          value_id?: string
          created_at?: string
        }
      }
      operation_variant_attributes: {
        Row: {
          operation_id: string
          attribute_id: string
          created_at: string
        }
        Insert: {
          operation_id: string
          attribute_id: string
          created_at?: string
        }
        Update: {
          operation_id?: string
          attribute_id?: string
          created_at?: string
        }
      }
      work_log_attributes: {
        Row: {
          work_log_attribute_id: string
          work_log_id: string
          value_id: string
          created_at: string
        }
        Insert: {
          work_log_attribute_id?: string
          work_log_id: string
          value_id: string
          created_at?: string
        }
        Update: {
          work_log_attribute_id?: string
          work_log_id?: string
          value_id?: string
          created_at?: string
        }
      }
      work_sessions: {
        Row: {
          session_id: string
          worker_id: string
          part_id: string
          operation_id: string
          start_time: string
          end_time: string | null
          work_date: string
          status: 'active' | 'paused' | 'completed' | 'abandoned'
          work_log_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          session_id?: string
          worker_id: string
          part_id: string
          operation_id: string
          start_time?: string
          end_time?: string | null
          work_date?: string
          status?: 'active' | 'paused' | 'completed' | 'abandoned'
          work_log_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          session_id?: string
          worker_id?: string
          part_id?: string
          operation_id?: string
          start_time?: string
          end_time?: string | null
          work_date?: string
          status?: 'active' | 'paused' | 'completed' | 'abandoned'
          work_log_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      work_session_attributes: {
        Row: {
          session_attribute_id: string
          session_id: string
          value_id: string
          created_at: string
        }
        Insert: {
          session_attribute_id?: string
          session_id: string
          value_id: string
          created_at?: string
        }
        Update: {
          session_attribute_id?: string
          session_id?: string
          value_id?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// 便利な型エイリアス
export type Worker = Database['public']['Tables']['workers']['Row'];
export type Part = Database['public']['Tables']['parts']['Row'];
export type Operation = Database['public']['Tables']['operations']['Row'];
export type WorkLog = Database['public']['Tables']['work_logs']['Row'];
export type BOM = Database['public']['Tables']['bom']['Row'];
export type BOMConsumption = Database['public']['Tables']['bom_consumption']['Row'];
export type SkinDesign = Database['public']['Tables']['skin_designs']['Row'];
export type ProductVariant = Database['public']['Tables']['product_variants']['Row'];

// 新しい階層型バリエーション関連の型エイリアス
export type VariantAttribute = Database['public']['Tables']['variant_attributes']['Row'];
export type VariantAttributeValue = Database['public']['Tables']['variant_attribute_values']['Row'];
export type ProductVariantV2 = Database['public']['Tables']['product_variants_v2']['Row'];
export type VariantAttributeAssignment = Database['public']['Tables']['variant_attribute_assignments']['Row'];
export type OperationVariantAttribute = Database['public']['Tables']['operation_variant_attributes']['Row'];
export type WorkLogAttribute = Database['public']['Tables']['work_log_attributes']['Row'];
export type WorkSession = Database['public']['Tables']['work_sessions']['Row'];
export type WorkSessionAttribute = Database['public']['Tables']['work_session_attributes']['Row'];

export type WorkLogInsert = Database['public']['Tables']['work_logs']['Insert'];
export type WorkLogUpdate = Database['public']['Tables']['work_logs']['Update'];
export type BOMInsert = Database['public']['Tables']['bom']['Insert'];
export type BOMConsumptionInsert = Database['public']['Tables']['bom_consumption']['Insert'];
export type SkinDesignInsert = Database['public']['Tables']['skin_designs']['Insert'];
export type SkinDesignUpdate = Database['public']['Tables']['skin_designs']['Update'];
export type ProductVariantInsert = Database['public']['Tables']['product_variants']['Insert'];
export type ProductVariantUpdate = Database['public']['Tables']['product_variants']['Update'];

// 新しい階層型バリエーション関連のInsert/Update型
export type VariantAttributeInsert = Database['public']['Tables']['variant_attributes']['Insert'];
export type VariantAttributeUpdate = Database['public']['Tables']['variant_attributes']['Update'];
export type VariantAttributeValueInsert = Database['public']['Tables']['variant_attribute_values']['Insert'];
export type VariantAttributeValueUpdate = Database['public']['Tables']['variant_attribute_values']['Update'];
export type ProductVariantV2Insert = Database['public']['Tables']['product_variants_v2']['Insert'];
export type ProductVariantV2Update = Database['public']['Tables']['product_variants_v2']['Update'];
export type VariantAttributeAssignmentInsert = Database['public']['Tables']['variant_attribute_assignments']['Insert'];
export type VariantAttributeAssignmentUpdate = Database['public']['Tables']['variant_attribute_assignments']['Update'];
export type OperationVariantAttributeInsert = Database['public']['Tables']['operation_variant_attributes']['Insert'];
export type OperationVariantAttributeUpdate = Database['public']['Tables']['operation_variant_attributes']['Update'];
export type WorkLogAttributeInsert = Database['public']['Tables']['work_log_attributes']['Insert'];
export type WorkLogAttributeUpdate = Database['public']['Tables']['work_log_attributes']['Update'];
export type WorkSessionInsert = Database['public']['Tables']['work_sessions']['Insert'];
export type WorkSessionUpdate = Database['public']['Tables']['work_sessions']['Update'];
export type WorkSessionAttributeInsert = Database['public']['Tables']['work_session_attributes']['Insert'];
export type WorkSessionAttributeUpdate = Database['public']['Tables']['work_session_attributes']['Update'];

// 結合したデータ型（実績一覧表示用）
export interface WorkLogWithDetails extends WorkLog {
  worker_name: string;
  part_name: string;
  operation_name: string;
}

// BOMと部品情報を結合した型
export interface BOMWithPart extends BOM {
  consumed_part_name: string;
}

// バリエーション属性値と属性情報を結合した型
export interface VariantAttributeValueWithAttribute extends VariantAttributeValue {
  attribute_name: string;
}

// 商品バリエーションと属性値を結合した型
export interface ProductVariantV2WithAttributes extends ProductVariantV2 {
  attributes: VariantAttributeValueWithAttribute[];
}
