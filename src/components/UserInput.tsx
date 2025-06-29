import { useState } from "react";

interface UserInputProps {
	onCheckStep: (input: string) => void;
	isSolved: boolean;
	stepNumber: number;
}

export function UserInput({
	onCheckStep,
	isSolved,
	stepNumber,
}: UserInputProps) {
	const [input, setInput] = useState("");

	const handleCheck = () => {
		if (input.trim()) {
			onCheckStep(input.trim());
			setInput(""); // Clear input after successful submission
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleCheck();
		}
	};

	return (
		<div className="mt-4">
			<label
				htmlFor="student-answer"
				className="block text-sm font-medium text-gray-700 mb-2"
			>
				{isSolved ? "Problem Solved!" : `Step ${stepNumber}:`}
			</label>
			<div className="flex items-center space-x-3">
				<input
					type="text"
					id="student-answer"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={handleKeyDown}
					disabled={isSolved}
					className="flex-grow w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed font-mono"
					placeholder={isSolved ? "Great job!" : "e.g., 4x - 12 - x + 5 = 14"}
				/>
				<button
					type="button"
					onClick={handleCheck}
					disabled={isSolved || !input.trim()}
					className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
				>
					Check
				</button>
			</div>
		</div>
	);
}
