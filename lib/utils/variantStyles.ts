/**
 * Variant Style Utilities
 *
 * ## Purpose
 * Centralized styling logic for product variants
 * Provides consistent color coding across the application
 *
 * ## Benefits
 * - Single source of truth for variant colors
 * - Easy to add/modify variant types
 * - Type-safe variant style definitions
 * - Testable logic
 *
 * ## Part of
 * Phase 3: Code Quality Improvements (Task 3.2)
 */

// ========================================
// Type Definitions
// ========================================

/**
 * Tailwind CSS color classes for variants
 */
export interface VariantColorClasses {
  /** Background and text color classes */
  badge: string;
  /** Border color class */
  border?: string;
  /** Hover state classes */
  hover?: string;
}

/**
 * Variant type categories
 */
export enum VariantType {
  SHIMAMURA = '島村',
  NORMAL = '通常',
  AKAFUJI = '赤富士',
  FLOWER = '花柄',
  ARABESQUE = '唐草',
  PLAIN = '無地',
  WALNUT = 'ウォルナット',
  MAPLE = '楓',
  ZELKOVA = '欅',
  UNKNOWN = '不明',
}

// ========================================
// Color Mapping
// ========================================

/**
 * Variant type to color mapping
 *
 * Color scheme:
 * - 島村: Blue (premium)
 * - 通常: Emerald (standard)
 * - 赤富士: Rose (special design)
 * - 花柄: Purple (floral pattern)
 * - 唐草: Purple (arabesque pattern)
 * - 無地: Slate (plain)
 * - ウォルナット: Amber (walnut wood)
 * - 楓: Yellow (maple wood)
 * - 欅: Orange (zelkova wood)
 */
const VARIANT_COLOR_MAP: Record<VariantType, VariantColorClasses> = {
  [VariantType.SHIMAMURA]: {
    badge: 'bg-blue-100 text-blue-700',
    border: 'border-blue-400',
    hover: 'hover:bg-blue-200',
  },
  [VariantType.NORMAL]: {
    badge: 'bg-emerald-100 text-emerald-700',
    border: 'border-emerald-400',
    hover: 'hover:bg-emerald-200',
  },
  [VariantType.AKAFUJI]: {
    badge: 'bg-rose-100 text-rose-700',
    border: 'border-rose-400',
    hover: 'hover:bg-rose-200',
  },
  [VariantType.FLOWER]: {
    badge: 'bg-purple-100 text-purple-700',
    border: 'border-purple-400',
    hover: 'hover:bg-purple-200',
  },
  [VariantType.ARABESQUE]: {
    badge: 'bg-purple-100 text-purple-700',
    border: 'border-purple-400',
    hover: 'hover:bg-purple-200',
  },
  [VariantType.PLAIN]: {
    badge: 'bg-slate-100 text-slate-700',
    border: 'border-slate-400',
    hover: 'hover:bg-slate-200',
  },
  [VariantType.WALNUT]: {
    badge: 'bg-amber-100 text-amber-700',
    border: 'border-amber-400',
    hover: 'hover:bg-amber-200',
  },
  [VariantType.MAPLE]: {
    badge: 'bg-yellow-100 text-yellow-700',
    border: 'border-yellow-400',
    hover: 'hover:bg-yellow-200',
  },
  [VariantType.ZELKOVA]: {
    badge: 'bg-orange-100 text-orange-700',
    border: 'border-orange-400',
    hover: 'hover:bg-orange-200',
  },
  [VariantType.UNKNOWN]: {
    badge: 'bg-gray-100 text-gray-700',
    border: 'border-gray-400',
    hover: 'hover:bg-gray-200',
  },
};

// ========================================
// Public Functions
// ========================================

/**
 * Detect variant type from name
 *
 * @param valueName - Variant value name (e.g., "島村", "赤富士")
 * @returns Detected variant type
 *
 * @example
 * ```typescript
 * detectVariantType('島村') // => VariantType.SHIMAMURA
 * detectVariantType('赤富士皮') // => VariantType.AKAFUJI
 * detectVariantType('その他') // => VariantType.UNKNOWN
 * ```
 */
