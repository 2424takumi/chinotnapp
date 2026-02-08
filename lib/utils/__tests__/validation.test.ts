import { describe, it, expect } from 'vitest';
import {
  safeParseInt,
  safeParseFloat,
  isValidNumber,
  isValidInteger,
  validateQuantity,
  validateAdjustmentQuantity,
  validateMoveQuantity,
  isInRange,
  clampToRange,
  isEmpty,
  hasMinLength,
  hasMaxLength,
} from '../validation';

describe('validation utilities', () => {
  describe('safeParseInt', () => {
    it('should parse valid integer strings', () => {
      expect(safeParseInt('123')).toBe(123);
      expect(safeParseInt('0')).toBe(0);
      expect(safeParseInt('-456')).toBe(-456);
    });

    it('should return default value for invalid input', () => {
      expect(safeParseInt('abc')).toBe(0);
      expect(safeParseInt('abc', -1)).toBe(-1);
      expect(safeParseInt('')).toBe(0);
    });
  });

  describe('safeParseFloat', () => {
    it('should parse valid float strings', () => {
      expect(safeParseFloat('123.45')).toBe(123.45);
      expect(safeParseFloat('0.5')).toBe(0.5);
      expect(safeParseFloat('-456.78')).toBe(-456.78);
    });

    it('should return default value for invalid input', () => {
      expect(safeParseFloat('abc')).toBe(0);
      expect(safeParseFloat('abc', -1.5)).toBe(-1.5);
    });
  });

  describe('isValidNumber', () => {
    it('should return true for valid numbers', () => {
      expect(isValidNumber('123')).toBe(true);
      expect(isValidNumber('12.5')).toBe(true);
      expect(isValidNumber('-10')).toBe(true);
    });

    it('should return false for invalid numbers', () => {
      expect(isValidNumber('abc')).toBe(false);
      expect(isValidNumber('')).toBe(false);
      expect(isValidNumber('  ')).toBe(false);
    });
  });

  describe('isValidInteger', () => {
    it('should return true for valid integers', () => {
      expect(isValidInteger('123')).toBe(true);
      expect(isValidInteger('0')).toBe(true);
      expect(isValidInteger('-456')).toBe(true);
    });

    it('should return false for invalid integers', () => {
      expect(isValidInteger('12.5')).toBe(false);
      expect(isValidInteger('abc')).toBe(false);
      expect(isValidInteger('')).toBe(false);
    });
  });

  describe('validateQuantity', () => {
    it('should validate valid quantities', () => {
      const result = validateQuantity('5');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(5);
    });

    it('should reject zero by default', () => {
      const result = validateQuantity('0');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('数量は1以上で入力してください');
    });

    it('should allow zero when allowZero is true', () => {
      const result = validateQuantity('0', { allowZero: true });
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(0);
    });

    it('should enforce minimum value', () => {
      const result = validateQuantity('5', { min: 10 });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('数量は10以上で入力してください');
    });

    it('should enforce maximum value', () => {
      const result = validateQuantity('15', { max: 10 });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('数量は10以下で入力してください');
    });

    it('should reject empty input', () => {
      const result = validateQuantity('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('数量を入力してください');
    });
  });

  describe('validateAdjustmentQuantity', () => {
    it('should allow positive numbers', () => {
      const result = validateAdjustmentQuantity('5');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(5);
    });

    it('should allow negative numbers', () => {
      const result = validateAdjustmentQuantity('-3');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(-3);
    });

    it('should reject zero', () => {
      const result = validateAdjustmentQuantity('0');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('0以外の数量を入力してください');
    });
  });

  describe('validateMoveQuantity', () => {
    it('should allow valid move quantity', () => {
      const result = validateMoveQuantity('5', 10);
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(5);
    });

    it('should reject quantity exceeding inventory', () => {
      const result = validateMoveQuantity('15', 10);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('在庫数(10)を超える数量は移動できません');
    });

    it('should reject zero or negative', () => {
      const result = validateMoveQuantity('0', 10);
      expect(result.isValid).toBe(false);
    });
  });

  describe('isInRange', () => {
    it('should return true for values in range', () => {
      expect(isInRange(5, 1, 10)).toBe(true);
      expect(isInRange(1, 1, 10)).toBe(true);
      expect(isInRange(10, 1, 10)).toBe(true);
    });

    it('should return false for values out of range', () => {
      expect(isInRange(0, 1, 10)).toBe(false);
      expect(isInRange(11, 1, 10)).toBe(false);
    });
  });

  describe('clampToRange', () => {
    it('should return value if in range', () => {
      expect(clampToRange(5, 1, 10)).toBe(5);
    });

    it('should clamp to minimum', () => {
      expect(clampToRange(0, 1, 10)).toBe(1);
    });

    it('should clamp to maximum', () => {
      expect(clampToRange(15, 1, 10)).toBe(10);
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty strings', () => {
      expect(isEmpty('')).toBe(true);
      expect(isEmpty('  ')).toBe(true);
      expect(isEmpty('\t\n')).toBe(true);
    });

    it('should return false for non-empty strings', () => {
      expect(isEmpty('hello')).toBe(false);
      expect(isEmpty(' hello ')).toBe(false);
    });
  });

  describe('hasMinLength', () => {
    it('should return true if string meets minimum length', () => {
      expect(hasMinLength('hello', 3)).toBe(true);
      expect(hasMinLength('hello', 5)).toBe(true);
    });

    it('should return false if string is too short', () => {
      expect(hasMinLength('hi', 3)).toBe(false);
    });
  });

  describe('hasMaxLength', () => {
    it('should return true if string is within maximum length', () => {
      expect(hasMaxLength('hello', 10)).toBe(true);
      expect(hasMaxLength('hello', 5)).toBe(true);
    });

    it('should return false if string is too long', () => {
      expect(hasMaxLength('hello world', 5)).toBe(false);
    });
  });
});
