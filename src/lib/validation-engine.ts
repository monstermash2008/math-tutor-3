import {
	MathParsingError,
	type TreeAnalysisResult,
	analyzeExpressionTree,
	areEquivalent,
	getCanonical,
	getSimplificationFeedback,
	isFullySimplified,
	validateMathInputSyntax,
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
	treeAnalysis?: TreeAnalysisResult;
	simplificationFeedback?: string[];
	detectedPatterns?: string[];
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
 * Now includes tree-based analysis for sophisticated pattern detection
 *
 * @param context - The validation context containing problem, history, and input
 * @returns StepValidationResult with tree analysis and specific feedback
 */
export function validateStep(context: ValidationContext): StepValidationResult {
	const { problemModel, userHistory, studentInput } = context;

	try {
		// Validate input syntax upfront to catch parsing errors early
		validateMathInputSyntax(studentInput);

		// Perform tree-based analysis of the student input
		const treeAnalysis = analyzeExpressionTree(studentInput);
		const simplificationFeedback = getSimplificationFeedback(
			treeAnalysis.patterns,
		);
		const detectedPatterns = treeAnalysis.patterns.map((p) => p.type);

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

		// Enhanced progress check using tree analysis
		const isRepeatingPreviousStep = checkForNoProgress(
			studentInput,
			previousStep,
			isCorrectStep,
		);

		if (isRepeatingPreviousStep) {
			return {
				result: "VALID_BUT_NO_PROGRESS",
				isCorrect: false,
				shouldAdvance: false,
				treeAnalysis,
				simplificationFeedback,
				detectedPatterns,
			};
		}

		if (isCorrectStep) {
			// Find which specific teacher step this matches
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
				// Enhanced final step validation using tree analysis
				if (treeAnalysis.isFullySimplified) {
					return {
						result: "CORRECT_FINAL_STEP",
						isCorrect: true,
						shouldAdvance: true,
						treeAnalysis,
						simplificationFeedback: [],
						detectedPatterns,
					};
				}
				return {
					result: "CORRECT_BUT_NOT_SIMPLIFIED",
					isCorrect: true,
					shouldAdvance: true,
					treeAnalysis,
					simplificationFeedback,
					detectedPatterns,
				};
			}

			// This is a correct intermediate step
			return {
				result: "CORRECT_INTERMEDIATE_STEP",
				isCorrect: true,
				shouldAdvance: true,
				treeAnalysis,
				simplificationFeedback: treeAnalysis.isFullySimplified
					? []
					: simplificationFeedback,
				detectedPatterns,
			};
		}

		// Not a correct step - provide detailed feedback
		return {
			result: "EQUIVALENCE_FAILURE",
			isCorrect: false,
			shouldAdvance: false,
			treeAnalysis,
			simplificationFeedback,
			detectedPatterns,
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
 * Enhanced progress check that uses tree analysis to detect meaningful changes
 */
function checkForNoProgress(
	studentInput: string,
	previousStep: string,
	isCorrectStep: boolean,
): boolean {
	// Exact string repetition is always no progress
	if (studentInput.trim() === previousStep.trim()) {
		return true;
	}

	// If it's a correct step, it's progress regardless of equivalence
	if (isCorrectStep) {
		return false;
	}

	// Check mathematical equivalence
	try {
		if (areEquivalent(studentInput, previousStep)) {
			// Even if mathematically equivalent, check if simplification patterns changed
			const currentAnalysis = analyzeExpressionTree(studentInput);
			const previousAnalysis = analyzeExpressionTree(previousStep);

			// If the new expression has fewer unsimplified patterns, it's progress
			const currentPatternCount = currentAnalysis.patterns.length;
			const previousPatternCount = previousAnalysis.patterns.length;

			return currentPatternCount >= previousPatternCount;
		}
	} catch {
		// If comparison fails, assume it's not repetition
		return false;
	}

	return false;
}

/**
 * Checks if the problem has been completely solved using tree-based analysis
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

		const isEquivalent = areEquivalent(lastUserStep, finalTeacherStep);
		const isSimplified = analyzeExpressionTree(lastUserStep).isFullySimplified;

		return isEquivalent && isSimplified;
	} catch {
		return false;
	}
}

/**
 * Generates contextual hints based on tree analysis
 */
export function generateContextualHints(context: ValidationContext): string[] {
	const { studentInput } = context;
	const hints: string[] = [];

	try {
		const analysis = analyzeExpressionTree(studentInput);

		if (analysis.patterns.length === 0 && analysis.hasUnsimplifiedOperations) {
			hints.push(
				"Look for opportunities to simplify coefficients or clean up the expression.",
			);
		}

		if (analysis.patterns.length > 0) {
			const feedback = getSimplificationFeedback(analysis.patterns);
			hints.push(...feedback);
		}

		if (analysis.isFullySimplified) {
			hints.push(
				"This expression appears to be fully simplified. Check if it matches the expected form.",
			);
		}

		return hints;
	} catch {
		return ["Try to simplify your expression step by step."];
	}
}

/**
 * Checks if an expression needs simplification using tree analysis
 */
export function needsSimplification(expression: string): boolean {
	try {
		const analysis = analyzeExpressionTree(expression);
		return !analysis.isFullySimplified;
	} catch {
		return false;
	}
}

/**
 * Gets specific simplification suggestions for an expression
 */
export function getSimplificationSuggestions(expression: string): string[] {
	try {
		const analysis = analyzeExpressionTree(expression);
		return getSimplificationFeedback(analysis.patterns);
	} catch {
		return [];
	}
}

/**
 * Analyzes the mathematical operation performed between two steps
 */
export function analyzeStepOperation(
	previousStep: string,
	currentStep: string,
): {
	operationType: string;
	isValid: boolean;
	description: string;
} {
	try {
		const prevAnalysis = analyzeExpressionTree(previousStep);
		const currAnalysis = analyzeExpressionTree(currentStep);

		// Compare pattern counts to identify operation type
		const prevPatterns = prevAnalysis.patterns.map((p) => p.type);
		const currPatterns = currAnalysis.patterns.map((p) => p.type);

		if (
			prevPatterns.includes("CONSTANT_ARITHMETIC") &&
			!currPatterns.includes("CONSTANT_ARITHMETIC")
		) {
			return {
				operationType: "SIMPLIFIED_ARITHMETIC",
				isValid: true,
				description: "Simplified constant arithmetic operations",
			};
		}

		if (
			prevPatterns.includes("LIKE_TERMS") &&
			!currPatterns.includes("LIKE_TERMS")
		) {
			return {
				operationType: "COMBINED_LIKE_TERMS",
				isValid: true,
				description: "Combined like terms",
			};
		}

		if (
			prevPatterns.includes("DISTRIBUTIVE") &&
			!currPatterns.includes("DISTRIBUTIVE")
		) {
			return {
				operationType: "DISTRIBUTED",
				isValid: true,
				description: "Applied distributive property",
			};
		}

		if (areEquivalent(previousStep, currentStep)) {
			return {
				operationType: "EQUIVALENT_TRANSFORMATION",
				isValid: true,
				description: "Applied valid mathematical transformation",
			};
		}

		return {
			operationType: "UNKNOWN",
			isValid: false,
			description: "Could not identify the mathematical operation",
		};
	} catch {
		return {
			operationType: "ERROR",
			isValid: false,
			description: "Error analyzing the mathematical operation",
		};
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
