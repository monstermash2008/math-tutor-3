import {
	type ConstantNode,
	type MathNode,
	type OperatorNode,
	parse,
	simplify,
} from "mathjs";

import { MathParsingError } from "../src/types";
import type { SimplificationPattern, TreeAnalysisResult } from "../src/types";

/**
 * Validates input for obviously malformed expressions
 */
function validateMathInput(input: string): void {
	// Check for consecutive operators that are clearly malformed
	if (/\+\+|\-\-\-|\/\/|\*\*/.test(input.replace(/\s/g, ""))) {
		throw new MathParsingError(
			"Invalid mathematical expression: consecutive operators detected",
			input,
		);
	}
}

/**
 * Validates and parses mathematical input syntax
 * This is a lightweight validation function that extracts common parsing logic
 *
 * @param input - The mathematical string to validate and parse
 * @returns Parsed input data with validation completed
 * @throws MathParsingError if the input has syntax errors
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

	// Validate input for obviously malformed expressions
	validateMathInput(trimmedInput);

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

		return {
			trimmedInput,
			isEquation: true,
			leftSide: leftSide.trim(),
			rightSide: rightSide.trim(),
		};
	}

	return {
		trimmedInput,
		isEquation: false,
	};
}

/**
 * Normalizes equation canonical forms to ensure equivalent equations produce identical results
 * For example: both "3x = 9" and "9 = 3x" should produce the same canonical form
 */
function normalizeEquationCanonicalForm(node: MathNode): MathNode {
	try {
		// For expressions of the form A - B = 0 (canonical equation form)
		// We want to ensure consistent ordering: variables before constants
		
		const nodeStr = node.toString();
		
		// If the expression is a simple form like "9 - 3 * x", convert to "3 * x - 9"
		// Pattern: constant - variable*term -> variable*term - constant
		if (nodeStr.match(/^\d+\s*-\s*\d*\s*\*?\s*[a-zA-Z]/)) {
			// This is in the form "constant - variable", flip it to "variable - constant"
			const simplified = simplify(parse(`-(${nodeStr})`));
			return simplified;
		}
		
		// If the expression starts with a negative variable term, try to normalize
		if (nodeStr.match(/^-\d*[a-zA-Z]/) || nodeStr.startsWith("-(")) {
			// Multiply the entire expression by -1 to get positive leading coefficient
			const flipped = simplify(parse(`-(${nodeStr})`));
			return flipped;
		}
		
		return node;
	} catch {
		// If normalization fails, return the original node
		return node;
	}
}

export function getCanonical(input: string): MathNode {
	try {
		const parsed = validateMathInputSyntax(input);

		if (parsed.isEquation) {
			// Transform A = B into A - B and simplify
			const differenceExpression = `(${parsed.leftSide}) - (${parsed.rightSide})`;
			let node = parse(differenceExpression);
			node = simplify(node);
			
			// Normalize equation canonical form: ensure consistent sign
			node = normalizeEquationCanonicalForm(node);
			
			return node;
		}

		// Handle regular expressions
		const node = parse(parsed.trimmedInput);
		return simplify(node);
	} catch (error) {
		if (error instanceof MathParsingError) {
			throw error;
		}

		// Handle math.js parsing errors
		throw new MathParsingError(
			`Failed to parse mathematical expression: ${error instanceof Error ? error.message : "Unknown error"}`,
			input,
		);
	}
}

/**
 * Checks if a mathematical expression is in its fully simplified form
 * This compares the original expression with its simplified version
 *
 * @param input - The mathematical string to check
 * @returns true if the expression is fully simplified, false otherwise
 */
export function isFullySimplified(input: string): boolean {
	try {
		const parsed = validateMathInputSyntax(input);

		if (parsed.isEquation && parsed.leftSide && parsed.rightSide) {
			// Check if both sides are individually simplified
			const leftSimplified = isExpressionSimplified(parsed.leftSide);
			const rightSimplified = isExpressionSimplified(parsed.rightSide);

			return leftSimplified && rightSimplified;
		}

		// Handle regular expressions
		return isExpressionSimplified(parsed.trimmedInput);
	} catch {
		// If validation or parsing fails, it's not a valid simplified expression
		return false;
	}
}

/**
 * Helper function to check if a single expression (not equation) is simplified
 */
