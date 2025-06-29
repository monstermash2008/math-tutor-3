import { useMutation } from '@tanstack/react-query';
import React, { useReducer } from 'react';
import { type FeedbackEntry, type FeedbackHistory, type LLMFeedbackRequest, constructPrompt, llmFeedbackMutationFn } from '../lib/llm-feedback-service';
import type { ProblemModel, StepValidationResult, ValidationContext, ValidationResult } from '../lib/validation-engine';
import { analyzeStepOperation, generateContextualHints, getExpectedNextSteps, getSimplificationSuggestions, needsSimplification, validateStep } from '../lib/validation-engine';
import { FeedbackDisplay } from './FeedbackDisplay';
import { ProblemView } from './ProblemView';
import { StepsHistory } from './StepsHistory';
import { UserInput } from './UserInput';

export type FeedbackStatus = 'idle' | 'loading' | 'success' | 'error';

// Individual attempt interface - keeping for backward compatibility
interface StudentAttempt {
  input: string;
  isCorrect: boolean;
  feedback: string;
  timestamp: Date;
  stepNumber: number;
}

// Application state interface
interface AppState {
  userHistory: string[]; // Only correct steps
  allAttempts: StudentAttempt[]; // All attempts (correct and incorrect) - for backward compatibility
  feedbackHistory: FeedbackHistory; // New structured feedback history
  currentStatus: 'idle' | 'checking' | 'awaiting_next_step' | 'solved';
  feedbackStatus: FeedbackStatus;
  feedbackMessage: string;
  currentPrompt?: string; // For testing/debugging: shows the prompt sent to LLM
  consecutiveFailures: number; // Track consecutive incorrect attempts for current step
  isShowingHintFeedback: boolean; // Track if we're showing hint feedback (not regular step feedback)
  hintRequestStatus: 'idle' | 'loading' | 'success' | 'error'; // Separate loading state for hint requests
}

// State actions
type AppAction = 
  | { type: 'CHECK_STEP_START' }
  | { type: 'CHECK_STEP_SUCCESS'; payload: { step: string; message: string; feedbackStatus: FeedbackStatus } }
  | { type: 'CHECK_STEP_ERROR'; payload: { step: string; message: string } }
  | { type: 'PROBLEM_SOLVED'; payload: { step: string; message: string } }
  | { type: 'LLM_FEEDBACK_SUCCESS'; payload: { message: string; feedbackStatus: FeedbackStatus; stepIndex: number; validationResult: string; studentInput: string; isCorrect: boolean } }
  | { type: 'LLM_FEEDBACK_ERROR'; payload: { message: string } }
  | { type: 'LLM_PROMPT_SENT'; payload: { prompt: string } }
  | { type: 'RESET_FEEDBACK' }
  | { type: 'INCREMENT_FAILURES' }
  | { type: 'RESET_FAILURES' }
  | { type: 'HINT_REQUEST_START' }
  | { type: 'HINT_REQUEST_SUCCESS'; payload: { message: string } }
  | { type: 'HINT_REQUEST_ERROR'; payload: { message: string } };

