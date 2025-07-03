import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Static problem data to migrate (converted to LaTeX format)
const STATIC_PROBLEMS = [
  // EXISTING BASIC PROBLEMS
  {
    problemId: 'solve-001',
    problemStatement: 'Solve for x: $4(x - 3) - (x - 5) = 14$',
    problemType: 'SOLVE_EQUATION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$4x - 12 - (x - 5) = 14$',
        '$4x - 12 - x + 5 = 14$',
        '$3x - 12 + 5 = 14$',
        '$3x - 7 = 14$',
        '$3x = 21$',
        '$x = 7$'
      ]
    }
  },
  {
    problemId: 'solve-002',
    problemStatement: 'Solve for x: $5x + 3 = 2x + 12$',
    problemType: 'SOLVE_EQUATION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$5x - 2x + 3 = 12$',
        '$3x + 3 = 12$',
        '$3x = 12 - 3$',
        '$3x = 9$',
        '$x = 3$'
      ]
    }
  },
  {
    problemId: 'solve-003',
    problemStatement: 'Solve for x: $3x - 7 = 14$',
    problemType: 'SOLVE_EQUATION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$3x = 14 + 7$',
        '$3x = 21$',
        '$x = 7$'
      ]
    }
  },
  {
    problemId: 'solve-004',
    problemStatement: 'Solve for x: $2x + 5 = 11$',
    problemType: 'SOLVE_EQUATION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$2x = 11 - 5$',
        '$2x = 6$',
        '$x = 3$'
      ]
    }
  },
  {
    problemId: 'simplify-001',
    problemStatement: 'Simplify: $3(x - 2y) + 2(y + 4x)$',
    problemType: 'SIMPLIFY_EXPRESSION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$3x - 6y + 2y + 8x$',
        '$11x - 4y$'
      ]
    }
  },
  {
    problemId: 'simplify-002',
    problemStatement: 'Simplify: $4x - x - 7$',
    problemType: 'SIMPLIFY_EXPRESSION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$3x - 7$'
      ]
    }
  },
  {
    problemId: 'simplify-003',
    problemStatement: 'Simplify: $2x + 3 + 5x - 1$',
    problemType: 'SIMPLIFY_EXPRESSION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$7x + 2$'
      ]
    }
  },
  {
    problemId: 'solve-005',
    problemStatement: 'Solve for x: $6x - 9 = 3x + 6$',
    problemType: 'SOLVE_EQUATION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$6x - 3x = 6 + 9$',
        '$3x = 15$',
        '$x = 5$'
      ]
    }
  },
  {
    problemId: 'solve-006',
    problemStatement: 'Solve for x: $2(x + 3) = 14$',
    problemType: 'SOLVE_EQUATION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$2x + 6 = 14$',
        '$2x = 14 - 6$',
        '$2x = 8$',
        '$x = 4$'
      ]
    }
  },
  {
    problemId: 'simplify-004',
    problemStatement: 'Simplify: $5(2x + 1) - 3x$',
    problemType: 'SIMPLIFY_EXPRESSION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$10x + 5 - 3x$',
        '$7x + 5$'
      ]
    }
  },

  // NEW ADVANCED PROBLEMS - QUADRATIC EQUATIONS
  {
    problemId: 'solve-quad-001',
    problemStatement: 'Solve for x: $x^2 - 5x + 6 = 0$',
    problemType: 'SOLVE_EQUATION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$(x - 2)(x - 3) = 0$',
        '$x - 2 = 0 \\text{ or } x - 3 = 0$',
        '$x = 2 \\text{ or } x = 3$'
      ]
    }
  },
  {
    problemId: 'solve-quad-002',
    problemStatement: 'Solve for x: $x^2 + 7x + 12 = 0$',
    problemType: 'SOLVE_EQUATION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$(x + 3)(x + 4) = 0$',
        '$x + 3 = 0 \\text{ or } x + 4 = 0$',
        '$x = -3 \\text{ or } x = -4$'
      ]
    }
  },
  {
    problemId: 'solve-quad-003',
    problemStatement: 'Solve for x: $x^2 - 4x - 5 = 0$',
    problemType: 'SOLVE_EQUATION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$(x - 5)(x + 1) = 0$',
        '$x - 5 = 0 \\text{ or } x + 1 = 0$',
        '$x = 5 \\text{ or } x = -1$'
      ]
    }
  },
  {
    problemId: 'solve-quad-004',
    problemStatement: 'Solve for x using the quadratic formula: $x^2 - 6x + 8 = 0$',
    problemType: 'SOLVE_EQUATION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$x = \\frac{6 \\pm \\sqrt{36 - 32}}{2}$',
        '$x = \\frac{6 \\pm \\sqrt{4}}{2}$',
        '$x = \\frac{6 \\pm 2}{2}$',
        '$x = 4 \\text{ or } x = 2$'
      ]
    }
  },

  // SYSTEMS OF EQUATIONS
  {
    problemId: 'solve-system-001',
    problemStatement: 'Solve the system: $x + y = 5$, $x - y = 1$',
    problemType: 'SOLVE_EQUATION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$(x + y) + (x - y) = 5 + 1$',
        '$2x = 6$',
        '$x = 3$',
        '$3 + y = 5$',
        '$y = 2$'
      ]
    }
  },
  {
    problemId: 'solve-system-002',
    problemStatement: 'Solve the system: $2x + 3y = 12$, $x - y = 1$',
    problemType: 'SOLVE_EQUATION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$x = y + 1$',
        '$2(y + 1) + 3y = 12$',
        '$2y + 2 + 3y = 12$',
        '$5y = 10$',
        '$y = 2$',
        '$x = 3$'
      ]
    }
  },

  // RATIONAL EQUATIONS
  {
    problemId: 'solve-rational-001',
    problemStatement: 'Solve for x: $\\frac{x + 2}{x - 1} = 3$',
    problemType: 'SOLVE_EQUATION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$x + 2 = 3(x - 1)$',
        '$x + 2 = 3x - 3$',
        '$2 + 3 = 3x - x$',
        '$5 = 2x$',
        '$x = \\frac{5}{2}$'
      ]
    }
  },
  {
    problemId: 'solve-rational-002',
    problemStatement: 'Solve for x: $\\frac{1}{x} + \\frac{1}{x+1} = \\frac{1}{2}$',
    problemType: 'SOLVE_EQUATION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$\\frac{2(x+1) + 2x}{2x(x+1)} = \\frac{1}{2}$',
        '$\\frac{2x + 2 + 2x}{2x(x+1)} = \\frac{1}{2}$',
        '$\\frac{4x + 2}{2x(x+1)} = \\frac{1}{2}$',
        '$2(4x + 2) = 2x(x+1)$',
        '$8x + 4 = 2x^2 + 2x$',
        '$2x^2 - 6x - 4 = 0$',
        '$x^2 - 3x - 2 = 0$',
        '$x = \\frac{3 \\pm \\sqrt{9 + 8}}{2} = \\frac{3 \\pm \\sqrt{17}}{2}$'
      ]
    }
  },

  // RADICAL EQUATIONS
  {
    problemId: 'solve-radical-001',
    problemStatement: 'Solve for x: $\\sqrt{x + 4} = 5$',
    problemType: 'SOLVE_EQUATION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$x + 4 = 25$',
        '$x = 21$'
      ]
    }
  },
  {
    problemId: 'solve-radical-002',
    problemStatement: 'Solve for x: $\\sqrt{2x - 1} = x - 2$',
    problemType: 'SOLVE_EQUATION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$2x - 1 = (x - 2)^2$',
        '$2x - 1 = x^2 - 4x + 4$',
        '$x^2 - 6x + 5 = 0$',
        '$(x - 1)(x - 5) = 0$',
        '$x = 1 \\text{ or } x = 5$ (check: $x = 5$ is valid)'
      ]
    }
  },

  // EXPONENTIAL EQUATIONS
  {
    problemId: 'solve-exp-001',
    problemStatement: 'Solve for x: $2^x = 16$',
    problemType: 'SOLVE_EQUATION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$2^x = 2^4$',
        '$x = 4$'
      ]
    }
  },
  {
    problemId: 'solve-exp-002',
    problemStatement: 'Solve for x: $3^{2x-1} = 27$',
    problemType: 'SOLVE_EQUATION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$3^{2x-1} = 3^3$',
        '$2x - 1 = 3$',
        '$2x = 4$',
        '$x = 2$'
      ]
    }
  },

  // ABSOLUTE VALUE EQUATIONS
  {
    problemId: 'solve-abs-001',
    problemStatement: 'Solve for x: $|x - 3| = 7$',
    problemType: 'SOLVE_EQUATION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$x - 3 = 7 \\text{ or } x - 3 = -7$',
        '$x = 10 \\text{ or } x = -4$'
      ]
    }
  },
  {
    problemId: 'solve-abs-002',
    problemStatement: 'Solve for x: $|2x + 1| = 9$',
    problemType: 'SOLVE_EQUATION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$2x + 1 = 9 \\text{ or } 2x + 1 = -9$',
        '$2x = 8 \\text{ or } 2x = -10$',
        '$x = 4 \\text{ or } x = -5$'
      ]
    }
  },

  // COMPLEX POLYNOMIAL EXPRESSIONS
  {
    problemId: 'simplify-poly-001',
    problemStatement: 'Simplify: $(x + 3)(x - 2) + x(x + 1)$',
    problemType: 'SIMPLIFY_EXPRESSION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$x^2 - 2x + 3x - 6 + x^2 + x$',
        '$x^2 + x - 6 + x^2 + x$',
        '$2x^2 + 2x - 6$'
      ]
    }
  },
  {
    problemId: 'simplify-poly-002',
    problemStatement: 'Simplify: $(2x + 1)^2 - (x - 3)^2$',
    problemType: 'SIMPLIFY_EXPRESSION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$4x^2 + 4x + 1 - (x^2 - 6x + 9)$',
        '$4x^2 + 4x + 1 - x^2 + 6x - 9$',
        '$3x^2 + 10x - 8$'
      ]
    }
  },
  {
    problemId: 'simplify-poly-003',
    problemStatement: 'Simplify: $x^3 - 2x^2 + x - (x^3 + x^2 - 3x)$',
    problemType: 'SIMPLIFY_EXPRESSION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$x^3 - 2x^2 + x - x^3 - x^2 + 3x$',
        '$-3x^2 + 4x$'
      ]
    }
  },

  // RATIONAL EXPRESSIONS
  {
    problemId: 'simplify-rational-001',
    problemStatement: 'Simplify: $\\frac{x^2 - 4}{x + 2}$',
    problemType: 'SIMPLIFY_EXPRESSION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$\\frac{(x - 2)(x + 2)}{x + 2}$',
        '$x - 2$'
      ]
    }
  },
  {
    problemId: 'simplify-rational-002',
    problemStatement: 'Simplify: $\\frac{2x^2 + 6x}{4x}$',
    problemType: 'SIMPLIFY_EXPRESSION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$\\frac{2x(x + 3)}{4x}$',
        '$\\frac{x + 3}{2}$'
      ]
    }
  },
  {
    problemId: 'simplify-rational-003',
    problemStatement: 'Simplify: $\\frac{x^2 - 9}{x^2 + 6x + 9}$',
    problemType: 'SIMPLIFY_EXPRESSION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$\\frac{(x - 3)(x + 3)}{(x + 3)^2}$',
        '$\\frac{x - 3}{x + 3}$'
      ]
    }
  },

  // RADICAL EXPRESSIONS
  {
    problemId: 'simplify-radical-001',
    problemStatement: 'Simplify: $\\sqrt{48} + \\sqrt{12}$',
    problemType: 'SIMPLIFY_EXPRESSION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$\\sqrt{16 \\cdot 3} + \\sqrt{4 \\cdot 3}$',
        '$4\\sqrt{3} + 2\\sqrt{3}$',
        '$6\\sqrt{3}$'
      ]
    }
  },
  {
    problemId: 'simplify-radical-002',
    problemStatement: 'Simplify: $\\sqrt{x^3y^2}$ where $x,y \\geq 0$',
    problemType: 'SIMPLIFY_EXPRESSION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$\\sqrt{x^2 \\cdot x \\cdot y^2}$',
        '$xy\\sqrt{x}$'
      ]
    }
  },
  {
    problemId: 'simplify-radical-003',
    problemStatement: 'Simplify: $\\frac{\\sqrt{6} + \\sqrt{3}}{\\sqrt{3}}$',
    problemType: 'SIMPLIFY_EXPRESSION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$\\frac{\\sqrt{6}}{\\sqrt{3}} + \\frac{\\sqrt{3}}{\\sqrt{3}}$',
        '$\\sqrt{2} + 1$'
      ]
    }
  },

  // COMPLEX FRACTIONS
  {
    problemId: 'simplify-complex-001',
    problemStatement: 'Simplify: $\\frac{\\frac{1}{x} + \\frac{1}{y}}{\\frac{1}{x} - \\frac{1}{y}}$',
    problemType: 'SIMPLIFY_EXPRESSION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$\\frac{\\frac{y + x}{xy}}{\\frac{y - x}{xy}}$',
        '$\\frac{y + x}{xy} \\cdot \\frac{xy}{y - x}$',
        '$\\frac{x + y}{y - x}$'
      ]
    }
  },

  // LOGARITHMIC EXPRESSIONS
  {
    problemId: 'simplify-log-001',
    problemStatement: 'Simplify: $\\log_2(8) + \\log_2(4)$',
    problemType: 'SIMPLIFY_EXPRESSION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$\\log_2(2^3) + \\log_2(2^2)$',
        '$3 + 2$',
        '$5$'
      ]
    }
  },

  // FACTORING EXPRESSIONS
  {
    problemId: 'simplify-factor-001',
    problemStatement: 'Factor: $x^2 + 8x + 15$',
    problemType: 'SIMPLIFY_EXPRESSION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$(x + 3)(x + 5)$'
      ]
    }
  },
  {
    problemId: 'simplify-factor-002',
    problemStatement: 'Factor: $4x^2 - 12x + 8$',
    problemType: 'SIMPLIFY_EXPRESSION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$4(x^2 - 3x + 2)$',
        '$4(x - 1)(x - 2)$'
      ]
    }
  },
  {
    problemId: 'simplify-factor-003',
    problemStatement: 'Factor: $x^3 - 8$',
    problemType: 'SIMPLIFY_EXPRESSION' as const,
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '$(x - 2)(x^2 + 2x + 4)$'
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
    if (problemStatement.includes('system') || problemStatement.includes('System')) {
      return 'System of Equations';
    } else if (problemStatement.includes('x²') || problemStatement.includes('quadratic formula')) {
      return 'Quadratic Equation';
    } else if (problemStatement.includes('√') || problemStatement.includes('sqrt')) {
      return 'Radical Equation';
    } else if (problemStatement.includes('/') && problemStatement.includes('x')) {
      return 'Rational Equation';
    } else if (problemStatement.includes('^') || problemStatement.includes('²') || problemStatement.includes('³')) {
      return 'Exponential Equation';
    } else if (problemStatement.includes('|')) {
      return 'Absolute Value Equation';
    } else {
      return 'Linear Equation';
    }
  } else if (problemType === 'SIMPLIFY_EXPRESSION') {
    if (problemStatement.includes('Factor')) {
      return 'Factor Expression';
    } else if (problemStatement.includes('√') || problemStatement.includes('sqrt')) {
      return 'Simplify Radicals';
    } else if (problemStatement.includes('log') || problemStatement.includes('Log')) {
      return 'Simplify Logarithms';
    } else if (problemStatement.includes('/') && problemStatement.includes('x')) {
      return 'Simplify Rational Expression';
    } else if (problemStatement.includes('x²') || problemStatement.includes('x³') || problemStatement.includes('^')) {
      return 'Simplify Polynomials';
    } else if (problemStatement.includes('(') && problemStatement.includes(')')) {
      return 'Expand and Simplify';
    } else {
      return 'Simplify Expression';
    }
  }
  return 'Math Problem';
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
      
      // Determine subject based on problem content
      let subject = 'Algebra';
      if (staticProblem.problemStatement.includes('system') || staticProblem.problemStatement.includes('System')) {
        subject = 'Algebra - Systems';
      } else if (staticProblem.problemStatement.includes('x²') || staticProblem.problemStatement.includes('quadratic')) {
        subject = 'Algebra - Quadratics';
      } else if (staticProblem.problemStatement.includes('√') || staticProblem.problemStatement.includes('sqrt')) {
        subject = 'Algebra - Radicals';
      } else if (staticProblem.problemStatement.includes('log') || staticProblem.problemStatement.includes('Log')) {
        subject = 'Algebra - Logarithms';
      } else if (staticProblem.problemStatement.includes('^') && !staticProblem.problemStatement.includes('x²')) {
        subject = 'Algebra - Exponentials';
      } else if (staticProblem.problemStatement.includes('|')) {
        subject = 'Algebra - Absolute Value';
      } else if (staticProblem.problemStatement.includes('/') && staticProblem.problemStatement.includes('x')) {
        subject = 'Algebra - Rational Expressions';
      } else if (staticProblem.problemType === 'SOLVE_EQUATION') {
        subject = 'Algebra - Linear Equations';
      } else {
        subject = 'Algebra - Expressions';
      }
      
      // Generate comprehensive tags based on content
      const tags = [];
      
      // Basic tags
      if (staticProblem.problemStatement.includes('x')) tags.push('single-variable');
      if (staticProblem.problemStatement.includes('y')) tags.push('multi-variable');
      if (staticProblem.problemStatement.includes('(')) tags.push('parentheses');
      
      // Problem type tags
      if (staticProblem.problemType === 'SOLVE_EQUATION') tags.push('equations');
      if (staticProblem.problemType === 'SIMPLIFY_EXPRESSION') tags.push('simplification');
      
      // Content-specific tags
      if (staticProblem.problemStatement.includes('x²') || staticProblem.problemStatement.includes('quadratic')) {
        tags.push('quadratic', 'factoring');
      }
      if (staticProblem.problemStatement.includes('system') || staticProblem.problemStatement.includes('System')) {
        tags.push('systems', 'substitution', 'elimination');
      }
      if (staticProblem.problemStatement.includes('√') || staticProblem.problemStatement.includes('sqrt')) {
        tags.push('radicals', 'square-roots');
      }
      if (staticProblem.problemStatement.includes('/') && staticProblem.problemStatement.includes('x')) {
        tags.push('rational-expressions', 'fractions');
      }
      if (staticProblem.problemStatement.includes('^') || staticProblem.problemStatement.includes('²') || staticProblem.problemStatement.includes('³')) {
        tags.push('exponents');
      }
      if (staticProblem.problemStatement.includes('|')) {
        tags.push('absolute-value');
      }
      if (staticProblem.problemStatement.includes('log') || staticProblem.problemStatement.includes('Log')) {
        tags.push('logarithms');
      }
      if (staticProblem.problemStatement.includes('Factor')) {
        tags.push('factoring', 'polynomials');
      }
      if (staticProblem.problemStatement.includes('x³') || staticProblem.problemStatement.includes('polynomial')) {
        tags.push('polynomials');
      }
      
      // Difficulty-based tags
      if (stepCount <= 2) tags.push('beginner');
      else if (stepCount <= 4) tags.push('intermediate');
      else tags.push('advanced');

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