function isExpressionSimplified(expression: string): boolean {
	try {
		const node = parse(expression);
		const simplified = simplify(node);

		// Convert both to standardized string format for comparison
		const originalStr = node.toString({ implicit: "hide" });
		const simplifiedStr = simplified.toString({ implicit: "hide" });

		// If the strings are identical, no change occurred
		if (originalStr === simplifiedStr) {
			return true;
		}

		// Handle cosmetic changes (spacing, explicit multiplication)
		// These don't represent meaningful simplification
		const normalize = (str: string) =>
			str.replace(/\s/g, "").replace(/\*/g, "");

		if (normalize(originalStr) === normalize(simplifiedStr)) {
			return true;
		}

		// Check if only term reordering occurred (e.g., '10 + 2x' -> '2x + 10')
		// Both expressions should have the same mathematical tokens
		const getTokens = (str: string) => {
			return normalize(str)
				.split(/[\+\-]/)
				.map((term) => term.trim())
				.filter((term) => term)
				.sort();
		};

		const originalTokens = getTokens(originalStr);
		const simplifiedTokens = getTokens(simplifiedStr);

		// If they have the same sorted tokens, it's just reordering
		if (JSON.stringify(originalTokens) === JSON.stringify(simplifiedTokens)) {
			return true;
		}

		// If we get here, the structure genuinely changed during simplification
		// This means the original was not fully simplified
		return false;
	} catch {
		return false;
	}
}

/**
 * Checks if two mathematical expressions are equivalent by computing their difference
 * Two expressions are equivalent if their difference simplifies to zero
 *
 * @param expr1 - First expression
 * @param expr2 - Second expression
 * @returns true if expressions are mathematically equivalent
 */
export function areEquivalent(expr1: string, expr2: string): boolean {
	try {
		// Validate both expressions to catch malformed input early
		validateMathInput(expr1);
		validateMathInput(expr2);

		// Phase 6b: Use enhanced canonical comparison for all cases
		const canonical1 = getEnhancedCanonical(expr1);
		const canonical2 = getEnhancedCanonical(expr2);

		// Tree-based comparison is the most reliable method
		if (canonical1.equals(canonical2)) {
			return true;
		}

		// Phase 6b: Use algebraic difference method for cases where canonical forms differ
		// If (expr1) - (expr2) simplifies to 0, then they're equivalent
		try {
			const difference = simplify(parse(`(${expr1}) - (${expr2})`));
			
			// Check if difference is zero
			if (difference.toString() === "0" || difference.equals(parse("0"))) {
				return true;
			}
			
			// Check if difference is a zero constant node
			if (difference.type === "ConstantNode" && (difference as ConstantNode).value === 0) {
				return true;
			}
			
			return false;
		} catch {
			// If difference calculation fails, try string-based fallback
			try {
				const str1 = canonical1.toString();
				const str2 = canonical2.toString();
				
				// Normalize whitespace and implicit multiplication
				const normalize = (s: string) => s.replace(/\s/g, "").replace(/\*/g, "");
				
				if (normalize(str1) === normalize(str2)) {
					return true;
				}
				
				// Apply term ordering normalization as final attempt
				const normalized1 = normalizeTermOrder(str1);
				const normalized2 = normalizeTermOrder(str2);
				
				return normalize(normalized1) === normalize(normalized2);
			} catch {
				return false;
			}
		}
	} catch {
		// If any step fails, expressions are not equivalent
		return false;
	}
}

/**
 * Phase 6b: Enhanced canonical form generation using tree transformation methods
 * Ensures mathematically equivalent expressions produce identical tree structures
 */
export function getEnhancedCanonical(input: string): MathNode {
	try {
		const parsed = validateMathInputSyntax(input);

		if (parsed.isEquation) {
			// Transform A = B into A - B and apply canonical transformation
			const differenceExpression = `(${parsed.leftSide}) - (${parsed.rightSide})`;
			let node = parse(differenceExpression);
			
			// Apply enhanced canonical transformation
			node = applyCanonicalTransformation(node);
			
			// Normalize equation canonical form: ensure consistent sign
			node = normalizeEquationCanonicalForm(node);
			
			return node;
		}

		// Handle regular expressions with enhanced canonical transformation
		const node = parse(parsed.trimmedInput);
		return applyCanonicalTransformation(node);
	} catch (error) {
		if (error instanceof MathParsingError) {
			throw error;
		}

		throw new MathParsingError(
			`Failed to parse mathematical expression: ${error instanceof Error ? error.message : "Unknown error"}`,
			input,
		);
	}
}

