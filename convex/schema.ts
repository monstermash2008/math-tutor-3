import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // Math problems table
  problems: defineTable({
    // Basic Problem Info
    problemStatement: v.string(),
    problemType: v.union(v.literal("SOLVE_EQUATION"), v.literal("SIMPLIFY_EXPRESSION")),
    
    // Solution Steps
    solutionSteps: v.array(v.string()),
    
    // Metadata
    title: v.optional(v.string()), // Optional friendly title
    description: v.optional(v.string()), // Optional description
    difficulty: v.union(v.literal("Easy"), v.literal("Medium"), v.literal("Hard")),
    subject: v.optional(v.string()), // e.g., "Algebra", "Geometry"
    gradeLevel: v.optional(v.string()), // e.g., "Grade 9", "High School"
    
    // Management
    createdBy: v.optional(v.id("users")), // Future: user authentication
    isPublic: v.boolean(), // Whether other users can see it
    tags: v.optional(v.array(v.string())), // For categorization
    
    // Usage Analytics
    timesAttempted: v.number(),
    averageSteps: v.optional(v.number()),
    successRate: v.optional(v.number()),
  }).index("problemType", ["problemType"])
    .index("difficulty", ["difficulty"])
    .index("isPublic", ["isPublic"])
    .index("createdBy", ["createdBy"]),

  // Problem attempts table for analytics
  problemAttempts: defineTable({
    problemId: v.id("problems"),
    userId: v.optional(v.id("users")), // Future: user authentication
    completed: v.boolean(),
    stepsCount: v.number(),
    timeSpent: v.number(), // in seconds
    hintsUsed: v.number(),
    sessionId: v.optional(v.string()), // For tracking anonymous sessions
  }).index("problemId", ["problemId"])
    .index("userId", ["userId"])
    .index("sessionId", ["sessionId"]),

  // Step attempts for detailed analytics
  stepAttempts: defineTable({
    problemId: v.id("problems"),
    sessionId: v.optional(v.string()),
    studentInput: v.string(),
    validationResult: v.string(),
    isCorrect: v.boolean(),
    processingTimeMs: v.number(),
    hintsUsed: v.number(),
  }).index("problemId", ["problemId"])
    .index("sessionId", ["sessionId"]),

  // Hint requests tracking
  hintRequests: defineTable({
    problemId: v.id("problems"),
    sessionId: v.optional(v.string()),
    userHistoryLength: v.number(),
    hintsProvided: v.array(v.string()),
  }).index("problemId", ["problemId"])
    .index("sessionId", ["sessionId"]),

  // Future: Users table for authentication
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("student"), v.literal("teacher"), v.literal("admin")),
  }).index("email", ["email"]),
})
