import { useReducer } from 'react';
import type { ProblemModel, ValidationContext } from '../lib/validation-engine';
import { isProblemSolved, validateStep } from '../lib/validation-engine';
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
}

// State actions
type AppAction = 
  | { type: 'CHECK_STEP_START' }
  | { type: 'CHECK_STEP_SUCCESS'; payload: { step: string; message: string; feedbackStatus: FeedbackStatus } }
  | { type: 'CHECK_STEP_ERROR'; payload: { step: string; message: string } }
  | { type: 'PROBLEM_SOLVED'; payload: { step: string; message: string } }
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
    
    case 'RESET_FEEDBACK':
      return {
        ...state,
        feedbackStatus: 'idle',
        feedbackMessage: ''
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
    feedbackMessage: ''
  };

  const [state, dispatch] = useReducer(appReducer, initialState);

  // Handle step validation (Phase 2: placeholder logic)
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
        
        // Generate placeholder feedback messages based on validation result
        let message = '';
        let feedbackStatus: FeedbackStatus = 'success';

        switch (result.result) {
          case 'CORRECT_FINAL_STEP':
            message = 'Excellent! You solved the problem correctly. Great work!';
            dispatch({ type: 'PROBLEM_SOLVED', payload: { step: studentInput, message } });
            return;
          
          case 'CORRECT_INTERMEDIATE_STEP':
            message = 'Great job! That\'s the correct next step. Keep going!';
            feedbackStatus = 'success';
            break;
          
          case 'CORRECT_BUT_NOT_SIMPLIFIED':
            message = 'Correct! But please simplify your answer further.';
            feedbackStatus = 'warning';
            break;
          
          case 'VALID_BUT_NO_PROGRESS':
            message = 'That\'s mathematically valid, but doesn\'t simplify the problem. Try a different approach.';
            feedbackStatus = 'warning';
            break;
          
          case 'EQUIVALENCE_FAILURE':
            message = 'That doesn\'t look quite right. Check your arithmetic and try again.';
            dispatch({ type: 'CHECK_STEP_ERROR', payload: { step: studentInput, message } });
            return;
          
          case 'PARSING_ERROR':
            message = result.errorMessage || 'I couldn\'t understand that format. Please check your input.';
            dispatch({ type: 'CHECK_STEP_ERROR', payload: { step: studentInput, message } });
            return;
          
          default:
            message = 'Something unexpected happened. Please try again.';
            dispatch({ type: 'CHECK_STEP_ERROR', payload: { step: studentInput, message } });
            return;
        }

        // Check if problem is now solved
        const updatedContext: ValidationContext = {
          problemModel: problem,
          userHistory: [...state.userHistory, studentInput],
          studentInput: ''
        };

        if (isProblemSolved(updatedContext)) {
          dispatch({ type: 'PROBLEM_SOLVED', payload: { step: studentInput, message: 'Perfect! You\'ve solved the entire problem!' } });
        } else {
          dispatch({ type: 'CHECK_STEP_SUCCESS', payload: { step: studentInput, message, feedbackStatus } });
        }

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
      />
    </div>
  );
}

// Export the StudentAttempt type for use in other components
export type { StudentAttempt }; 