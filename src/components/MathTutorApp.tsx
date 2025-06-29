import { useMutation } from "@tanstack/react-query";
import { useAction } from "convex/react";
import { useReducer } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type {
	FeedbackEntry,
	FeedbackHistory,
} from "../lib/llm-feedback-service";
import type { ProblemModel, ValidationResult } from "../lib/validation-engine";
import { FeedbackDisplay } from "./FeedbackDisplay";
import { ProblemView } from "./ProblemView";
import { StepsHistory } from "./StepsHistory";
import { UserInput } from "./UserInput";

export type FeedbackStatus = "idle" | "loading" | "success" | "error";

// Individual attempt interface - keeping for backward compatibility
interface StudentAttempt {
	input: string;
	isCorrect: boolean;
	feedback: string;
	timestamp: Date;
	stepNumber: number;
}

// Application state interface
interface AppState {
	userHistory: string[]; // Only correct steps
	allAttempts: StudentAttempt[]; // All attempts (correct and incorrect) - for backward compatibility
	feedbackHistory: FeedbackHistory; // New structured feedback history
	currentStatus: "idle" | "checking" | "awaiting_next_step" | "solved";
	feedbackStatus: FeedbackStatus;
	feedbackMessage: string;
	currentPrompt?: string; // For testing/debugging: shows the prompt sent to LLM
	consecutiveFailures: number; // Track consecutive incorrect attempts for current step
	isShowingHintFeedback: boolean; // Track if we're showing hint feedback (not regular step feedback)
	hintRequestStatus: "idle" | "loading" | "success" | "error"; // Separate loading state for hint requests
}

// State actions
type AppAction =
	| { type: "CHECK_STEP_START"; payload: { step: string } }
	| {
			type: "CHECK_STEP_SUCCESS";
			payload: {
				message: string;
				feedbackStatus: FeedbackStatus;
			};
	  }
	| { type: "CHECK_STEP_ERROR"; payload: { message: string } }
	| { type: "PROBLEM_SOLVED"; payload: { message: string } }
	| {
			type: "LLM_FEEDBACK_SUCCESS";
			payload: {
				message: string;
				feedbackStatus: FeedbackStatus;
				stepIndex: number;
				validationResult: string;
				studentInput: string;
				isCorrect: boolean;
			};
	  }
	| { type: "LLM_FEEDBACK_ERROR"; payload: { message: string } }
	| { type: "LLM_PROMPT_SENT"; payload: { prompt: string } }
	| { type: "RESET_FEEDBACK" }
	| { type: "INCREMENT_FAILURES" }
	| { type: "RESET_FAILURES" }
	| { type: "HINT_REQUEST_START" }
	| { type: "HINT_REQUEST_SUCCESS"; payload: { message: string } }
	| { type: "HINT_REQUEST_ERROR"; payload: { message: string } };

