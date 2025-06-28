import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type LLMFeedbackRequest,
	constructPrompt,
	getLLMFeedback,
} from "../llm-feedback-service";
import type { ProblemModel, ValidationResult } from "../validation-engine";

// Mock the environment
vi.mock("../env", () => ({
	env: {
		VITE_OPENROUTER_API_KEY: "mock-api-key",
	},
}));

describe("LLM Feedback Service", () => {
	const mockProblem: ProblemModel = {
		problemId: "test-001",
		problemStatement: "Solve for x: 5x + 3 = 2x + 12",
		problemType: "SOLVE_EQUATION",
		teacherModel: {
			type: "sequential_steps",
			steps: ["3x + 3 = 12", "3x = 9", "x = 3"],
		},
	};

	const baseLLMRequest: LLMFeedbackRequest = {
		problemStatement: mockProblem.problemStatement,
		userHistory: [mockProblem.problemStatement, "3x + 3 = 12"],
		studentInput: "3x = 9",
		validationResult: "CORRECT_INTERMEDIATE_STEP",
		problemModel: mockProblem,
		feedbackHistory: {},
		currentStepIndex: 1,
	};

	describe("constructPrompt", () => {
		it("should construct correct prompts for CORRECT_FINAL_STEP", () => {
			const request = {
				...baseLLMRequest,
				validationResult: "CORRECT_FINAL_STEP" as const,
				studentInput: "x = 3",
			};

			const prompt = constructPrompt(request);

			expect(prompt).toContain("You are a math tutor");
			expect(prompt).toContain("Solve for x: 5x + 3 = 2x + 12");
			expect(prompt).toContain("Student input: x = 3");
			expect(prompt).toContain("Student solved the problem! Briefly confirm correctness. 1 sentence.");
		});

		it("should construct correct prompts for CORRECT_INTERMEDIATE_STEP", () => {
			const request = {
				...baseLLMRequest,
				validationResult: "CORRECT_INTERMEDIATE_STEP" as const,
			};

			const prompt = constructPrompt(request);

			expect(prompt).toContain("Student made correct progress");
			expect(prompt).toContain("minimal hint about the next step");
			expect(prompt).toContain("1-2 sentences");
		});

		it("should construct correct prompts for CORRECT_BUT_NOT_SIMPLIFIED", () => {
			const request = {
				...baseLLMRequest,
				validationResult: "CORRECT_BUT_NOT_SIMPLIFIED" as const,
				studentInput: "x = 9/3",
			};

			const prompt = constructPrompt(request);

			expect(prompt).toContain("Student is correct but needs to simplify");
			expect(prompt).toContain("Gently prompt to simplify further");
			expect(prompt).toContain("1-2 sentences");
		});

		it("should construct correct prompts for EQUIVALENCE_FAILURE", () => {
			const request = {
				...baseLLMRequest,
				validationResult: "EQUIVALENCE_FAILURE" as const,
				studentInput: "5x = 9",
			};

			const prompt = constructPrompt(request);

			expect(prompt).toContain("Student made an error");
			expect(prompt).toContain("Point out there's an error, ask them to check their work");
			expect(prompt).toContain("1-2 sentences");
		});

		it("should construct correct prompts for PARSING_ERROR", () => {
			const request = {
				...baseLLMRequest,
				validationResult: "PARSING_ERROR" as const,
				studentInput: "3x ++ 9",
			};

			const prompt = constructPrompt(request);

			expect(prompt).toContain("Student's input has formatting issues");
			expect(prompt).toContain("Explain how to format math expressions clearly");
			expect(prompt).toContain("1 sentence");
		});

		it("should include previous steps in the prompt", () => {
			const prompt = constructPrompt(baseLLMRequest);

			expect(prompt).toContain("Previous steps: 1. 3x + 3 = 12");
		});

		it("should handle empty history correctly", () => {
			const request = {
				...baseLLMRequest,
				userHistory: [mockProblem.problemStatement],
				studentInput: "3x = 9",
				validationResult: "CORRECT_INTERMEDIATE_STEP" as const,
				currentStepIndex: 0,
			};

			const prompt = constructPrompt(request);

			expect(prompt).toContain("Previous steps: None");
		});

		it("should include previous feedback context for repeated attempts", () => {
			const request = {
				...baseLLMRequest,
				feedbackHistory: {
					2: [{
						id: 'feedback1',
						stepIndex: 2,
						feedback: 'First attempt feedback',
						timestamp: Date.now(),
						order: 1,
						validationResult: 'EQUIVALENCE_FAILURE' as ValidationResult
					}]
				},
				studentInput: "x = 4",
				validationResult: "EQUIVALENCE_FAILURE" as const,
				currentStepIndex: 2
			};
			const prompt = constructPrompt(request);

			expect(prompt).toContain("Previous feedback given to student for this step:");
			expect(prompt).toContain("Attempt 1: First attempt feedback");
			expect(prompt).toContain("Don't repeat information already given");
			expect(prompt).toContain("Identify which part has the error without giving the answer");
		});

		it("should provide progressive hints based on attempt number", () => {
			// First attempt - minimal hints
			const firstAttempt = {
				...baseLLMRequest,
				feedbackHistory: {},
				validationResult: "EQUIVALENCE_FAILURE" as const
			};
			const firstPrompt = constructPrompt(firstAttempt);
			expect(firstPrompt).toContain("Point out there's an error, ask them to check their work");

			// Second attempt - moderate hints  
			const secondAttempt = {
				...baseLLMRequest,
				feedbackHistory: {
					2: [{
						id: 'feedback1',
						stepIndex: 2,
						feedback: 'First feedback',
						timestamp: Date.now(),
						order: 1,
						validationResult: "EQUIVALENCE_FAILURE" as ValidationResult
					}]
				},
				validationResult: "EQUIVALENCE_FAILURE" as const,
				currentStepIndex: 2
			};
			const secondPrompt = constructPrompt(secondAttempt);
			expect(secondPrompt).toContain("Identify which part has the error without giving the answer");

			// Third attempt - detailed hints
			const thirdAttempt = {
				...baseLLMRequest,
				feedbackHistory: {
					2: [
						{
							id: 'feedback1',
							stepIndex: 2,
							feedback: 'First feedback',
							timestamp: Date.now(),
							order: 1,
							validationResult: "EQUIVALENCE_FAILURE" as ValidationResult
						},
						{
							id: 'feedback2',
							stepIndex: 2,
							feedback: 'Second feedback',
							timestamp: Date.now(),
							order: 2,
							validationResult: "EQUIVALENCE_FAILURE" as ValidationResult
						}
					]
				},
				validationResult: "EQUIVALENCE_FAILURE" as const,
				currentStepIndex: 2
			};
			const thirdPrompt = constructPrompt(thirdAttempt);
			expect(thirdPrompt).toContain("Explain what went wrong and hint at the correct approach");
		});
	});
});
