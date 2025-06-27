import { describe, expect, it } from 'vitest';
import { 
  type ProblemModel,
  type ValidationContext,
  getExpectedNextSteps,
  isProblemSolved, 
  validateStep 
} from '../validation-engine';

describe('Validation Engine', () => {
  const sampleProblem: ProblemModel = {
    problemId: 'p-102',
    problemStatement: 'Solve for x: 4(x - 3) - (x - 5) = 14',
    problemType: 'SOLVE_EQUATION',
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '4x - 12 - (x - 5) = 14',
        '4x - 12 - x + 5 = 14',
        '3x - 12 + 5 = 14',
        '3x - 7 = 14',
        '3x = 21',
        'x = 7'
      ]
    }
  };

  describe('validateStep', () => {
    describe('correct final step', () => {
      it('should return CORRECT_FINAL_STEP for fully simplified final answer', () => {
        const context: ValidationContext = {
          problemModel: sampleProblem,
          userHistory: [sampleProblem.problemStatement, '3x = 21'],
          studentInput: 'x = 7'
        };

        const result = validateStep(context);
        expect(result.result).toBe('CORRECT_FINAL_STEP');
        expect(result.isCorrect).toBe(true);
        expect(result.shouldAdvance).toBe(true);
      });

      it('should return CORRECT_BUT_NOT_SIMPLIFIED for correct but unsimplified final answer', () => {
        const context: ValidationContext = {
          problemModel: sampleProblem,
          userHistory: [sampleProblem.problemStatement, '3x = 21'],
          studentInput: 'x = 21/3'
        };

        const result = validateStep(context);
        expect(result.result).toBe('CORRECT_BUT_NOT_SIMPLIFIED');
        expect(result.isCorrect).toBe(true);
        expect(result.shouldAdvance).toBe(true);
      });
    });

    describe('correct intermediate step', () => {
      it('should return CORRECT_INTERMEDIATE_STEP for valid intermediate steps', () => {
        const context: ValidationContext = {
          problemModel: sampleProblem,
          userHistory: [sampleProblem.problemStatement, '4x - 12 - x + 5 = 14'],
          studentInput: '3x - 7 = 14'
        };

        const result = validateStep(context);
        expect(result.result).toBe('CORRECT_INTERMEDIATE_STEP');
        expect(result.isCorrect).toBe(true);
        expect(result.shouldAdvance).toBe(true);
      });
    });

    describe('valid but no progress', () => {
      it('should return VALID_BUT_NO_PROGRESS when student repeats previous step', () => {
        const context: ValidationContext = {
          problemModel: sampleProblem,
          userHistory: [sampleProblem.problemStatement, '4x - 12 - x + 5 = 14'],
          studentInput: '4x - 12 - x + 5 = 14'
        };

        const result = validateStep(context);
        expect(result.result).toBe('VALID_BUT_NO_PROGRESS');
        expect(result.isCorrect).toBe(false);
        expect(result.shouldAdvance).toBe(false);
      });
    });

    describe('equivalence failure', () => {
      it('should return EQUIVALENCE_FAILURE for incorrect steps', () => {
        const context: ValidationContext = {
          problemModel: sampleProblem,
          userHistory: [sampleProblem.problemStatement, '3x - 7 = 14'],
          studentInput: '3x = 20' // Incorrect arithmetic
        };

        const result = validateStep(context);
        expect(result.result).toBe('EQUIVALENCE_FAILURE');
        expect(result.isCorrect).toBe(false);
        expect(result.shouldAdvance).toBe(false);
      });
    });

    describe('parsing error', () => {
      it('should return PARSING_ERROR for malformed input', () => {
        const context: ValidationContext = {
          problemModel: sampleProblem,
          userHistory: [sampleProblem.problemStatement],
          studentInput: '3x ++ 5 = 14'
        };

        const result = validateStep(context);
        expect(result.result).toBe('PARSING_ERROR');
        expect(result.isCorrect).toBe(false);
        expect(result.shouldAdvance).toBe(false);
        expect(result.errorMessage).toBeDefined();
      });
    });
  });

  describe('isProblemSolved', () => {
    it('should return true when problem is completely solved', () => {
      const context: ValidationContext = {
        problemModel: sampleProblem,
        userHistory: [
          sampleProblem.problemStatement,
          '4x - 12 - x + 5 = 14',
          '3x - 7 = 14',
          '3x = 21',
          'x = 7'
        ],
        studentInput: ''
      };

      expect(isProblemSolved(context)).toBe(true);
    });

    it('should return false when problem is not solved', () => {
      const context: ValidationContext = {
        problemModel: sampleProblem,
        userHistory: [
          sampleProblem.problemStatement,
          '4x - 12 - x + 5 = 14',
          '3x - 7 = 14'
        ],
        studentInput: ''
      };

      expect(isProblemSolved(context)).toBe(false);
    });

    it('should return false for empty history', () => {
      const context: ValidationContext = {
        problemModel: sampleProblem,
        userHistory: [],
        studentInput: ''
      };

      expect(isProblemSolved(context)).toBe(false);
    });

    it('should return false when final step is correct but not simplified', () => {
      const context: ValidationContext = {
        problemModel: sampleProblem,
        userHistory: [
          sampleProblem.problemStatement,
          '4x - 12 - x + 5 = 14',
          '3x - 7 = 14',
          '3x = 21',
          'x = 21/3' // Correct but not simplified
        ],
        studentInput: ''
      };

      expect(isProblemSolved(context)).toBe(false);
    });
  });

  describe('getExpectedNextSteps', () => {
    it('should return remaining teacher steps', () => {
      const context: ValidationContext = {
        problemModel: sampleProblem,
        userHistory: [
          sampleProblem.problemStatement,
          '4x - 12 - x + 5 = 14',
          '3x - 7 = 14'
        ],
        studentInput: ''
      };

      const nextSteps = getExpectedNextSteps(context);
      expect(nextSteps).toEqual([
        '3x - 7 = 14', // Current step
        '3x = 21',
        'x = 7'
      ]);
    });

    it('should return all steps when history only contains problem statement', () => {
      const context: ValidationContext = {
        problemModel: sampleProblem,
        userHistory: [sampleProblem.problemStatement],
        studentInput: ''
      };

      const nextSteps = getExpectedNextSteps(context);
      expect(nextSteps).toEqual(sampleProblem.teacherModel.steps);
    });
  });

  describe('integration with different problem types', () => {
    const simplifyProblem: ProblemModel = {
      problemId: 'p-201',
      problemStatement: 'Simplify: 3(x - 2y) + 2(y + 4x)',
      problemType: 'SIMPLIFY_EXPRESSION',
      teacherModel: {
        type: 'sequential_steps',
        steps: [
          '3x - 6y + 2y + 8x',
          '11x - 4y'
        ]
      }
    };

    it('should handle SIMPLIFY_EXPRESSION problems', () => {
      const context: ValidationContext = {
        problemModel: simplifyProblem,
        userHistory: [simplifyProblem.problemStatement],
        studentInput: '3x - 6y + 2y + 8x'
      };

      const result = validateStep(context);
      expect(result.result).toBe('CORRECT_INTERMEDIATE_STEP');
      expect(result.isCorrect).toBe(true);
    });

    it('should validate final simplification step', () => {
      const context: ValidationContext = {
        problemModel: simplifyProblem,
        userHistory: [simplifyProblem.problemStatement, '3x - 6y + 2y + 8x'],
        studentInput: '11x - 4y'
      };

      const result = validateStep(context);
      expect(result.result).toBe('CORRECT_FINAL_STEP');
      expect(result.isCorrect).toBe(true);
    });
  });
}); 