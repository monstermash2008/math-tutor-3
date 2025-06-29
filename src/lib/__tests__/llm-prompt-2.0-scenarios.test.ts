import { describe, expect, it, vi } from "vitest";
import { type LLMFeedbackRequest, constructPrompt } from "../llm-feedback-service";
import type { ProblemModel, ValidationResult } from "../validation-engine";

// Mock the environment
vi.mock("../env", () => ({
	env: {
		VITE_OPENROUTER_API_KEY: "mock-api-key",
	},
}));

describe("LLM Prompt 2.0 - Phase 4 Scenario Testing", () => {
	const baseProblem: ProblemModel = {
		_id: "test-phase4",
		problemStatement: "Solve for x: 3x + 6 = 15",
		problemType: "SOLVE_EQUATION",
		solutionSteps: ["3x = 9", "x = 3"],
		difficulty: "Medium",
		isPublic: true,
		timesAttempted: 0,
	};

	describe("Scenario 1: Algebraic Equation Solving", () => {
		it("should provide rich context for correct intermediate step", () => {
			const request: LLMFeedbackRequest = {
				problemStatement: baseProblem.problemStatement,
				userHistory: [baseProblem.problemStatement, "3x = 9"],
				studentInput: "x = 3",
				validationResult: "CORRECT_FINAL_STEP",
				problemModel: baseProblem,
				feedbackHistory: {},
				currentStepIndex: 1,
				
				// Enhanced mathematical analysis
				contextualHints: ["Isolate variable", "Apply division"],
				needsSimplification: false,
				simplificationSuggestions: [],
				stepOperation: {
					operationType: "division",
					isValid: true,
					description: "Divided both sides by 3 to solve for x"
				}
			};

			const prompt = constructPrompt(request);

			// Verify mathematical analysis section
			expect(prompt).toContain("MATHEMATICAL ANALYSIS:");
			expect(prompt).toContain("Expression needs simplification: false");
			expect(prompt).toContain("Mathematical context: Isolate variable, Apply division");

			// Verify step operation analysis
			expect(prompt).toContain("STUDENT'S ATTEMPTED OPERATION:");
			expect(prompt).toContain("Operation type: division");
			expect(prompt).toContain("Divided both sides by 3 to solve for x");
			expect(prompt).toContain("Operation validity: true");

			// Should acknowledge correct final step
			expect(prompt).toContain("Student solved the problem!");
		});

		it("should provide specific guidance for simplification needs", () => {
			const request: LLMFeedbackRequest = {
				problemStatement: "Solve for x: 2x + 4 = 10",
				userHistory: ["Solve for x: 2x + 4 = 10", "2x = 6"],
				studentInput: "x = 6/2",
				validationResult: "CORRECT_BUT_NOT_SIMPLIFIED",
				problemModel: baseProblem,
				feedbackHistory: {},
				currentStepIndex: 1,
				
				// Enhanced mathematical analysis for simplification
				contextualHints: ["Simplify fractions", "Perform division"],
				needsSimplification: true,
				simplificationSuggestions: [
					"6/2 simplifies to 3",
					"Divide numerator by denominator: 6 ÷ 2 = 3"
				],
				stepOperation: {
					operationType: "division",
					isValid: true,
					description: "Divided both sides by 2 to isolate x"
				}
			};

			const prompt = constructPrompt(request);

			// Verify mathematical analysis
			expect(prompt).toContain("Expression needs simplification: true");
			expect(prompt).toContain("Mathematical context: Simplify fractions, Perform division");

			// Verify specific guidance section
			expect(prompt).toContain("SPECIFIC GUIDANCE:");
			expect(prompt).toContain("6/2 simplifies to 3");
			expect(prompt).toContain("Divide numerator by denominator: 6 ÷ 2 = 3");

			// Should instruct to use mathematical analysis
			expect(prompt).toContain("Use the mathematical analysis above to provide specific guidance");
		});
	});

	describe("Scenario 2: Error Detection and Guidance", () => {
		it("should provide targeted feedback for equivalence failures", () => {
			const request: LLMFeedbackRequest = {
				problemStatement: "Solve for x: 4x + 8 = 20",
				userHistory: ["Solve for x: 4x + 8 = 20"],
				studentInput: "4x = 28", // Error: should be 4x = 12
				validationResult: "EQUIVALENCE_FAILURE",
				problemModel: baseProblem,
				feedbackHistory: {},
				currentStepIndex: 0,
				
				// Enhanced analysis for error case
				contextualHints: ["Check arithmetic", "Subtract correctly"],
				needsSimplification: false,
				simplificationSuggestions: [],
				stepOperation: {
					operationType: "subtraction",
					isValid: false,
					description: "Attempted to subtract 8 from both sides but made arithmetic error"
				}
			};

			const prompt = constructPrompt(request);

			// Verify operation analysis shows the error
			expect(prompt).toContain("STUDENT'S ATTEMPTED OPERATION:");
			expect(prompt).toContain("Operation type: subtraction");
			expect(prompt).toContain("arithmetic error");
			expect(prompt).toContain("Operation validity: false");

			// Verify contextual hints for correction
			expect(prompt).toContain("Mathematical context: Check arithmetic, Subtract correctly");

			// Should instruct to use both analyses
			expect(prompt).toContain("Use the mathematical analysis and operation analysis above to provide targeted guidance");
		});

		it("should handle valid but non-progressive steps", () => {
			const request: LLMFeedbackRequest = {
				problemStatement: "Solve for x: 5x + 10 = 25",
				userHistory: ["Solve for x: 5x + 10 = 25"],
				studentInput: "5x + 10 = 25", // Valid but same as problem - no progress
				validationResult: "VALID_BUT_NO_PROGRESS",
				problemModel: baseProblem,
				feedbackHistory: {},
				currentStepIndex: 0,
				
				// Enhanced analysis for no progress
				contextualHints: ["Try a different operation", "Isolate the variable term"],
				needsSimplification: false,
				simplificationSuggestions: [],
				stepOperation: {
					operationType: "restatement",
					isValid: true,
					description: "Restated the original equation without performing any operation"
				}
			};

			const prompt = constructPrompt(request);

			// Verify operation analysis explains what happened
			expect(prompt).toContain("Operation type: restatement");
			expect(prompt).toContain("Restated the original equation without performing any operation");
			expect(prompt).toContain("Operation validity: true");

			// Should instruct to use operation analysis for guidance
			expect(prompt).toContain("Use the operation analysis above to explain what they tried and suggest better approaches");

			// Verify contextual hints for progression
			expect(prompt).toContain("Try a different operation, Isolate the variable term");
		});
	});

	describe("Scenario 3: Complex Mathematical Operations", () => {
		it("should handle multi-step algebraic manipulation", () => {
			const request: LLMFeedbackRequest = {
				problemStatement: "Simplify: 3(2x + 4) - 2x = 14",
				userHistory: [
					"Simplify: 3(2x + 4) - 2x = 14",
					"6x + 12 - 2x = 14"
				],
				studentInput: "4x + 12 = 14",
				validationResult: "CORRECT_INTERMEDIATE_STEP",
				problemModel: baseProblem,
				feedbackHistory: {},
				currentStepIndex: 1,
				
				// Enhanced analysis for complex operations
				contextualHints: ["Combine like terms", "Continue isolating variable"],
				needsSimplification: false,
				simplificationSuggestions: [],
				stepOperation: {
					operationType: "combine_like_terms",
					isValid: true,
					description: "Combined like terms: 6x - 2x = 4x"
				}
			};

			const prompt = constructPrompt(request);

			// Verify complex operation is captured
			expect(prompt).toContain("Operation type: combine_like_terms");
			expect(prompt).toContain("Combined like terms: 6x - 2x = 4x");

			// Verify appropriate contextual hints
			expect(prompt).toContain("Combine like terms, Continue isolating variable");

			// Should acknowledge correct progress
			expect(prompt).toContain("Student made correct progress");
		});

		it("should provide detailed analysis for parsing errors", () => {
			const request: LLMFeedbackRequest = {
				problemStatement: "Solve for x: x + 5 = 12",
				userHistory: ["Solve for x: x + 5 = 12"],
				studentInput: "x ++ 7", // Parsing error
				validationResult: "PARSING_ERROR",
				problemModel: baseProblem,
				feedbackHistory: {},
				currentStepIndex: 0,
				
				// Enhanced analysis for parsing error
				contextualHints: ["Check expression format", "Use single operators"],
				needsSimplification: false,
				simplificationSuggestions: [],
				// No step operation for parsing errors
			};

			const prompt = constructPrompt(request);

			// Should include contextual hints even for parsing errors
			expect(prompt).toContain("Mathematical context: Check expression format, Use single operators");

			// Should not include operation analysis (since parsing failed)
			expect(prompt).not.toContain("STUDENT'S ATTEMPTED OPERATION:");

			// Should provide formatting guidance
			expect(prompt).toContain("Student's input has formatting issues");
		});
	});

	describe("Scenario 4: Progressive Feedback Integration", () => {
		it("should provide enhanced context for repeated attempts", () => {
			const request: LLMFeedbackRequest = {
				problemStatement: "Solve for x: 2x - 3 = 7",
				userHistory: ["Solve for x: 2x - 3 = 7"],
				studentInput: "2x = 4", // Error: should be 2x = 10
				validationResult: "EQUIVALENCE_FAILURE",
				problemModel: baseProblem,
				feedbackHistory: {
					0: [
						{
							id: "feedback1",
							stepIndex: 0,
							feedback: "Check your arithmetic when moving terms",
							timestamp: Date.now(),
							order: 1,
							validationResult: "EQUIVALENCE_FAILURE" as ValidationResult,
						},
					],
				},
				currentStepIndex: 0,
				
				// Enhanced analysis for second attempt
				contextualHints: ["Add 3 to both sides", "Check arithmetic carefully"],
				needsSimplification: false,
				simplificationSuggestions: [],
				stepOperation: {
					operationType: "addition",
					isValid: false,
					description: "Attempted to add 3 to both sides but calculated incorrectly"
				}
			};

			const prompt = constructPrompt(request);

			// Should include previous feedback context
			expect(prompt).toContain("Previous feedback given to student for this step:");
			expect(prompt).toContain("Check your arithmetic when moving terms");
			expect(prompt).toContain("Don't repeat information already given");

			// Should include enhanced mathematical analysis
			expect(prompt).toContain("MATHEMATICAL ANALYSIS:");
			expect(prompt).toContain("Add 3 to both sides, Check arithmetic carefully");

			// Should include operation analysis for the specific error
			expect(prompt).toContain("calculated incorrectly");
			expect(prompt).toContain("Operation validity: false");

			// Should provide moderate hints (second attempt)
			expect(prompt).toContain("Identify which part has the error without giving the answer");
		});
	});

	describe("Scenario 5: Edge Cases and Robustness", () => {
		it("should handle requests without enhanced analysis gracefully", () => {
			const basicRequest: LLMFeedbackRequest = {
				problemStatement: "Solve for x: x + 1 = 4",
				userHistory: ["Solve for x: x + 1 = 4"],
				studentInput: "x = 3",
				validationResult: "CORRECT_FINAL_STEP",
				problemModel: baseProblem,
				feedbackHistory: {},
				currentStepIndex: 0,
				// No enhanced analysis fields
			};

			const prompt = constructPrompt(basicRequest);

			// Should not include analysis sections
			expect(prompt).not.toContain("MATHEMATICAL ANALYSIS:");
			expect(prompt).not.toContain("STUDENT'S ATTEMPTED OPERATION:");
			expect(prompt).not.toContain("SPECIFIC GUIDANCE:");

			// But should still function correctly
			expect(prompt).toContain("Student solved the problem!");
		});

		it("should handle empty arrays and undefined values", () => {
			const edgeCaseRequest: LLMFeedbackRequest = {
				problemStatement: "Solve for x: x = 5",
				userHistory: ["Solve for x: x = 5"],
				studentInput: "x = 5",
				validationResult: "CORRECT_FINAL_STEP",
				problemModel: baseProblem,
				feedbackHistory: {},
				currentStepIndex: 0,
				
				// Edge case values
				contextualHints: [], // Empty array
				needsSimplification: undefined, // Undefined
				simplificationSuggestions: [], // Empty array
				stepOperation: undefined // Undefined
			};

			const prompt = constructPrompt(edgeCaseRequest);

			// Should not include empty sections
			expect(prompt).not.toContain("MATHEMATICAL ANALYSIS:");
			expect(prompt).not.toContain("STUDENT'S ATTEMPTED OPERATION:");
			expect(prompt).not.toContain("SPECIFIC GUIDANCE:");

			// Should still work correctly
			expect(prompt).toContain("Student solved the problem!");
		});

		it("should handle long arrays of suggestions properly", () => {
			const longSuggestionsRequest: LLMFeedbackRequest = {
				problemStatement: "Simplify: (x^2 + 2x + 1)/(x + 1)",
				userHistory: ["Simplify: (x^2 + 2x + 1)/(x + 1)"],
				studentInput: "(x^2 + 2x + 1)/(x + 1)",
				validationResult: "VALID_BUT_NO_PROGRESS",
				problemModel: baseProblem,
				feedbackHistory: {},
				currentStepIndex: 0,
				
				// Long arrays to test formatting
				contextualHints: [
					"Factor the numerator",
					"Look for perfect square trinomials", 
					"Cancel common factors",
					"Simplify the resulting expression"
				],
				needsSimplification: true,
				simplificationSuggestions: [
					"Factor x^2 + 2x + 1 as (x + 1)^2",
					"Rewrite as (x + 1)^2 / (x + 1)",
					"Cancel the common factor (x + 1)",
					"The simplified form is (x + 1)"
				],
			};

			const prompt = constructPrompt(longSuggestionsRequest);

			// Should include all contextual hints
			expect(prompt).toContain("Factor the numerator, Look for perfect square trinomials, Cancel common factors, Simplify the resulting expression");

			// Should include all specific guidance items
			expect(prompt).toContain("Factor x^2 + 2x + 1 as (x + 1)^2");
			expect(prompt).toContain("Rewrite as (x + 1)^2 / (x + 1)");
			expect(prompt).toContain("Cancel the common factor (x + 1)");
			expect(prompt).toContain("The simplified form is (x + 1)");
		});
	});

	describe("Scenario 6: Quality Metrics Verification", () => {
		it("should demonstrate significant prompt enhancement", () => {
			// Create two identical requests - one basic, one enhanced
			const basicRequest: LLMFeedbackRequest = {
				problemStatement: "Solve for x: 6x - 12 = 18",
				userHistory: ["Solve for x: 6x - 12 = 18"],
				studentInput: "6x = 30",
				validationResult: "CORRECT_INTERMEDIATE_STEP",
				problemModel: baseProblem,
				feedbackHistory: {},
				currentStepIndex: 0,
			};

			const enhancedRequest: LLMFeedbackRequest = {
				...basicRequest,
				contextualHints: ["Isolate variable term", "Use addition property"],
				needsSimplification: false,
				simplificationSuggestions: [],
				stepOperation: {
					operationType: "addition",
					isValid: true,
					description: "Added 12 to both sides to isolate the 6x term"
				}
			};

			const basicPrompt = constructPrompt(basicRequest);
			const enhancedPrompt = constructPrompt(enhancedRequest);

			// Measure improvement metrics
			const basicLength = basicPrompt.length;
			const enhancedLength = enhancedPrompt.length;
			const lengthIncrease = (enhancedLength - basicLength) / basicLength;

			// Enhanced prompt should be significantly longer (more informative)
			expect(lengthIncrease).toBeGreaterThan(0.3); // At least 30% more content

			// Enhanced prompt should contain mathematical analysis
			expect(enhancedPrompt).toContain("MATHEMATICAL ANALYSIS:");
			expect(enhancedPrompt).toContain("STUDENT'S ATTEMPTED OPERATION:");

			// Basic prompt should not contain these sections
			expect(basicPrompt).not.toContain("MATHEMATICAL ANALYSIS:");
			expect(basicPrompt).not.toContain("STUDENT'S ATTEMPTED OPERATION:");

			// Both should contain core instruction
			expect(basicPrompt).toContain("Student made correct progress");
			expect(enhancedPrompt).toContain("Student made correct progress");
		});
	});
}); 