import type { ProblemModel, ValidationResult } from "../src/types";

const MODEL_NAME = "anthropic/claude-sonnet-4";

// Data structure for tracking feedback history
export interface FeedbackEntry {
	id: string;
	stepIndex: number;
	feedback: string;
	timestamp: number;
	order: number; // order within that step (1st attempt, 2nd attempt, etc.)
	validationResult: ValidationResult;
}

export interface FeedbackHistory {
	[stepIndex: number]: FeedbackEntry[];
}

export interface LLMFeedbackRequest {
	problemStatement: string;
	userHistory: string[];
	studentInput: string;
	validationResult: ValidationResult;
	problemModel: ProblemModel;
	feedbackHistory?: FeedbackHistory;
	currentStepIndex: number;

	// Enhanced mathematical analysis fields (LLM Prompt 2.0)
	contextualHints?: string[];
	stepOperation?: {
		operationType: string;
		isValid: boolean;
		description: string;
	};
	needsSimplification?: boolean;
	simplificationSuggestions?: string[];

	// Hint system fields
	isHintRequest?: boolean;
	expectedNextSteps?: string[];
}

export interface LLMFeedbackResponse {
	feedback: string;
	encouragement?: string;
}

/**
 * Gets previous feedback for the current step to provide context for progressive hints
 */
function getPreviousFeedbackForStep(
	feedbackHistory: FeedbackHistory,
	stepIndex: number,
): FeedbackEntry[] {
	return feedbackHistory[stepIndex] || [];
}

/**
 * Formats mathematical analysis context for enhanced LLM prompts (LLM Prompt 2.0)
 */
function formatMathematicalAnalysis(request: LLMFeedbackRequest): string {
	const { contextualHints, needsSimplification, simplificationSuggestions } =
		request;

	// Check if all fields are effectively empty
	const hasContextualHints = contextualHints && contextualHints.length > 0;
	const hasSimplificationData = needsSimplification !== undefined;
	const hasSuggestions =
		simplificationSuggestions && simplificationSuggestions.length > 0;

	if (!hasContextualHints && !hasSimplificationData && !hasSuggestions) {
		return "";
	}

	let analysis = "\n\nMATHEMATICAL ANALYSIS:";

	if (hasSimplificationData) {
		analysis += `\n- Expression needs simplification: ${needsSimplification}`;
	}

	if (hasContextualHints) {
		analysis += `\n- Mathematical context: ${contextualHints.join(", ")}`;
	}

	if (hasSuggestions) {
		analysis += "\n\nSPECIFIC GUIDANCE:";
		for (const suggestion of simplificationSuggestions) {
			analysis += `\n- ${suggestion}`;
		}
	}

	return analysis;
}

/**
 * Formats step operation analysis for enhanced LLM prompts (LLM Prompt 2.0)
 */
function formatStepOperationAnalysis(request: LLMFeedbackRequest): string {
	const { stepOperation } = request;

	if (!stepOperation) {
		return "";
	}

	return `\n\nSTUDENT'S ATTEMPTED OPERATION:
- Operation type: ${stepOperation.operationType}
- Operation description: ${stepOperation.description}
- Operation validity: ${stepOperation.isValid}`;
}

/**
 * Constructs a specialized prompt for hint requests when students are stuck
 */
function constructHintPrompt(request: LLMFeedbackRequest): string {
	const {
		problemStatement,
		userHistory,
		studentInput,
		expectedNextSteps = [],
	} = request;

	const nextStep = expectedNextSteps[0] || "Continue working on the problem";

	return `
You are a math tutor helping a student who is stuck after multiple attempts.

Problem: ${problemStatement}
Previous steps: ${
		userHistory
			.slice(1)
			.map((step, i) => `${i + 1}. ${step}`)
			.join("\n") || "None"
	}
Student's attempt: ${studentInput}

The correct next step is: ${nextStep}

TASK: Explain this next step to the student. Include:
1. What operation they should perform
2. WHY this operation is the right choice
3. How it moves them closer to solving the problem
4. Any mathematical concept they should understand

Be encouraging - they tried hard and asked for help. You can be more detailed than usual (2-4 sentences).`;
}

/**
 * Constructs a pedagogically-focused prompt for the LLM based on validation results and previous feedback
 * Enhanced with rich mathematical context (LLM Prompt 2.0)
 */
