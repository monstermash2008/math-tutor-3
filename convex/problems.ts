import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

// Type definitions for better type safety
export type Problem = Doc<"problems">;
export type ProblemAttempt = Doc<"problemAttempts">;

// Input validation schemas
const createProblemSchema = v.object({
  problemStatement: v.string(),
  problemType: v.union(v.literal("SOLVE_EQUATION"), v.literal("SIMPLIFY_EXPRESSION")),
  solutionSteps: v.array(v.string()),
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  difficulty: v.union(v.literal("Easy"), v.literal("Medium"), v.literal("Hard")),
  subject: v.optional(v.string()),
  gradeLevel: v.optional(v.string()),
  isPublic: v.boolean(),
  tags: v.optional(v.array(v.string())),
});

const updateProblemSchema = v.object({
  id: v.id("problems"),
  problemStatement: v.optional(v.string()),
  problemType: v.optional(v.union(v.literal("SOLVE_EQUATION"), v.literal("SIMPLIFY_EXPRESSION"))),
  solutionSteps: v.optional(v.array(v.string())),
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  difficulty: v.optional(v.union(v.literal("Easy"), v.literal("Medium"), v.literal("Hard"))),
  subject: v.optional(v.string()),
  gradeLevel: v.optional(v.string()),
  isPublic: v.optional(v.boolean()),
  tags: v.optional(v.array(v.string())),
});

// ============== MUTATIONS ==============

// Create a new problem
export const createProblem = mutation({
  args: createProblemSchema,
  handler: async (ctx, args) => {
    // Validate required fields
    if (!args.problemStatement.trim()) {
      throw new Error("Problem statement is required");
    }
    if (!args.solutionSteps.length) {
      throw new Error("At least one solution step is required");
    }

    // Create the problem with default analytics values
    const problemId = await ctx.db.insert("problems", {
      ...args,
      timesAttempted: 0,
      averageSteps: undefined,
      successRate: undefined,
      createdBy: undefined, // TODO: Set when user auth is implemented
    });

    return problemId;
  },
});

// Update an existing problem
export const updateProblem = mutation({
  args: updateProblemSchema,
  handler: async (ctx, args) => {
    const { id, ...updateData } = args;
    
    // Check if problem exists
    const existingProblem = await ctx.db.get(id);
    if (!existingProblem) {
      throw new Error("Problem not found");
    }

    // TODO: Add authorization check when user auth is implemented
    // if (existingProblem.createdBy !== ctx.auth.getUserId()) {
    //   throw new Error("Not authorized to update this problem");
    // }

    // Validate updated fields
    if (updateData.problemStatement !== undefined && !updateData.problemStatement.trim()) {
      throw new Error("Problem statement cannot be empty");
    }
    if (updateData.solutionSteps !== undefined && !updateData.solutionSteps.length) {
      throw new Error("At least one solution step is required");
    }

    await ctx.db.patch(id, updateData);
    return id;
  },
});