// Utility function to generate unique feedback entry IDs
function generateFeedbackId(): string {
  return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Utility function to add feedback entry to history
function addFeedbackToHistory(
  history: FeedbackHistory,
  stepIndex: number,
  feedback: string,
  validationResult: string
): FeedbackHistory {
  const currentStepFeedback = history[stepIndex] || [];
  const newEntry: FeedbackEntry = {
    id: generateFeedbackId(),
    stepIndex,
    feedback,
    timestamp: Date.now(),
    order: currentStepFeedback.length + 1,
    validationResult: validationResult as ValidationResult
  };

  return {
    ...history,
    [stepIndex]: [...currentStepFeedback, newEntry]
  };
}

// State reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'CHECK_STEP_START':
      return {
        ...state,
        currentStatus: 'checking',
        feedbackStatus: 'loading',
        feedbackMessage: 'Checking your answer...'
      };
    
    case 'CHECK_STEP_SUCCESS': {
      const successAttempt: StudentAttempt = {
        input: action.payload.step,
        isCorrect: true,
        feedback: action.payload.message,
        timestamp: new Date(),
        stepNumber: state.userHistory.length
      };
      
      return {
        ...state,
        userHistory: [...state.userHistory, action.payload.step],
        allAttempts: [...state.allAttempts, successAttempt],
        currentStatus: 'awaiting_next_step',
        feedbackStatus: action.payload.feedbackStatus,
        feedbackMessage: action.payload.message,
        consecutiveFailures: 0 // Reset on success
      };
    }
    
    case 'CHECK_STEP_ERROR': {
      const errorAttempt: StudentAttempt = {
        input: action.payload.step,
        isCorrect: false,
        feedback: action.payload.message, // This will be "Getting feedback..."
        timestamp: new Date(),
        stepNumber: state.userHistory.length
      };
      
      return {
        ...state,
        allAttempts: [...state.allAttempts, errorAttempt],
        currentStatus: 'awaiting_next_step',
        feedbackStatus: 'loading',
        feedbackMessage: action.payload.message
      };
    }
    
    case 'PROBLEM_SOLVED': {
      const solvedAttempt: StudentAttempt = {
        input: action.payload.step,
        isCorrect: true,
        feedback: action.payload.message,
        timestamp: new Date(),
        stepNumber: state.userHistory.length
      };
      
      return {
        ...state,
        userHistory: [...state.userHistory, action.payload.step],
        allAttempts: [...state.allAttempts, solvedAttempt],
        currentStatus: 'solved',
        feedbackStatus: 'success',
        feedbackMessage: action.payload.message,
        consecutiveFailures: 0 // Reset on completion
      };
    }

    case 'LLM_FEEDBACK_SUCCESS': {
      const updatedFeedbackHistory = addFeedbackToHistory(
        state.feedbackHistory,
        action.payload.stepIndex,
        action.payload.message,
        action.payload.validationResult
      );

      // Update the most recent StudentAttempt that's waiting for feedback
      // Since LLM requests are made immediately after creating attempts,
      // we can safely update the last attempt with "Getting feedback..."
      const updatedAttempts = state.allAttempts.map((attempt, index) => {
        // Find the most recent attempt with "Getting feedback..."
        const isLastWaitingAttempt = attempt.feedback === 'Getting feedback...' &&
          !state.allAttempts.slice(index + 1).some(laterAttempt => 
            laterAttempt.feedback === 'Getting feedback...'
          );
        
        if (isLastWaitingAttempt) {
          return {
            ...attempt,
            feedback: action.payload.message
          };
        }
        return attempt;
      });

      return {
        ...state,
        feedbackStatus: action.payload.feedbackStatus,
        feedbackMessage: action.payload.message,
        feedbackHistory: updatedFeedbackHistory,
        allAttempts: updatedAttempts,
        isShowingHintFeedback: false // Regular step feedback doesn't show in FeedbackDisplay
      };
    }

    case 'LLM_FEEDBACK_ERROR':
      return {
        ...state,
        feedbackStatus: 'error',
        feedbackMessage: action.payload.message
      };
    
    case 'LLM_PROMPT_SENT':
      return {
        ...state,
        currentPrompt: action.payload.prompt
      };
    
    case 'RESET_FEEDBACK':
      return {
        ...state,
        feedbackStatus: 'idle',
        feedbackMessage: '',
        currentPrompt: undefined,
        isShowingHintFeedback: false, // Clear hint feedback display
        hintRequestStatus: 'idle' // Reset hint request status
      };
    
    case 'INCREMENT_FAILURES':
      return {
        ...state,
        consecutiveFailures: state.consecutiveFailures + 1
      };
    
    case 'RESET_FAILURES':
      return {
        ...state,
        consecutiveFailures: 0
      };
    
    case 'HINT_REQUEST_START':
      return {
        ...state,
        hintRequestStatus: 'loading',
        feedbackStatus: 'loading',
        feedbackMessage: 'Getting hint...',
        isShowingHintFeedback: true // Show hint feedback in FeedbackDisplay
      };
    
    case 'HINT_REQUEST_SUCCESS':
      return {
        ...state,
        hintRequestStatus: 'success',
        feedbackStatus: 'success',
        feedbackMessage: action.payload.message,
        isShowingHintFeedback: true // Keep showing hint feedback in FeedbackDisplay
      };
    
    case 'HINT_REQUEST_ERROR':
      return {
        ...state,
        hintRequestStatus: 'error',
        feedbackStatus: 'error',
        feedbackMessage: action.payload.message,
        isShowingHintFeedback: true // Show error in FeedbackDisplay
      };
    
    default:
      return state;
  }
}

interface MathTutorAppProps {
  problem: ProblemModel;
}

