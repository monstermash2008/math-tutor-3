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
 * Check if an expression is fully simplified using CortexJS
 */
export function isFullySimplifiedCortex(input: string): boolean {
  try {
    // Parse with canonical: false to preserve original structure
    const originalStructure = ce.parse(input, { canonical: false });
    
    // Get the canonical (auto-simplified) version
    const canonical = ce.parse(input);
    
    // Check if the structures are meaningfully different (not just operator representation)
    if (!originalStructure.isSame(canonical)) {
      // Check if this is just a cosmetic difference (e.g., InvisibleOperator vs Multiply)
      if (!isJustCosmeticDifference(originalStructure, canonical)) {
        return false;
      }
    }
    
    // Also check if further simplification is possible
    const simplified = canonical.simplify();
    return canonical.isEqual(simplified) ?? false;
  } catch {
    return false;
  }
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
 * Analyze an expression tree using CortexJS
 */
export function analyzeExpressionTreeCortex(input: string): TreeAnalysisResult {
  try {
    // Parse with canonical: false to preserve original structure for analysis
    const originalStructure = ce.parse(input, { canonical: false });
    
    // Also get the canonical form for comparison
    const expr = ce.parse(input);

    // Initialize patterns array
    const patterns: SimplificationPattern[] = [];

    // Check for constant arithmetic opportunities
    const constantOps = findConstantOperations(expr);
    patterns.push(...constantOps);

    // Check for like terms
    const likeTerms = findLikeTermsPatterns(expr);
    patterns.push(...likeTerms);

    // Check for distributive opportunities
    const distributive = findDistributiveOpportunities(expr);
    patterns.push(...distributive);

    // Use the enhanced simplification check
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

// No need for complex GCD calculations - CortexJS handles simplification detection

/**
 * Check if the difference between two expressions is just cosmetic (operator representation)
 * rather than a meaningful mathematical simplification
 */
function isJustCosmeticDifference(original: BoxedExpression, canonical: BoxedExpression): boolean {
  try {
    // Check for specific cosmetic differences we know about
    const originalJson = original.json;
    const canonicalJson = canonical.json;
    
    // Helper function to normalize operators for comparison
    function normalizeOperators(json: any): any {
      if (Array.isArray(json)) {
        const [op, ...args] = json;
        
        // Normalize InvisibleOperator to Multiply
        const normalizedOp = op === 'InvisibleOperator' ? 'Multiply' : op;
        
        // Recursively normalize arguments
        const normalizedArgs = args.map(arg => normalizeOperators(arg));
        
        return [normalizedOp, ...normalizedArgs];
      }
      
      return json;
    }
    
    // Normalize both expressions and compare
    const normalizedOriginal = normalizeOperators(originalJson);
    const normalizedCanonical = normalizeOperators(canonicalJson);
    
    // If they're the same after normalization, it's just cosmetic
    return JSON.stringify(normalizedOriginal) === JSON.stringify(normalizedCanonical);
  } catch {
    return false;
  }
}

/**
 * Find constant arithmetic operations in the expression
 */
function findConstantOperations(expr: BoxedExpression): SimplificationPattern[] {
  const patterns: SimplificationPattern[] = [];
  
  // Get the expression tree
  const tree = expr.json as CortexTreeNode;
  
  // Helper function to check if a node represents a constant operation
  function isConstantOperation(node: CortexTreeNode): boolean {
    if (Array.isArray(node) && node.length > 0) {
      const [op, ...args] = node;
      // Check if it's an arithmetic operation
      if (['+', '-', '*', '/'].includes(op)) {
        // Check if all arguments are numbers
        return args.every(arg => typeof arg === 'number' || (Array.isArray(arg) && arg[0] === 'Number'));
      }
    }
    return false;
  }
  
  // Helper function to traverse the tree
  function traverse(node: CortexTreeNode) {
    if (Array.isArray(node)) {
      if (isConstantOperation(node)) {
        const boxedNode = ce.box(['Arithmetic', ...node] as CortexNode);
        patterns.push({
          type: "CONSTANT_ARITHMETIC",
          description: `Constant arithmetic operation: ${boxedNode.latex}`,
          nodes: [boxedNode],
          suggestion: `Simplify: ${boxedNode.latex} = ${boxedNode.simplify().latex}`,
        });
      }
      // Recursively traverse child nodes
      node.forEach(child => traverse(child));
    }
  }
  
  traverse(tree);
  return patterns;
}

/**
 * Find like terms in the expression
 */
function findLikeTermsPatterns(expr: BoxedExpression): SimplificationPattern[] {
  const patterns: SimplificationPattern[] = [];
  
  // Get the expression tree
  const tree = expr.json as CortexTreeNode;
  
  // Helper function to get the variable part of a term
  function getVariablePart(node: CortexTreeNode): string {
    if (typeof node === 'number' || (Array.isArray(node) && node[0] === 'Number')) {
      return '1';
    }
    if (typeof node === 'string') {
      return node;
    }
    if (Array.isArray(node)) {
      const [op, ...args] = node;
      if (op === '*') {
        // For multiplication, extract non-constant factors
        const nonConstantFactors = args.filter(arg => 
          !(typeof arg === 'number' || (Array.isArray(arg) && arg[0] === 'Number'))
        );
        if (nonConstantFactors.length === 0) {
          return '1';
        }
        const boxedFactors = ce.box(['Multiply', ...nonConstantFactors] as CortexNode);
        return boxedFactors.latex;
      }
    }
    return ce.box(['Symbol', node.toString()] as CortexNode).latex;
  }
  
  // Helper function to find like terms
  function findLikeTerms(node: CortexTreeNode) {
    if (Array.isArray(node) && node[0] === '+') {
      const terms = node.slice(1) as CortexTreeNode[];
      const termsByVariable = new Map<string, CortexTreeNode[]>();
      
      terms.forEach((term: CortexTreeNode) => {
        const varPart = getVariablePart(term);
        if (!termsByVariable.has(varPart)) {
          termsByVariable.set(varPart, []);
        }
        termsByVariable.get(varPart)?.push(term);
      });
      
      termsByVariable.forEach((terms, varPart) => {
        if (terms.length > 1) {
          const boxedTerms = terms.map(t => ce.box(['Term', t] as CortexNode));
          patterns.push({
            type: "LIKE_TERMS",
            description: `Like terms with variable part: ${varPart}`,
            nodes: boxedTerms,
            suggestion: `Combine like terms: ${boxedTerms.map(t => t.latex).join(' + ')}`,
          });
        }
      });
    }
    
    // Recursively traverse child nodes
    if (Array.isArray(node)) {
      node.forEach((child: CortexTreeNode) => findLikeTerms(child));
    }
  }
  
  findLikeTerms(tree);
  return patterns;
}

/**
 * Find distributive opportunities in the expression
 */
function findDistributiveOpportunities(expr: BoxedExpression): SimplificationPattern[] {
  const patterns: SimplificationPattern[] = [];
  
  // Get the expression tree
  const tree = expr.json as CortexTreeNode;
  
  // Helper function to check for distributive opportunities
  function hasDistributive(node: CortexTreeNode): boolean {
    if (Array.isArray(node) && node[0] === '*') {
      const args = node.slice(1) as CortexTreeNode[];
      // Check if one argument is a sum/difference
      return args.some((arg: CortexTreeNode) => 
        Array.isArray(arg) && (arg[0] === '+' || arg[0] === '-')
      );
    }
    return false;
  }
  
  // Helper function to traverse the tree
  function traverse(node: CortexTreeNode) {
    if (Array.isArray(node)) {
      if (hasDistributive(node)) {
        const boxedNode = ce.box(['Multiply', ...node.slice(1)] as CortexNode);
        patterns.push({
          type: "DISTRIBUTIVE",
          description: `Distributive property opportunity: ${boxedNode.latex}`,
          nodes: [boxedNode],
          suggestion: `Distribute: ${boxedNode.latex} = ${boxedNode.expand().latex}`,
        });
      }
      // Recursively traverse child nodes
      node.forEach((child: CortexTreeNode) => traverse(child));
    }
  }
  
  traverse(tree);
  return patterns;
} 