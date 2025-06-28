import { env } from "../env";
import type { ProblemModel, ValidationResult } from "./validation-engine";

const MODEL_NAME = "anthropic/claude-sonnet-4";

export interface LLMFeedbackRequest {
	problemStatement: string;
	userHistory: string[];
	studentInput: string;
	validationResult: ValidationResult;
	problemModel: ProblemModel;
}

export interface LLMFeedbackResponse {
	feedback: string;
	encouragement?: string;
}

/**
 * Constructs a pedagogically-focused prompt for the LLM based on validation results
 */
export function constructPrompt(request: LLMFeedbackRequest): string {
	const {
		problemStatement,
		userHistory,
		studentInput,
		validationResult,
		problemModel,
	} = request;

	const baseContext = `
You are a helpful math tutor working with a student on algebra problems. 

Problem: ${problemStatement}
Previous correct steps: ${
		userHistory
			.slice(1)
			.map((step, i) => `${i + 1}. ${step}`)
			.join("\n") || "None yet"
	}
Student's current input: ${studentInput}
Validation result: ${validationResult}
`;

	switch (validationResult) {
		case "CORRECT_FINAL_STEP":
			return `${baseContext}

The student has successfully solved the problem! Provide enthusiastic congratulations and briefly explain why their final step is correct. Keep it encouraging and positive. Use 1-2 sentences maximum.`;

		case "CORRECT_INTERMEDIATE_STEP":
			return `${baseContext}

The student made a correct step forward! Provide encouraging feedback and briefly mention what good mathematical technique they used. Then give a gentle hint about what type of operation to consider next. Keep it supportive and pedagogical. Use 2-3 sentences maximum.`;

		case "CORRECT_BUT_NOT_SIMPLIFIED":
			return `${baseContext}

The student's answer is mathematically correct but not fully simplified. Acknowledge that they're right, then gently guide them to simplify further. Be encouraging while explaining why simplification is helpful. Use 2-3 sentences maximum.`;

		case "VALID_BUT_NO_PROGRESS":
			return `${baseContext}

The student's step is mathematically valid but doesn't move closer to solving the problem. Acknowledge the validity, then gently suggest a more productive approach or operation that would make progress. Be encouraging and specific. Use 2-3 sentences maximum.`;

		case "EQUIVALENCE_FAILURE":
			return `${baseContext}

The student made an error in their calculation. Provide gentle, constructive feedback that helps them identify what went wrong without giving away the answer. Focus on the mathematical concept or operation that needs attention. Be supportive and educational. Use 2-3 sentences maximum.`;

		case "PARSING_ERROR":
			return `${baseContext}
      
The student's input has a formatting issue. Help them understand how to write mathematical expressions clearly, with a specific example related to their input. Be patient and encouraging. Use 1-2 sentences maximum.`;

		default:
			return `${baseContext}

Provide gentle, encouraging feedback to help the student continue working on this problem. Use 1-2 sentences maximum.`;
	}
}

/**
 * Makes an API call to OpenRouter for LLM feedback
 */
export async function getLLMFeedback(
	request: LLMFeedbackRequest,
): Promise<LLMFeedbackResponse> {
	const { validationResult } = request;
	const apiKey = env.VITE_OPENROUTER_API_KEY;

	if (!apiKey) {
		throw new Error(
			"OpenRouter API key not configured. Please set VITE_OPENROUTER_API_KEY environment variable.",
		);
	}

	const prompt = constructPrompt(request);

	try {
		const response = await fetch(
			"https://openrouter.ai/api/v1/chat/completions",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
					"HTTP-Referer": window.location.origin, // Required for free models
					"X-Title": "Math Tutor App", // Optional: helps identify your app
				},
				body: JSON.stringify({
					model: MODEL_NAME,
					messages: [
						{
							role: "user",
							content: prompt,
						},
					],
					max_tokens: 150, // Keep responses concise
					temperature: 0.7, // Balanced creativity/consistency
				}),
			},
		);

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`OpenRouter API error (${response.status}): ${errorText}`,
			);
		}

		const data = await response.json();

		if (!data.choices || !data.choices[0] || !data.choices[0].message) {
			throw new Error("Invalid response format from OpenRouter API");
		}

		const feedback = data.choices[0].message.content.trim();

		return {
			feedback,
			encouragement:
				validationResult === "CORRECT_FINAL_STEP"
					? "🎉 Problem solved!"
					: undefined,
		};
	} catch (error) {
		// Re-throw with more context for debugging
		throw new Error(
			`LLM feedback request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * Hook for React Query mutation to handle LLM feedback requests
 */
export const llmFeedbackMutationFn = async (
	request: LLMFeedbackRequest,
): Promise<LLMFeedbackResponse> => {
	return getLLMFeedback(request);
};
