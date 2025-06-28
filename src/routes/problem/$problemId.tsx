import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useConvex } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { MathTutorApp } from "../../components/MathTutorApp";

export const Route = createFileRoute("/problem/$problemId")({
	component: ProblemPage,
});

function ProblemPage() {
	const { problemId } = Route.useParams();
	const convex = useConvex();

	// Fetch from database
	const {
		data: problem,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["problem", problemId],
		queryFn: async () => {
			return await convex.query(api.problems.getProblemById, {
				id: problemId as Id<"problems">,
			});
		},
		retry: false,
	});

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gray-50 py-8">
				<div className="max-w-2xl mx-auto px-4">
					<div className="text-center">
						<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
						<p className="mt-2 text-gray-600">Loading problem...</p>
					</div>
				</div>
			</div>
		);
	}

	if (!problem) {
		return (
			<div className="min-h-screen bg-gray-50 py-8">
				<div className="max-w-2xl mx-auto px-4">
					<div className="text-center">
						<div className="text-red-600 mb-4">
							<svg
								className="w-16 h-16 mx-auto"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<title>Problem not found</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="1"
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"
								/>
							</svg>
						</div>
						<h2 className="text-xl font-semibold text-gray-900 mb-2">
							Problem Not Found
						</h2>
						<p className="text-gray-600 mb-4">
							The problem you're looking for doesn't exist or has been removed.
						</p>
						<Link
							to="/library"
							className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
						>
							<svg
								className="w-4 h-4 mr-2"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<title>Back to library</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M10 19l-7-7m0 0l7-7m-7 7h18"
								/>
							</svg>
							Back to Library
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 py-8">
			{/* Navigation header */}
			<div className="max-w-2xl mx-auto px-4 mb-6">
				<div className="flex items-center justify-between">
					<Link
						to="/library"
						className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
					>
						<svg
							className="w-4 h-4 mr-1"
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
						Back to Library
					</Link>

					<div className="text-sm text-gray-500">Problem ID: {problem._id}</div>
				</div>
			</div>

			{/* Math tutor app */}
			<MathTutorApp problem={problem} />
		</div>
	);
}
