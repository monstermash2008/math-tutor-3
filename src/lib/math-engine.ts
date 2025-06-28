import { type MathNode, parse, simplify } from "mathjs";

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
 * Converts a mathematical expression or equation to its canonical form
 * For equations (containing '='), it transforms A = B into A - B
 * For expressions, it returns the simplified form
 *
 * @param input - The mathematical string to canonicalize
 * @returns The canonical MathNode representation
 * @throws MathParsingError if the input cannot be parsed
 */
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

		// For expressions, compute difference and check if it's zero
		const node1 = simplify(parse(expr1));
		const node2 = simplify(parse(expr2));

		// Try direct comparison first
		if (node1.equals(node2)) {
			return true;
		}

		// If direct comparison fails, try difference approach
		const difference = simplify(`(${expr1.trim()}) - (${expr2.trim()})`);

		// Check if difference is literally zero
		if (difference.toString() === "0" || difference.equals(parse("0"))) {
			return true;
		}

		// For polynomial expressions, test equivalence at multiple points
		// This handles cases where math.js doesn't fully expand/simplify
		try {
			const testValues = [0, 1, 2, -1, 5, 10];
			const isEquivalent = testValues.every((x) => {
				try {
					const result = difference.evaluate({ x });
					return Math.abs(result) < 1e-10;
				} catch {
					// If evaluation fails, this might not be a polynomial in x
					return false;
				}
			});

			return isEquivalent;
		} catch {
			// If numerical testing fails, fall back to false
			return false;
		}
	} catch {
		// If either expression is malformed, they're not equivalent
		return false;
	}
}
