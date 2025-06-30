import { Link } from "@tanstack/react-router";
import type { ProblemModel } from "../types";

interface ProblemCardProps {
	problem: ProblemModel;
}

export function ProblemCard({ problem }: ProblemCardProps) {
	const stepCount = problem.solutionSteps.length;

	const difficultyColors = {
		Easy: "bg-green-100 text-green-800 border-green-200",
		Medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
		Hard: "bg-red-100 text-red-800 border-red-200",
	};

	const typeColors = {
		SOLVE_EQUATION: "bg-blue-100 text-blue-800 border-blue-200",
		SIMPLIFY_EXPRESSION: "bg-purple-100 text-purple-800 border-purple-200",
	};

	return (
		<Link
			to="/problem/$problemId"
			params={{ problemId: problem._id }}
			className="block group"
		>
			<div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-200 group-hover:border-blue-300 h-full">
				{/* Header with badges */}
				<div className="flex items-start justify-between mb-4">
					<div className="flex gap-2 flex-wrap">
						<span
							className={`px-2 py-1 rounded-full text-xs font-medium border ${difficultyColors[problem.difficulty]}`}
						>
							{problem.difficulty}
						</span>
						<span
							className={`px-2 py-1 rounded-full text-xs font-medium border ${typeColors[problem.problemType]}`}
						>
							{problem.problemType === "SOLVE_EQUATION" ? "Solve" : "Simplify"}
						</span>
					</div>
					<div className="text-xs text-gray-500">
						{stepCount} step{stepCount !== 1 ? "s" : ""}
					</div>
				</div>

				{/* Problem statement */}
				<div className="mb-4">
					<h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
						{problem.title || problem.problemStatement}
					</h3>
					{problem.title && (
						<p className="text-sm text-gray-600">{problem.problemStatement}</p>
					)}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-between text-sm text-gray-600">
					<span className="flex items-center">
						<svg
							className="w-4 h-4 mr-1"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-label="Start problem"
						>
							<title>Start problem</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M9 5l7 7-7 7"
							/>
						</svg>
						Start Problem
					</span>
					<span className="text-xs text-gray-400">
						{problem.timesAttempted} attempt
						{problem.timesAttempted !== 1 ? "s" : ""}
					</span>
				</div>
			</div>
		</Link>
	);
}
