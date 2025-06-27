// Core mathematical engine exports
export {
  getCanonical,
  isFullySimplified,
  areEquivalent,
  MathParsingError
} from '../math-engine';

// Validation engine exports
export {
  validateStep,
  isProblemSolved,
  getExpectedNextSteps,
  type ValidationResult,
  type StepValidationResult,
  type ProblemModel,
  type ValidationContext
} from '../validation-engine'; 