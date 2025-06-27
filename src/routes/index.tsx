import { Link, createFileRoute } from '@tanstack/react-router'
import { MathTutorApp } from '../components/MathTutorApp'
import { problemLibrary } from '../lib/problem-library'
import type { ProblemModel } from '../lib/validation-engine'

export const Route = createFileRoute('/')({
  component: App,
})

// Featured problem for the home page
const featuredProblem = problemLibrary[0]; // The original complex problem

// Sample problem for Phase 2 testing
const sampleProblem: ProblemModel = {
  problemId: 'p-102',
  problemStatement: 'Solve for x: 4(x - 3) - (x - 5) = 14',
  problemType: 'SOLVE_EQUATION',
  teacherModel: {
    type: 'sequential_steps',
    steps: [
      '4x - 12 - (x - 5) = 14',
      '4x - 12 - x + 5 = 14',
      '3x - 12 + 5 = 14',
      '3x - 7 = 14',
      '3x = 21',
      'x = 7'
    ]
  }
};

function App() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Hero section */}
      <div className="max-w-4xl mx-auto px-4 text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Interactive Math Tutor</h1>
        <p className="text-xl text-gray-600 mb-6">
          Master algebra step-by-step with intelligent feedback and guidance
        </p>
        
        {/* Navigation buttons */}
        <div className="flex justify-center gap-4 mb-8">
          <Link
            to="/library"
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
          >
            Browse Problem Library
          </Link>
          <a
            href="#featured-problem"
            className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
          >
            Try Featured Problem
          </a>
        </div>

        {/* Quick stats */}
        <div className="flex justify-center gap-8 text-sm text-gray-600 mb-8">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Check mark">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Step-by-step validation
          </div>
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Lightning bolt">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Instant feedback
          </div>
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Book">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.168 18.477 18.582 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            {problemLibrary.length} practice problems
          </div>
        </div>
      </div>

      {/* Featured problem section */}
      <div id="featured-problem" className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Featured Problem</h2>
          <p className="text-gray-600">Try this step-by-step algebra problem to get started</p>
        </div>
        <MathTutorApp problem={featuredProblem} />
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto px-4 mt-12 text-center text-sm text-gray-500">
        <p>
          Interactive Math Tutor • Phase 2 Implementation • 
          <Link to="/library" className="text-blue-600 hover:text-blue-800 ml-1">
            Explore more problems →
          </Link>
        </p>
      </div>
    </div>
  )
}