export function constructPrompt(request: LLMFeedbackRequest): string {
	const {
		problemStatement,
		userHistory,
		studentInput,
		validationResult,
		problemModel,
		feedbackHistory = {},
		currentStepIndex,
		isHintRequest = false,
		expectedNextSteps = [],
	} = request;

	// Handle hint requests separately
	if (isHintRequest) {
		return constructHintPrompt(request);
	}

	const previousFeedback = getPreviousFeedbackForStep(
		feedbackHistory,
		currentStepIndex,
	);
	const attemptNumber = previousFeedback.length + 1;
	const isFirstAttempt = attemptNumber === 1;

	// Enhanced mathematical analysis sections (LLM Prompt 2.0)
	const mathematicalAnalysis = formatMathematicalAnalysis(request);
	const stepOperationAnalysis = formatStepOperationAnalysis(request);

	const baseContext = `
You are a math tutor. Problem: ${problemStatement}
Previous steps: ${
		userHistory
			.slice(1)
			.map((step, i) => `${i + 1}. ${step}`)
			.join("\n") || "None"
	}
Student input: ${studentInput}
Validation: ${validationResult}${mathematicalAnalysis}${stepOperationAnalysis}`;

	// Add previous feedback context if this isn't the first attempt
	const feedbackContext = !isFirstAttempt
		? `

Previous feedback given to student for this step:
${previousFeedback.map((entry, i) => `Attempt ${i + 1}: ${entry.feedback}`).join("\n")}

IMPORTANT: Don't repeat information already given. Provide new insight or be more specific.`
		: "";

	const hintLevel = isFirstAttempt
		? "minimal"
		: attemptNumber === 2
			? "moderate"
			: "detailed";

	switch (validationResult) {
		case "CORRECT_FINAL_STEP":
			return `${baseContext}${feedbackContext}

Student solved the problem! Briefly confirm correctness. 1 sentence.`;

		case "CORRECT_INTERMEDIATE_STEP":
			return `${baseContext}${feedbackContext}

Student made correct progress. Acknowledge briefly, then give a ${hintLevel} hint about the next step. ${hintLevel === "detailed" ? "You can be more specific about what operation to try." : "1-2 sentences."} `;

		case "CORRECT_BUT_NOT_SIMPLIFIED":
			return `${baseContext}${feedbackContext}

Student is correct but needs to simplify. ${isFirstAttempt ? "Gently prompt to simplify further." : "Be more specific about what to simplify."} Use the mathematical analysis above to provide specific guidance. 1-2 sentences.`;

		case "VALID_BUT_NO_PROGRESS":
			return `${baseContext}${feedbackContext}

Student's step is valid but doesn't help solve the problem. ${hintLevel === "minimal" ? "Suggest a different approach." : hintLevel === "moderate" ? "Suggest a specific operation that would help." : "Give a clear hint about what operation to try and why."} Use the operation analysis above to explain what they tried and suggest better approaches. 1-2 sentences.`;

		case "EQUIVALENCE_FAILURE":
			return `${baseContext}${feedbackContext}

Student made an error. ${hintLevel === "minimal" ? "Point out there's an error, ask them to check their work." : hintLevel === "moderate" ? "Identify which part has the error without giving the answer." : "Explain what went wrong and hint at the correct approach."} Use the mathematical analysis and operation analysis above to provide targeted guidance. 1-2 sentences.`;

		case "PARSING_ERROR":
			return `${baseContext}${feedbackContext}
      
Student's input has formatting issues. ${isFirstAttempt ? "Explain how to format math expressions clearly." : "Give a specific example of correct formatting."} 1 sentence.`;

		default:
			return `${baseContext}${feedbackContext}

Provide helpful guidance. 1 sentence.`;
	}
}

/**
 * Makes an API call to OpenRouter for LLM feedback
 * Note: In Convex, you'd use fetch() for HTTP requests
 */
export async function getLLMFeedback(
	request: LLMFeedbackRequest,
): Promise<LLMFeedbackResponse> {
	// TODO: In production, get API key from Convex environment variables
	// For now, this would need to be configured in Convex dashboard
	const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "demo-key";
	
	if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === "demo-key") {
		// Return a mock response for demo purposes
		return {
			feedback: "This is a demo response. In production, configure your OpenRouter API key in the Convex dashboard.",
		};
	}

	try {
		const prompt = constructPrompt(request);

		const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
			method: "POST",
			headers: {
				"Authorization": `Bearer ${OPENROUTER_API_KEY}`,
				"HTTP-Referer": "https://math-tutor.com", // Replace with your domain
				"X-Title": "Math Tutor",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: MODEL_NAME,
				messages: [
					{
						role: "user",
						content: prompt,
					},
				],
				max_tokens: 300,
				temperature: 0.7,
			}),
		});

		if (!response.ok) {
			const errorData = await response.text();
			throw new Error(`OpenRouter API error: ${response.status} - ${errorData}`);
		}

		const data = await response.json();
		
		if (!data.choices || !data.choices[0] || !data.choices[0].message) {
			throw new Error("Invalid response format from OpenRouter API");
		}

		const feedback = data.choices[0].message.content.trim();

		return {
			feedback,
		};

	} catch (error) {
		console.error("LLM Feedback Error:", error);
		
		// Fallback response
		return {
			feedback: "I'm having trouble generating feedback right now. Please check your work and try again.",
		};
	}
}

/**
 * Exports the function that would be called by frontend mutations
 */
export const llmFeedbackMutationFn = async (
	request: LLMFeedbackRequest,
): Promise<LLMFeedbackResponse> => {
	return await getLLMFeedback(request);
}; 