/**
 * Validation Utilities
 *
 * ## Purpose
 * Common validation functions for form inputs
 * Provides consistent validation logic across the application
 *
 * ## Benefits
 * - Single source of truth for validation rules
 * - Testable validation logic
 * - Type-safe validation results
 * - Consistent error messages
 *
 * ## Part of
 * Phase 3: Code Quality Improvements (Task 3.2)
 */

// ========================================
// Type Definitions
// ========================================

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  /** Error message if validation failed */
  error?: string;
  /** Parsed value if validation passed */
  value?: number;
}

/**
 * Quantity validation options
 */
export interface QuantityValidationOptions {
  /** Minimum allowed value (inclusive) */
  min?: number;
  /** Maximum allowed value (inclusive) */
  max?: number;
  /** Whether to allow zero */
  allowZero?: boolean;
  /** Custom error message */
  errorMessage?: string;
}

// ========================================
// Number Parsing and Validation
// ========================================

/**
 * Safely parse string to integer
 *
 * @param value - String value to parse
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed integer or default value
 *
 * @example
 * ```typescript
 * safeParseInt('123') // => 123
 * safeParseInt('abc') // => 0
 * safeParseInt('abc', -1) // => -1
 * ```
 */
export function safeParseInt(value: string, defaultValue: number = 0): number {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Safely parse string to float
 *
 * @param value - String value to parse
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed float or default value
 */
export function safeParseFloat(value: string, defaultValue: number = 0): number {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Check if string is a valid number
 *
 * @param value - String value to check
 * @returns True if valid number
 *
 * @example
 * ```typescript
 * isValidNumber('123') // => true
 * isValidNumber('12.5') // => true
 * isValidNumber('abc') // => false
 * isValidNumber('') // => false
 * ```
 */
export function isValidNumber(value: string): boolean {
  if (value.trim() === '') return false;
  const parsed = parseFloat(value);
  return !isNaN(parsed);
}

/**
 * Check if string is a valid integer
 *
 * @param value - String value to check
 * @returns True if valid integer
 *
 * @example
 * ```typescript
 * isValidInteger('123') // => true
 * isValidInteger('12.5') // => false
 * isValidInteger('abc') // => false
 * ```
 */
export function isValidInteger(value: string): boolean {
  if (value.trim() === '') return false;
  const parsed = parseInt(value, 10);
  return !isNaN(parsed) && parsed.toString() === value.trim();
}

// ========================================
// Quantity Validation
// ========================================

/**
 * Validate quantity input
 *
 * @param value - Quantity string to validate
 * @param options - Validation options
 * @returns Validation result with parsed value or error
 *
 * @example
 * ```typescript
 * validateQuantity('5') // => { isValid: true, value: 5 }
 * validateQuantity('0') // => { isValid: false, error: '...' }
 * validateQuantity('5', { min: 10 }) // => { isValid: false, error: '...' }
 * ```
 */
export function validateQuantity(
  value: string,
  options: QuantityValidationOptions = {}
): ValidationResult {
  const { min = 1, max, allowZero = false, errorMessage } = options;

  // Empty check
  if (value.trim() === '') {
    return {
      isValid: false,
      error: errorMessage || '数量を入力してください',
    };
  }

  // Parse
  const quantity = safeParseInt(value);

  // NaN check
  if (isNaN(quantity)) {
    return {
      isValid: false,
      error: errorMessage || '有効な数値を入力してください',
    };
  }

  // Zero check
  if (!allowZero && quantity === 0) {
    return {
      isValid: false,
      error: errorMessage || '数量は1以上で入力してください',
    };
  }

  // Min check
  if (quantity < min) {
    return {
      isValid: false,
      error: errorMessage || `数量は${min}以上で入力してください`,
    };
  }

  // Max check
  if (max !== undefined && quantity > max) {
    return {
      isValid: false,
      error: errorMessage || `数量は${max}以下で入力してください`,
    };
  }

  return {
    isValid: true,
    value: quantity,
  };
}

/**
 * Validate adjustment quantity (allows negative values)
 *
 * @param value - Quantity string to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * validateAdjustmentQuantity('5') // => { isValid: true, value: 5 }
 * validateAdjustmentQuantity('-3') // => { isValid: true, value: -3 }
 * validateAdjustmentQuantity('0') // => { isValid: false, error: '...' }
 * ```
 */
export function validateAdjustmentQuantity(value: string): ValidationResult {
  if (value.trim() === '') {
    return {
      isValid: false,
      error: '数量を入力してください',
    };
  }

  const quantity = safeParseInt(value);

  if (isNaN(quantity)) {
    return {
      isValid: false,
      error: '有効な数値を入力してください',
    };
  }

  if (quantity === 0) {
    return {
      isValid: false,
      error: '0以外の数量を入力してください',
    };
  }

  return {
    isValid: true,
    value: quantity,
  };
}

/**
 * Validate inventory move quantity
 *
 * @param value - Quantity string to validate
 * @param maxInventory - Maximum available inventory
 * @returns Validation result
 *
 * @example
 * ```typescript
 * validateMoveQuantity('5', 10) // => { isValid: true, value: 5 }
 * validateMoveQuantity('15', 10) // => { isValid: false, error: '...' }
 * ```
 */
export function validateMoveQuantity(value: string, maxInventory: number): ValidationResult {
  if (value.trim() === '') {
    return {
      isValid: false,
      error: '移動数量を入力してください',
    };
  }

  const quantity = safeParseInt(value);

  if (isNaN(quantity)) {
    return {
      isValid: false,
      error: '有効な数値を入力してください',
    };
  }

  if (quantity <= 0) {
    return {
      isValid: false,
      error: '移動数量は1以上で入力してください',
    };
  }

  if (quantity > maxInventory) {
    return {
      isValid: false,
      error: `在庫数(${maxInventory})を超える数量は移動できません`,
    };
  }

  return {
    isValid: true,
    value: quantity,
  };
}

// ========================================
// Range Validation
// ========================================

/**
 * Validate number is within range
 *
 * @param value - Number to validate
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns True if within range
 *
 * @example
 * ```typescript
 * isInRange(5, 1, 10) // => true
 * isInRange(0, 1, 10) // => false
 * isInRange(15, 1, 10) // => false
 * ```
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Clamp number to range
 *
 * @param value - Number to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 *
 * @example
 * ```typescript
 * clampToRange(5, 1, 10) // => 5
 * clampToRange(0, 1, 10) // => 1
 * clampToRange(15, 1, 10) // => 10
 * ```
 */
export function clampToRange(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ========================================
// String Validation
// ========================================

/**
 * Check if string is empty or whitespace only
 *
 * @param value - String to check
 * @returns True if empty or whitespace
 *
 * @example
 * ```typescript
 * isEmpty('') // => true
 * isEmpty('  ') // => true
 * isEmpty('hello') // => false
 * ```
 */
export function isEmpty(value: string): boolean {
  return value.trim().length === 0;
}

/**
 * Check if string has minimum length
 *
 * @param value - String to check
 * @param minLength - Minimum length
 * @returns True if meets minimum length
 */
export function hasMinLength(value: string, minLength: number): boolean {
  return value.trim().length >= minLength;
}

/**
 * Check if string has maximum length
 *
 * @param value - String to check
 * @param maxLength - Maximum length
 * @returns True if within maximum length
 */
export function hasMaxLength(value: string, maxLength: number): boolean {
  return value.trim().length <= maxLength;
}