/**
 * Phase 6b: Ensure full expansion using aggressive simplification
 * Trust math.js's built-in expansion capabilities
 */
function expandDistributive(node: MathNode): MathNode {
	try {
		// Convert to string and reparse to trigger fresh simplification
		const nodeStr = node.toString();
		const reparsed = parse(nodeStr);
		
		// Apply aggressive simplification which includes distributive expansion
		const simplified = simplify(reparsed);
		
		return simplified;
	} catch {
		// If expansion fails, return the original node
		return node;
	}
}

/**
 * Phase 6b: Force full expansion of expressions by applying expand() function
 * This ensures distributive properties are fully expanded for canonical comparison
 */
function forceFullExpansion(node: MathNode): MathNode {
	try {
		// Use math.js's expand() function which forces full expansion
		const nodeStr = node.toString();
		
		// First try the expand function
		const expanded = parse(nodeStr);
		
		// Apply expansion using string-based approach for better control
		let expandedStr = nodeStr;
		
		// Force expansion of patterns like a*(b + c) -> a*b + a*c
		// Use a more aggressive approach to ensure all distributions are expanded
		try {
			const expandResult = simplify(expanded, ['expand']);
			return expandResult;
		} catch {
			// If expand rule fails, use manual approach
			return manualExpansion(expanded);
		}
	} catch {
		return node;
	}
}

/**
 * Phase 6b: Manual expansion for cases where math.js expand doesn't work
 */
function manualExpansion(node: MathNode): MathNode {
	try {
		// Convert to string and apply manual expansion patterns
		let exprStr = node.toString();
		
		// Expand patterns like 2*(x + 3) -> 2*x + 6
		// This is a simple regex-based expansion for common patterns
		exprStr = exprStr.replace(/(\d+)\s*\*\s*\(([^)]+)\)/g, (match, coeff, inner) => {
					// Split the inner expression by + and - while preserving signs
		const terms = inner.split(/(\+|\-)/).filter((t: string) => t.trim());
			let result = '';
			
			for (let i = 0; i < terms.length; i++) {
				const term = terms[i].trim();
				if (term === '+' || term === '-') {
					result += ` ${term} `;
				} else if (term) {
					if (result && !result.endsWith(' + ') && !result.endsWith(' - ')) {
						result += ' + ';
					}
					result += `${coeff} * ${term}`;
				}
			}
			
			return result;
		});
		
		return parse(exprStr);
	} catch {
		return node;
	}
}

/**
 * Phase 6b: Normalize expression ordering for consistent canonical forms
 * Handles term ordering that math.js doesn't guarantee
 */
function normalizeExpressionOrder(node: MathNode): MathNode {
	try {
		// Convert to normalized string representation and reparse
		const normalizedStr = normalizeTermOrder(node.toString());
		return parse(normalizedStr);
	} catch {
		return node;
	}
}

/**
 * Phase 6b: Normalize term ordering in expression strings using tree-based parsing
 * Implements consistent ordering rules: alphabetical variables, descending powers, constants last
 */
function normalizeTermOrder(expr: string): string {
	try {
		// Parse and simplify the expression first
		const parsed = parse(expr);
		const simplified = simplify(parsed);
		
		// Extract and sort terms properly
		const sortedExpr = sortExpressionTerms(simplified);
		return sortedExpr.toString();
	} catch {
		return expr;
	}
}

/**
 * Phase 6b: Sort expression terms using tree analysis
 * Provides consistent term ordering for canonical forms
 */
function sortExpressionTerms(node: MathNode): MathNode {
	try {
		// If it's not an addition/subtraction expression, return as-is
		if (node.type !== "OperatorNode") {
			return node;
		}
		
		const opNode = node as OperatorNode;
		if (opNode.op !== "+" && opNode.op !== "-") {
			return node;
		}
		
		// Extract all terms from the expression
		const terms = extractAllTerms(node);
		
		// Sort terms according to canonical rules
		const sortedTerms = terms.sort((a, b) => {
			return compareTerms(a, b);
		});
		
		// Reconstruct the expression
		return reconstructSortedExpression(sortedTerms);
	} catch {
		return node;
	}
}

/**
 * Phase 6b: Extract all terms from an expression with their signs
 */
