import { useMutation } from '@tanstack/react-query';
import { useReducer } from 'react';
import type { LLMFeedbackRequest } from '../lib/llm-feedback-service';
import { constructPrompt, llmFeedbackMutationFn } from '../lib/llm-feedback-service';
import type { ProblemModel, ValidationContext } from '../lib/validation-engine';
import { validateStep } from '../lib/validation-engine';
import { FeedbackDisplay, type FeedbackStatus } from './FeedbackDisplay';
import { ProblemView } from './ProblemView';
import { StepsHistory } from './StepsHistory';
import { UserInput } from './UserInput';

// Individual attempt interface
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
  allAttempts: StudentAttempt[]; // All attempts (correct and incorrect)
  currentStatus: 'idle' | 'checking' | 'awaiting_next_step' | 'solved';
  feedbackStatus: FeedbackStatus;
  feedbackMessage: string;
  currentPrompt?: string; // For testing/debugging: shows the prompt sent to LLM
}

// State actions
type AppAction = 
  | { type: 'CHECK_STEP_START' }
  | { type: 'CHECK_STEP_SUCCESS'; payload: { step: string; message: string; feedbackStatus: FeedbackStatus } }
  | { type: 'CHECK_STEP_ERROR'; payload: { step: string; message: string } }
  | { type: 'PROBLEM_SOLVED'; payload: { step: string; message: string } }
  | { type: 'LLM_FEEDBACK_SUCCESS'; payload: { message: string; feedbackStatus: FeedbackStatus } }
  | { type: 'LLM_FEEDBACK_ERROR'; payload: { message: string } }
  | { type: 'LLM_PROMPT_SENT'; payload: { prompt: string } }
  | { type: 'RESET_FEEDBACK' };

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
        feedbackMessage: action.payload.message
      };
    }
    
    case 'CHECK_STEP_ERROR': {
      const errorAttempt: StudentAttempt = {
        input: action.payload.step,
        isCorrect: false,
        feedback: action.payload.message,
        timestamp: new Date(),
        stepNumber: state.userHistory.length
      };
      
      return {
        ...state,
        allAttempts: [...state.allAttempts, errorAttempt],
        currentStatus: 'awaiting_next_step',
        feedbackStatus: 'error',
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
        feedbackMessage: action.payload.message
      };
    }

    case 'LLM_FEEDBACK_SUCCESS':
      return {
        ...state,
        feedbackStatus: action.payload.feedbackStatus,
        feedbackMessage: action.payload.message
      };

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
        currentPrompt: undefined
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
    currentStatus: 'awaiting_next_step',
    feedbackStatus: 'idle',
    feedbackMessage: '',
    currentPrompt: undefined
  };

  const [state, dispatch] = useReducer(appReducer, initialState);

  // LLM feedback mutation
  const llmFeedbackMutation = useMutation({
    mutationFn: llmFeedbackMutationFn,
    onSuccess: (response) => {
      const feedbackStatus: FeedbackStatus = response.encouragement ? 'success' : 'success';
      dispatch({
        type: 'LLM_FEEDBACK_SUCCESS',
        payload: {
          message: response.feedback,
          feedbackStatus
        }
      });
    },
    onError: (error) => {
      dispatch({
        type: 'LLM_FEEDBACK_ERROR',
        payload: {
          message: 'Unable to get feedback right now. Please try again.'
        }
      });
      console.error('LLM feedback error:', error);
    }
  });

  // Handle step validation with LLM integration
  const handleCheckStep = (studentInput: string) => {
    dispatch({ type: 'CHECK_STEP_START' });

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
        
        // Prepare LLM feedback request
        const llmRequest: LLMFeedbackRequest = {
          problemStatement: problem.problemStatement,
          userHistory: state.userHistory,
          studentInput,
          validationResult: result.result,
          problemModel: problem
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

  const isSolved = state.currentStatus === 'solved';
  const stepNumber = state.userHistory.length; // Current step number

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
        isSolved={isSolved} 
      />

      {/* User Input */}
      <UserInput 
        onCheckStep={handleCheckStep}
        isSolved={isSolved}
        stepNumber={stepNumber}
      />

      {/* Feedback Display */}
      <FeedbackDisplay 
        status={state.feedbackStatus}
        message={state.feedbackMessage}
        prompt={state.currentPrompt}
      />
    </div>
  );
}

// Export the StudentAttempt type for use in other components
export type { StudentAttempt }; 