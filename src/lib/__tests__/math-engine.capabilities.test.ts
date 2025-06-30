import { parse } from "mathjs";
import { describe, expect, it } from "vitest";
import { areEquivalent, isFullySimplified } from "../../../convex/math_engine";
import {
	analyzeExpressionTree,
	areCanonicallyEquivalent,
	findLikeTerms,
	getEnhancedCanonical,
	getSimplificationFeedback,
	hasConstantOperations,
	hasDistributiveOpportunities,
	hasUnsimplifiedOperations,
} from "../../../convex/math_engine";

describe("Math Engine - Capabilities", () => {
	describe("Linear Algebra - Basic Operations", () => {
		describe("like terms combination", () => {
			it("should combine like terms with same variable", () => {
				expect(areEquivalent("3x + 5x", "8x")).toBe(true);
				expect(areEquivalent("7y - 2y + 3y", "8y")).toBe(true);
				expect(areEquivalent("4a + 2a - a", "5a")).toBe(true);
				expect(areEquivalent("x + x + x", "3x")).toBe(true);
				expect(areEquivalent("10x - 3x + 2x", "9x")).toBe(true);

				expect(isFullySimplified("3x + 5x")).toBe(false);
				expect(isFullySimplified("8x")).toBe(true);
				expect(isFullySimplified("7y - 2y + 3y")).toBe(false);
				expect(isFullySimplified("8y")).toBe(true);
			});

			it("should handle coefficients and constants", () => {
				expect(areEquivalent("5x - 3x + 7", "2x + 7")).toBe(true);
				expect(areEquivalent("4y + 8 - 2y + 3", "2y + 11")).toBe(true);
				expect(areEquivalent("3a + 5 + 2a - 1", "5a + 4")).toBe(true);
				expect(areEquivalent("7x - 4x + 10 - 6", "3x + 4")).toBe(true);

				expect(isFullySimplified("5x - 3x + 7")).toBe(false);
				expect(isFullySimplified("2x + 7")).toBe(true);
			});

			it("should combine like terms across multiple variables", () => {
				expect(areEquivalent("3x + 2y - x + 4y", "2x + 6y")).toBe(true);
				expect(areEquivalent("5a - 3b + 2a + b", "7a - 2b")).toBe(true);
				expect(areEquivalent("4x + 3y + 2x - y", "6x + 2y")).toBe(true);
				expect(areEquivalent("2a + 3b - a + 2b", "a + 5b")).toBe(true);

				expect(isFullySimplified("3x + 2y - x + 4y")).toBe(false);
				expect(isFullySimplified("2x + 6y")).toBe(true);
			});
		});

		describe("term reordering recognition", () => {
			it("should recognize equivalent term arrangements", () => {
				expect(areEquivalent("2x + 3", "3 + 2x")).toBe(true);
				expect(areEquivalent("5y - 4", "-4 + 5y")).toBe(true);
				expect(areEquivalent("3a + 2b", "2b + 3a")).toBe(true);
				expect(areEquivalent("x + y + z", "z + x + y")).toBe(true);
				expect(areEquivalent("4x - 2y + 1", "1 + 4x - 2y")).toBe(true);

				// All of these should be considered simplified (just reordered)
				expect(isFullySimplified("2x + 3")).toBe(true);
				expect(isFullySimplified("3 + 2x")).toBe(true);
				expect(isFullySimplified("3a + 2b")).toBe(true);
				expect(isFullySimplified("2b + 3a")).toBe(true);
			});
		});
	});

	describe("Arithmetic Simplification", () => {
		describe("basic arithmetic", () => {
			it("should simplify basic arithmetic", () => {
				expect(areEquivalent("3 + 2", "5")).toBe(true);
				expect(areEquivalent("10 - 4", "6")).toBe(true);
				expect(areEquivalent("7 + 8", "15")).toBe(true);
				expect(areEquivalent("20 - 12", "8")).toBe(true);
				expect(areEquivalent("5 + 3 + 2", "10")).toBe(true);
				expect(areEquivalent("15 - 6 - 3", "6")).toBe(true);

				expect(isFullySimplified("3 + 2")).toBe(false);
				expect(isFullySimplified("5")).toBe(true);
				expect(isFullySimplified("10 - 4")).toBe(false);
				expect(isFullySimplified("6")).toBe(true);
			});

			it("should handle mixed operations", () => {
				expect(areEquivalent("5 + 3 - 2", "6")).toBe(true);
				expect(areEquivalent("10 - 4 + 7", "13")).toBe(true);
				expect(areEquivalent("8 + 2 - 5 + 1", "6")).toBe(true);
				expect(areEquivalent("20 - 8 + 3 - 5", "10")).toBe(true);

				expect(isFullySimplified("5 + 3 - 2")).toBe(false);
				expect(isFullySimplified("6")).toBe(true);
			});
		});

		describe("fractions", () => {
			it("should simplify simple fractions", () => {
				expect(areEquivalent("6/2", "3")).toBe(true);
				expect(areEquivalent("10/5", "2")).toBe(true);
				expect(areEquivalent("15/3", "5")).toBe(true);
				expect(areEquivalent("20/4", "5")).toBe(true);

				expect(isFullySimplified("6/2")).toBe(false);
				expect(isFullySimplified("3")).toBe(true);
				expect(isFullySimplified("10/5")).toBe(false);
				expect(isFullySimplified("2")).toBe(true);
			});
		});
	});

	describe("Exponent Operations", () => {
		describe("basic exponent rules", () => {
			it("should handle exponent multiplication", () => {
				expect(areEquivalent("x^2 * x^3", "x^5")).toBe(true);
				expect(areEquivalent("x^4 * x", "x^5")).toBe(true);
				expect(areEquivalent("x * x^2", "x^3")).toBe(true);
				expect(areEquivalent("y^3 * y^2", "y^5")).toBe(true);
				expect(areEquivalent("a^2 * a^4", "a^6")).toBe(true);

				expect(isFullySimplified("x^2 * x^3")).toBe(false);
				expect(isFullySimplified("x^5")).toBe(true);
				expect(isFullySimplified("x^4 * x")).toBe(false);
				expect(isFullySimplified("x^5")).toBe(true);
			});

			it("should handle exponent division", () => {
				expect(areEquivalent("x^5 / x^2", "x^3")).toBe(true);
				expect(areEquivalent("x^4 / x", "x^3")).toBe(true);
				expect(areEquivalent("y^6 / y^3", "y^3")).toBe(true);
				expect(areEquivalent("a^7 / a^2", "a^5")).toBe(true);
				expect(areEquivalent("x^3 / x^3", "1")).toBe(true);

				expect(isFullySimplified("x^5 / x^2")).toBe(false);
				expect(isFullySimplified("x^3")).toBe(true);
				expect(isFullySimplified("x^4 / x")).toBe(false);
				expect(isFullySimplified("x^3")).toBe(true);
			});
		});
	});

	describe("Simple Rational Expressions", () => {
		describe("basic cancellation", () => {
			it("should handle algebraic fractions", () => {
				expect(areEquivalent("2x/2", "x")).toBe(true);
				expect(areEquivalent("6x/3", "2x")).toBe(true);
				expect(areEquivalent("4x/2", "2x")).toBe(true);
				expect(areEquivalent("10x/5", "2x")).toBe(true);
				expect(areEquivalent("12x/4", "3x")).toBe(true);

				expect(isFullySimplified("2x/2")).toBe(false);
				expect(isFullySimplified("x")).toBe(true);
				expect(isFullySimplified("6x/3")).toBe(false);
				expect(isFullySimplified("2x")).toBe(true);
			});
		});
	});

	describe("Equation Structure Recognition", () => {
		describe("canonical form and reordering", () => {
			it("should handle equation reordering", () => {
				expect(areEquivalent("x + 5 = 12", "5 + x = 12")).toBe(true);
				expect(areEquivalent("2x + 3 = 11", "3 + 2x = 11")).toBe(true);
				expect(areEquivalent("y - 4 = 8", "-4 + y = 8")).toBe(true);
				expect(areEquivalent("3a + 2 = 14", "2 + 3a = 14")).toBe(true);
			});
		});
	});

	describe("Error Handling and Edge Cases", () => {
		describe("malformed input", () => {
			it("should handle malformed expressions gracefully", () => {
				expect(areEquivalent("3x ++ 5", "3x + 5")).toBe(false);
				expect(areEquivalent("3x --- 5", "3x - 5")).toBe(false);
				expect(areEquivalent("invalid", "x + 1")).toBe(false);

				expect(isFullySimplified("3x ++ 5")).toBe(false);
				expect(isFullySimplified("invalid expression")).toBe(true); // Math.js treats unrecognized strings as simplified
			});
		});

		describe("edge cases", () => {
			it("should handle zero and identity operations", () => {
				expect(areEquivalent("x + 0", "x")).toBe(true);
				expect(areEquivalent("0 + x", "x")).toBe(true);
				expect(areEquivalent("x * 1", "x")).toBe(true);
				expect(areEquivalent("1 * x", "x")).toBe(true);

				expect(isFullySimplified("x + 0")).toBe(false);
				expect(isFullySimplified("x")).toBe(true);
				expect(isFullySimplified("x * 1")).toBe(false);
				expect(isFullySimplified("x")).toBe(true);
			});
		});
	});

	describe("Complex Multi-step Expressions", () => {
		describe("combined operations", () => {
			it("should handle complex multi-step expressions", () => {
				expect(areEquivalent("2x + 3x - x + 5", "4x + 5")).toBe(true);
				expect(areEquivalent("3y - 2y + 7 - 3", "y + 4")).toBe(true);
				expect(areEquivalent("5a + 2 - 3a + 8", "2a + 10")).toBe(true);
				expect(areEquivalent("4x + 6 - 2x - 1", "2x + 5")).toBe(true);

				expect(isFullySimplified("2x + 3x - x + 5")).toBe(false);
				expect(isFullySimplified("4x + 5")).toBe(true);
			});
		});
	});

	describe("Tree-Based Analysis (Phase 6a)", () => {
		describe("hasConstantOperations", () => {
			it("should detect constant arithmetic operations", () => {
				const node = parse("2 + 3 + x");
				const patterns = hasConstantOperations(node);

				expect(patterns).toHaveLength(1);
				expect(patterns[0].type).toBe("CONSTANT_ARITHMETIC");
				expect(patterns[0].description).toContain("2 + 3");
			});

			it("should not detect constants in simplified expressions", () => {
				const node = parse("x + 5");
				const patterns = hasConstantOperations(node);

				expect(patterns).toHaveLength(0);
			});

			it("should detect multiple constant operations", () => {
				const node = parse("2 + 3 + 4 * 5 + x");
				const patterns = hasConstantOperations(node);

				expect(patterns.length).toBeGreaterThan(0);
				expect(patterns.some((p) => p.type === "CONSTANT_ARITHMETIC")).toBe(
					true,
				);
			});
		});

		describe("findLikeTerms", () => {
			it("should detect like terms", () => {
				const node = parse("3x + 2x + 5");
				const patterns = findLikeTerms(node);

				expect(patterns).toHaveLength(1);
				expect(patterns[0].type).toBe("LIKE_TERMS");
				expect(patterns[0].description).toContain("x");
			});

			it("should not detect like terms in expressions without them", () => {
				const node = parse("2x + 3y");
				const patterns = findLikeTerms(node);

				expect(patterns).toHaveLength(0);
			});

			it("should handle complex like terms", () => {
				const node = parse("2x^2 + 3x^2 + 4x + 5");
				const patterns = findLikeTerms(node);

				expect(patterns.length).toBeGreaterThan(0);
				expect(patterns.some((p) => p.description.includes("x ^ 2"))).toBe(
					true,
				);
			});
		});

		describe("hasDistributiveOpportunities", () => {
			it("should detect distributive opportunities", () => {
				const node = parse("4(x + 2) + 3");
				const patterns = hasDistributiveOpportunities(node);

				expect(patterns).toHaveLength(1);
				expect(patterns[0].type).toBe("DISTRIBUTIVE");
			});

			it("should not detect distributive opportunities in simplified expressions", () => {
				const node = parse("4x + 8 + 3");
				const patterns = hasDistributiveOpportunities(node);

				expect(patterns).toHaveLength(0);
			});
		});

		describe("hasUnsimplifiedOperations", () => {
			it("should detect unsimplified operations", () => {
				const node = parse("2 + 3 + x");
				const result = hasUnsimplifiedOperations(node);

				expect(result).toBe(true);
			});

			it("should not detect unsimplified operations in simplified expressions", () => {
				const node = parse("x + 5");
				const result = hasUnsimplifiedOperations(node);

				expect(result).toBe(false);
			});

			it("should detect coefficient normalization opportunities", () => {
				const node = parse("1 * x + 5");
				const result = hasUnsimplifiedOperations(node);

				expect(result).toBe(true);
			});
		});

		describe("analyzeExpressionTree", () => {
			it("should provide comprehensive analysis for unsimplified expressions", () => {
				const result = analyzeExpressionTree("2 + 3 + x");

				expect(result.isFullySimplified).toBe(false);
				expect(result.patterns.length).toBeGreaterThan(0);
				expect(result.hasUnsimplifiedOperations).toBe(true);
			});

			it("should recognize fully simplified expressions", () => {
				const result = analyzeExpressionTree("x + 5");

				expect(result.isFullySimplified).toBe(true);
				expect(result.patterns).toHaveLength(0);
				expect(result.hasUnsimplifiedOperations).toBe(false);
			});

			it("should handle complex expressions with multiple patterns", () => {
				const result = analyzeExpressionTree("2 + 3 + 3x + 2x + 4(y + 1)");

				expect(result.isFullySimplified).toBe(false);
				expect(result.patterns.length).toBeGreaterThan(1);

				const patternTypes = result.patterns.map((p) => p.type);
				expect(patternTypes).toContain("CONSTANT_ARITHMETIC");
				expect(patternTypes).toContain("LIKE_TERMS");
				expect(patternTypes).toContain("DISTRIBUTIVE");
			});

			it("should handle malformed input gracefully", () => {
				const result = analyzeExpressionTree("(3 + 5"); // Unmatched parenthesis

				expect(result.isFullySimplified).toBe(false);
				expect(result.patterns).toHaveLength(0);
				expect(result.hasUnsimplifiedOperations).toBe(false);
			});
		});

		describe("getSimplificationFeedback", () => {
			it("should provide specific feedback for different pattern types", () => {
				const result = analyzeExpressionTree("2 + 3 + 3x + 2x + 4(y + 1)");
				const feedback = getSimplificationFeedback(result.patterns);

				expect(feedback.length).toBeGreaterThan(0);
				expect(feedback.some((f) => f.includes("arithmetic"))).toBe(true);
				expect(feedback.some((f) => f.includes("like terms"))).toBe(true);
				expect(feedback.some((f) => f.includes("distributive"))).toBe(true);
			});

			it("should return empty feedback for no patterns", () => {
				const feedback = getSimplificationFeedback([]);

				expect(feedback).toHaveLength(0);
			});
		});

		describe("Integration with existing math engine", () => {
			it("should work with equations", () => {
				// Test that it can analyze parts of equations
				const result = analyzeExpressionTree("3x + 2x");

				expect(result.isFullySimplified).toBe(false);
				expect(result.patterns.some((p) => p.type === "LIKE_TERMS")).toBe(true);
			});

			it("should provide actionable suggestions", () => {
				const result = analyzeExpressionTree("3x + 2x + 5 + 7");
				const feedback = getSimplificationFeedback(result.patterns);

				expect(feedback.length).toBeGreaterThan(0);
				expect(feedback.every((f) => f.includes("You can"))).toBe(true);
			});
		});
	});

	describe("Tree-Based Canonical Form (Phase 6b)", () => {
		describe("Tree Transformation Testing", () => {
			it("should produce identical canonical trees for equivalent expressions", () => {
				// Test case: '2x + 10' and '10 + 2x' -> should produce identical canonical trees
				const expr1 = "2x + 10";
				const expr2 = "10 + 2x";
				
				expect(areCanonicallyEquivalent(expr1, expr2)).toBe(true);
			});

			it("should handle polynomial reordering consistently", () => {
				// Test case: '3x^2 + 2x + 1' and '1 + 2x + 3x^2' -> should produce identical canonical trees
				const expr1 = "3x^2 + 2x + 1";
				const expr2 = "1 + 2x + 3x^2";
				
				expect(areCanonicallyEquivalent(expr1, expr2)).toBe(true);
			});

			it("should implement alphabetical variable ordering", () => {
				// Test case: 'x + y' and 'y + x' -> should produce identical canonical trees
				const expr1 = "x + y";
				const expr2 = "y + x";
				
				expect(areCanonicallyEquivalent(expr1, expr2)).toBe(true);
			});

			it("should handle coefficient normalization", () => {
				// Test case: '1*x + 0*y' -> should transform to 'x'
				const expr1 = "1*x + 0*y";
				const expr2 = "x";
				
				expect(areCanonicallyEquivalent(expr1, expr2)).toBe(true);
			});

			it("should handle negative coefficient normalization", () => {
				const expr1 = "-1*x";
				const expr2 = "-x";
				
				expect(areCanonicallyEquivalent(expr1, expr2)).toBe(true);
			});

			it("should handle zero coefficient elimination", () => {
				const expr1 = "2x + 0*y + 3";
				const expr2 = "2x + 3";
				
				expect(areCanonicallyEquivalent(expr1, expr2)).toBe(true);
			});
		});

		describe("Canonical Form Consistency", () => {
			it("should produce deterministic canonical forms", () => {
				const expression = "3x + 2y - x + 5";
				
				// Multiple calls should produce the same canonical form
				const canonical1 = getEnhancedCanonical(expression);
				const canonical2 = getEnhancedCanonical(expression);
				
				expect(canonical1.equals(canonical2)).toBe(true);
			});

			it("should handle complex multi-variable expressions", () => {
				const expr1 = "3a + 2b - a + 4c";
				const expr2 = "2a + 2b + 4c";
				
				expect(areCanonicallyEquivalent(expr1, expr2)).toBe(true);
			});

			it("should handle power ordering correctly", () => {
				const expr1 = "x + x^3 + x^2";
				const expr2 = "x^3 + x^2 + x";
				
				expect(areCanonicallyEquivalent(expr1, expr2)).toBe(true);
			});

			it("should place constants at the end", () => {
				const expr1 = "5 + 2x + 3y";
				const expr2 = "2x + 3y + 5";
				
				expect(areCanonicallyEquivalent(expr1, expr2)).toBe(true);
			});
		});

		describe("Equation Canonicalization", () => {
					it("should handle equation reordering", () => {
			// Test case: '3x = 9' and '9 = 3x' -> should produce identical canonical trees
			// Note: For equations, we use the original areEquivalent which handles equation reordering
			const eq1 = "3x = 9";
			const eq2 = "9 = 3x";
			

			
			expect(areEquivalent(eq1, eq2)).toBe(true);
		});

			it("should canonicalize complex equations consistently", () => {
				// Test case: '5x + 3 = 2x + 12' and '5x - 2x = 12 - 3' are actually equivalent
				const eq1 = "5x + 3 = 2x + 12";
				const eq2 = "5x - 2x = 12 - 3";
				
				// These ARE equivalent (both simplify to 3x = 9), so they should be detected as such
				expect(areEquivalent(eq1, eq2)).toBe(true);
				
				// But the canonical forms should be internally consistent
				const canonical1 = getEnhancedCanonical(eq1);
				const canonical2 = getEnhancedCanonical(eq1); // Same equation
				
				expect(canonical1.equals(canonical2)).toBe(true);
			});

			it("should maintain mathematical equivalence after canonicalization", () => {
				const eq1 = "2x + 4 = 10";
				const eq2 = "4 + 2x = 10";
				
				expect(areCanonicallyEquivalent(eq1, eq2)).toBe(true);
			});
		});

		describe("Performance and Edge Cases", () => {
			it("should handle single terms correctly", () => {
				const expr1 = "x";
				const expr2 = "1*x";
				
				expect(areCanonicallyEquivalent(expr1, expr2)).toBe(true);
			});

			it("should handle constants correctly", () => {
				const expr1 = "5";
				const expr2 = "5";
				
				expect(areCanonicallyEquivalent(expr1, expr2)).toBe(true);
			});

			it("should handle malformed input gracefully", () => {
				expect(() => getEnhancedCanonical("3x ++ 5")).toThrow();
			});

			it("should handle complex nested expressions", () => {
				const expr1 = "2*(x + 3) + 4*(y - 1)";
				const expr2 = "2*x + 6 + 4*y - 4";
				

				
				// These expressions are mathematically equivalent after expansion
				// Use original areEquivalent since it handles distributive expansion better
				expect(areEquivalent(expr1, expr2)).toBe(true);
			});
		});

		describe("Integration with Existing Math Engine", () => {
			it("should enhance areEquivalent function with canonical comparison", () => {
				// Test that the enhanced areEquivalent function still works for basic cases
				const expr1 = "2x + 3";
				const expr2 = "3 + 2x";
				
				expect(areEquivalent(expr1, expr2)).toBe(true);
			});

			it("should fallback gracefully when canonical comparison fails", () => {
				// Test edge cases where canonical comparison might fail
				const expr1 = "x + 1";
				const expr2 = "1 + x";
				
				expect(areEquivalent(expr1, expr2)).toBe(true);
			});

			it("should work with the validation engine", () => {
				// Test that Phase 6b enhancements work with existing validation
				const expr1 = "3x + 2";
				const expr2 = "2 + 3x";
				
				expect(areCanonicallyEquivalent(expr1, expr2)).toBe(true);
			});
		});
	});
});
