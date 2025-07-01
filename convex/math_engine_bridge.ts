/**
 * Migration Bridge: Maintains existing API while migrating internals to CortexJS
 * This file gradually replaces MathJS functions with CortexJS equivalents
 * while keeping the same function signatures for backward compatibility.
 */

import { ComputeEngine } from "@cortex-js/compute-engine";
import type { MathNode } from "mathjs"; // Keep for backward compatibility during migration
import { MathParsingError } from "../src/types";
import type { SimplificationPattern, TreeAnalysisResult } from "../src/types";

// Import original MathJS functions (will be gradually replaced)
import {
  validateMathInputSyntax as mathJSValidateMathInputSyntax,
  getCanonical as mathJSGetCanonical,
  areEquivalent as mathJSAreEquivalent,
  isFullySimplified as mathJSIsFullySimplified,
  analyzeExpressionTree as mathJSAnalyzeExpressionTree,
  getEnhancedCanonical as mathJSGetEnhancedCanonical,
  applyCanonicalTransformation as mathJSApplyCanonicalTransformation,
  normalizeCoefficients as mathJSNormalizeCoefficients,
  areCanonicallyEquivalent as mathJSAreCanonicallyEquivalent,
  getSimplificationFeedback as mathJSGetSimplificationFeedback,
} from "./math_engine";

// Import new CortexJS functions
import {
  parseTextExpression,
  parseLatexExpression,
  checkEquivalence,
  isFullySimplifiedCortex,
  getCanonicalCortex,
  getComputeEngine,
  analyzeExpressionTreeCortex,
  simplifyExpression,
  toLatex,
} from "./cortex_math_engine";

const ce = new ComputeEngine();

// Feature flag to control migration rollout
const USE_CORTEX_JS = true; // Enable CortexJS by default

/**
 * Bridge function: validateMathInputSyntax
 * Maintains the existing API while optionally using CortexJS internally
 */
export function validateMathInputSyntax(input: string): {
  trimmedInput: string;
  isEquation: boolean;
  leftSide?: string;
  rightSide?: string;
} {
  if (USE_CORTEX_JS) {
    // CortexJS implementation
    const trimmedInput = input.trim();

    if (!trimmedInput) {
      throw new MathParsingError("Empty input provided", input);
    }

    // Basic validation for malformed expressions
    if (/\+\+|\-\-\-|\/\/|\*\*/.test(trimmedInput.replace(/\s/g, ""))) {
      throw new MathParsingError(
        "Invalid mathematical expression: consecutive operators detected",
        input,
      );
    }

    // Handle equations (contains '=')
    if (trimmedInput.includes("=")) {
      const sides = trimmedInput.split("=");

      if (sides.length !== 2) {
        throw new MathParsingError(
          "Invalid equation format: equations must have exactly one equals sign",
          input,
        );
      }

      const [leftSide, rightSide] = sides;

      if (!leftSide.trim() || !rightSide.trim()) {
        throw new MathParsingError(
          "Invalid equation format: both sides of equation must contain expressions",
          input,
        );
      }

      // Validate both sides can be parsed
      try {
        parseTextExpression(leftSide.trim());
        parseTextExpression(rightSide.trim());
      } catch (error) {
        throw new MathParsingError(
          `Invalid equation: ${error instanceof Error ? error.message : "Unknown parsing error"}`,
          input,
        );
      }

      return {
        trimmedInput,
        isEquation: true,
        leftSide: leftSide.trim(),
        rightSide: rightSide.trim(),
      };
    }

    // Validate single expression
    try {
      parseTextExpression(trimmedInput);
    } catch (error) {
      throw new MathParsingError(
        `Invalid expression: ${error instanceof Error ? error.message : "Unknown parsing error"}`,
        input,
      );
    }

    return {
      trimmedInput,
      isEquation: false,
    };
  } else {
    // Fallback to original MathJS implementation
    return mathJSValidateMathInputSyntax(input);
  }
}

/**
 * Bridge function: getCanonical
 * Gradually migrate from MathJS to CortexJS
 */
export function getCanonical(input: string): any {
  if (USE_CORTEX_JS) {
    try {
      const parsed = validateMathInputSyntax(input);

      if (parsed.isEquation && parsed.leftSide && parsed.rightSide) {
        // Transform A = B into A - B for canonical form
        const leftExpr = parseTextExpression(parsed.leftSide);
        const rightExpr = parseTextExpression(parsed.rightSide);
        
        // Create difference expression: left - right
        const difference = ce.box(["Subtract", leftExpr, rightExpr]);
        return difference.canonical;
      }

      // Handle regular expressions
      const expr = parseTextExpression(parsed.trimmedInput);
      return expr.canonical;
    } catch (error) {
      if (error instanceof MathParsingError) {
        throw error;
      }
      throw new MathParsingError(
        `Failed to get canonical form: ${error instanceof Error ? error.message : "Unknown error"}`,
        input,
      );
    }
  } else {
    // Fallback to original MathJS implementation
    return mathJSGetCanonical(input);
  }
}

/**
 * Bridge function: areEquivalent
 * Gradually migrate from MathJS to CortexJS
 */
export function areEquivalent(expr1: string, expr2: string): boolean {
  if (USE_CORTEX_JS) {
    try {
      return checkEquivalence(expr1, expr2);
    } catch {
      // If CortexJS fails, fallback to MathJS
      return mathJSAreEquivalent(expr1, expr2);
    }
  } else {
    return mathJSAreEquivalent(expr1, expr2);
  }
}

/**
 * Bridge function: isFullySimplified
 * Gradually migrate from MathJS to CortexJS
 */
