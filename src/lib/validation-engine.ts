import {
	MathParsingError,
	areEquivalent,
	isFullySimplified,
} from "./math-engine";

/**
 * Validation result codes that indicate the outcome of step validation
 */
export type ValidationResult =
	| "CORRECT_FINAL_STEP"
	| "CORRECT_INTERMEDIATE_STEP"
	| "CORRECT_BUT_NOT_SIMPLIFIED"
	| "VALID_BUT_NO_PROGRESS"
	| "EQUIVALENCE_FAILURE"
	| "PARSING_ERROR";

/**
 * The result of validating a student's step
 */
export interface StepValidationResult {
	result: ValidationResult;
	isCorrect: boolean;
	shouldAdvance: boolean;
	errorMessage?: string;
}

/**
 * Problem model representing the database format
 */
export interface ProblemModel {
	_id: string;
	problemStatement: string;
	problemType: "SOLVE_EQUATION" | "SIMPLIFY_EXPRESSION";
	solutionSteps: string[];
	title?: string;
	description?: string;
	difficulty: "Easy" | "Medium" | "Hard";
	subject?: string;
	gradeLevel?: string;
	isPublic: boolean;
	tags?: string[];
	timesAttempted: number;
	averageSteps?: number;
	successRate?: number;
	createdBy?: string;
}

/**
 * Context needed for step validation
 */
export interface ValidationContext {
	problemModel: ProblemModel;
	userHistory: string[];
	studentInput: string;
}

/**
 * Main validation function that checks a student's step against the problem model
 *
 * @param context - The validation context containing problem, history, and input
 * @returns StepValidationResult indicating the outcome
 */
export function validateStep(context: ValidationContext): StepValidationResult {
	const { problemModel, userHistory, studentInput } = context;

	try {
		// Get the previous step (last correct step in history)
		const previousStep = userHistory[userHistory.length - 1];
		const teacherSteps = problemModel.solutionSteps;

		// Check if student input matches any teacher step
		const matchingTeacherStep = teacherSteps.find((teacherStep) => {
			try {
				return areEquivalent(studentInput, teacherStep);
			} catch {
				return false;
			}
		});

		const isCorrectStep = !!matchingTeacherStep;

		// Check for no progress: only flag if expressions are literally the same
		// Mathematical equivalence is not enough - we want to catch exact repetition
		const isRepeatingPreviousStep =
			studentInput.trim() === previousStep.trim() ||
			(areEquivalent(studentInput, previousStep) && !isCorrectStep);

		if (isRepeatingPreviousStep) {
			return {
				result: "VALID_BUT_NO_PROGRESS",
				isCorrect: false,
				shouldAdvance: false,
			};
		}

		if (isCorrectStep) {
			// Find which specific teacher step this matches
			// Look for exact match first, then equivalent match
			let matchingStepIndex = teacherSteps.findIndex(
				(step) => studentInput.trim() === step.trim(),
			);

			// If no exact match found, look for equivalent match
			if (matchingStepIndex === -1) {
				matchingStepIndex = teacherSteps.findIndex((step) =>
					areEquivalent(studentInput, step),
				);
			}

			// Check if this is the final step in the sequence
			const isFinalStepInSequence =
				matchingStepIndex === teacherSteps.length - 1;

			if (isFinalStepInSequence) {
				// This is the final step in the teacher's sequence
				if (isFullySimplified(studentInput)) {
					return {
						result: "CORRECT_FINAL_STEP",
						isCorrect: true,
						shouldAdvance: true,
					};
				}
				return {
					result: "CORRECT_BUT_NOT_SIMPLIFIED",
					isCorrect: true,
					shouldAdvance: true,
				};
			}
			// This is a correct intermediate step in the sequence
			return {
				result: "CORRECT_INTERMEDIATE_STEP",
				isCorrect: true,
				shouldAdvance: true,
			};
		}
		return {
			result: "EQUIVALENCE_FAILURE",
			isCorrect: false,
			shouldAdvance: false,
		};
	} catch (error) {
		if (error instanceof MathParsingError) {
			return {
				result: "PARSING_ERROR",
				isCorrect: false,
				shouldAdvance: false,
				errorMessage: error.message,
			};
		}

		// Handle unexpected errors
		return {
			result: "PARSING_ERROR",
			isCorrect: false,
			shouldAdvance: false,
			errorMessage: "An unexpected error occurred during validation",
		};
	}
}

/**
 * Checks if the problem has been completely solved
 *
 * @param context - The validation context
 * @returns true if the last step in history is equivalent to the final teacher step and simplified
 */
export function isProblemSolved(context: ValidationContext): boolean {
	const { problemModel, userHistory } = context;

	if (userHistory.length === 0) {
		return false;
	}

	try {
		const lastUserStep = userHistory[userHistory.length - 1];
		const finalTeacherStep =
			problemModel.solutionSteps[problemModel.solutionSteps.length - 1];

		return (
			areEquivalent(lastUserStep, finalTeacherStep) &&
			isFullySimplified(lastUserStep)
		);
	} catch {
		return false;
	}
}

/**
 * Gets the expected next steps from the teacher model based on current progress
 *
 * @param context - The validation context
 * @returns Array of remaining teacher steps
 */
export function getExpectedNextSteps(context: ValidationContext): string[] {
	const { problemModel, userHistory } = context;
	const teacherSteps = problemModel.solutionSteps;

	if (userHistory.length <= 1) {
		// Only problem statement in history, return all teacher steps
		return [...teacherSteps];
	}

	// Find the last completed step in the teacher model
	const lastUserStep = userHistory[userHistory.length - 1];
	let currentTeacherIndex = -1;

	// Find which teacher step corresponds to the user's last step
	// Look for exact match first, then equivalent match
	for (let i = 0; i < teacherSteps.length; i++) {
		if (lastUserStep.trim() === teacherSteps[i].trim()) {
			currentTeacherIndex = i;
			break;
		}
	}

	// If no exact match found, look for equivalent match
	if (currentTeacherIndex === -1) {
		for (let i = 0; i < teacherSteps.length; i++) {
			try {
				if (areEquivalent(lastUserStep, teacherSteps[i])) {
					currentTeacherIndex = i;
					break;
				}
			} catch {
				// Skip invalid steps - continue to next iteration
			}
		}
	}

	// Return remaining steps after the current position
	return teacherSteps.slice(currentTeacherIndex + 1);
}
