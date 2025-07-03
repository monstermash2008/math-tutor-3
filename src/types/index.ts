/**
 * Shared types for the Math Tutor application
 * Used by both frontend components and Convex backend functions
 */

import type { BoxedExpression } from "@cortex-js/compute-engine";

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
 * Simplification pattern detected in mathematical expressions
 */
export interface SimplificationPattern {
	type:
		| "CONSTANT_ARITHMETIC"
		| "LIKE_TERMS"
		| "DISTRIBUTIVE"
		| "COEFFICIENT_NORMALIZATION";
	description: string;
	nodes: BoxedExpression[];
	suggestion: string;
}

/**
 * Result of tree-based analysis of mathematical expressions
 */
export interface TreeAnalysisResult {
	isFullySimplified: boolean;
	patterns: SimplificationPattern[];
	hasUnsimplifiedOperations: boolean;
}

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
 * Response format from Convex validation action
 */
export interface StepValidationResponse {
	result: ValidationResult;
	isCorrect: boolean;
	shouldAdvance: boolean;
	feedback: string;
	hints?: string[];
	errorMessage?: string;
	processingTimeMs: number;
}

/**
 * Result of step operation analysis
 */
export interface StepOperationResult {
	operationType: string;
	isValid: boolean;
	description: string;
} 