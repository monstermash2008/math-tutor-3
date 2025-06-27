import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { MathTutorApp } from '../../components/MathTutorApp'
import { getProblemById } from '../../lib/problem-library'

export const Route = createFileRoute('/problem/$problemId')({
  component: ProblemPage,
  loader: ({ params }) => {
    const problem = getProblemById(params.problemId);
    if (!problem) {
      throw notFound();
    }
    return { problem };
  },
})

function ProblemPage() {
  const { problem } = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Navigation header */}
      <div className="max-w-2xl mx-auto px-4 mb-6">
        <div className="flex items-center justify-between">
          <Link 
            to="/library"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Back arrow">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Library
          </Link>
          
          <div className="text-sm text-gray-500">
            Problem ID: {problem.problemId}
          </div>
        </div>
      </div>

      {/* Math tutor app */}
      <MathTutorApp problem={problem} />
    </div>
  )
} 