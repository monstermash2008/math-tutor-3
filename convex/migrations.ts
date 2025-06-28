import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Static problem data to migrate (copied from problem-library.ts)
const STATIC_PROBLEMS = [
  {
    problemId: 'solve-001',
    problemStatement: 'Solve for x: 4(x - 3) - (x - 5) = 14',
    problemType: 'SOLVE_EQUATION' as const,
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
    problemType: 'SOLVE_EQUATION' as const,
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
    problemType: 'SOLVE_EQUATION' as const,
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
    problemType: 'SOLVE_EQUATION' as const,
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
    problemType: 'SIMPLIFY_EXPRESSION' as const,
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
    problemType: 'SIMPLIFY_EXPRESSION' as const,
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
    problemType: 'SIMPLIFY_EXPRESSION' as const,
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
    problemType: 'SOLVE_EQUATION' as const,
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
    problemType: 'SOLVE_EQUATION' as const,
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
    problemType: 'SIMPLIFY_EXPRESSION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '10x + 5 - 3x',
        '7x + 5'
      ]
    }
  }
];

// Helper function to determine difficulty based on step count
function getDifficultyLevel(stepCount: number): 'Easy' | 'Medium' | 'Hard' {
  if (stepCount <= 2) return 'Easy';
  if (stepCount <= 4) return 'Medium';
  return 'Hard';
}

// Helper function to generate a friendly title from problem statement
function generateTitle(problemStatement: string, problemType: string): string {
  if (problemType === 'SOLVE_EQUATION') {
    // Extract the main equation part
    const match = problemStatement.match(/Solve for x: (.+)/);
    if (match) {
      return `Solve: ${match[1]}`;
    }
    return problemStatement;
  } else {
    // Extract the expression part
    const match = problemStatement.match(/Simplify: (.+)/);
    if (match) {
      return `Simplify: ${match[1]}`;
    }
    return problemStatement;
  }
}

// Mutation to seed the database with static problems
export const seedProblems = mutation({
  args: { 
    forceReseed: v.optional(v.boolean()) // If true, clear existing problems first
  },
  handler: async (ctx, args) => {
    // Check if problems already exist (unless forcing reseed)
    if (!args.forceReseed) {
      const existingProblems = await ctx.db.query("problems").take(1);
      if (existingProblems.length > 0) {
        return {
          success: false,
          message: "Problems already exist. Use forceReseed: true to recreate.",
          problemsCreated: 0
        };
      }
    } else {
      // Clear existing problems if force reseeding
      const existingProblems = await ctx.db.query("problems").collect();
      for (const problem of existingProblems) {
        // Delete associated attempts first
        const attempts = await ctx.db
          .query("problemAttempts")
          .withIndex("problemId", (q) => q.eq("problemId", problem._id))
          .collect();
        
        for (const attempt of attempts) {
          await ctx.db.delete(attempt._id);
        }
        
        // Delete the problem
        await ctx.db.delete(problem._id);
      }
    }

    // Create problems from static data
    let problemsCreated = 0;
    const createdProblems = [];

    for (const staticProblem of STATIC_PROBLEMS) {
      const stepCount = staticProblem.teacherModel.steps.length;
      const difficulty = getDifficultyLevel(stepCount);
      const title = generateTitle(staticProblem.problemStatement, staticProblem.problemType);
      
      // Determine subject based on problem type
      const subject = staticProblem.problemType === 'SOLVE_EQUATION' ? 'Algebra - Equations' : 'Algebra - Expressions';
      
      // Generate tags based on content
      const tags = [];
      if (staticProblem.problemStatement.includes('(')) tags.push('parentheses');
      if (staticProblem.problemStatement.includes('x')) tags.push('single-variable');
      if (staticProblem.problemType === 'SOLVE_EQUATION') tags.push('linear-equations');
      if (staticProblem.problemType === 'SIMPLIFY_EXPRESSION') tags.push('simplification');

      try {
                 const problemId = await ctx.db.insert("problems", {
           problemStatement: staticProblem.problemStatement,
           problemType: staticProblem.problemType,
           solutionSteps: staticProblem.teacherModel.steps,
           title,
           description: `Practice problem: ${title}`,
           difficulty,
           subject,
           gradeLevel: "High School",
           isPublic: true, // Make all seed problems public
           tags,
           timesAttempted: 0,
           averageSteps: undefined,
           successRate: undefined,
           createdBy: undefined, // System-created
         });

         createdProblems.push({
           id: problemId,
           title
         });
        problemsCreated++;
      } catch (error) {
        console.error(`Failed to create problem ${staticProblem.problemId}:`, error);
      }
    }

    return {
      success: true,
      message: `Successfully created ${problemsCreated} problems`,
      problemsCreated,
      problems: createdProblems
    };
  },
});

// Mutation to check migration status
export const getMigrationStatus = mutation({
  args: {},
  handler: async (ctx) => {
    const problemCount = await ctx.db.query("problems").take(1000);
    const attemptCount = await ctx.db.query("problemAttempts").take(1000);
    
    return {
      totalProblems: problemCount.length,
      totalAttempts: attemptCount.length,
      sampleProblems: problemCount.slice(0, 3).map(p => ({
        id: p._id,
        title: p.title,
        problemType: p.problemType
      }))
    };
  },
}); 