export function isFullySimplified(input: string): boolean {
  if (USE_CORTEX_JS) {
    try {
      return isFullySimplifiedCortex(input);
    } catch {
      // If CortexJS fails, fallback to MathJS
      return mathJSIsFullySimplified(input);
    }
  } else {
    return mathJSIsFullySimplified(input);
  }
}

/**
 * Bridge function: analyzeExpressionTree
 * Use CortexJS implementation when enabled
 */
export function analyzeExpressionTree(input: string): TreeAnalysisResult {
  if (USE_CORTEX_JS) {
    try {
      return analyzeExpressionTreeCortex(input);
    } catch {
      // If CortexJS fails, fallback to MathJS
      return mathJSAnalyzeExpressionTree(input);
    }
  } else {
    return mathJSAnalyzeExpressionTree(input);
  }
}

/**
 * Utility function to check which engine is being used
 */
export function getCurrentMathEngine(): "mathjs" | "cortexjs" {
  return USE_CORTEX_JS ? "cortexjs" : "mathjs";
}

/**
 * Utility function to parse expressions with automatic fallback
 */
export function parseWithFallback(input: string): any {
  if (USE_CORTEX_JS) {
    try {
      return parseTextExpression(input);
    } catch {
      // If CortexJS fails, we could fallback to MathJS if needed
      throw new MathParsingError("Failed to parse expression with CortexJS", input);
    }
  } else {
    // Use existing MathJS parsing logic
    const parsed = mathJSValidateMathInputSyntax(input);
    return mathJSGetCanonical(parsed.trimmedInput);
  }
}

/**
 * Bridge function: getEnhancedCanonical
 * Provides enhanced canonical form with additional normalization
 */
export function getEnhancedCanonical(input: string): any {
  if (USE_CORTEX_JS) {
    try {
      const parsed = validateMathInputSyntax(input);
      
      if (parsed.isEquation && parsed.leftSide && parsed.rightSide) {
        // Transform A = B into A - B for canonical form
        const leftExpr = parseTextExpression(parsed.leftSide);
        const rightExpr = parseTextExpression(parsed.rightSide);
        
        // Create difference expression and normalize
        const difference = ce.box(["Subtract", leftExpr, rightExpr]);
        const normalized = difference.canonical;
        
        // Apply additional normalization steps
        return normalized.expand().simplify();
      }
      
      // Handle regular expressions with enhanced normalization
      const expr = parseTextExpression(parsed.trimmedInput);
      const normalized = expr.canonical;
      return normalized.expand().simplify();
    } catch (error) {
      if (error instanceof MathParsingError) {
        throw error;
      }
      throw new MathParsingError(
        `Failed to get enhanced canonical form: ${error instanceof Error ? error.message : "Unknown error"}`,
        input,
      );
    }
  } else {
    return mathJSGetEnhancedCanonical(input);
  }
}

/**
 * Bridge function: applyCanonicalTransformation
 * Applies canonical transformations to normalize expressions
 */
export function applyCanonicalTransformation(expr: any): any {
  if (USE_CORTEX_JS) {
    try {
      const boxed = typeof expr === 'string' ? parseTextExpression(expr) : expr;
      return boxed.canonical.expand().simplify();
    } catch {
      // If CortexJS fails, fallback to MathJS
      return mathJSApplyCanonicalTransformation(expr);
    }
  } else {
    return mathJSApplyCanonicalTransformation(expr);
  }
}

/**
 * Bridge function: normalizeCoefficients
 * Normalizes coefficients in expressions
 */
export function normalizeCoefficients(expr: any): any {
  if (USE_CORTEX_JS) {
    try {
      const boxed = typeof expr === 'string' ? parseTextExpression(expr) : expr;
      // CortexJS handles coefficient normalization in canonical form
      return boxed.canonical;
    } catch {
      // If CortexJS fails, fallback to MathJS
      return mathJSNormalizeCoefficients(expr);
    }
  } else {
    return mathJSNormalizeCoefficients(expr);
  }
}

/**
 * Bridge function: areCanonicallyEquivalent
 * Checks if expressions are equivalent using canonical forms
 */
export function areCanonicallyEquivalent(expr1: string, expr2: string): boolean {
  if (USE_CORTEX_JS) {
    try {
      const canonical1 = getEnhancedCanonical(expr1);
      const canonical2 = getEnhancedCanonical(expr2);
      return canonical1.isEqual(canonical2) ?? false;
    } catch {
      // If CortexJS fails, fallback to MathJS
      return mathJSAreCanonicallyEquivalent(expr1, expr2);
    }
  } else {
    return mathJSAreCanonicallyEquivalent(expr1, expr2);
  }
}

/**
 * Bridge function: getSimplificationFeedback
 * Generates user-friendly feedback for simplification patterns
 */
export function getSimplificationFeedback(patterns: SimplificationPattern[]): string[] {
  if (USE_CORTEX_JS) {
    return patterns.map(pattern => {
      switch (pattern.type) {
        case "CONSTANT_ARITHMETIC":
          return `You can simplify the arithmetic: ${pattern.suggestion}`;
        case "LIKE_TERMS":
          return `You can combine like terms: ${pattern.suggestion}`;
        case "DISTRIBUTIVE":
          return `You can apply the distributive property: ${pattern.suggestion}`;
        case "COEFFICIENT_NORMALIZATION":
          return `You can normalize the coefficients: ${pattern.suggestion}`;
        default:
          return pattern.suggestion;
      }
    });
  } else {
    return mathJSGetSimplificationFeedback(patterns);
  }
} 