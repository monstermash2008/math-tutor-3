import { describe, expect, it } from "vitest";
import type { ProblemModel } from "../../types";
import { constructPrompt } from "../llm-feedback-service";
import type { LLMFeedbackRequest } from "../llm-feedback-service";

describe("Hint System", () => {
	const mockProblem: ProblemModel = {
		_id: "test-problem",
		problemStatement: "Solve for x: 2x + 3 = 7",
		problemType: "SOLVE_EQUATION",
		solutionSteps: ["2x = 4", "x = 2"],
		difficulty: "Easy",
		isPublic: true,
		timesAttempted: 0,
	};

	it("should construct a hint prompt when isHintRequest is true", () => {
		const hintRequest: LLMFeedbackRequest = {
			problemStatement: mockProblem.problemStatement,
			userHistory: ["2x + 3 = 7"],
			studentInput: "I need help with the next step",
			validationResult: "EQUIVALENCE_FAILURE",
			problemModel: mockProblem,
			currentStepIndex: 0,
			isHintRequest: true,
			expectedNextSteps: ["2x = 4"],
		};

		const prompt = constructPrompt(hintRequest);

		// Verify hint prompt structure
		expect(prompt).toContain("helping a student who is stuck");
		expect(prompt).toContain("The correct next step is: 2x = 4");
		expect(prompt).toContain("WHY this operation is the right choice");
		expect(prompt).toContain("Be encouraging");
		expect(prompt).toContain("2-4 sentences");
	});

	it("should handle hint requests with no expected steps", () => {
		const hintRequest: LLMFeedbackRequest = {
			problemStatement: mockProblem.problemStatement,
			userHistory: ["2x + 3 = 7"],
			studentInput: "I need help",
			validationResult: "EQUIVALENCE_FAILURE",
			problemModel: mockProblem,
			currentStepIndex: 0,
			isHintRequest: true,
			expectedNextSteps: [],
		};

		const prompt = constructPrompt(hintRequest);

		expect(prompt).toContain("Continue working on the problem");
		expect(prompt).toContain("helping a student who is stuck");
	});

	it("should not be a hint prompt when isHintRequest is false", () => {
		const regularRequest: LLMFeedbackRequest = {
			problemStatement: mockProblem.problemStatement,
			userHistory: ["2x + 3 = 7"],
			studentInput: "x = 3",
			validationResult: "EQUIVALENCE_FAILURE",
			problemModel: mockProblem,
			currentStepIndex: 0,
			isHintRequest: false,
		};

		const prompt = constructPrompt(regularRequest);

		// Should be regular prompt, not hint prompt
		expect(prompt).not.toContain("helping a student who is stuck");
		expect(prompt).not.toContain("The correct next step is");
		expect(prompt).toContain("You are a math tutor");
		expect(prompt).toContain("Student made an error");
	});

	it("should handle hint requests with multiple expected steps", () => {
		const hintRequest: LLMFeedbackRequest = {
			problemStatement: mockProblem.problemStatement,
			userHistory: ["2x + 3 = 7"],
			studentInput: "I need help",
			validationResult: "EQUIVALENCE_FAILURE",
			problemModel: mockProblem,
			currentStepIndex: 0,
			isHintRequest: true,
			expectedNextSteps: ["2x = 4", "x = 2"],
		};

		const prompt = constructPrompt(hintRequest);

		// Should use the first expected step
		expect(prompt).toContain("The correct next step is: 2x = 4");
		expect(prompt).not.toContain("x = 2"); // Should not include later steps
		expect(prompt).toContain("helping a student who is stuck");
	});
});