function extractAllTerms(node: MathNode): Array<{ term: MathNode; isPositive: boolean }> {
	const terms: Array<{ term: MathNode; isPositive: boolean }> = [];
	
	function extract(currentNode: MathNode, sign: boolean) {
		if (currentNode.type === "OperatorNode") {
			const opNode = currentNode as OperatorNode;
			
			if (opNode.op === "+") {
				// For addition, process all arguments with current sign
				for (const arg of opNode.args) {
					extract(arg, sign);
				}
			} else if (opNode.op === "-") {
				if (opNode.args.length === 1) {
					// Unary minus
					extract(opNode.args[0], !sign);
				} else if (opNode.args.length === 2) {
					// Binary subtraction
					extract(opNode.args[0], sign);
					extract(opNode.args[1], !sign);
				}
			} else {
				// Other operators are treated as single terms
				terms.push({ term: currentNode, isPositive: sign });
			}
		} else {
			// Constants, symbols, etc. are single terms
			terms.push({ term: currentNode, isPositive: sign });
		}
	}
	
	extract(node, true);
	return terms;
}

/**
 * Phase 6b: Compare two terms for canonical ordering
 * Rules: constants last, then alphabetical by main variable, then descending by power
 */
function compareTerms(a: { term: MathNode; isPositive: boolean }, b: { term: MathNode; isPositive: boolean }): number {
	const termA = getTermInfo(a.term);
	const termB = getTermInfo(b.term);
	
	// Constants come last
	if (termA.isConstant !== termB.isConstant) {
		return termA.isConstant ? 1 : -1;
	}
	
	// If both are constants, order by value
	if (termA.isConstant && termB.isConstant) {
		return termA.value - termB.value;
	}
	
	// Order alphabetically by main variable
	if (termA.mainVariable !== termB.mainVariable) {
		return termA.mainVariable.localeCompare(termB.mainVariable);
	}
	
	// Same variable, order by descending power
	return termB.power - termA.power;
}

/**
 * Phase 6b: Extract term information for sorting
 */
function getTermInfo(term: MathNode): { isConstant: boolean; mainVariable: string; power: number; value: number } {
	if (term.type === "ConstantNode") {
		const constNode = term as ConstantNode;
		return { 
			isConstant: true, 
			mainVariable: "", 
			power: 0, 
			value: typeof constNode.value === "number" ? constNode.value : 0 
		};
	}
	
	if (term.type === "SymbolNode") {
		return { 
			isConstant: false, 
			mainVariable: term.toString(), 
			power: 1, 
			value: 0 
		};
	}
	
	if (term.type === "OperatorNode") {
		const opNode = term as OperatorNode;
		
		// Handle powers like x^2
		if (opNode.op === "^" && opNode.args.length === 2) {
			const base = opNode.args[0];
			const exponent = opNode.args[1];
			
			if (base.type === "SymbolNode" && exponent.type === "ConstantNode") {
				const power = typeof (exponent as ConstantNode).value === "number" ? (exponent as ConstantNode).value as number : 1;
				return { 
					isConstant: false, 
					mainVariable: base.toString(), 
					power, 
					value: 0 
				};
			}
		}
		
		// Handle multiplication to find main variable
		if (opNode.op === "*") {
			let mainVar = "";
			let mainPower = 1;
			
			// Look for the first variable in the multiplication
			for (const arg of opNode.args) {
				if (arg.type === "SymbolNode") {
					mainVar = arg.toString();
					break;
				} else if (arg.type === "OperatorNode" && (arg as OperatorNode).op === "^") {
					const powNode = arg as OperatorNode;
					if (powNode.args[0].type === "SymbolNode" && powNode.args[1].type === "ConstantNode") {
						mainVar = powNode.args[0].toString();
						mainPower = typeof (powNode.args[1] as ConstantNode).value === "number" ? (powNode.args[1] as ConstantNode).value as number : 1;
						break;
					}
				}
			}
			
			if (mainVar) {
				return { 
					isConstant: false, 
					mainVariable: mainVar, 
					power: mainPower, 
					value: 0 
				};
			}
		}
	}
	
	// Default case: treat as variable with alphabetical ordering
	return { 
		isConstant: false, 
		mainVariable: term.toString(), 
		power: 1, 
		value: 0 
	};
}

