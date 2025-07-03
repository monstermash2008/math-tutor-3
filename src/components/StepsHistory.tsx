import type { FeedbackHistory } from "convex/llm_service";
import { useEffect, useState } from "react";
import { MathContent } from "./MathContent";
import type { StudentAttempt } from "./MathTutorApp";

interface StepsHistoryProps {
	history: string[];
	allAttempts: StudentAttempt[];
	feedbackHistory: FeedbackHistory;
	isSolved?: boolean;
}

// Unified timeline item that can be either a completed step or an attempt
interface TimelineItem {
	type: "completed_step" | "attempt";
	timestamp: Date;
	content: string;
	stepNumber: number;
	isCorrect?: boolean;
	status?: "pending" | "correct" | "incorrect";
	feedback?: string;
	isFinalAnswer?: boolean;
}

// Helper function to detect and render mathematical content
// NOTE: This is replaced by the universal MathContent component imported above

export function StepsHistory({
	history,
	allAttempts,
	feedbackHistory,
	isSolved = false,
}: StepsHistoryProps) {
	// Extract steps from history (excluding the problem statement)
	const steps = history.slice(1);

	// Always call ALL hooks first - never have early returns that skip hooks
	const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
	const [manuallyExpandedItems, setManuallyExpandedItems] = useState<
		Set<string>
	>(new Set());

	// Create a unified timeline that combines completed steps and attempts
	const createUnifiedTimeline = (): TimelineItem[] => {
		const timeline: TimelineItem[] = [];

		// Add completed steps to timeline
		// We need to estimate timestamps for completed steps since they don't have explicit timestamps
		// We'll use the timestamp of the correct attempt that corresponds to each step
		for (const [index, step] of steps.entries()) {
			const stepNumber = index + 1;
			const isLastStep = index === steps.length - 1;
			const isFinalAnswer = isSolved && isLastStep;

			// Find the correct attempt that corresponds to this completed step
			const correctAttempt = allAttempts.find(
				(attempt) =>
					attempt.isCorrect &&
					attempt.input === step &&
					attempt.stepNumber === stepNumber,
			);

			timeline.push({
				type: "completed_step",
				timestamp:
					correctAttempt?.timestamp || new Date(Date.now() + index * 1000),
				content: step,
				stepNumber,
				isCorrect: true,
				status: "correct",
				isFinalAnswer,
			});
		}

		// Add all attempts to timeline
		for (const attempt of allAttempts) {
			// Skip correct attempts that are already represented as completed steps
			if (attempt.isCorrect && steps.includes(attempt.input)) {
				continue;
			}

			timeline.push({
				type: "attempt",
				timestamp: attempt.timestamp,
				content: attempt.input,
				stepNumber: attempt.stepNumber,
				isCorrect: attempt.isCorrect,
				status: attempt.status,
				feedback: attempt.feedback,
			});
		}

		// Sort by timestamp to ensure chronological order
		timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

		return timeline;
	};

	const timeline = createUnifiedTimeline();

	// Auto-expand new incorrect attempts with feedback, and close previous auto-expanded items when new step is completed
	useEffect(() => {
		const itemIdsToAutoExpand = new Set<string>();
		const currentStepNumber = steps.length + 1;

		timeline.forEach((item, index) => {
			if (
				item.type === "attempt" &&
				item.status === "incorrect" &&
				item.feedback &&
				item.feedback !== "Validating..."
			) {
				// Only auto-expand recent incorrect attempts (not completed step attempts)
				if (item.stepNumber >= currentStepNumber) {
					const itemId = `timeline-item-${item.timestamp.getTime()}-${index}`;
					itemIdsToAutoExpand.add(itemId);
				}
			}
		});

		setExpandedItems((prevExpanded) => {
			const newExpanded = new Set<string>();
			let hasChanges = false;

			// Preserve manually expanded items from any step
			for (const expandedItemId of prevExpanded) {
				if (manuallyExpandedItems.has(expandedItemId)) {
					newExpanded.add(expandedItemId);
				} else {
					// This was auto-expanded, check if it should remain expanded
					const timelineIndex = timeline.findIndex((item, index) => {
						const itemId = `timeline-item-${item.timestamp.getTime()}-${index}`;
						return itemId === expandedItemId;
					});

					if (timelineIndex !== -1) {
						const item = timeline[timelineIndex];
						// Only keep auto-expanded if it's a current step attempt
						if (
							item.type === "attempt" &&
							item.stepNumber >= currentStepNumber
						) {
							newExpanded.add(expandedItemId);
						} else {
							// This auto-expanded item should be collapsed now (previous step)
							hasChanges = true;
						}
					}
				}
			}

			// Add new items that should be auto-expanded (current step incorrect attempts)
			for (const itemId of itemIdsToAutoExpand) {
				if (!newExpanded.has(itemId)) {
					newExpanded.add(itemId);
					hasChanges = true;
				}
			}

			return hasChanges ? newExpanded : prevExpanded;
		});
	}, [timeline, steps.length, manuallyExpandedItems]);

	// Toggle feedback expansion
	const toggleItemFeedback = (itemId: string) => {
		const newExpanded = new Set(expandedItems);
		const newManuallyExpanded = new Set(manuallyExpandedItems);

		if (newExpanded.has(itemId)) {
			// Currently expanded, so collapse it
			newExpanded.delete(itemId);
			newManuallyExpanded.delete(itemId);
		} else {
			// Currently collapsed, so expand it and mark as manually expanded
			newExpanded.add(itemId);
			newManuallyExpanded.add(itemId);
		}

		setExpandedItems(newExpanded);
		setManuallyExpandedItems(newManuallyExpanded);
	};

	// Handle empty case AFTER all hooks are called
	if (steps.length === 0 && allAttempts.length === 0) {
		return null;
	}

	return (
		<div className="space-y-4 mb-6">
			{timeline.map((item, index) => {
				const itemId = `timeline-item-${item.timestamp.getTime()}-${index}`;
				const isExpanded = expandedItems.has(itemId);
				const hasFeedback = item.feedback && item.feedback !== "Validating...";
				const isValidating =
					item.status === "pending" || item.feedback === "Validating...";

				if (item.type === "completed_step") {
					// Render completed step
					const containerClass = item.isFinalAnswer
						? "bg-blue-50 p-4 rounded-lg border-2 border-blue-400 shadow-md"
						: "bg-green-50 p-4 rounded-lg border border-green-200";

					const iconColor = item.isFinalAnswer
						? "text-blue-600"
						: "text-green-600";
					const stepLabelColor = item.isFinalAnswer
						? "text-blue-600"
						: "text-gray-500";
					const stepLabel = item.isFinalAnswer
						? "Final Answer"
						: `Step ${item.stepNumber}`;

					return (
						<div key={itemId} className="space-y-2">
							<div className={containerClass}>
								<div className="flex items-center">
									{item.isFinalAnswer ? (
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
										<MathContent
											content={item.content}
											className={`font-medium ${item.isFinalAnswer ? "text-blue-800 text-lg" : "text-gray-800"}`}
										/>
										{item.isFinalAnswer && (
											<p className="text-xs text-blue-600 mt-1 font-medium">
												🎉 Excellent work!
											</p>
										)}
									</div>
								</div>
							</div>
						</div>
					);
				}

				// Render attempt
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
				} else if (item.isCorrect) {
					// This shouldn't happen since correct attempts become completed steps
					bgColor = "bg-green-50";
					borderColor = "border-green-200";
					textColor = "text-green-700";
					iconColor = "text-green-500";
					label = "Correct Attempt";
					ariaLabel = "Correct attempt";
				} else {
					bgColor = "bg-red-50";
					borderColor = "border-red-200";
					textColor = "text-red-700";
					iconColor = "text-red-500";
					label = "Incorrect Attempt";
					ariaLabel = "Incorrect attempt";
				}

				return (
					<div key={itemId} className="space-y-2">
						<div className={`${bgColor} p-3 rounded-lg border ${borderColor}`}>
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
									// Incorrect X icon (or check for correct attempts)
									<svg
										className={`w-5 h-5 ${iconColor} mr-3 flex-shrink-0 mt-0.5`}
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										aria-label={ariaLabel}
									>
										<title>{ariaLabel}</title>
										{item.isCorrect ? (
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="2"
												d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										) : (
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="2"
												d="M6 18L18 6M6 6l12 12"
											/>
										)}
									</svg>
								)}
								<div className="flex-1">
									<p className={`text-sm font-medium ${textColor}`}>{label}</p>
									<MathContent
										content={item.content}
										className="text-gray-800 mb-1"
									/>

									{/* Show loading state for validating attempts */}
									{isValidating && (
										<div
											className={`text-sm ${textColor} mt-2 p-2 ${bgColor} rounded border ${borderColor} flex items-center`}
										>
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
											{item.feedback}
										</div>
									)}

									{/* Show feedback in accordion format for attempts with feedback */}
									{hasFeedback && !isValidating && (
										<div className="mt-2">
											{isExpanded ? (
												<div className="p-2 bg-red-100 rounded border">
													<p className="text-sm text-red-600">
														{item.feedback}
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
								{hasFeedback && !isValidating && (
									<button
										type="button"
										onClick={() => toggleItemFeedback(itemId)}
										className="ml-2 p-1 text-red-400 hover:text-red-600 transition-colors"
										aria-label={`${isExpanded ? "Hide" : "Show"} feedback for incorrect attempt`}
									>
										<svg
											className={`w-4 h-4 transform transition-transform ${isExpanded ? "rotate-180" : ""}`}
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<title>{`${isExpanded ? "Hide" : "Show"} feedback`}</title>
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
					</div>
				);
			})}
		</div>
	);
}
