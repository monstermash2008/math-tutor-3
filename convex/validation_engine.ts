import {
	analyzeExpressionTree,
	areEquivalent,
	getCanonical,
	getSimplificationFeedback,
	isFullySimplified,
	validateMathInputSyntax,
} from "./math_engine";

import type {
	ValidationResult,
	StepValidationResult,
	ProblemModel,
	ValidationContext,
	TreeAnalysisResult,
} from "../src/types";
import { MathParsingError } from "../src/types";

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

	const lastStep = userHistory[userHistory.length - 1];
	const finalTeacherStep = problemModel.solutionSteps[problemModel.solutionSteps.length - 1];

	try {
		return areEquivalent(lastStep, finalTeacherStep) && isFullySimplified(lastStep);
	} catch {
		return false;
	}
}

/**
 * Generates contextual hints based on the current state of the problem
 */
export function generateContextualHints(context: ValidationContext): string[] {
	const { problemModel, userHistory } = context;
	const hints: string[] = [];

	// Analyze current progress
	const completedSteps = userHistory.length - 1; // Subtract 1 for problem statement
	const totalSteps = problemModel.solutionSteps.length;
	const progressPercent = Math.round((completedSteps / totalSteps) * 100);

	hints.push(`You've completed ${completedSteps} of ${totalSteps} steps (${progressPercent}%)`);

	// Get next expected step if available
	if (completedSteps < problemModel.solutionSteps.length) {
		const nextStep = problemModel.solutionSteps[completedSteps];
		hints.push(`Next step should lead toward: ${nextStep}`);
	}

	return hints;
}

/**
 * Checks if an expression needs simplification
 */
export function needsSimplification(expression: string): boolean {
	try {
		const analysis = analyzeExpressionTree(expression);
		return !analysis.isFullySimplified || analysis.patterns.length > 0;
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
 * Analyzes the type of operation performed between two steps
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
		// Basic operation detection - could be enhanced significantly
		if (previousStep === currentStep) {
			return {
				operationType: "NO_CHANGE",
				isValid: false,
				description: "No mathematical operation was performed",
			};
		}

		// Check if expressions are equivalent
		if (areEquivalent(previousStep, currentStep)) {
			return {
				operationType: "ALGEBRAIC_MANIPULATION",
				isValid: true,
				description: "Applied valid algebraic manipulation",
			};
		}

		// Check for common operations
		if (currentStep.length > previousStep.length) {
			return {
				operationType: "EXPANSION",
				isValid: true,
				description: "Expanded or distributed terms",
			};
		}

		if (currentStep.length < previousStep.length) {
			return {
				operationType: "SIMPLIFICATION",
				isValid: true,
				description: "Simplified the expression",
			};
		}

		// Check for addition/subtraction patterns
		if (currentStep.includes("+") && !previousStep.includes("+")) {
			return {
				operationType: "ADDITION",
				isValid: true,
				description: "Added terms to both sides",
			};
		}

		if (currentStep.includes("-") && !previousStep.includes("-")) {
			return {
				operationType: "SUBTRACTION",
				isValid: true,
				description: "Subtracted terms from both sides",
			};
		}

		// Check for multiplication/division patterns
		if (currentStep.includes("*") && !previousStep.includes("*")) {
			return {
				operationType: "MULTIPLICATION",
				isValid: true,
				description: "Multiplied both sides",
			};
		}

		if (currentStep.includes("/") && !previousStep.includes("/")) {
			return {
				operationType: "DIVISION",
				isValid: true,
				description: "Divided both sides",
			};
		}

		// Default case
		return {
			operationType: "UNKNOWN",
			isValid: false,
			description: "Could not identify the mathematical operation",
		};
	} catch {
		return {
			operationType: "ERROR",
			isValid: false,
			description: "Error analyzing the operation",
		};
	}
}

/**
 * Gets expected next steps for hint generation
 */
export function getExpectedNextSteps(context: ValidationContext): string[] {
	const { problemModel, userHistory } = context;
	const completedSteps = userHistory.length - 1; // Subtract 1 for problem statement

	// Return remaining steps from the solution
	return problemModel.solutionSteps.slice(completedSteps);
} 