/**
 * Phase 6b: Reconstruct expression from sorted terms
 */
function reconstructSortedExpression(terms: Array<{ term: MathNode; isPositive: boolean }>): MathNode {
	if (terms.length === 0) {
		return parse("0");
	}
	
	if (terms.length === 1) {
		const term = terms[0];
		return term.isPositive ? term.term : parse(`-(${term.term.toString()})`);
	}
	
	// Build expression string
	let exprStr = "";
	
	for (let i = 0; i < terms.length; i++) {
		const term = terms[i];
		
		if (i === 0) {
			// First term
			exprStr = term.isPositive ? term.term.toString() : `-(${term.term.toString()})`;
		} else {
			// Subsequent terms
			if (term.isPositive) {
				exprStr += ` + ${term.term.toString()}`;
			} else {
				exprStr += ` - ${term.term.toString()}`;
			}
		}
	}
	
	return parse(exprStr);
}

/**
 * Phase 6b: Core tree transformation function that applies all canonical rules
 * Combines math.js simplification with forced expansion and consistent ordering
 */
export function applyCanonicalTransformation(node: MathNode): MathNode {
	// Apply transformations in sequence for consistent results
	let transformed = node;
	
	// Step 1: Force full expansion using string manipulation
	transformed = forceFullExpansion(transformed);
	
	// Step 2: Apply simplification to clean up
	transformed = simplify(transformed);
	
	// Step 3: Apply multiple rounds to ensure complete expansion
	let previousForm = '';
	for (let i = 0; i < 3; i++) {
		const currentForm = transformed.toString();
		if (currentForm === previousForm) {
			break; // No changes, we're done
		}
		previousForm = currentForm;
		transformed = forceFullExpansion(transformed);
		transformed = simplify(transformed);
	}
	
	// Step 4: Normalize coefficients for consistent representation
	transformed = normalizeCoefficients(transformed);
	
	// Step 5: Apply consistent string-based normalization for ordering
	transformed = normalizeExpressionOrder(transformed);
	
	// Step 6: Final simplification to clean up normalization artifacts
	transformed = simplify(transformed);
	
	return transformed;
}

/**
 * Phase 6b: Coefficient normalization using tree transformation
 * Handles implicit coefficients, negative coefficients, and zero coefficients
 */
export function normalizeCoefficients(node: MathNode): MathNode {
	// First simplify to normalize coefficient representations
	let normalized = simplify(node);
	
	return normalized.transform((childNode) => {
		// Handle multiplication nodes for coefficient normalization
		if (childNode.type === "OperatorNode") {
			const opNode = childNode as OperatorNode;
			
			if (opNode.op === "*" && opNode.args.length === 2) {
				const [first, second] = opNode.args;
				
				// Check if first argument is a constant coefficient
				if (first.type === "ConstantNode") {
					const constantNode = first as ConstantNode;
					const coefficient = constantNode.value;
					
					// Handle special coefficient cases
					if (coefficient === 0) {
						// 0 * x -> 0
						return parse("0");
					} else if (coefficient === 1) {
						// 1 * x -> x
						return second;
					} else if (coefficient === -1) {
						// -1 * x -> -x (create unary minus)
						return parse(`-(${second.toString()})`);
					}
				}
				
				// Check if second argument is a constant coefficient (x * 2 -> 2 * x)
				if (second.type === "ConstantNode") {
					const constantNode = second as ConstantNode;
					const coefficient = constantNode.value;
					
					if (coefficient === 0) {
						return parse("0");
					} else if (coefficient === 1) {
						return first;
					} else if (coefficient === -1) {
						return parse(`-(${first.toString()})`);
					}
					
					// Reorder to put coefficient first: x * 2 -> 2 * x
					return parse(`${coefficient} * (${first.toString()})`);
				}
			}
		}
		
		return childNode;
	});
}



/**
 * Phase 6b: Fast tree comparison using canonical forms
 * More reliable than string comparison for mathematical equivalence
 */
export function areCanonicallyEquivalent(expr1: string, expr2: string): boolean {
	try {
		const canonical1 = getEnhancedCanonical(expr1);
		const canonical2 = getEnhancedCanonical(expr2);
		
		// Direct tree comparison is the most reliable method
		return canonical1.equals(canonical2);
	} catch {
		// If canonical transformation fails, fall back to original method
		return areEquivalent(expr1, expr2);
	}
}