export function detectVariantType(valueName: string): VariantType {
  const name = valueName.toLowerCase();

  // Order matters: check specific patterns first
  if (name.includes(VariantType.SHIMAMURA)) return VariantType.SHIMAMURA;
  if (name.includes(VariantType.AKAFUJI)) return VariantType.AKAFUJI;
  if (name.includes(VariantType.FLOWER)) return VariantType.FLOWER;
  if (name.includes(VariantType.ARABESQUE)) return VariantType.ARABESQUE;
  if (name.includes(VariantType.PLAIN)) return VariantType.PLAIN;
  if (name.includes(VariantType.WALNUT)) return VariantType.WALNUT;
  if (name.includes(VariantType.MAPLE)) return VariantType.MAPLE;
  if (name.includes(VariantType.ZELKOVA)) return VariantType.ZELKOVA;
  if (name.includes(VariantType.NORMAL)) return VariantType.NORMAL;

  return VariantType.UNKNOWN;
}

/**
 * Get Tailwind CSS color classes for variant badge
 *
 * @param valueName - Variant value name
 * @returns Tailwind CSS classes for badge background and text
 *
 * @example
 * ```typescript
 * getVariantBadgeColor('島村') // => 'bg-blue-100 text-blue-700'
 * getVariantBadgeColor('赤富士') // => 'bg-rose-100 text-rose-700'
 * ```
 */
export function getVariantBadgeColor(valueName: string): string {
  const type = detectVariantType(valueName);
  return VARIANT_COLOR_MAP[type].badge;
}

/**
 * Get Tailwind CSS border color class
 *
 * @param valueName - Variant value name
 * @returns Tailwind CSS border color class
 *
 * @example
 * ```typescript
 * getVariantBorderColor('島村') // => 'border-blue-400'
 * ```
 */
export function getVariantBorderColor(valueName: string): string {
  const type = detectVariantType(valueName);
  return VARIANT_COLOR_MAP[type].border || 'border-gray-400';
}

/**
 * Get Tailwind CSS hover state class
 *
 * @param valueName - Variant value name
 * @returns Tailwind CSS hover state class
 *
 * @example
 * ```typescript
 * getVariantHoverColor('島村') // => 'hover:bg-blue-200'
 * ```
 */
export function getVariantHoverColor(valueName: string): string {
  const type = detectVariantType(valueName);
  return VARIANT_COLOR_MAP[type].hover || 'hover:bg-gray-200';
}

/**
 * Get complete color classes for variant
 *
 * @param valueName - Variant value name
 * @returns Object with all color classes
 *
 * @example
 * ```typescript
 * const colors = getVariantColorClasses('島村');
 * // => { badge: 'bg-blue-100 text-blue-700', border: 'border-blue-400', ... }
 * ```
 */
export function getVariantColorClasses(valueName: string): VariantColorClasses {
  const type = detectVariantType(valueName);
  return VARIANT_COLOR_MAP[type];
}

/**
 * Check if variant name is a special type (not normal/unknown)
 *
 * @param valueName - Variant value name
 * @returns True if special type
 *
 * @example
 * ```typescript
 * isSpecialVariant('島村') // => true
 * isSpecialVariant('通常') // => false
 * ```
 */
export function isSpecialVariant(valueName: string): boolean {
  const type = detectVariantType(valueName);
  return type !== VariantType.NORMAL && type !== VariantType.UNKNOWN;
}

/**
 * Get all defined variant types
 *
 * @returns Array of all variant types
 */
export function getAllVariantTypes(): VariantType[] {
  return Object.values(VariantType);
}

/**
 * Get color preview for variant (for admin UI)
 *
 * @param valueName - Variant value name
 * @returns Hex color code for preview
 */
export function getVariantPreviewColor(valueName: string): string {
  const type = detectVariantType(valueName);

  const colorMap: Record<VariantType, string> = {
    [VariantType.SHIMAMURA]: '#3B82F6',    // blue-500
    [VariantType.NORMAL]: '#10B981',       // emerald-500
    [VariantType.AKAFUJI]: '#F43F5E',      // rose-500
    [VariantType.FLOWER]: '#A855F7',       // purple-500
    [VariantType.ARABESQUE]: '#A855F7',    // purple-500
    [VariantType.PLAIN]: '#64748B',        // slate-500
    [VariantType.WALNUT]: '#F59E0B',       // amber-500
    [VariantType.MAPLE]: '#EAB308',        // yellow-500
    [VariantType.ZELKOVA]: '#F97316',      // orange-500
    [VariantType.UNKNOWN]: '#6B7280',      // gray-500
  };

  return colorMap[type];
}