export function MathTutorApp({ problem }: MathTutorAppProps) {
  // Initialize state with problem statement in history
  const initialState: AppState = {
    userHistory: [problem.problemStatement],
    allAttempts: [],
    feedbackHistory: {},
    currentStatus: 'awaiting_next_step',
    feedbackStatus: 'idle',
    feedbackMessage: '',
    currentPrompt: undefined,
    consecutiveFailures: 0,
    isShowingHintFeedback: false,
    hintRequestStatus: 'idle' // Initialize hint request status
  };

  const [state, dispatch] = useReducer(appReducer, initialState);

  // LLM feedback mutation
  const llmFeedbackMutation = useMutation({
    mutationFn: llmFeedbackMutationFn,
    onSuccess: (response, variables) => {
      // Handle hint requests differently
      if (variables.isHintRequest) {
        dispatch({
          type: 'HINT_REQUEST_SUCCESS',
          payload: { message: response.feedback }
        });
        return;
      }

      const feedbackStatus: FeedbackStatus = response.encouragement ? 'success' : 'success';
      
      // Determine if this is a correct step based on validation result
      const isCorrect = variables.validationResult === 'CORRECT_FINAL_STEP' || 
                       variables.validationResult === 'CORRECT_INTERMEDIATE_STEP' ||
                       variables.validationResult === 'CORRECT_BUT_NOT_SIMPLIFIED' ||
                       variables.validationResult === 'VALID_BUT_NO_PROGRESS';
      
      dispatch({
        type: 'LLM_FEEDBACK_SUCCESS',
        payload: {
          message: response.feedback,
          feedbackStatus,
          stepIndex: variables.currentStepIndex,
          validationResult: variables.validationResult,
          studentInput: variables.studentInput,
          isCorrect
        }
      });
    },
    onError: (error, variables) => {
      if (variables.isHintRequest) {
        dispatch({
          type: 'HINT_REQUEST_ERROR',
          payload: {
            message: 'Unable to get hint right now. Please try again.'
          }
        });
      } else {
        dispatch({
          type: 'LLM_FEEDBACK_ERROR',
          payload: {
            message: 'Unable to get feedback right now. Please try again.'
          }
        });
      }
      console.error('LLM feedback error:', error);
    }
  });

  // Handle step validation with LLM integration
  const handleCheckStep = (studentInput: string) => {
    dispatch({ type: 'CHECK_STEP_START' });
    dispatch({ type: 'RESET_FEEDBACK' }); // Clear any hint feedback when checking a new step

    // Simulate validation delay
    setTimeout(() => {
      try {
        // Create validation context
        const context: ValidationContext = {
          problemModel: problem,
          userHistory: state.userHistory,
          studentInput
        };

        // Validate the step
        		const result = validateStep(context);
        
        // Current step index is based on how many steps have been completed
        // For correct steps, this will be the new step number
        // For incorrect steps, this remains the current step number
        const currentStepIndex = result.result === 'CORRECT_INTERMEDIATE_STEP' || result.result === 'CORRECT_FINAL_STEP' 
          ? state.userHistory.length  // New step index for correct steps
          : state.userHistory.length - 1; // Current step index for errors (subtract 1 because userHistory includes problem statement)

        // Gather enhanced mathematical analysis (LLM Prompt 2.0)
        const contextualHints = generateContextualHints(context);
        const needsSimpl = needsSimplification(studentInput);
        const simplificationSuggestions = getSimplificationSuggestions(studentInput);
        
        // Analyze step operation (only if we have previous steps)
        let stepOperation = undefined;
        if (state.userHistory.length > 1) {
          const previousStep = state.userHistory[state.userHistory.length - 1];
          stepOperation = analyzeStepOperation(previousStep, studentInput);
        }

        // Prepare enhanced LLM feedback request with mathematical context
        const llmRequest: LLMFeedbackRequest = {
          problemStatement: problem.problemStatement,
          userHistory: state.userHistory,
          studentInput,
          validationResult: result.result,
          problemModel: problem,
          feedbackHistory: state.feedbackHistory,
          currentStepIndex: Math.max(0, currentStepIndex), // Ensure non-negative
          
          // Enhanced mathematical analysis fields (LLM Prompt 2.0)
          contextualHints,
          stepOperation,
          needsSimplification: needsSimpl,
          simplificationSuggestions,
        };

        // Generate and store the prompt for debugging
        const prompt = constructPrompt(llmRequest);
        dispatch({ type: 'LLM_PROMPT_SENT', payload: { prompt } });

        // Handle different validation results and trigger LLM feedback
        switch (result.result) {
          case 'CORRECT_FINAL_STEP':
            dispatch({ type: 'PROBLEM_SOLVED', payload: { step: studentInput, message: 'Problem completed!' } });
            llmFeedbackMutation.mutate(llmRequest);
            return;
          
          case 'CORRECT_INTERMEDIATE_STEP':
          case 'CORRECT_BUT_NOT_SIMPLIFIED':
          case 'VALID_BUT_NO_PROGRESS':
            // For correct steps, update history first, then get LLM feedback
            dispatch({ 
              type: 'CHECK_STEP_SUCCESS', 
              payload: { 
                step: studentInput, 
                message: 'Getting feedback...', 
                feedbackStatus: 'loading'
              } 
            });
            llmFeedbackMutation.mutate(llmRequest);
            break;
          
          case 'EQUIVALENCE_FAILURE':
          case 'PARSING_ERROR':
            // For errors, don't update history but still get LLM feedback
            dispatch({ type: 'INCREMENT_FAILURES' });
            dispatch({ 
              type: 'CHECK_STEP_ERROR', 
              payload: { 
                step: studentInput, 
                message: 'Getting feedback...' 
              } 
            });
            llmFeedbackMutation.mutate(llmRequest);
            return;
          
          default:
            dispatch({ 
              type: 'CHECK_STEP_ERROR', 
              payload: { 
                step: studentInput, 
                message: 'Something unexpected happened. Please try again.' 
              } 
            });
            return;
        }

        // For correct steps, the problem solved check is handled above
        // LLM feedback will provide appropriate messaging

      } catch (error) {
        dispatch({ type: 'CHECK_STEP_ERROR', payload: { 
          step: studentInput,
          message: 'An error occurred while checking your answer. Please try again.' 
        }});
      }
    }, 1000); // 1 second delay to simulate processing
  };

  // Handle hint request when student is stuck
  const handleHintRequest = () => {
    dispatch({ type: 'HINT_REQUEST_START' });

    try {
      // Create validation context
      const context: ValidationContext = {
        problemModel: problem,
        userHistory: state.userHistory,
        studentInput: '' // Empty for hint requests
      };

      // Get expected next steps
      const expectedNextSteps = getExpectedNextSteps(context);

      // Prepare LLM hint request
      const hintRequest: LLMFeedbackRequest = {
        problemStatement: problem.problemStatement,
        userHistory: state.userHistory,
        studentInput: 'I need help with the next step',
        validationResult: 'EQUIVALENCE_FAILURE', // Not used for hints
        problemModel: problem,
        feedbackHistory: state.feedbackHistory,
        currentStepIndex: Math.max(0, state.userHistory.length - 1),
        isHintRequest: true,
        expectedNextSteps
      };

      // Send hint request to LLM
      llmFeedbackMutation.mutate(hintRequest);
    } catch (error) {
      dispatch({
        type: 'HINT_REQUEST_ERROR',
        payload: { message: 'Unable to get hint right now. Please try again.' }
      });
    }
  };

  const isSolved = state.currentStatus === 'solved';
  const stepNumber = state.userHistory.length; // Current step number
  const showHintButton = state.consecutiveFailures >= 3 && !isSolved;

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-8 bg-white rounded-2xl shadow-lg border border-gray-200">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Interactive Math Tutor</h1>
        <p className="text-gray-500 mt-2">Solve the problem one step at a time.</p>
      </div>

      {/* Problem Display */}
      <ProblemView problem={problem} />

      {/* Steps History */}
      <StepsHistory 
        history={state.userHistory} 
        allAttempts={state.allAttempts}
        feedbackHistory={state.feedbackHistory}
        isSolved={isSolved} 
      />

      {/* User Input */}
      <UserInput 
        onCheckStep={handleCheckStep}
        isSolved={isSolved}
        stepNumber={stepNumber}
      />

      {/* Feedback Display - only for hint requests */}
      {state.isShowingHintFeedback && (
        <FeedbackDisplay 
          status={state.feedbackStatus}
          message={state.feedbackMessage}
          prompt={state.currentPrompt}
        />
      )}

      {/* Hint Button - shown after 3 consecutive failures */}
      {showHintButton && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={handleHintRequest}
            disabled={state.hintRequestStatus === 'loading'}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {state.hintRequestStatus === 'loading' ? 'Getting hint...' : "I'm stuck! 💡"}
          </button>
          <p className="text-sm text-gray-500 mt-2">
            Get a hint with the next step explained
          </p>
        </div>
      )}
    </div>
  );
}

// Export the StudentAttempt type for use in other components
export type { StudentAttempt }; 