export function hasConstantOperations(node: MathNode): SimplificationPattern[] {
	const patterns: SimplificationPattern[] = [];

	// Filter for operator nodes where all arguments are constants
	const constantOperations = node.filter((childNode) => {
		if (childNode.type !== "OperatorNode") return false;

		const opNode = childNode as OperatorNode;
		// Check if all arguments are constant nodes
		return opNode.args.every((arg) => arg.type === "ConstantNode");
	});

	for (const opNode of constantOperations) {
		const operatorNode = opNode as OperatorNode;
		patterns.push({
			type: "CONSTANT_ARITHMETIC",
			description: `Constant arithmetic operation: ${operatorNode.toString()}`,
			nodes: [operatorNode],
			suggestion: `Simplify ${operatorNode.toString()} to ${simplify(operatorNode).toString()}`,
		});
	}

	return patterns;
}

export function findLikeTerms(node: MathNode): SimplificationPattern[] {
	const patterns: SimplificationPattern[] = [];

	// Extract all terms from addition/subtraction operations
	const terms = extractTermsFromExpression(node);

	// Group terms by their variable part
	const termGroups = new Map<string, MathNode[]>();

	for (const term of terms) {
		const variablePart = getVariablePart(term);
		if (!termGroups.has(variablePart)) {
			termGroups.set(variablePart, []);
		}
		const termGroup = termGroups.get(variablePart);
		if (termGroup) {
			termGroup.push(term);
		}
	}

	// Find groups with more than one term (like terms)
	for (const [variablePart, groupTerms] of termGroups) {
		if (groupTerms.length > 1 && variablePart !== "1") {
			// Don't group pure constants
			patterns.push({
				type: "LIKE_TERMS",
				description: `Like terms with variable part: ${variablePart}`,
				nodes: groupTerms,
				suggestion: `Combine like terms: ${groupTerms.map((t) => t.toString()).join(" + ")}`,
			});
		}
	}

	return patterns;
}

export function hasDistributiveOpportunities(
	node: MathNode,
): SimplificationPattern[] {
	const patterns: SimplificationPattern[] = [];

	// Filter for multiplication nodes where one operand is a parenthesized expression
	const distributiveOps = node.filter((childNode) => {
		if (childNode.type !== "OperatorNode") return false;

		const opNode = childNode as OperatorNode;
		if (opNode.op !== "*") return false;

		// Check if one argument is a parenthesized addition/subtraction
		return opNode.args.some((arg) => {
			// Handle ParenthesisNode containing addition/subtraction
			if (arg.type === "ParenthesisNode") {
				const parenthesisNode = arg as { content?: MathNode }; // ParenthesisNode structure
				return (
					parenthesisNode.content &&
					parenthesisNode.content.type === "OperatorNode" &&
					((parenthesisNode.content as OperatorNode).op === "+" ||
						(parenthesisNode.content as OperatorNode).op === "-")
				);
			}
			// Also handle direct OperatorNode (for cases without explicit parentheses)
			return (
				arg.type === "OperatorNode" &&
				((arg as OperatorNode).op === "+" || (arg as OperatorNode).op === "-")
			);
		});
	});

	for (const opNode of distributiveOps) {
		const operatorNode = opNode as OperatorNode;
		patterns.push({
			type: "DISTRIBUTIVE",
			description: `Distributive property opportunity: ${operatorNode.toString()}`,
			nodes: [operatorNode],
			suggestion: `Distribute: ${operatorNode.toString()}`,
		});
	}

	return patterns;
}

export function hasUnsimplifiedOperations(node: MathNode): boolean {
	let hasUnsimplified = false;

	node.traverse((childNode) => {
		// Check for constant arithmetic
		if (childNode.type === "OperatorNode") {
			const opNode = childNode as OperatorNode;
			if (opNode.args.every((arg) => arg.type === "ConstantNode")) {
				hasUnsimplified = true;
			}
		}

		// Check for coefficient normalization opportunities (1*x, -1*x, etc.)
		if (childNode.type === "OperatorNode") {
			const opNode = childNode as OperatorNode;
			if (opNode.op === "*" && opNode.args.length === 2) {
				const [first, second] = opNode.args;
				if (first.type === "ConstantNode") {
					const constantNode = first as ConstantNode;
					if (constantNode.value === 1 || constantNode.value === -1) {
						hasUnsimplified = true;
					}
				}
			}
		}
	});

	return hasUnsimplified;
}

