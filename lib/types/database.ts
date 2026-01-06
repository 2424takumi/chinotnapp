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
          created_at: string
          updated_at: string
        }
        Insert: {
          worker_id?: string
          name: string
          order_index?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          worker_id?: string
          name?: string
          order_index?: number
          active?: boolean
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

export type WorkLogInsert = Database['public']['Tables']['work_logs']['Insert'];
export type WorkLogUpdate = Database['public']['Tables']['work_logs']['Update'];
export type BOMInsert = Database['public']['Tables']['bom']['Insert'];
export type BOMConsumptionInsert = Database['public']['Tables']['bom_consumption']['Insert'];
export type SkinDesignInsert = Database['public']['Tables']['skin_designs']['Insert'];
export type SkinDesignUpdate = Database['public']['Tables']['skin_designs']['Update'];
export type ProductVariantInsert = Database['public']['Tables']['product_variants']['Insert'];
export type ProductVariantUpdate = Database['public']['Tables']['product_variants']['Update'];

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
