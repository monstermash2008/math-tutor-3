interface StepsHistoryProps {
  history: string[];
  isSolved?: boolean;
}

export function StepsHistory({ history, isSolved = false }: StepsHistoryProps) {
  // Skip the first item (problem statement) and display the rest as steps
  const steps = history.slice(1);
  
  if (steps.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {steps.map((step, index) => {
        const isLastStep = index === steps.length - 1;
        const isFinalAnswer = isSolved && isLastStep;
        
        // Different styling for final answer vs intermediate steps
        const containerClass = isFinalAnswer 
          ? "flex items-center bg-blue-50 p-4 rounded-lg border-2 border-blue-400 shadow-md"
          : "flex items-center bg-green-50 p-4 rounded-lg border border-green-200";
        
        const iconColor = isFinalAnswer ? "text-blue-600" : "text-green-600";
        const stepLabelColor = isFinalAnswer ? "text-blue-600" : "text-gray-500";
        const stepLabel = isFinalAnswer ? "Final Answer" : `Step ${index + 1}`;
        
        return (
          <div key={`step-${index}-${step.slice(0, 10)}`} className={containerClass}>
            {isFinalAnswer ? (
              // Special trophy icon for final answer
              <svg 
                className={`w-6 h-6 ${iconColor} mr-3 flex-shrink-0`}
                fill="currentColor" 
                viewBox="0 0 20 20"
                aria-label="Problem solved successfully"
              >
                <path fillRule="evenodd" d="M10 2L13 8l6 .75-4.12 4.62L16 19l-6-3-6 3 1.12-5.63L1 8.75 7 8l3-6z" clipRule="evenodd" />
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
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            <div>
              <p className={`text-sm font-semibold ${stepLabelColor}`}>{stepLabel}</p>
              <p className={`font-medium font-mono ${isFinalAnswer ? 'text-blue-800 text-lg' : 'text-gray-800'}`}>
                {step}
              </p>
              {isFinalAnswer && (
                <p className="text-xs text-blue-600 mt-1 font-medium">🎉 Excellent work!</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
} 