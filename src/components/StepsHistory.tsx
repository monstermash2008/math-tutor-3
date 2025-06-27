import type { StudentAttempt } from "./MathTutorApp";

interface StepsHistoryProps {
	history: string[];
	allAttempts: StudentAttempt[];
	isSolved?: boolean;
}

export function StepsHistory({
	history,
	allAttempts,
	isSolved = false,
}: StepsHistoryProps) {
	// Skip the first item (problem statement) and display the rest as steps
	const steps = history.slice(1);

	if (steps.length === 0 && allAttempts.length === 0) {
		return null;
	}

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

	return (
		<div className="space-y-4 mb-6">
			{/* Display completed steps */}
			{steps.map((step, index) => {
				const stepNumber = index + 1;
				const isLastStep = index === steps.length - 1;
				const isFinalAnswer = isSolved && isLastStep;
				const stepAttempts = attemptsByStep[stepNumber] || [];

				// Different styling for final answer vs intermediate steps
				const containerClass = isFinalAnswer
					? "bg-blue-50 p-4 rounded-lg border-2 border-blue-400 shadow-md"
					: "bg-green-50 p-4 rounded-lg border border-green-200";

				const iconColor = isFinalAnswer ? "text-blue-600" : "text-green-600";
				const stepLabelColor = isFinalAnswer
					? "text-blue-600"
					: "text-gray-500";
				const stepLabel = isFinalAnswer ? "Final Answer" : `Step ${stepNumber}`;

				return (
					<div
						key={`step-${stepNumber}-${step.slice(0, 10)}`}
						className="space-y-2"
					>
						{/* Show incorrect attempts for this step first */}
						{stepAttempts
							.filter((attempt) => !attempt.isCorrect)
							.map((attempt) => (
								<div
									key={`attempt-${stepNumber}-${attempt.timestamp.getTime()}`}
									className="flex items-start bg-red-50 p-3 rounded-lg border border-red-200"
								>
									<svg
										className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										aria-label="Incorrect attempt"
									>
										<title>Incorrect attempt</title>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
									<div className="flex-1">
										<p className="text-sm font-medium text-red-700">
											Incorrect Attempt
										</p>
										<p className="font-mono text-gray-800 mb-1">
											{attempt.input}
										</p>
										<p className="text-xs text-red-600">{attempt.feedback}</p>
									</div>
								</div>
							))}

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
								</div>
							</div>
						</div>
					</div>
				);
			})}

			{/* Show any remaining incorrect attempts for the current step */}
			{!isSolved &&
				(() => {
					const currentStepNumber = steps.length + 1;
					const currentStepAttempts = attemptsByStep[currentStepNumber] || [];
					const incorrectAttempts = currentStepAttempts.filter(
						(attempt) => !attempt.isCorrect,
					);

					if (incorrectAttempts.length === 0) return null;

					return (
						<div className="space-y-2">
							<p className="text-sm font-medium text-gray-600 mb-2">
								Previous attempts for Step {currentStepNumber}:
							</p>
							{incorrectAttempts.map((attempt) => (
								<div
									key={`current-attempt-${attempt.timestamp.getTime()}`}
									className="flex items-start bg-red-50 p-3 rounded-lg border border-red-200"
								>
									<svg
										className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										aria-label="Incorrect attempt"
									>
										<title>Incorrect attempt</title>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
									<div className="flex-1">
										<p className="text-sm font-medium text-red-700">
											Incorrect Attempt
										</p>
										<p className="font-mono text-gray-800 mb-1">
											{attempt.input}
										</p>
										<p className="text-xs text-red-600">{attempt.feedback}</p>
									</div>
								</div>
							))}
						</div>
					);
				})()}
		</div>
	);
}
