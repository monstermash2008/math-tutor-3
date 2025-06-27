import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ProblemCard } from '../components/ProblemCard'
import { getProblemsByType, problemLibrary } from '../lib/problem-library'

export const Route = createFileRoute('/library')({
  component: LibraryPage,
})

function LibraryPage() {
  const [filter, setFilter] = useState<'ALL' | 'SOLVE_EQUATION' | 'SIMPLIFY_EXPRESSION'>('ALL');
  
  const filteredProblems = filter === 'ALL' 
    ? problemLibrary 
    : getProblemsByType(filter);

  const solveCount = getProblemsByType('SOLVE_EQUATION').length;
  const simplifyCount = getProblemsByType('SIMPLIFY_EXPRESSION').length;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Math Problem Library</h1>
          <p className="text-lg text-gray-600 mb-6">
            Choose from our collection of algebra problems to practice your skills
          </p>
          
          {/* Stats */}
          <div className="flex justify-center gap-6 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{solveCount}</div>
              <div className="text-sm text-gray-600">Equations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{simplifyCount}</div>
              <div className="text-sm text-gray-600">Expressions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{problemLibrary.length}</div>
              <div className="text-sm text-gray-600">Total Problems</div>
            </div>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'ALL'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              All Problems ({problemLibrary.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('SOLVE_EQUATION')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'SOLVE_EQUATION'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Solve Equations ({solveCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('SIMPLIFY_EXPRESSION')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'SIMPLIFY_EXPRESSION'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Simplify Expressions ({simplifyCount})
            </button>
          </div>
        </div>

        {/* Problems grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {filteredProblems.map((problem) => (
            <ProblemCard key={problem.problemId} problem={problem} />
          ))}
        </div>

        {/* Back to main page */}
        <div className="text-center">
          <Link 
            to="/"
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Back arrow">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
} 