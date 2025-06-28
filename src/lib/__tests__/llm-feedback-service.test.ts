import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type LLMFeedbackRequest,
	constructPrompt,
	getLLMFeedback,
} from "../llm-feedback-service";
import type { ProblemModel } from "../validation-engine";

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
	};

	describe("constructPrompt", () => {
		it("should construct correct prompts for CORRECT_FINAL_STEP", () => {
			const request = {
				...baseLLMRequest,
				validationResult: "CORRECT_FINAL_STEP" as const,
				studentInput: "x = 3",
			};

			const prompt = constructPrompt(request);

			expect(prompt).toContain("You are a helpful math tutor");
			expect(prompt).toContain("Solve for x: 5x + 3 = 2x + 12");
			expect(prompt).toContain("Student's current input: x = 3");
			expect(prompt).toContain("Validation result: CORRECT_FINAL_STEP");
			expect(prompt).toContain("successfully solved the problem");
			expect(prompt).toContain("1-2 sentences maximum");
		});

		it("should construct correct prompts for CORRECT_INTERMEDIATE_STEP", () => {
			const request = {
				...baseLLMRequest,
				validationResult: "CORRECT_INTERMEDIATE_STEP" as const,
			};

			const prompt = constructPrompt(request);

			expect(prompt).toContain("correct step forward");
			expect(prompt).toContain("hint about what type of operation");
			expect(prompt).toContain("2-3 sentences maximum");
		});

		it("should construct correct prompts for CORRECT_BUT_NOT_SIMPLIFIED", () => {
			const request = {
				...baseLLMRequest,
				validationResult: "CORRECT_BUT_NOT_SIMPLIFIED" as const,
				studentInput: "x = 9/3",
			};

			const prompt = constructPrompt(request);

			expect(prompt).toContain(
				"mathematically correct but not fully simplified",
			);
			expect(prompt).toContain("gently guide them to simplify");
		});

		it("should construct correct prompts for EQUIVALENCE_FAILURE", () => {
			const request = {
				...baseLLMRequest,
				validationResult: "EQUIVALENCE_FAILURE" as const,
				studentInput: "5x = 9",
			};

			const prompt = constructPrompt(request);

			expect(prompt).toContain("made an error in their calculation");
			expect(prompt).toContain("without giving away the answer");
		});

		it("should construct correct prompts for PARSING_ERROR", () => {
			const request = {
				...baseLLMRequest,
				validationResult: "PARSING_ERROR" as const,
				studentInput: "3x ++ 9",
			};

			const prompt = constructPrompt(request);

			expect(prompt).toContain("formatting issue");
			expect(prompt).toContain("write mathematical expressions clearly");
		});

		it("should include previous steps in the prompt", () => {
			const request = {
				...baseLLMRequest,
				userHistory: [mockProblem.problemStatement, "3x + 3 = 12", "3x = 9"],
			};

			const prompt = constructPrompt(request);

			expect(prompt).toContain("1. 3x + 3 = 12");
			expect(prompt).toContain("2. 3x = 9");
		});

		it("should handle empty history correctly", () => {
			const request = {
				...baseLLMRequest,
				userHistory: [mockProblem.problemStatement],
			};

			const prompt = constructPrompt(request);

			expect(prompt).toContain("Previous correct steps: None yet");
		});
	});
});
