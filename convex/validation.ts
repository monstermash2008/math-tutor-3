import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { 
  validateStep as validateMathStep, 
  generateContextualHints,
  needsSimplification,
  getSimplificationSuggestions,
  analyzeStepOperation,
  getExpectedNextSteps,
  type ValidationContext,
  type ProblemModel 
} from "./validation_engine";
import { 
  getLLMFeedback, 
  constructPrompt,
  type LLMFeedbackRequest 
} from "./llm_service";

export type ValidationResult =
  | "CORRECT_FINAL_STEP"
  | "CORRECT_INTERMEDIATE_STEP"
  | "CORRECT_BUT_NOT_SIMPLIFIED"
  | "VALID_BUT_NO_PROGRESS"
  | "EQUIVALENCE_FAILURE"
  | "PARSING_ERROR";

export interface StepValidationResponse {
  result: ValidationResult;
  isCorrect: boolean;
  shouldAdvance: boolean;
  feedback: string;
  hints?: string[];
  errorMessage?: string;
  processingTimeMs: number;
}

// Internal mutation to log step attempts
const logStepAttempt = internalMutation({
  args: {
    problemId: v.id("problems"),
    sessionId: v.optional(v.string()),
    studentInput: v.string(),
    validationResult: v.string(),
    isCorrect: v.boolean(),
    processingTimeMs: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("stepAttempts", {
      ...args,
      hintsUsed: 0, // Will be tracked separately
    });
  },
});

// Main validation action - replaces frontend setTimeout
export const validateStep = action({
  args: {
    problemId: v.id("problems"),
    studentInput: v.string(),
    userHistory: v.array(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<StepValidationResponse> => {
    const startTime = Date.now();
    
    try {
                   // Get problem from database
      const problemDoc = await ctx.runQuery(internal.problems.getProblemByIdInternal, {
        id: args.problemId,
      });

      if (!problemDoc) {
        throw new Error("Problem not found");
      }

      // Convert database document to ProblemModel format
      const problem: ProblemModel = {
        _id: problemDoc._id,
        problemStatement: problemDoc.problemStatement,
        solutionSteps: problemDoc.solutionSteps,
        problemType: problemDoc.problemType,
        difficulty: problemDoc.difficulty,
        isPublic: problemDoc.isPublic,
        timesAttempted: problemDoc.timesAttempted,
      };

      // Create validation context
      const context: ValidationContext = {
        problemModel: problem,
        userHistory: args.userHistory,
        studentInput: args.studentInput,
      };

      // Validate the step using real math engine
      const validationResult = validateMathStep(context);

      // Generate enhanced mathematical analysis
      const contextualHints = generateContextualHints(context);
      const needsSimpl = needsSimplification(args.studentInput);
      const simplificationSuggestions = getSimplificationSuggestions(args.studentInput);

      // Analyze step operation (only if we have previous steps)
      let stepOperation = undefined;
      if (args.userHistory.length > 1) {
        const previousStep = args.userHistory[args.userHistory.length - 1];
        stepOperation = analyzeStepOperation(previousStep, args.studentInput);
      }

      // Prepare LLM feedback request
      const llmRequest: LLMFeedbackRequest = {
        problemStatement: problem.problemStatement,
        userHistory: args.userHistory,
        studentInput: args.studentInput,
        validationResult: validationResult.result,
        problemModel: problem,
        feedbackHistory: {}, // Would be retrieved from database in production
        currentStepIndex: Math.max(0, args.userHistory.length - 1),
        contextualHints,
        stepOperation,
        needsSimplification: needsSimpl,
        simplificationSuggestions,
      };

      // Generate LLM feedback
      const llmResponse = await getLLMFeedback(llmRequest);

      const processingTime = Date.now() - startTime;

             // Log attempt for analytics (simplified for demo)
       // In production, you'd call the internal mutation properly
       console.log("Step attempt logged:", {
         problemId: args.problemId,
         studentInput: args.studentInput,
         validationResult: validationResult.result,
         isCorrect: validationResult.isCorrect,
         processingTimeMs: processingTime,
       });

      return {
        result: validationResult.result,
        isCorrect: validationResult.isCorrect,
        shouldAdvance: validationResult.shouldAdvance,
        feedback: llmResponse.feedback,
        processingTimeMs: processingTime,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error("Validation error:", error);

      return {
        result: "PARSING_ERROR",
        isCorrect: false,
        shouldAdvance: false,
        feedback: "I'm having trouble understanding your input. Please check your mathematical expression and try again.",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        processingTimeMs: processingTime,
      };
    }
  },
});

