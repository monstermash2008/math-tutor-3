import {
	type ConstantNode,
	type MathNode,
	type OperatorNode,
	parse,
	simplify,
} from "mathjs";

/**
 * Custom error class for mathematical parsing errors
 */
export class MathParsingError extends Error {
	constructor(
		message: string,
		public originalInput: string,
	) {
		super(message);
		this.name = "MathParsingError";
	}
}

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

export function getCanonical(input: string): MathNode {
	try {
		const parsed = validateMathInputSyntax(input);

		if (parsed.isEquation) {
			// Transform A = B into A - B and simplify
			const differenceExpression = `(${parsed.leftSide}) - (${parsed.rightSide})`;
			const node = parse(differenceExpression);
			return simplify(node);
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

		// For equations, convert to canonical form first
		if (expr1.includes("=") || expr2.includes("=")) {
			const canonical1 = getCanonical(expr1);
			const canonical2 = getCanonical(expr2);

			// Try direct comparison first
			if (canonical1.equals(canonical2)) {
				return true;
			}

			// If direct comparison fails, use numerical testing
			try {
				const difference = simplify(
					`(${canonical1.toString()}) - (${canonical2.toString()})`,
				);

				// Check if difference is literally zero
				if (difference.toString() === "0" || difference.equals(parse("0"))) {
					return true;
				}

				// Test at multiple points
				const testValues = [0, 1, 2, -1, 5, 10];
				return testValues.every((x) => {
					try {
						const result = difference.evaluate({ x });
						return Math.abs(result) < 1e-10;
					} catch {
						return false;
					}
				});
			} catch {
				return false;
			}
		}

		// Handle regular expressions by comparing their difference
		const node1 = parse(expr1);
		const node2 = parse(expr2);

		// Try direct comparison first (most efficient)
		if (node1.equals(node2)) {
			return true;
		}

		// Calculate difference and simplify
		const difference = simplify(`(${expr1}) - (${expr2})`);

		// Check if difference is literally zero
		if (difference.toString() === "0" || difference.equals(parse("0"))) {
			return true;
		}

		// For more complex expressions, test at multiple points
		const testValues = [0, 1, 2, -1, 5, 10];
		return testValues.every((x) => {
			try {
				const result = difference.evaluate({ x });
				return Math.abs(result) < 1e-10;
			} catch {
				// If evaluation fails (e.g., division by zero), try different approach
				return false;
			}
		});
	} catch {
		// If any step fails, expressions are not equivalent
		return false;
	}
}

export interface SimplificationPattern {
	type:
		| "CONSTANT_ARITHMETIC"
		| "LIKE_TERMS"
		| "DISTRIBUTIVE"
		| "COEFFICIENT_NORMALIZATION";
	description: string;
	nodes: MathNode[];
	suggestion: string;
}

export interface TreeAnalysisResult {
	isFullySimplified: boolean;
	patterns: SimplificationPattern[];
	hasUnsimplifiedOperations: boolean;
}

export function hasConstantOperations(node: MathNode): SimplificationPattern[] {
	const patterns: SimplificationPattern[] = [];

	if (node.type === 'OperatorNode') {
		const operatorNode = node as OperatorNode;
		if (
			operatorNode.fn === "add" ||
			operatorNode.fn === "subtract" ||
			operatorNode.fn === "multiply" ||
			operatorNode.fn === "divide"
		) {
			const args = operatorNode.args;
			if (
				args.length === 2 &&
				args.every((arg) => arg.type === 'ConstantNode' || arg.type === 'OperatorNode')
			) {
				patterns.push({
					type: "CONSTANT_ARITHMETIC",
					description: `Simplify ${node.toString()}`,
					nodes: [node],
					suggestion: `Calculate ${node.toString()} directly`,
				});
			}
		}
	}

	// Recursively check child nodes
	if ("args" in node && Array.isArray(node.args)) {
		for (const arg of node.args) {
			patterns.push(...hasConstantOperations(arg));
		}
	}

	return patterns;
}

export function findLikeTerms(node: MathNode): SimplificationPattern[] {
	const patterns: SimplificationPattern[] = [];

	if (node.type === 'OperatorNode') {
		const operatorNode = node as OperatorNode;
		if (operatorNode.fn === "add" || operatorNode.fn === "subtract") {
			const terms = extractTermsFromExpression(node);
			const termGroups: { [key: string]: MathNode[] } = {};

			// Group terms by their variable part
			for (const term of terms) {
				const variablePart = getVariablePart(term);
				if (!termGroups[variablePart]) {
					termGroups[variablePart] = [];
				}
				termGroups[variablePart].push(term);
			}

			// Find groups with multiple terms (like terms)
			for (const [variablePart, groupTerms] of Object.entries(termGroups)) {
				if (groupTerms.length > 1) {
					patterns.push({
						type: "LIKE_TERMS",
						description: `Combine like terms with ${variablePart || "constants"}`,
						nodes: groupTerms,
						suggestion: `Add the coefficients of ${
							variablePart || "constant terms"
						}`,
					});
				}
			}
		}
	}

	return patterns;
}

export function hasDistributiveOpportunities(
	node: MathNode,
): SimplificationPattern[] {
	const patterns: SimplificationPattern[] = [];

	if (node.type === 'OperatorNode') {
		const operatorNode = node as OperatorNode;

		// Look for multiplication with parentheses: a(b + c)
		if (operatorNode.fn === "multiply" && operatorNode.args.length === 2) {
			const [left, right] = operatorNode.args;

			// Check if one operand is a sum/difference
			if (
				(left.type === 'OperatorNode' &&
					((left as OperatorNode).fn === "add" ||
						(left as OperatorNode).fn === "subtract")) ||
				(right.type === 'OperatorNode' &&
					((right as OperatorNode).fn === "add" ||
						(right as OperatorNode).fn === "subtract"))
			) {
				patterns.push({
					type: "DISTRIBUTIVE",
					description: `Apply distributive property to ${node.toString()}`,
					nodes: [node],
					suggestion: "Distribute multiplication over addition/subtraction",
				});
			}
		}
	}

	// Recursively check child nodes
	if ("args" in node && Array.isArray(node.args)) {
		for (const arg of node.args) {
			patterns.push(...hasDistributiveOpportunities(arg));
		}
	}

	return patterns;
}

export function hasUnsimplifiedOperations(node: MathNode): boolean {
	// Check for constant arithmetic
	if (node.type === 'OperatorNode') {
		const operatorNode = node as OperatorNode;
		if (
			operatorNode.fn === "add" ||
			operatorNode.fn === "subtract" ||
			operatorNode.fn === "multiply" ||
			operatorNode.fn === "divide"
		) {
			const args = operatorNode.args;
			if (args.length === 2 && args.every((arg) => arg.type === 'ConstantNode')) {
				return true;
			}
		}
	}

	// Recursively check child nodes
	if ("args" in node && Array.isArray(node.args)) {
		for (const arg of node.args) {
			if (hasUnsimplifiedOperations(arg)) {
				return true;
			}
		}
	}

	return false;
}

export function analyzeExpressionTree(input: string): TreeAnalysisResult {
	try {
		const node = parse(input);
		const simplified = simplify(node);

		// Check if expression is fully simplified
		const isFullySimplified = node.equals(simplified);

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
			isFullySimplified: isFullySimplified && !hasUnsimplifiedOps,
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

	if (node.type === 'OperatorNode') {
		const operatorNode = node as OperatorNode;
		if (operatorNode.fn === "add") {
			// For addition, all arguments are terms
			terms.push(...operatorNode.args);
		} else if (operatorNode.fn === "subtract" && operatorNode.args.length === 2) {
			// For subtraction, first arg is positive, second is negative
			terms.push(operatorNode.args[0]);
			// Create a negative version of the second term
			terms.push(operatorNode.args[1]);
		} else {
			// For other operations, treat the whole node as a single term
			terms.push(node);
		}
	} else {
		terms.push(node);
	}

	return terms;
}

function getVariablePart(node: MathNode): string {
	try {
		// For constants, return empty string
		if (node.type === 'ConstantNode') {
			return "";
		}

		// For variables, return the variable name
		if (node.type === 'SymbolNode') {
			return node.toString();
		}

		// For more complex expressions, try to extract variable pattern
		// This is a simplified approach - could be enhanced for more complex cases
		const nodeStr = node.toString();

		// Remove coefficients and extract variable pattern
		const variableMatch = nodeStr.match(/[a-zA-Z]+(\^[0-9]+)?/);
		return variableMatch ? variableMatch[0] : nodeStr;
	} catch {
		return node.toString();
	}
}

export function getSimplificationFeedback(
	patterns: SimplificationPattern[],
): string[] {
	const feedback: string[] = [];

	for (const pattern of patterns) {
		switch (pattern.type) {
			case "CONSTANT_ARITHMETIC":
				feedback.push("You can simplify the arithmetic operations");
				break;
			case "LIKE_TERMS":
				feedback.push("Look for like terms that can be combined");
				break;
			case "DISTRIBUTIVE":
				feedback.push("Consider using the distributive property");
				break;
			case "COEFFICIENT_NORMALIZATION":
				feedback.push("The coefficients could be simplified");
				break;
		}
	}

	return feedback;
} 