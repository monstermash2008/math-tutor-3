import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useConvex } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { ProblemCard } from "../components/ProblemCard";

export const Route = createFileRoute("/library")({
	component: LibraryPage,
});

function LibraryPage() {
	const [filter, setFilter] = useState<
		"ALL" | "SOLVE_EQUATION" | "SIMPLIFY_EXPRESSION"
	>("ALL");
	const convex = useConvex();

	// Fetch all problems from database
	const {
		data: allProblems = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["problems", "all"],
		queryFn: async () => {
			return await convex.query(api.problems.getAllProblems, {
				publicOnly: true,
			});
		},
	});

	// Filter problems based on selected filter
	const filteredProblems =
		filter === "ALL"
			? allProblems
			: allProblems.filter((problem) => problem.problemType === filter);

	const solveCount = allProblems.filter(
		(p) => p.problemType === "SOLVE_EQUATION",
	).length;
	const simplifyCount = allProblems.filter(
		(p) => p.problemType === "SIMPLIFY_EXPRESSION",
	).length;

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gray-50 py-8">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center">
						<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
						<p className="mt-2 text-gray-600">Loading problems...</p>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-gray-50 py-8">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center">
						<div className="text-red-600 mb-4">
							<svg
								className="w-12 h-12 mx-auto"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<title>Error icon</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"
								/>
							</svg>
						</div>
						<h2 className="text-xl font-semibold text-gray-900 mb-2">
							Error Loading Problems
						</h2>
						<p className="text-gray-600 mb-4">
							We couldn't load the problem library. Please try again.
						</p>
						<button
							type="button"
							onClick={() => window.location.reload()}
							className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
						>
							Retry
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 py-8">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				{/* Header */}
				<div className="text-center mb-8">
					<h1 className="text-4xl font-bold text-gray-900 mb-4">
						Math Problem Library
					</h1>
					<p className="text-lg text-gray-600 mb-6">
						Choose from our collection of algebra problems to practice your
						skills
					</p>

					{/* Action Buttons */}
					<div className="flex justify-center gap-4 mb-6">
						<Link
							to="/create"
							className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200"
						>
							Create New Problem
						</Link>
					</div>

					{/* Stats */}
					<div className="flex justify-center gap-6 mb-6">
						<div className="text-center">
							<div className="text-2xl font-bold text-blue-600">
								{solveCount}
							</div>
							<div className="text-sm text-gray-600">Equations</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-purple-600">
								{simplifyCount}
							</div>
							<div className="text-sm text-gray-600">Expressions</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-green-600">
								{allProblems.length}
							</div>
							<div className="text-sm text-gray-600">Total Problems</div>
						</div>
					</div>
				</div>

				{/* Filter buttons */}
				<div className="flex justify-center mb-8">
					<div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
						<button
							type="button"
							onClick={() => setFilter("ALL")}
							className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
								filter === "ALL"
									? "bg-blue-100 text-blue-700"
									: "text-gray-500 hover:text-gray-700"
							}`}
						>
							All Problems ({allProblems.length})
						</button>
						<button
							type="button"
							onClick={() => setFilter("SOLVE_EQUATION")}
							className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
								filter === "SOLVE_EQUATION"
									? "bg-blue-100 text-blue-700"
									: "text-gray-500 hover:text-gray-700"
							}`}
						>
							Solve Equations ({solveCount})
						</button>
						<button
							type="button"
							onClick={() => setFilter("SIMPLIFY_EXPRESSION")}
							className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
								filter === "SIMPLIFY_EXPRESSION"
									? "bg-blue-100 text-blue-700"
									: "text-gray-500 hover:text-gray-700"
							}`}
						>
							Simplify Expressions ({simplifyCount})
						</button>
					</div>
				</div>

				{/* Problems grid */}
				{filteredProblems.length === 0 ? (
					<div className="text-center py-12">
						<div className="text-gray-400 mb-4">
							<svg
								className="w-16 h-16 mx-auto"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<title>Empty document icon</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="1"
									d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
						</div>
						<h3 className="text-lg font-medium text-gray-900 mb-2">
							No Problems Found
						</h3>
						<p className="text-gray-600 mb-4">
							{filter === "ALL"
								? "No problems have been created yet."
								: `No ${filter.replace("_", " ").toLowerCase()} problems found.`}
						</p>
						<Link
							to="/create"
							className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
						>
							Create the First Problem
						</Link>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
						{filteredProblems.map((problem) => (
							<ProblemCard key={problem._id} problem={problem} />
						))}
					</div>
				)}

				{/* Back to main page */}
				<div className="text-center">
					<Link
						to="/"
						className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					>
						<svg
							className="w-4 h-4 mr-2"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-label="Back arrow"
						>
							<title>Back arrow</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M10 19l-7-7m0 0l7-7m-7 7h18"
							/>
						</svg>
						Back to Home
					</Link>
				</div>
			</div>
		</div>
	);
}
