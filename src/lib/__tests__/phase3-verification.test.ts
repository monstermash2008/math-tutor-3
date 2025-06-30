import { describe, expect, it } from "vitest";
import { validateStep } from "../../../convex/validation_engine";
import type { ProblemModel, ValidationContext } from "../../types";

describe("Phase 3 Verification - UI to Validation Engine Integration", () => {
	const testProblem: ProblemModel = {
		_id: "verification-test",
		problemStatement: "Solve for x: 5x + 3 = 2x + 12",
		problemType: "SOLVE_EQUATION",
		solutionSteps: ["3x + 3 = 12", "3x = 9", "x = 3"],
		difficulty: "Medium",
		isPublic: true,
		timesAttempted: 0,
	};

	it("should demonstrate the complete data flow from UI to validation engine", () => {
		// Simulate the exact flow that happens in MathTutorApp.handleCheckStep

		// Step 1: Initial state (just problem statement in history)
		let userHistory = [testProblem.problemStatement];

		// Step 2: User enters first correct step
		const studentInput1 = "3x + 3 = 12";
		const context1: ValidationContext = {
			problemModel: testProblem,
			userHistory: userHistory,
			studentInput: studentInput1,
		};

		const result1 = validateStep(context1);
		expect(result1.result).toBe("CORRECT_INTERMEDIATE_STEP");
		expect(result1.isCorrect).toBe(true);
		expect(result1.shouldAdvance).toBe(true);

		// Step 3: Update history (as UI would do)
		userHistory = [...userHistory, studentInput1];

		// Step 4: User enters second correct step
		const studentInput2 = "3x = 9";
		const context2: ValidationContext = {
			problemModel: testProblem,
			userHistory: userHistory,
			studentInput: studentInput2,
		};

		const result2 = validateStep(context2);
		expect(result2.result).toBe("CORRECT_INTERMEDIATE_STEP");
		expect(result2.isCorrect).toBe(true);

		// Step 5: Update history again
		userHistory = [...userHistory, studentInput2];

		// Step 6: User enters final step
		const studentInput3 = "x = 3";
		const context3: ValidationContext = {
			problemModel: testProblem,
			userHistory: userHistory,
			studentInput: studentInput3,
		};

		const result3 = validateStep(context3);
		expect(result3.result).toBe("CORRECT_FINAL_STEP");
		expect(result3.isCorrect).toBe(true);

		// This demonstrates the exact same flow that MathTutorApp uses!
	});

	it("should handle error cases correctly", () => {
		const context: ValidationContext = {
			problemModel: testProblem,
			userHistory: [testProblem.problemStatement],
			studentInput: "7x = 9", // Incorrect step
		};

		const result = validateStep(context);
		expect(result.result).toBe("EQUIVALENCE_FAILURE");
		expect(result.isCorrect).toBe(false);
		expect(result.shouldAdvance).toBe(false);
	});

	it("should handle parsing errors gracefully", () => {
		const context: ValidationContext = {
			problemModel: testProblem,
			userHistory: [testProblem.problemStatement],
			studentInput: "3x ++ 5 = 12", // Malformed input
		};

		const result = validateStep(context);
		expect(result.result).toBe("PARSING_ERROR");
		expect(result.isCorrect).toBe(false);
		expect(result.errorMessage).toBeDefined();
	});

	it("should handle valid but no progress scenarios", () => {
		// Start with some history
		const userHistory = [testProblem.problemStatement, "3x + 3 = 12"];

		const context: ValidationContext = {
			problemModel: testProblem,
			userHistory: userHistory,
			studentInput: "3x + 3 = 12", // Repeating the previous step
		};

		const result = validateStep(context);
		expect(result.result).toBe("VALID_BUT_NO_PROGRESS");
		expect(result.isCorrect).toBe(false);
		expect(result.shouldAdvance).toBe(false);
	});

	it("should demonstrate state reducer integration patterns", () => {
		// This test demonstrates how the validation results map to reducer actions
		const context: ValidationContext = {
			problemModel: testProblem,
			userHistory: [testProblem.problemStatement],
			studentInput: "3x + 3 = 12",
		};

		const result = validateStep(context);

		// These are the exact mappings used in MathTutorApp.handleCheckStep
		if (result.result === "CORRECT_FINAL_STEP") {
			// Would dispatch: { type: 'PROBLEM_SOLVED', payload: { step, message } }
			expect(result.isCorrect).toBe(true);
		} else if (result.result === "CORRECT_INTERMEDIATE_STEP") {
			// Would dispatch: { type: 'CHECK_STEP_SUCCESS', payload: { step, message, feedbackStatus: 'success' } }
			expect(result.isCorrect).toBe(true);
			expect(result.shouldAdvance).toBe(true);
		} else if (result.result === "CORRECT_BUT_NOT_SIMPLIFIED") {
			// Would dispatch: { type: 'CHECK_STEP_SUCCESS', payload: { step, message, feedbackStatus: 'warning' } }
			expect(result.isCorrect).toBe(true);
		} else if (
			result.result === "EQUIVALENCE_FAILURE" ||
			result.result === "PARSING_ERROR"
		) {
			// Would dispatch: { type: 'CHECK_STEP_ERROR', payload: { step, message } }
			expect(result.isCorrect).toBe(false);
		}
	});
});