// Utility function to generate unique feedback entry IDs
function generateFeedbackId(): string {
	return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Utility function to add feedback entry to history
function addFeedbackToHistory(
	history: FeedbackHistory,
	stepIndex: number,
	feedback: string,
	validationResult: string,
): FeedbackHistory {
	const currentStepFeedback = history[stepIndex] || [];
	const newEntry: FeedbackEntry = {
		id: generateFeedbackId(),
		stepIndex,
		feedback,
		timestamp: Date.now(),
		order: currentStepFeedback.length + 1,
		validationResult: validationResult as ValidationResult,
	};

	return {
		...history,
		[stepIndex]: [...currentStepFeedback, newEntry],
	};
}

// State reducer
function appReducer(state: AppState, action: AppAction): AppState {
	switch (action.type) {
		case "CHECK_STEP_START": {
			// Optimistic update: immediately add step with loading feedback
			const currentStepNumber = state.userHistory.length + 1; // Next step number (1-indexed)
			const optimisticAttempt: StudentAttempt = {
				input: action.payload.step,
				isCorrect: false, // Will be updated when validation completes
				feedback: "Validating...", // Loading state feedback
				timestamp: new Date(),
				stepNumber: currentStepNumber,
			};



			return {
				...state,
				allAttempts: [...state.allAttempts, optimisticAttempt],
				currentStatus: "checking",
				feedbackStatus: "loading",
				feedbackMessage: "Checking your answer...",
			};
		}

		case "CHECK_STEP_SUCCESS": {
			// Update the most recent attempt with success feedback
			const updatedAttempts = [...state.allAttempts];
			const lastAttemptIndex = updatedAttempts.length - 1;
			
			if (lastAttemptIndex >= 0) {
				const lastAttempt = updatedAttempts[lastAttemptIndex];
				updatedAttempts[lastAttemptIndex] = {
					...lastAttempt,
					isCorrect: true,
					feedback: action.payload.message,
				};

				// Add to userHistory only for correct steps
				return {
					...state,
					userHistory: [...state.userHistory, lastAttempt.input],
					allAttempts: updatedAttempts,
					currentStatus: "awaiting_next_step",
					feedbackStatus: action.payload.feedbackStatus,
					feedbackMessage: action.payload.message,
					consecutiveFailures: 0, // Reset on success
				};
			}

			return state;
		}

		case "CHECK_STEP_ERROR": {
			// Update the most recent attempt with error feedback
			const updatedAttempts = [...state.allAttempts];
			const lastAttemptIndex = updatedAttempts.length - 1;
			
			if (lastAttemptIndex >= 0) {
				updatedAttempts[lastAttemptIndex] = {
					...updatedAttempts[lastAttemptIndex],
					isCorrect: false,
					feedback: action.payload.message,
				};
			}

			return {
				...state,
				allAttempts: updatedAttempts,
				currentStatus: "awaiting_next_step",
				feedbackStatus: "error",
				feedbackMessage: action.payload.message,
			};
		}

		case "PROBLEM_SOLVED": {
			// Update the most recent attempt and mark as solved
			const updatedAttempts = [...state.allAttempts];
			const lastAttemptIndex = updatedAttempts.length - 1;
			
			if (lastAttemptIndex >= 0) {
				const lastAttempt = updatedAttempts[lastAttemptIndex];
				updatedAttempts[lastAttemptIndex] = {
					...lastAttempt,
					isCorrect: true,
					feedback: action.payload.message,
				};

				// Add to userHistory for the final correct step
				return {
					...state,
					userHistory: [...state.userHistory, lastAttempt.input],
					allAttempts: updatedAttempts,
					currentStatus: "solved",
					feedbackStatus: "success",
					feedbackMessage: action.payload.message,
					consecutiveFailures: 0, // Reset on completion
				};
			}

			return state;
		}

		case "LLM_FEEDBACK_SUCCESS": {
			const updatedFeedbackHistory = addFeedbackToHistory(
				state.feedbackHistory,
				action.payload.stepIndex,
				action.payload.message,
				action.payload.validationResult,
			);

			// Update the most recent StudentAttempt that's waiting for feedback
			// Since LLM requests are made immediately after creating attempts,
			// we can safely update the last attempt with "Getting feedback..."
			const updatedAttempts = state.allAttempts.map((attempt, index) => {
				// Find the most recent attempt with "Getting feedback..."
				const isLastWaitingAttempt =
					attempt.feedback === "Getting feedback..." &&
					!state.allAttempts
						.slice(index + 1)
						.some(
							(laterAttempt) => laterAttempt.feedback === "Getting feedback...",
						);

				if (isLastWaitingAttempt) {
					return {
						...attempt,
						feedback: action.payload.message,
					};
				}
				return attempt;
			});

			return {
				...state,
				feedbackStatus: action.payload.feedbackStatus,
				feedbackMessage: action.payload.message,
				feedbackHistory: updatedFeedbackHistory,
				allAttempts: updatedAttempts,
				isShowingHintFeedback: false, // Regular step feedback doesn't show in FeedbackDisplay
			};
		}

		case "LLM_FEEDBACK_ERROR":
			return {
				...state,
				feedbackStatus: "error",
				feedbackMessage: action.payload.message,
			};

		case "LLM_PROMPT_SENT":
			return {
				...state,
				currentPrompt: action.payload.prompt,
			};

		case "RESET_FEEDBACK":
			return {
				...state,
				feedbackStatus: "idle",
				feedbackMessage: "",
				currentPrompt: undefined,
				isShowingHintFeedback: false, // Clear hint feedback display
				hintRequestStatus: "idle", // Reset hint request status
			};

		case "INCREMENT_FAILURES":
			return {
				...state,
				consecutiveFailures: state.consecutiveFailures + 1,
			};

		case "RESET_FAILURES":
			return {
				...state,
				consecutiveFailures: 0,
			};

		case "HINT_REQUEST_START":
			return {
				...state,
				hintRequestStatus: "loading",
				feedbackStatus: "loading",
				feedbackMessage: "Getting hint...",
				isShowingHintFeedback: true, // Show hint feedback in FeedbackDisplay
			};

		case "HINT_REQUEST_SUCCESS":
			return {
				...state,
				hintRequestStatus: "success",
				feedbackStatus: "success",
				feedbackMessage: action.payload.message,
				isShowingHintFeedback: true, // Keep showing hint feedback in FeedbackDisplay
			};

		case "HINT_REQUEST_ERROR":
			return {
				...state,
				hintRequestStatus: "error",
				feedbackStatus: "error",
				feedbackMessage: action.payload.message,
				isShowingHintFeedback: true, // Show error in FeedbackDisplay
			};

		default:
			return state;
	}
}

interface MathTutorAppProps {
	problem: ProblemModel;
}

export function MathTutorApp({ problem }: MathTutorAppProps) {
	// Initialize state with problem statement in history
	const initialState: AppState = {
		userHistory: [problem.problemStatement],
		allAttempts: [],
		feedbackHistory: {},
		currentStatus: "awaiting_next_step",
		feedbackStatus: "idle",
		feedbackMessage: "",
		currentPrompt: undefined,
		consecutiveFailures: 0,
		isShowingHintFeedback: false,
		hintRequestStatus: "idle", // Initialize hint request status
	};

	const [state, dispatch] = useReducer(appReducer, initialState);

	// Backend validation action
	const validateStepAction = useAction(api.validation.validateStep);

	// Handle step validation using backend
	const handleCheckStep = async (studentInput: string) => {
		// Optimistically add the step immediately
		dispatch({ type: "CHECK_STEP_START", payload: { step: studentInput } });
		dispatch({ type: "RESET_FEEDBACK" });

		try {
			// Call backend validation - no artificial delay needed!
			// Natural network latency replaces setTimeout
			const validationResponse = await validateStepAction({
				problemId: problem._id as Id<"problems">, // Cast to Convex ID type
				studentInput,
				userHistory: state.userHistory,
				sessionId: `session_${Date.now()}`, // Optional session tracking
			});

			const { result, isCorrect, shouldAdvance, feedback, processingTimeMs } =
				validationResponse;

			// Current step index calculation
			const currentStepIndex = isCorrect
				? state.userHistory.length // New step index for correct steps
				: state.userHistory.length - 1; // Current step index for errors

			// Update feedback history
			const updatedFeedbackHistory = addFeedbackToHistory(
				state.feedbackHistory,
				Math.max(0, currentStepIndex),
				feedback,
				result,
			);

			// Handle validation results
			switch (result) {
				case "CORRECT_FINAL_STEP":
					dispatch({
						type: "PROBLEM_SOLVED",
						payload: { message: feedback },
					});
					break;

				case "CORRECT_INTERMEDIATE_STEP":
				case "CORRECT_BUT_NOT_SIMPLIFIED":
					dispatch({
						type: "CHECK_STEP_SUCCESS",
						payload: {
							message: feedback,
							feedbackStatus: "success",
						},
					});
					break;

				case "VALID_BUT_NO_PROGRESS":
					// Valid but no progress - don't add to history but still provide feedback
					dispatch({
						type: "CHECK_STEP_ERROR",
						payload: {
							message: feedback,
						},
					});
					break;

				case "EQUIVALENCE_FAILURE":
				case "PARSING_ERROR":
					dispatch({ type: "INCREMENT_FAILURES" });
					dispatch({
						type: "CHECK_STEP_ERROR",
						payload: {
							message: feedback,
						},
					});
					break;

				default:
					dispatch({
						type: "CHECK_STEP_ERROR",
						payload: {
							message: "Something unexpected happened. Please try again.",
						},
					});
			}

			// Simulate LLM feedback success for compatibility with existing state management
			dispatch({
				type: "LLM_FEEDBACK_SUCCESS",
				payload: {
					message: feedback,
					feedbackStatus: "success",
					stepIndex: Math.max(0, currentStepIndex),
					validationResult: result,
					studentInput,
					isCorrect,
				},
			});

			// Optional: Log performance metrics
			console.log(`Backend validation completed in ${processingTimeMs}ms`);
		} catch (error) {
			dispatch({
				type: "CHECK_STEP_ERROR",
				payload: {
					message:
						"Unable to validate your answer right now. Please try again.",
				},
			});
			console.error("Backend validation error:", error);
		}
	};

	// TODO: Implement hint functionality with backend
	const handleHintRequest = () => {
		dispatch({
			type: "HINT_REQUEST_SUCCESS",
			payload: { message: "Hint functionality will be available soon!" },
		});
	};

	const isSolved = state.currentStatus === "solved";
	const stepNumber = state.userHistory.length; // Current step number
	const showHintButton = state.consecutiveFailures >= 3 && !isSolved;

	return (
		<div className="w-full max-w-2xl mx-auto p-4 sm:p-8 bg-white rounded-2xl shadow-lg border border-gray-200">
			{/* Header */}
			<div className="text-center mb-8">
				<h1 className="text-3xl font-bold text-gray-900">
					Interactive Math Tutor
				</h1>
				<p className="text-gray-500 mt-2">
					Solve the problem one step at a time.
				</p>
			</div>

			{/* Problem Display */}
			<ProblemView problem={problem} />

			{/* Steps History */}
			<StepsHistory
				history={state.userHistory}
				allAttempts={state.allAttempts}
				feedbackHistory={state.feedbackHistory}
				isSolved={isSolved}
			/>

			{/* User Input */}
			<UserInput
				onCheckStep={handleCheckStep}
				isSolved={isSolved}
				stepNumber={stepNumber}
			/>

			{/* Feedback Display - only for hint requests */}
			{state.isShowingHintFeedback && (
				<FeedbackDisplay
					status={state.feedbackStatus}
					message={state.feedbackMessage}
					prompt={state.currentPrompt}
				/>
			)}

			{/* Hint Button - shown after 3 consecutive failures */}
			{showHintButton && (
				<div className="mt-4 text-center">
					<button
						type="button"
						onClick={handleHintRequest}
						disabled={state.hintRequestStatus === "loading"}
						className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
					>
						{state.hintRequestStatus === "loading"
							? "Getting hint..."
							: "I'm stuck! 💡"}
					</button>
					<p className="text-sm text-gray-500 mt-2">
						Get a hint with the next step explained
					</p>
				</div>
			)}
		</div>
	);
}

// Export the StudentAttempt type for use in other components
export type { StudentAttempt };
