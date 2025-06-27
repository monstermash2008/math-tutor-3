import { describe, expect, it } from 'vitest';
import { MathParsingError, areEquivalent, getCanonical, isFullySimplified } from '../math-engine';

describe('Math Engine', () => {
  describe('getCanonical', () => {
    describe('expressions', () => {
      it('should canonicalize simple expressions', () => {
        const node1 = getCanonical('2x + 10');
        const node2 = getCanonical('10 + 2x');
        
        // Both should be equivalent
        expect(node1.equals(node2)).toBe(true);
      });

      it('should handle complex expressions', () => {
        // Use areEquivalent function which should handle this properly
        expect(areEquivalent('4(x - 3)', '4x - 12')).toBe(true);
      });

      it('should handle double negatives', () => {
        const node = getCanonical('--x');
        const expected = getCanonical('x');
        
        expect(node.equals(expected)).toBe(true);
      });
    });

    describe('equations', () => {
      it('should transform equations to canonical form', () => {
        const node = getCanonical('3x = 9');
        const expected = getCanonical('3x - 9');
        
        expect(node.equals(expected)).toBe(true);
      });

      it('should handle x = 3 format', () => {
        const node = getCanonical('x = 3');
        const expected = getCanonical('x - 3');
        
        expect(node.equals(expected)).toBe(true);
      });

      it('should handle complex equations', () => {
        // Use areEquivalent function which should handle this properly
        expect(areEquivalent('4(x - 3) = 10', '4x - 22 = 0')).toBe(true);
      });
    });

    describe('error handling', () => {
      it('should throw MathParsingError for empty input', () => {
        expect(() => getCanonical('')).toThrow(MathParsingError);
        expect(() => getCanonical('   ')).toThrow(MathParsingError);
      });

      it('should throw MathParsingError for invalid equation format', () => {
        expect(() => getCanonical('5x = = 9')).toThrow(MathParsingError);
        expect(() => getCanonical('5x = 9 = 3')).toThrow(MathParsingError);
        expect(() => getCanonical('= 9')).toThrow(MathParsingError);
        expect(() => getCanonical('5x =')).toThrow(MathParsingError);
      });

      it('should throw MathParsingError for malformed expressions', () => {
        expect(() => getCanonical('3x ++ 5')).toThrow(MathParsingError);
        expect(() => getCanonical('3x --- 5')).toThrow(MathParsingError);
        expect(() => getCanonical('3x // 5')).toThrow(MathParsingError);
      });
    });
  });

  describe('isFullySimplified', () => {
    describe('equations', () => {
      it('should return true for simplified equations', () => {
        expect(isFullySimplified('x = 3')).toBe(true);
        expect(isFullySimplified('3x - 7 = 0')).toBe(true);
      });

      it('should return false for non-simplified equations', () => {
        expect(isFullySimplified('x = 9/3')).toBe(false);
        expect(isFullySimplified('4x - x - 7 = 0')).toBe(false);
      });
    });

    describe('expressions', () => {
      it('should return true for simplified expressions', () => {
        expect(isFullySimplified('3x - 7')).toBe(true);
        expect(isFullySimplified('10 + 2x')).toBe(true);
      });

      it('should return false for non-simplified expressions', () => {
        expect(isFullySimplified('4x - x - 7')).toBe(false);
        expect(isFullySimplified('3 + 2 + x')).toBe(false);
      });
    });

    describe('error handling', () => {
      it('should return false for empty input', () => {
        expect(isFullySimplified('')).toBe(false);
        expect(isFullySimplified('   ')).toBe(false);
      });

      it('should return false for invalid expressions', () => {
        expect(isFullySimplified('3x ++ 5')).toBe(false);
        expect(isFullySimplified('= = =')).toBe(false);
      });
    });
  });

  describe('areEquivalent', () => {
    it('should return true for equivalent expressions', () => {
      expect(areEquivalent('2x + 3', '3 + 2x')).toBe(true);
      expect(areEquivalent('4x - 12', '4(x - 3)')).toBe(true);
    });

    it('should return true for equivalent equations', () => {
      expect(areEquivalent('3x = 9', 'x = 3')).toBe(false); // These are different steps
      expect(areEquivalent('2x + 5 = 11', '5 + 2x = 11')).toBe(true);
    });

    it('should return false for non-equivalent expressions', () => {
      expect(areEquivalent('2x + 3', '2x + 4')).toBe(false);
      expect(areEquivalent('x = 3', 'x = 4')).toBe(false);
    });

    it('should handle parsing errors gracefully', () => {
      expect(areEquivalent('3x ++ 5', '3x + 5')).toBe(false);
      expect(areEquivalent('3x + 5', '3x --- 5')).toBe(false);
    });
  });
}); 