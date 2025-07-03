import { ComputeEngine, BoxedExpression, SemiBoxedExpression, NumericValue } from "@cortex-js/compute-engine";
import { MathParsingError } from "../src/types";
import type { SimplificationPattern, TreeAnalysisResult } from "../src/types";

// Initialize CortexJS Compute Engine
const ce = new ComputeEngine();

// Type definitions for CortexJS expression tree nodes
type CortexNode = readonly [string, ...SemiBoxedExpression[]];
type CortexOperator = '+' | '-' | '*' | '/';
type CortexTreeNode = number | string | CortexNode;

/**
 * Parse a LaTeX expression using CortexJS Compute Engine
 */
export function parseLatexExpression(latex: string): BoxedExpression {
  try {
    return ce.parse(latex);
  } catch (error) {
    throw new MathParsingError(
      `Failed to parse LaTeX expression: ${error instanceof Error ? error.message : "Unknown error"}`,
      latex,
    );
  }
}

/**
 * Parse a text expression, handling both LaTeX and plain text input
 */
export function parseTextExpression(text: string): BoxedExpression {
  try {
    // First try parsing as-is (handles plain text like "2x + 3")
    return ce.parse(text);
  } catch {
    try {
      // If that fails, try wrapping in LaTeX text command
      return ce.parse(`\\text{${text}}`);
    } catch (error) {
      throw new MathParsingError(
        `Failed to parse text expression: ${error instanceof Error ? error.message : "Unknown error"}`,
        text,
      );
    }
  }
}

/**
 * Simplify an expression using CortexJS
 */
export function simplifyExpression(expr: BoxedExpression): BoxedExpression {
  try {
    return expr.simplify();
  } catch (error) {
    throw new MathParsingError(
      `Failed to simplify expression: ${error instanceof Error ? error.message : "Unknown error"}`,
      expr.toString(),
    );
  }
}

/**
 * Check if two expressions are equivalent using CortexJS
 */
export function checkEquivalence(expr1: string, expr2: string): boolean {
  try {
    const parsed1 = ce.parse(expr1);
    const parsed2 = ce.parse(expr2);
    return parsed1.isEqual(parsed2) ?? false;
  } catch {
    return false;
  }
}

/**
 * Get the LaTeX representation of an expression
 */
export function toLatex(expr: BoxedExpression): string {
  try {
    return expr.latex;
  } catch {
    return expr.toString();
  }
}

/**
 * Get the canonical form of an expression using CortexJS
 */
export function getCanonicalCortex(input: string): BoxedExpression {
  try {
    const parsed = ce.parse(input);
    return parsed.canonical;
  } catch (error) {
    throw new MathParsingError(
      `Failed to get canonical form: ${error instanceof Error ? error.message : "Unknown error"}`,
      input,
    );
  }
}

/**
 * Check if an expression is fully simplified using CortexJS syntax tree analysis
 */
export function isFullySimplifiedCortex(input: string): boolean {
  try {
    // For certain patterns, check the input text before CortexJS auto-simplifies
    if (hasObviousUnsimplifiedPatterns(input)) {
      return false;
    }
    
    const original = ce.parse(input);
    const simplified = original.simplify();
    
    // Primary check: if simplification changes the expression, it's not fully simplified
    if (!original.isEqual(simplified)) {
      return false;
    }
    
    // Use syntax tree analysis to detect remaining unsimplified patterns
    return !hasUnsimplifiedPatterns(original);
  } catch {
    return false;
  }
}

/**
 * Check for obvious unsimplified patterns in the input text before parsing
 * This catches patterns that CortexJS auto-simplifies during parsing
 */
