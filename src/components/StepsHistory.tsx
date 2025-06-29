import { useEffect, useState } from "react";
import type { FeedbackHistory } from "../lib/llm-feedback-service";
import type { StudentAttempt } from "./MathTutorApp";

interface StepsHistoryProps {
	history: string[];
	allAttempts: StudentAttempt[];
	feedbackHistory: FeedbackHistory;
	isSolved?: boolean;
}

export function StepsHistory({
	history,
	allAttempts,
	feedbackHistory,
	isSolved = false,
}: StepsHistoryProps) {
	// Remove the problem statement from history for display
	const steps = history.slice(1);

	if (steps.length === 0 && allAttempts.length === 0) {
		return null;
	}

	// Track which step feedback sections are expanded
	const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

	// Initialize with no expanded attempts - all feedback starts collapsed
	const getInitialExpandedAttempts = () => {
		return new Set<string>();
	};

	// Track which incorrect attempts have expanded feedback
	const [expandedAttempts, setExpandedAttempts] = useState<Set<string>>(
		getInitialExpandedAttempts(),
	);

	// All feedback starts collapsed - no auto-expansion

	// Toggle feedback expansion for a step
	const toggleStepFeedback = (stepIndex: number) => {
		const newExpanded = new Set(expandedSteps);
		if (newExpanded.has(stepIndex)) {
			newExpanded.delete(stepIndex);
		} else {
			newExpanded.add(stepIndex);
		}
		setExpandedSteps(newExpanded);
	};

	// Toggle feedback expansion for an incorrect attempt
	const toggleAttemptFeedback = (attemptId: string) => {
		const newExpanded = new Set(expandedAttempts);
		if (newExpanded.has(attemptId)) {
			newExpanded.delete(attemptId);
		} else {
			newExpanded.add(attemptId);
		}
		setExpandedAttempts(newExpanded);
	};

	// Group attempts by step number for better organization
	const attemptsByStep = allAttempts.reduce(
		(acc, attempt) => {
			if (!acc[attempt.stepNumber]) {
				acc[attempt.stepNumber] = [];
			}
			acc[attempt.stepNumber].push(attempt);
			return acc;
		},
		{} as Record<number, StudentAttempt[]>,
	);

	// Check if there are attempts for the current step (not yet completed)  
	const currentStepNumber = steps.length + 1;
	const currentStepAttempts = attemptsByStep[currentStepNumber] || [];
	const hasCurrentStepAttempts = currentStepAttempts.length > 0;

	return (
		<div className="space-y-4 mb-6">
			{/* Display completed steps */}
			{steps.map((step, index) => {
				const stepNumber = index + 1;
				const isLastStep = index === steps.length - 1;
				const isFinalAnswer = isSolved && isLastStep;
				const isCurrentStep = isLastStep; // Only the most recent step should show feedback directly
				const stepAttempts = attemptsByStep[stepNumber] || [];

				// Get structured feedback for this step
				const stepFeedback = feedbackHistory[stepNumber] || [];
				const hasFeedback = stepFeedback.length > 0;
				const isExpanded = expandedSteps.has(stepNumber);

				// Different styling for final answer vs intermediate steps
				const containerClass = isFinalAnswer
					? "bg-blue-50 p-4 rounded-lg border-2 border-blue-400 shadow-md"
					: "bg-green-50 p-4 rounded-lg border border-green-200";

				const iconColor = isFinalAnswer ? "text-blue-600" : "text-green-600";
				const stepLabelColor = isFinalAnswer
					? "text-blue-600"
					: "text-gray-500";
				const stepLabel = isFinalAnswer ? "Final Answer" : `Step ${stepNumber}`;

				// Find the correct attempt for this step to show its feedback
				const correctAttempt = stepAttempts.find(
					(attempt) => attempt.isCorrect,
				);

				return (
					<div
						key={`step-${stepNumber}-${step.slice(0, 10)}`}
						className="space-y-2"
					>
						{/* Show incorrect and validating attempts for this step first */}
						{stepAttempts
							.filter((attempt) => attempt.status === "pending" || attempt.status === "incorrect")
							.map((attempt, attemptIndex) => {
								const attemptId = `attempt-${stepNumber}-${attempt.timestamp.getTime()}-${attemptIndex}`;
								const isValidating = attempt.status === "pending";
								const hasFeedback = attempt.feedback && attempt.status !== "pending";
								const isAttemptExpanded = expandedAttempts.has(attemptId);

								// Determine styling based on status
								let bgColor: string;
								let borderColor: string;
								let textColor: string;
								let iconColor: string;
								let label: string;
								let ariaLabel: string;
								
								switch (attempt.status) {
									case "pending":
										bgColor = "bg-amber-50";
										borderColor = "border-amber-200";
										textColor = "text-amber-700";
										iconColor = "text-amber-500";
										label = "Validating Step...";
										ariaLabel = "Validating step";
										break;
									case "incorrect":
										bgColor = "bg-red-50";
										borderColor = "border-red-200";
										textColor = "text-red-700";
										iconColor = "text-red-500";
										label = "Incorrect Attempt";
										ariaLabel = "Incorrect attempt";
										break;
									default:
										// This shouldn't happen for filtered attempts, but provide fallback
										bgColor = "bg-gray-50";
										borderColor = "border-gray-200";
										textColor = "text-gray-700";
										iconColor = "text-gray-500";
										label = "Unknown Status";
										ariaLabel = "Unknown status";
								}

								return (
									<div
										key={attemptId}
										className={`${bgColor} p-3 rounded-lg border ${borderColor}`}
									>
										<div className="flex items-start">
											{isValidating ? (
												// Loading/validating icon
												<svg
													className={`w-5 h-5 ${iconColor} mr-3 flex-shrink-0 mt-0.5 animate-spin`}
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
													aria-label={ariaLabel}
												>
													<title>{ariaLabel}</title>
													<circle
														className="opacity-25"
														cx="12"
														cy="12"
														r="10"
														stroke="currentColor"
														strokeWidth="2"
													/>
													<path
														className="opacity-75"
														fill="currentColor"
														d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
													/>
												</svg>
											) : (
												// Incorrect X icon
												<svg
													className={`w-5 h-5 ${iconColor} mr-3 flex-shrink-0 mt-0.5`}
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
													aria-label={ariaLabel}
												>
													<title>{ariaLabel}</title>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth="2"
														d="M6 18L18 6M6 6l12 12"
													/>
												</svg>
											)}
											<div className="flex-1">
												<p className={`text-sm font-medium ${textColor}`}>
													{label}
												</p>
												<p className="font-mono text-gray-800 mb-1">
													{attempt.input}
												</p>

												{/* Show loading state for validating attempts */}
												{isValidating && (
													<div className={`text-sm ${textColor} mt-2 p-2 ${bgColor} rounded border ${borderColor} flex items-center`}>
														<svg
															className={`animate-spin -ml-1 mr-2 h-4 w-4 ${iconColor}`}
															xmlns="http://www.w3.org/2000/svg"
															fill="none"
															viewBox="0 0 24 24"
														>
															<title>Loading spinner</title>
															<circle
																className="opacity-25"
																cx="12"
																cy="12"
																r="10"
																stroke="currentColor"
																strokeWidth="4"
															/>
															<path
																className="opacity-75"
																fill="currentColor"
																d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
															/>
														</svg>
														{attempt.feedback}
													</div>
												)}

												{/* Show feedback in accordion format for attempts with feedback */}
												{hasFeedback && (
													<div className="mt-2">
														{isAttemptExpanded ? (
															<div className="p-2 bg-red-100 rounded border">
																<p className="text-sm text-red-600">
																	{attempt.feedback}
																</p>
															</div>
														) : (
															<div className="text-xs text-red-500">
																Feedback available - click to expand
															</div>
														)}
													</div>
												)}
											</div>

											{/* Toggle button for feedback - only show if there's feedback */}
											{hasFeedback && (
												<button
													type="button"
													onClick={() => toggleAttemptFeedback(attemptId)}
													className="ml-2 p-1 text-red-400 hover:text-red-600 transition-colors"
													aria-label={`${isAttemptExpanded ? "Hide" : "Show"} feedback for incorrect attempt`}
												>
													<svg
														className={`w-4 h-4 transform transition-transform ${isAttemptExpanded ? "rotate-180" : ""}`}
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<title>{`${isAttemptExpanded ? "Hide" : "Show"} feedback`}</title>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth="2"
															d="M19 9l-7 7-7-7"
														/>
													</svg>
												</button>
											)}
										</div>
									</div>
								);
							})}

						{/* Show the correct step */}
						<div className={containerClass}>
							<div className="flex items-center">
								{isFinalAnswer ? (
									// Special trophy icon for final answer
									<svg
										className={`w-6 h-6 ${iconColor} mr-3 flex-shrink-0`}
										fill="currentColor"
										viewBox="0 0 20 20"
										aria-label="Problem solved successfully"
									>
										<title>Problem solved successfully</title>
										<path
											fillRule="evenodd"
											d="M10 2L13 8l6 .75-4.12 4.62L16 19l-6-3-6 3 1.12-5.63L1 8.75 7 8l3-6z"
											clipRule="evenodd"
										/>
									</svg>
								) : (
									// Regular check mark for intermediate steps
									<svg
										className={`w-6 h-6 ${iconColor} mr-3 flex-shrink-0`}
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										aria-label="Step completed successfully"
									>
										<title>Step completed successfully</title>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								)}
								<div className="flex-1">
									<p className={`text-sm font-semibold ${stepLabelColor}`}>
										{stepLabel}
									</p>
									<p
										className={`font-medium font-mono ${isFinalAnswer ? "text-blue-800 text-lg" : "text-gray-800"}`}
									>
										{step}
									</p>
									{isFinalAnswer && (
										<p className="text-xs text-blue-600 mt-1 font-medium">
											🎉 Excellent work!
										</p>
									)}

									{/* Feedback for current step is handled via accordion like other steps */}

									{/* Show loading state - only for current step */}
									{isCurrentStep &&
										(correctAttempt?.feedback === "Getting feedback..." ||
										correctAttempt?.feedback === "Validating...") && (
											<div className="mt-3 p-3 bg-gray-100 rounded border border-gray-300">
												<p className="text-sm text-gray-600 flex items-center">
													<svg
														className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-600"
														xmlns="http://www.w3.org/2000/svg"
														fill="none"
														viewBox="0 0 24 24"
													>
														<title>Loading spinner</title>
														<circle
															className="opacity-25"
															cx="12"
															cy="12"
															r="10"
															stroke="currentColor"
															strokeWidth="4"
														/>
														<path
															className="opacity-75"
															fill="currentColor"
															d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
														/>
													</svg>
													{correctAttempt?.feedback || "Processing..."}
												</p>
											</div>
										)}
								</div>

								{/* Feedback history toggle button - show for any feedback on previous steps, or multiple feedback on current step */}
								{hasFeedback && (!isCurrentStep || stepFeedback.length > 1) && (
									<button
										type="button"
										onClick={() => toggleStepFeedback(stepNumber)}
										className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
										aria-label={`${isExpanded ? "Hide" : "Show"} feedback history for step ${stepNumber}`}
									>
										<svg
											className={`w-5 h-5 transform transition-transform ${isExpanded ? "rotate-180" : ""}`}
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<title>{`${isExpanded ? "Hide" : "Show"} feedback history`}</title>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="2"
												d="M19 9l-7 7-7-7"
											/>
										</svg>
									</button>
								)}
							</div>

							{/* Display feedback for this step if expanded */}
							{(hasFeedback || stepAttempts.length > 0) && isExpanded && (
								<div className="mt-3 pt-3 border-t border-gray-200">
									<p className="text-sm font-medium text-gray-600 mb-2">
										{isCurrentStep
											? "Previous feedback:"
											: "All attempts & feedback:"}
									</p>
									<div className="space-y-2">
										{/* For previous steps: show all attempts and feedback */}
										{!isCurrentStep &&
											stepAttempts.map((attempt, attemptIndex) => {
												const isCorrectAttempt = attempt.isCorrect;
												const bgColor = isCorrectAttempt
													? "bg-green-50"
													: "bg-red-50";
												const borderColor = isCorrectAttempt
													? "border-green-200"
													: "border-red-200";
												const textColor = isCorrectAttempt
													? "text-green-700"
													: "text-red-700";
												const label = isCorrectAttempt
													? "Correct"
													: "Incorrect";

												return (
													<div
														key={`accordion-attempt-${stepNumber}-${attempt.timestamp.getTime()}-${attemptIndex}`}
														className={`p-3 rounded-lg border ${bgColor} ${borderColor}`}
													>
														<div className="flex items-start">
															<span
																className={`text-xs font-medium ${textColor} mr-2 mt-0.5`}
															>
																{label}
															</span>
															<div className="flex-1">
																<p className="text-sm font-mono text-gray-800 mb-1">
																	{attempt.input}
																</p>
																{attempt.feedback && (
																	<p className="text-sm text-gray-700">
																		{attempt.feedback}
																	</p>
																)}
															</div>
														</div>
													</div>
												);
											})}

										{/* For current step: show previous feedback from feedbackHistory (excluding most recent) */}
										{isCurrentStep &&
											stepFeedback
												.sort((a, b) => a.order - b.order) // Ensure proper ordering
												.filter(
													(feedback, index, array) => index < array.length - 1,
												) // Exclude most recent
												.map((feedback) => {
													// Style feedback based on validation result
													const isSuccess =
														feedback.validationResult ===
															"CORRECT_FINAL_STEP" ||
														feedback.validationResult ===
															"CORRECT_INTERMEDIATE_STEP";
													const bgColor = isSuccess
														? "bg-green-50"
														: "bg-orange-50";
													const borderColor = isSuccess
														? "border-green-200"
														: "border-orange-200";
													const textColor = isSuccess
														? "text-green-700"
														: "text-orange-700";

													return (
														<div
															key={feedback.id}
															className={`p-3 rounded-lg border ${bgColor} ${borderColor}`}
														>
															<div className="flex items-start">
																<span
																	className={`text-xs font-medium ${textColor} mr-2 mt-0.5`}
																>
																	#{feedback.order}
																</span>
																<p className="text-sm text-gray-800 flex-1">
																	{feedback.feedback}
																</p>
															</div>
														</div>
													);
												})}
									</div>
								</div>
							)}
						</div>
					</div>
				);
			})}

			{/* Show any remaining incorrect attempts for the current step */}
			{!isSolved &&
				(() => {
					const currentStepNumber = steps.length + 1; // Current step is the next step after completed ones
					const currentStepAttempts = attemptsByStep[currentStepNumber] || [];
					
					const incorrectAttempts = currentStepAttempts.filter(
						(attempt) => !attempt.isCorrect || attempt.status === "pending",
					);
					
					if (incorrectAttempts.length === 0) return null;

					return (
						<div className="space-y-2">
							<p className="text-sm font-medium text-gray-600 mb-2">
								Current step attempts:
							</p>
							{incorrectAttempts.map((attempt, attemptIndex) => {
								const attemptId = `current-attempt-${attempt.timestamp.getTime()}-${attemptIndex}`;
								const isValidating = attempt.status === "pending";
								const hasFeedback = attempt.feedback && attempt.status !== "pending";
								const isAttemptExpanded = expandedAttempts.has(attemptId);

								// Determine styling based on status
								let bgColor: string;
								let borderColor: string;
								let textColor: string;
								let iconColor: string;
								let label: string;
								let ariaLabel: string;
								
								if (isValidating) {
									bgColor = "bg-amber-50";
									borderColor = "border-amber-200";
									textColor = "text-amber-700";
									iconColor = "text-amber-500";
									label = "Validating Step...";
									ariaLabel = "Validating step";
								} else {
									bgColor = "bg-red-50";
									borderColor = "border-red-200";
									textColor = "text-red-700";
									iconColor = "text-red-500";
									label = "Incorrect Attempt";
									ariaLabel = "Incorrect attempt";
								}

								return (
									<div
										key={attemptId}
										className={`${bgColor} p-3 rounded-lg border ${borderColor}`}
									>
										<div className="flex items-start">
											{isValidating ? (
												// Loading/validating icon
												<svg
													className={`w-5 h-5 ${iconColor} mr-3 flex-shrink-0 mt-0.5 animate-spin`}
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
													aria-label={ariaLabel}
												>
													<title>{ariaLabel}</title>
													<circle
														className="opacity-25"
														cx="12"
														cy="12"
														r="10"
														stroke="currentColor"
														strokeWidth="2"
													/>
													<path
														className="opacity-75"
														fill="currentColor"
														d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
													/>
												</svg>
											) : (
												// Incorrect X icon
												<svg
													className={`w-5 h-5 ${iconColor} mr-3 flex-shrink-0 mt-0.5`}
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
													aria-label={ariaLabel}
												>
													<title>{ariaLabel}</title>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth="2"
														d="M6 18L18 6M6 6l12 12"
													/>
												</svg>
											)}
											<div className="flex-1">
												<p className={`text-sm font-medium ${textColor}`}>
													{label}
												</p>
												<p className="font-mono text-gray-800 mb-1">
													{attempt.input}
												</p>

												{/* Show loading state for validating attempts */}
												{isValidating && (
													<div className={`text-sm ${textColor} mt-2 p-2 ${bgColor} rounded border ${borderColor} flex items-center`}>
														<svg
															className={`animate-spin -ml-1 mr-2 h-4 w-4 ${iconColor}`}
															xmlns="http://www.w3.org/2000/svg"
															fill="none"
															viewBox="0 0 24 24"
														>
															<title>Loading spinner</title>
															<circle
																className="opacity-25"
																cx="12"
																cy="12"
																r="10"
																stroke="currentColor"
																strokeWidth="4"
															/>
															<path
																className="opacity-75"
																fill="currentColor"
																d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
															/>
														</svg>
														{attempt.feedback}
													</div>
												)}

												{/* Show feedback in accordion format for attempts with feedback */}
												{hasFeedback && (
													<div className="mt-2">
														{isAttemptExpanded ? (
															<div className="p-2 bg-red-100 rounded border">
																<p className="text-sm text-red-600">
																	{attempt.feedback}
																</p>
															</div>
														) : (
															<div className="text-xs text-red-500">
																Feedback available - click to expand
															</div>
														)}
													</div>
												)}
											</div>

											{/* Toggle button for feedback - only show if there's feedback */}
											{hasFeedback && (
												<button
													type="button"
													onClick={() => toggleAttemptFeedback(attemptId)}
													className="ml-2 p-1 text-red-400 hover:text-red-600 transition-colors"
													aria-label={`${isAttemptExpanded ? "Hide" : "Show"} feedback for incorrect attempt`}
												>
													<svg
														className={`w-4 h-4 transform transition-transform ${isAttemptExpanded ? "rotate-180" : ""}`}
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<title>{`${isAttemptExpanded ? "Hide" : "Show"} feedback`}</title>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth="2"
															d="M19 9l-7 7-7-7"
														/>
													</svg>
												</button>
											)}
										</div>
									</div>
								);
							})}
						</div>
					);
				})()}
		</div>
	);
}