// Delete a problem
export const deleteProblem = mutation({
  args: { id: v.id("problems") },
  handler: async (ctx, args) => {
    const problem = await ctx.db.get(args.id);
    if (!problem) {
      throw new Error("Problem not found");
    }

    // TODO: Add authorization check when user auth is implemented
    // if (problem.createdBy !== ctx.auth.getUserId()) {
    //   throw new Error("Not authorized to delete this problem");
    // }

    // Delete associated attempts first
    const attempts = await ctx.db
      .query("problemAttempts")
      .withIndex("problemId", (q) => q.eq("problemId", args.id))
      .collect();
    
    for (const attempt of attempts) {
      await ctx.db.delete(attempt._id);
    }

    // Delete the problem
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Increment attempt count and update analytics
export const incrementAttempts = mutation({
  args: { 
    problemId: v.id("problems"),
    completed: v.boolean(),
    stepsCount: v.number(),
    timeSpent: v.number(),
    hintsUsed: v.optional(v.number()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const problem = await ctx.db.get(args.problemId);
    if (!problem) {
      throw new Error("Problem not found");
    }

    // Record the attempt
    await ctx.db.insert("problemAttempts", {
      problemId: args.problemId,
      userId: undefined, // TODO: Set when user auth is implemented
      completed: args.completed,
      stepsCount: args.stepsCount,
      timeSpent: args.timeSpent,
      hintsUsed: args.hintsUsed || 0,
      sessionId: args.sessionId,
    });

    // Update problem analytics
    const newTimesAttempted = problem.timesAttempted + 1;
    
    // Calculate new averages
    const attempts = await ctx.db
      .query("problemAttempts")
      .withIndex("problemId", (q) => q.eq("problemId", args.problemId))
      .collect();

    const completedAttempts = attempts.filter(a => a.completed);
    const newSuccessRate = attempts.length > 0 ? (completedAttempts.length / attempts.length) * 100 : 0;
    const newAverageSteps = completedAttempts.length > 0 
      ? completedAttempts.reduce((sum, a) => sum + a.stepsCount, 0) / completedAttempts.length 
      : undefined;

    await ctx.db.patch(args.problemId, {
      timesAttempted: newTimesAttempted,
      successRate: newSuccessRate,
      averageSteps: newAverageSteps,
    });

    return args.problemId;
  },
});

// ============== QUERIES ==============

// Get all problems (with optional filtering)
export const getAllProblems = query({
  args: {
    limit: v.optional(v.number()),
    publicOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    
    if (args.publicOnly) {
      const problems = await ctx.db
        .query("problems")
        .withIndex("isPublic", (q) => q.eq("isPublic", true))
        .take(limit);
      return problems;
    } else {
      const problems = await ctx.db
        .query("problems")
        .take(limit);
      return problems;
    }
  },
});

// Get a problem by ID
export const getProblemById = query({
  args: { id: v.id("problems") },
  handler: async (ctx, args) => {
    const problem = await ctx.db.get(args.id);
    if (!problem) {
      return null;
    }
    
    // TODO: Add privacy check when user auth is implemented
    // if (!problem.isPublic && problem.createdBy !== ctx.auth.getUserId()) {
    //   return null;
    // }
    
    return problem;
  },
});

// Internal query for actions to get problem by ID (no privacy restrictions)
export const getProblemByIdInternal = internalQuery({
  args: { id: v.id("problems") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});



// Get problems by type
export const getProblemsByType = query({
  args: { 
    problemType: v.union(v.literal("SOLVE_EQUATION"), v.literal("SIMPLIFY_EXPRESSION")),
    publicOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let problems = await ctx.db
      .query("problems")
      .withIndex("problemType", (q) => q.eq("problemType", args.problemType))
      .collect();
    
    if (args.publicOnly) {
      problems = problems.filter(p => p.isPublic);
    }
    
    return problems;
  },
});

// Get problems by difficulty
export const getProblemsByDifficulty = query({
  args: { 
    difficulty: v.union(v.literal("Easy"), v.literal("Medium"), v.literal("Hard")),
    publicOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let problems = await ctx.db
      .query("problems")
      .withIndex("difficulty", (q) => q.eq("difficulty", args.difficulty))
      .collect();
    
    if (args.publicOnly) {
      problems = problems.filter(p => p.isPublic);
    }
    
    return problems;
  },
});

// Search problems by text (title, description, problem statement)
export const searchProblems = query({
  args: { 
    searchTerm: v.string(),
    publicOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const searchTerm = args.searchTerm.toLowerCase();
    let problems = await ctx.db.query("problems").collect();
    
    // Filter by public visibility if requested
    if (args.publicOnly) {
      problems = problems.filter(p => p.isPublic);
    }
    
    // Filter by search term
    const filteredProblems = problems.filter(problem => {
      const title = (problem.title || "").toLowerCase();
      const description = (problem.description || "").toLowerCase();
      const statement = problem.problemStatement.toLowerCase();
      const tags = (problem.tags || []).join(" ").toLowerCase();
      
      return title.includes(searchTerm) || 
             description.includes(searchTerm) || 
             statement.includes(searchTerm) ||
             tags.includes(searchTerm);
    });
    
    return filteredProblems;
  },
});

// Get user's created problems (for future use with auth)
export const getUserProblems = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (!args.userId) {
      return [];
    }
    
    const problems = await ctx.db
      .query("problems")
      .withIndex("createdBy", (q) => q.eq("createdBy", args.userId))
      .collect();
    
    return problems;
  },
});

// Get problem analytics
export const getProblemAnalytics = query({
  args: { problemId: v.id("problems") },
  handler: async (ctx, args) => {
    const problem = await ctx.db.get(args.problemId);
    if (!problem) {
      return null;
    }
    
    const attempts = await ctx.db
      .query("problemAttempts")
      .withIndex("problemId", (q) => q.eq("problemId", args.problemId))
      .collect();
    
    const completedAttempts = attempts.filter(a => a.completed);
    const totalTime = attempts.reduce((sum, a) => sum + a.timeSpent, 0);
    const averageTime = attempts.length > 0 ? totalTime / attempts.length : 0;
    
    return {
      problemId: args.problemId,
      totalAttempts: attempts.length,
      completedAttempts: completedAttempts.length,
      successRate: problem.successRate || 0,
      averageSteps: problem.averageSteps,
      averageTime,
      timesAttempted: problem.timesAttempted,
    };
  },
}); 