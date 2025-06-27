import type { ProblemModel } from './validation-engine';

export const problemLibrary: ProblemModel[] = [
  {
    problemId: 'solve-001',
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
  },
  {
    problemId: 'solve-002',
    problemStatement: 'Solve for x: 5x + 3 = 2x + 12',
    problemType: 'SOLVE_EQUATION',
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '5x - 2x + 3 = 12',
        '3x + 3 = 12',
        '3x = 12 - 3',
        '3x = 9',
        'x = 3'
      ]
    }
  },
  {
    problemId: 'solve-003',
    problemStatement: 'Solve for x: 3x - 7 = 14',
    problemType: 'SOLVE_EQUATION',
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '3x = 14 + 7',
        '3x = 21',
        'x = 7'
      ]
    }
  },
  {
    problemId: 'solve-004',
    problemStatement: 'Solve for x: 2x + 5 = 11',
    problemType: 'SOLVE_EQUATION',
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '2x = 11 - 5',
        '2x = 6',
        'x = 3'
      ]
    }
  },
  {
    problemId: 'simplify-001',
    problemStatement: 'Simplify: 3(x - 2y) + 2(y + 4x)',
    problemType: 'SIMPLIFY_EXPRESSION',
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '3x - 6y + 2y + 8x',
        '11x - 4y'
      ]
    }
  },
  {
    problemId: 'simplify-002',
    problemStatement: 'Simplify: 4x - x - 7',
    problemType: 'SIMPLIFY_EXPRESSION',
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '3x - 7'
      ]
    }
  },
  {
    problemId: 'simplify-003',
    problemStatement: 'Simplify: 2x + 3 + 5x - 1',
    problemType: 'SIMPLIFY_EXPRESSION',
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '7x + 2'
      ]
    }
  },
  {
    problemId: 'solve-005',
    problemStatement: 'Solve for x: 6x - 9 = 3x + 6',
    problemType: 'SOLVE_EQUATION',
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '6x - 3x = 6 + 9',
        '3x = 15',
        'x = 5'
      ]
    }
  },
  {
    problemId: 'solve-006',
    problemStatement: 'Solve for x: 2(x + 3) = 14',
    problemType: 'SOLVE_EQUATION',
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '2x + 6 = 14',
        '2x = 14 - 6',
        '2x = 8',
        'x = 4'
      ]
    }
  },
  {
    problemId: 'simplify-004',
    problemStatement: 'Simplify: 5(2x + 1) - 3x',
    problemType: 'SIMPLIFY_EXPRESSION',
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '10x + 5 - 3x',
        '7x + 5'
      ]
    }
  }
];

export function getProblemById(id: string): ProblemModel | undefined {
  return problemLibrary.find(problem => problem.problemId === id);
}

export function getProblemsByType(type: 'SOLVE_EQUATION' | 'SIMPLIFY_EXPRESSION'): ProblemModel[] {
  return problemLibrary.filter(problem => problem.problemType === type);
}

export function getDifficultyLevel(problem: ProblemModel): 'Easy' | 'Medium' | 'Hard' {
  const stepCount = problem.teacherModel.steps.length;
  if (stepCount <= 2) return 'Easy';
  if (stepCount <= 4) return 'Medium';
  return 'Hard';
} 