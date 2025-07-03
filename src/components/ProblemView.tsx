import type { ProblemModel } from "../types";
import { MathContent } from "./MathContent";

interface ProblemViewProps {
	problem: ProblemModel;
}

export function ProblemView({ problem }: ProblemViewProps) {
	return (
		<div className="bg-blue-50 p-6 rounded-xl mb-6 border border-blue-200">
			<p className="text-sm font-semibold text-blue-600 mb-2">Problem:</p>
			<div className="text-xl font-medium text-gray-800">
				<MathContent content={problem.problemStatement} />
			</div>
			<p className="text-sm text-gray-500 mt-2 capitalize">
				Type: {problem.problemType.replace("_", " ").toLowerCase()}
			</p>
		</div>
	);
}