function hasObviousUnsimplifiedPatterns(input: string): boolean {
  const trimmed = input.replace(/\s/g, '');
  
  // Check for obvious arithmetic that should be calculated - both pure numbers and algebraic fractions
  // Pure numeric fractions like 6/2, 10/5
  if (/\b\d+\/\d+\b/.test(trimmed)) {
    const fractionMatch = trimmed.match(/(\d+)\/(\d+)/);
    if (fractionMatch) {
      const num = Number.parseInt(fractionMatch[1]);
      const den = Number.parseInt(fractionMatch[2]);
      if (num % den === 0 || getGCD(num, den) > 1) {
        return true;
      }
    }
  }
  
  // Algebraic fractions like 2x/2, 6x/3, 4xy/2
  if (/\b\d+[a-zA-Z]+\/\d+\b/.test(trimmed)) {
    const algebraicFractionMatch = trimmed.match(/(\d+)([a-zA-Z]+)\/(\d+)/);
    if (algebraicFractionMatch) {
      const coeff = Number.parseInt(algebraicFractionMatch[1]);
      const den = Number.parseInt(algebraicFractionMatch[3]);
      if (coeff % den === 0 || getGCD(coeff, den) > 1) {
        return true;
      }
    }
  }
  
  // Check for addition/subtraction with zero
  if (/(^|[+\-])\s*0\s*[+\-]|[+\-]\s*0\s*($|[+\-])/.test(trimmed)) {
    return true;
  }
  
  // Check for multiplication by 1 or 0
  if (/\*\s*1\b|\b1\s*\*|^\s*1\s*\*|[^a-zA-Z]\s*1\s*\*/.test(trimmed)) {
    return true;
  }
  
  if (/\*\s*0\b|\b0\s*\*/.test(trimmed)) {
    return true;
  }
  
  // Check for basic constant arithmetic
  if (/\b\d+\s*[+\-\*\/]\s*\d+\b/.test(trimmed)) {
    return true;
  }
  
  // Check for like terms (simple cases)
  // Pattern for terms like "3x + 5x" or "2a - 3a + a"
  const termPattern = /(\d*[a-zA-Z]+)/g;
  const terms = [];
  let match;
  while ((match = termPattern.exec(trimmed)) !== null) {
    terms.push(match[1]);
  }
  
  if (terms.length > 1) {
    // Group by variable part
    const variableGroups = new Map<string, number>();
    for (const term of terms) {
      const varMatch = term.match(/([a-zA-Z]+)/);
      if (varMatch) {
        const variable = varMatch[1];
        variableGroups.set(variable, (variableGroups.get(variable) || 0) + 1);
      }
    }
    
    // If any variable appears more than once, we have like terms
    for (const count of variableGroups.values()) {
      if (count > 1) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if a BoxedExpression contains unsimplified patterns using syntax tree analysis
 * This focuses on patterns that survive CortexJS auto-simplification
 */
function hasUnsimplifiedPatterns(expr: BoxedExpression): boolean {
  // Check for like terms that can be combined (these can still exist after parsing)
  if (hasLikeTerms(expr)) {
    return true;
  }
  
  // Check for distributive opportunities
  if (hasDistributiveOpportunities(expr)) {
    return true;
  }
  
  // Most other patterns (constant arithmetic, identity operations, obvious fractions)
  // are automatically simplified by CortexJS during parsing, so we don't need to check for them here
  
  return false;
}

/**
 * Check for distributive opportunities that might not be automatically expanded
 */
function hasDistributiveOpportunities(expr: BoxedExpression): boolean {
  const op = expr.operator;
  
  if (op === 'Multiply') {
    const args = expr.ops;
    if (!args) return false;
    
    // Check if any argument is a sum that could be distributed
    for (const arg of args) {
      if (arg.operator === 'Add') {
        return true;
      }
    }
  }
  
  // Recursively check operands
  const args = expr.ops;
  if (args) {
    for (const arg of args) {
      if (hasDistributiveOpportunities(arg)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if expression contains constant arithmetic operations using syntax tree
 */
function hasConstantArithmetic(expr: BoxedExpression): boolean {
  const op = expr.operator;
  
  if (['Add', 'Subtract', 'Multiply', 'Divide'].includes(op)) {
    const args = expr.ops;
    
    // Check if all operands are pure numbers
    if (args && args.length >= 2 && args.every(arg => arg.isNumber)) {
      return true;
    }
    
    // Recursively check operands
    if (args) {
      for (const arg of args) {
        if (hasConstantArithmetic(arg)) {
          return true;
        }
      }
    }
  }
  
  return false;
}

/**
 * Check if expression has like terms that can be combined using syntax tree
 */
function hasLikeTerms(expr: BoxedExpression): boolean {
  const op = expr.operator;
  
  if (op === 'Add') {
    const args = expr.ops;
    if (!args) return false;
    
    // Group terms by their variable part
    const termGroups = new Map<string, number>();
    
    for (const arg of args) {
      const variablePart = getVariablePart(arg);
      const count = termGroups.get(variablePart) || 0;
      termGroups.set(variablePart, count + 1);
    }
    
    // If any variable part appears more than once, we have like terms
    for (const count of termGroups.values()) {
      if (count > 1) {
        return true;
      }
    }
  }
  
  // Recursively check operands
  const args = expr.ops;
  if (args) {
    for (const arg of args) {
      if (hasLikeTerms(arg)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Extract the variable part of a term for like-term detection
 */
function getVariablePart(expr: BoxedExpression): string {
  const op = expr.operator;
  
  // If it's just a pure number, the variable part is "1" (constant term)
  if (op === 'Number') {
    return "1";
  }
  
  // If it's just a symbol, that's the variable part
  if (op === 'Symbol' && expr.symbol) {
    return expr.symbol;
  }
  
  // For multiplication, extract non-constant factors and build variable part
  if (op === 'Multiply') {
    const args = expr.ops;
    if (!args) return expr.latex;
    
    const variableFactors: string[] = [];
    
    for (const arg of args) {
      if (arg.operator !== 'Number') {
        // This is a variable factor
        if (arg.operator === 'Symbol' && arg.symbol) {
          variableFactors.push(arg.symbol);
        } else {
          // For complex factors (like powers), use the whole latex representation
          variableFactors.push(arg.latex);
        }
      }
    }
    
    if (variableFactors.length === 0) {
      return "1"; // All factors were constants
    }
    
    // Join variable factors to create the variable part
    return variableFactors.sort().join('*');
  }
  
  // For powers and other complex expressions, treat the whole expression as the variable part
  return expr.latex;
}

/**
 * Check for identity operations (x + 0, x * 1, 0 * x, etc.)
 */
function hasIdentityOperations(expr: BoxedExpression): boolean {
  const op = expr.operator;
  const args = expr.ops;
  
  if (!args) return false;
  
  // Check for addition with zero
  if (op === 'Add') {
    for (const arg of args) {
      if (arg.isNumber && arg.re === 0) {
        return true;
      }
    }
  }
  
  // Check for multiplication with one or zero
  if (op === 'Multiply') {
    for (const arg of args) {
      if (arg.isNumber && (arg.re === 1 || arg.re === 0)) {
        return true;
      }
    }
  }
  
  // Recursively check operands
  for (const arg of args) {
    if (hasIdentityOperations(arg)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check for unsimplified fractions using syntax tree
 */
function hasUnsimplifiedFractions(expr: BoxedExpression): boolean {
  const op = expr.operator;
  
  // Check for division where numerator and denominator have common factors
  if (op === 'Divide') {
    const args = expr.ops;
    if (args && args.length === 2) {
      const [numerator, denominator] = args;
      
      // Simple case: same factors in numerator and denominator
      if (numerator.isEqual(denominator)) {
        return true;
      }
      
      // Check for numeric fractions that can be simplified
      if (numerator.isNumber && denominator.isNumber) {
        const numValue = numerator.re;
        const denValue = denominator.re;
        if (Number.isInteger(numValue) && Number.isInteger(denValue) && denValue !== 0) {
          // Check if they have a common factor > 1
          const gcd = getGCD(Math.abs(numValue), Math.abs(denValue));
          if (gcd > 1) {
            return true;
          }
        }
      }
    }
  }
  
  // Recursively check operands
  const args = expr.ops;
  if (args) {
    for (const arg of args) {
      if (hasUnsimplifiedFractions(arg)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Calculate greatest common divisor
 */
function getGCD(a: number, b: number): number {
  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a;
}

/**
 * Evaluate an expression numerically
 */
export function evaluateNumerically(expr: BoxedExpression): number | undefined {
  try {
    const result = expr.N();
    if (result.isNumber && !Number.isNaN(result.re)) {
      return result.re;
    }
    return Number.isNaN(result.re) ? Number.NaN : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Get the compute engine instance for advanced usage
 */
export function getComputeEngine(): ComputeEngine {
  return ce;
}

/**
 * Validate math input syntax (migrated from bridge)
 */
export function validateMathInputSyntax(input: string): {
  trimmedInput: string;
  isEquation: boolean;
  leftSide?: string;
  rightSide?: string;
} {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    throw new MathParsingError("Empty input provided", input);
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
}

/**
 * Alias for checkEquivalence to maintain API compatibility
 */
export function areEquivalent(expr1: string, expr2: string): boolean {
  return checkEquivalence(expr1, expr2);
}

/**
 * Enhanced canonical equivalence check
 */
export function areCanonicallyEquivalent(expr1: string, expr2: string): boolean {
  try {
    const parsed1 = ce.parse(expr1);
    const parsed2 = ce.parse(expr2);
    
    // Get canonical forms without aggressive simplification
    const canonical1 = parsed1.canonical;
    const canonical2 = parsed2.canonical;
    
    // For step validation, we want to check if expressions are the same
    // without doing mathematical transformations that change the form
    // So we compare canonical forms directly, not after expansion/simplification
    return canonical1.isEqual(canonical2) ?? false;
  } catch {
    return false;
  }
}

/**
 * Generate feedback based on simplification patterns
 */
export function getSimplificationFeedback(patterns: SimplificationPattern[]): string[] {
  const feedback: string[] = [];
  
  for (const pattern of patterns) {
    switch (pattern.type) {
      case "CONSTANT_ARITHMETIC":
        feedback.push("You can simplify the constant arithmetic operations");
        break;
      case "LIKE_TERMS":
        feedback.push("You can combine like terms");
        break;
      case "DISTRIBUTIVE":
        feedback.push("You can apply the distributive property");
        break;
      case "COEFFICIENT_NORMALIZATION":
        feedback.push("You can normalize the coefficients");
        break;
      default:
        feedback.push(pattern.suggestion);
    }
  }
  
  return feedback;
}

/**
 * Analyze an expression tree using CortexJS syntax tree analysis
 */
export function analyzeExpressionTreeCortex(input: string): TreeAnalysisResult {
  try {
    const expr = ce.parse(input);
    
    // Initialize patterns array
    const patterns: SimplificationPattern[] = [];

    // Use syntax tree analysis to find patterns
    const constantOps = findConstantOperationPatterns(expr);
    patterns.push(...constantOps);

    const likeTerms = findLikeTermPatterns(expr);
    patterns.push(...likeTerms);

    const distributive = findDistributivePatterns(expr);
    patterns.push(...distributive);

    const identityOps = findIdentityOperationPatterns(expr);
    patterns.push(...identityOps);

    // Check if fully simplified using our improved function
    const isFullySimplified = isFullySimplifiedCortex(input);
    const simplified = expr.simplify();
    const hasUnsimplifiedOps = !expr.isEqual(simplified);

    return {
      isFullySimplified: isFullySimplified && patterns.length === 0,
      patterns,
      hasUnsimplifiedOperations: hasUnsimplifiedOps || !isFullySimplified,
    };
  } catch (error) {
    // If parsing fails, return minimal analysis
    return {
      isFullySimplified: false,
      patterns: [],
      hasUnsimplifiedOperations: false,
    };
  }
}

/**
 * Find constant arithmetic patterns using syntax tree analysis
 */
function findConstantOperationPatterns(expr: BoxedExpression): SimplificationPattern[] {
  const patterns: SimplificationPattern[] = [];
  
  function traverse(node: BoxedExpression) {
    const op = node.operator;
    
    if (['Add', 'Subtract', 'Multiply', 'Divide'].includes(op)) {
      const args = node.ops;
      if (args && args.length >= 2 && args.every(arg => arg.isNumber)) {
        patterns.push({
          type: "CONSTANT_ARITHMETIC",
          description: `Constant arithmetic operation: ${node.latex}`,
          nodes: [node],
          suggestion: `Simplify: ${node.latex} = ${node.simplify().latex}`,
        });
      }
    }
    
    // Recursively traverse
    const args = node.ops;
    if (args) {
      for (const arg of args) {
        traverse(arg);
      }
    }
  }
  
  traverse(expr);
  return patterns;
}

/**
 * Find like term patterns using syntax tree analysis
 */
function findLikeTermPatterns(expr: BoxedExpression): SimplificationPattern[] {
  const patterns: SimplificationPattern[] = [];
  
  function traverse(node: BoxedExpression) {
    const op = node.operator;
    
    if (op === 'Add') {
      const args = node.ops;
      if (!args) return;
      
      // Group terms by their variable part
      const termGroups = new Map<string, BoxedExpression[]>();
      
      for (const arg of args) {
        const varPart = getVariablePart(arg);
        if (!termGroups.has(varPart)) {
          termGroups.set(varPart, []);
        }
        termGroups.get(varPart)?.push(arg);
      }
      
      // Find groups with multiple terms
      for (const [varPart, terms] of termGroups) {
        if (terms.length > 1 && varPart !== "1") { // Don't flag constants as like terms
          patterns.push({
            type: "LIKE_TERMS",
            description: `Like terms with variable part: ${varPart}`,
            nodes: terms,
            suggestion: `Combine like terms: ${terms.map(t => t.latex).join(' + ')}`,
          });
        }
      }
    }
    
    // Recursively traverse
    const args = node.ops;
    if (args) {
      for (const arg of args) {
        traverse(arg);
      }
    }
  }
  
  traverse(expr);
  return patterns;
}

/**
 * Find distributive patterns using syntax tree analysis
 */
function findDistributivePatterns(expr: BoxedExpression): SimplificationPattern[] {
  const patterns: SimplificationPattern[] = [];
  
  function traverse(node: BoxedExpression) {
    const op = node.operator;
    
    if (op === 'Multiply') {
      const args = node.ops;
      if (!args) return;
      
      // Check if any argument is a sum or difference
      for (const arg of args) {
        if (arg.operator === 'Add') {
          patterns.push({
            type: "DISTRIBUTIVE",
            description: `Distributive property opportunity: ${node.latex}`,
            nodes: [node],
            suggestion: `Distribute: ${node.latex} = ${node.expand().latex}`,
          });
          break;
        }
      }
    }
    
    // Recursively traverse
    const args = node.ops;
    if (args) {
      for (const arg of args) {
        traverse(arg);
      }
    }
  }
  
  traverse(expr);
  return patterns;
}

/**
 * Find identity operation patterns using syntax tree analysis
 */
function findIdentityOperationPatterns(expr: BoxedExpression): SimplificationPattern[] {
  const patterns: SimplificationPattern[] = [];
  
  function traverse(node: BoxedExpression) {
    const op = node.operator;
    const args = node.ops;
    
    if (!args) return;
    
         // Check for addition with zero
     if (op === 'Add') {
       for (const arg of args) {
         if (arg.isNumber && arg.re === 0) {
           patterns.push({
             type: "COEFFICIENT_NORMALIZATION",
             description: `Addition with zero: ${node.latex}`,
             nodes: [node],
             suggestion: `Remove zero: ${node.latex}`,
           });
           break;
         }
       }
     }
     
     // Check for multiplication with one or zero
     if (op === 'Multiply') {
       for (const arg of args) {
         if (arg.isNumber && arg.re === 1) {
           patterns.push({
             type: "COEFFICIENT_NORMALIZATION",
             description: `Multiplication by one: ${node.latex}`,
             nodes: [node],
             suggestion: `Remove multiplication by one: ${node.latex}`,
           });
           break;
         } else if (arg.isNumber && arg.re === 0) {
           patterns.push({
             type: "COEFFICIENT_NORMALIZATION",
             description: `Multiplication by zero: ${node.latex}`,
             nodes: [node],
             suggestion: `Simplify to zero: ${node.latex} = 0`,
           });
           break;
         }
       }
     }
    
    // Recursively traverse
    for (const arg of args) {
      traverse(arg);
    }
  }
  
  traverse(expr);
  return patterns;
} 