export function analyzeExpressionTree(input: string): TreeAnalysisResult {
	try {
		// Check if input is an equation and handle it properly
		const parsed = validateMathInputSyntax(input);
		
		if (parsed.isEquation && parsed.leftSide && parsed.rightSide) {
			// Handle equations by analyzing both sides
			const leftAnalysis = analyzeExpressionTree(parsed.leftSide);
			const rightAnalysis = analyzeExpressionTree(parsed.rightSide);
			
			// Combine results from both sides
			const combinedPatterns = [...leftAnalysis.patterns, ...rightAnalysis.patterns];
			const combinedIsFullySimplified = leftAnalysis.isFullySimplified && rightAnalysis.isFullySimplified;
			const combinedHasUnsimplifiedOps = leftAnalysis.hasUnsimplifiedOperations || rightAnalysis.hasUnsimplifiedOperations;
			
			return {
				isFullySimplified: combinedIsFullySimplified && !combinedHasUnsimplifiedOps,
				patterns: combinedPatterns,
				hasUnsimplifiedOperations: combinedHasUnsimplifiedOps,
			};
		}
		
		// Handle regular expressions (non-equations) - use original logic
		const node = parse(input);

		// Find various simplification patterns
		const constantPatterns = hasConstantOperations(node);
		const likeTermPatterns = findLikeTerms(node);
		const distributivePatterns = hasDistributiveOpportunities(node);

		const allPatterns = [
			...constantPatterns,
			...likeTermPatterns,
			...distributivePatterns,
		];

		// Check for unsimplified operations
		const hasUnsimplifiedOps = hasUnsimplifiedOperations(node);

		return {
			isFullySimplified: allPatterns.length === 0 && !hasUnsimplifiedOps,
			patterns: allPatterns,
			hasUnsimplifiedOperations: hasUnsimplifiedOps,
		};
	} catch {
		// If parsing fails, return minimal analysis
		return {
			isFullySimplified: false,
			patterns: [],
			hasUnsimplifiedOperations: false,
		};
	}
}

function extractTermsFromExpression(node: MathNode): MathNode[] {
	const terms: MathNode[] = [];

	if (node.type === "OperatorNode") {
		const opNode = node as OperatorNode;
		if (opNode.op === "+" || opNode.op === "-") {
			// For addition/subtraction, recursively extract terms
			for (const arg of opNode.args) {
				terms.push(...extractTermsFromExpression(arg));
			}
		} else {
			// For other operations, treat the whole thing as one term
			terms.push(node);
		}
	} else {
		// For constants, symbols, etc., treat as single term
		terms.push(node);
	}

	return terms;
}

function getVariablePart(node: MathNode): string {
	if (node.type === "ConstantNode") {
		return "1"; // Pure constant
	}

	if (node.type === "SymbolNode") {
		return node.toString(); // Pure variable
	}

	if (node.type === "OperatorNode") {
		const opNode = node as OperatorNode;

		if (opNode.op === "*") {
			// For multiplication, extract non-constant factors
			const nonConstantFactors = opNode.args.filter(
				(arg) => arg.type !== "ConstantNode",
			);
			if (nonConstantFactors.length === 0) {
				return "1"; // All factors are constants
			}
			return nonConstantFactors.map((f) => f.toString()).join("*");
		}

		if (opNode.op === "^") {
			// For powers, the whole thing is the variable part
			return node.toString();
		}
	}

	// Default: use the whole expression
	return node.toString();
}

export function getSimplificationFeedback(
	patterns: SimplificationPattern[],
): string[] {
	const feedback: string[] = [];

	for (const pattern of patterns) {
		switch (pattern.type) {
			case "CONSTANT_ARITHMETIC":
				feedback.push(`You can simplify the arithmetic: ${pattern.suggestion}`);
				break;
			case "LIKE_TERMS":
				feedback.push(`You can combine like terms: ${pattern.suggestion}`);
				break;
			case "DISTRIBUTIVE":
				feedback.push(
					`You can use the distributive property: ${pattern.suggestion}`,
				);
				break;
			case "COEFFICIENT_NORMALIZATION":
				feedback.push(
					`You can simplify the coefficient: ${pattern.suggestion}`,
				);
				break;
		}
	}

	return feedback;
} 