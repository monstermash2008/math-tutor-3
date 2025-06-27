import { createFileRoute } from '@tanstack/react-router'
import { MathTutorApp } from '../components/MathTutorApp'
import type { ProblemModel } from '../lib/validation-engine'

export const Route = createFileRoute('/')({
  component: App,
})

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
    <div className="min-h-screen bg-gray-50 text-gray-800 flex items-center justify-center py-8">
      <MathTutorApp problem={sampleProblem} />
    </div>
  )
}
