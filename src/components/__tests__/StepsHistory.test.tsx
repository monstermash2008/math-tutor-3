import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { StudentAttempt } from '../MathTutorApp';
import { StepsHistory } from '../StepsHistory';

describe('StepsHistory Component', () => {
  const mockAttempts: StudentAttempt[] = [
    {
      input: '4x - 12 - x + 5 = 14',
      isCorrect: true,
      feedback: 'Great job!',
      timestamp: new Date('2024-01-01T10:00:00'),
      stepNumber: 1
    },
    {
      input: '4x - 12 - x - 5 = 14',
      isCorrect: false,
      feedback: 'Check your arithmetic',
      timestamp: new Date('2024-01-01T09:55:00'),
      stepNumber: 1
    },
    {
      input: '3x - 7 = 14',
      isCorrect: true,
      feedback: 'Correct!',
      timestamp: new Date('2024-01-01T10:05:00'),
      stepNumber: 2
    }
  ];

  // Empty feedback history for tests
  const emptyFeedbackHistory = {};

  it('should render a list of steps when history is provided', () => {
    const history = [
      'Solve for x: 4(x - 3) - (x - 5) = 14',
      '4x - 12 - x + 5 = 14',
      '3x - 7 = 14'
    ];

    render(<StepsHistory history={history} allAttempts={[]} feedbackHistory={emptyFeedbackHistory} />);

    // Should render 2 steps (excluding the problem statement)
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('4x - 12 - x + 5 = 14')).toBeInTheDocument();
    expect(screen.getByText('3x - 7 = 14')).toBeInTheDocument();
  });

  it('should render nothing for an empty history array', () => {
    const { container } = render(<StepsHistory history={[]} allAttempts={[]} feedbackHistory={emptyFeedbackHistory} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render nothing when history only contains problem statement', () => {
    const history = ['Solve for x: 4(x - 3) - (x - 5) = 14'];
    const { container } = render(<StepsHistory history={history} allAttempts={[]} feedbackHistory={emptyFeedbackHistory} />);
    expect(container.firstChild).toBeNull();
  });

  it('should display steps with correct styling and icons', () => {
    const history = [
      'Solve for x: 4(x - 3) - (x - 5) = 14',
      '4x - 12 - x + 5 = 14'
    ];

    render(<StepsHistory history={history} allAttempts={[]} feedbackHistory={emptyFeedbackHistory} />);

    // Check for step styling - get the parent div that has the bg-green-50 class
    const stepElement = screen.getByText('4x - 12 - x + 5 = 14');
    const stepContainer = stepElement.closest('.bg-green-50');
    expect(stepContainer).toBeInTheDocument();
    expect(stepContainer).toHaveClass('bg-green-50');
    expect(stepContainer).toHaveClass('border-green-200');
    
    // Check for SVG check mark
    const checkIcon = screen.getByLabelText('Step completed successfully');
    expect(checkIcon).toBeInTheDocument();
  });

  it('should highlight the final answer when problem is solved', () => {
    const history = [
      'Solve for x: 4(x - 3) - (x - 5) = 14',
      '4x - 12 - x + 5 = 14',
      '3x - 7 = 14',
      'x = 7'
    ];

    render(<StepsHistory history={history} allAttempts={[]} feedbackHistory={emptyFeedbackHistory} isSolved={true} />);

    // Check for final answer special styling
    expect(screen.getByText('Final Answer')).toBeInTheDocument();
    expect(screen.getByText('🎉 Excellent work!')).toBeInTheDocument();
    
    // Check that the final step has blue styling
    const finalStepElement = screen.getByText('x = 7');
    const finalStepContainer = finalStepElement.closest('.bg-blue-50');
    expect(finalStepContainer).toBeInTheDocument();
  });

  it('should not highlight final step when problem is not solved', () => {
    const history = [
      'Solve for x: 4(x - 3) - (x - 5) = 14',
      '4x - 12 - x + 5 = 14',
      '3x - 7 = 14'
    ];

    render(<StepsHistory history={history} allAttempts={[]} feedbackHistory={emptyFeedbackHistory} isSolved={false} />);

    // Should not show "Final Answer" label
    expect(screen.queryByText('Final Answer')).not.toBeInTheDocument();
    expect(screen.queryByText('🎉 Excellent work!')).not.toBeInTheDocument();
    
    // All steps should have green styling
    const allSteps = screen.getAllByText(/Step \d+/);
    expect(allSteps).toHaveLength(2);
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
  });

  it('renders nothing when no history or attempts', () => {
    const { container } = render(<StepsHistory history={['Problem statement']} allAttempts={[]} feedbackHistory={emptyFeedbackHistory} />);
    expect(container.firstChild).toBeNull();
  });

  it('displays correct steps with green styling', () => {
    render(<StepsHistory history={['Problem', '4x - 12 - x + 5 = 14', '3x - 7 = 14']} allAttempts={mockAttempts} feedbackHistory={emptyFeedbackHistory} />);
    
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('4x - 12 - x + 5 = 14')).toBeInTheDocument();
    expect(screen.getByText('3x - 7 = 14')).toBeInTheDocument();
  });

  it('displays incorrect attempts with red styling', () => {
    render(<StepsHistory history={['Problem', '4x - 12 - x + 5 = 14']} allAttempts={mockAttempts} feedbackHistory={emptyFeedbackHistory} />);
    
    const incorrectAttempts = screen.getAllByText('Incorrect Attempt');
    expect(incorrectAttempts.length).toBeGreaterThan(0);
    expect(screen.getByText('4x - 12 - x - 5 = 14')).toBeInTheDocument();
    expect(screen.getByText('Check your arithmetic')).toBeInTheDocument();
  });

  it('shows final answer with special styling when solved', () => {
    render(<StepsHistory history={['Problem', 'x = 7']} allAttempts={mockAttempts} feedbackHistory={emptyFeedbackHistory} isSolved={true} />);
    
    expect(screen.getByText('Final Answer')).toBeInTheDocument();
    expect(screen.getByText('🎉 Excellent work!')).toBeInTheDocument();
  });

  it('groups attempts by step number correctly', () => {
    const multiStepAttempts: StudentAttempt[] = [
      {
        input: 'wrong1',
        isCorrect: false,
        feedback: 'Try again',
        timestamp: new Date(),
        stepNumber: 1
      },
      {
        input: 'wrong2',
        isCorrect: false,
        feedback: 'Still wrong',
        timestamp: new Date(),
        stepNumber: 1
      },
      {
        input: 'correct1',
        isCorrect: true,
        feedback: 'Good job',
        timestamp: new Date(),
        stepNumber: 1
      }
    ];

    render(<StepsHistory history={['Problem', 'correct1']} allAttempts={multiStepAttempts} feedbackHistory={emptyFeedbackHistory} />);
    
    expect(screen.getAllByText('Incorrect Attempt')).toHaveLength(2);
    expect(screen.getByText('wrong1')).toBeInTheDocument();
    expect(screen.getByText('wrong2')).toBeInTheDocument();
    expect(screen.getByText('correct1')).toBeInTheDocument();
  });

  it('shows current step incorrect attempts when not solved', () => {
    const currentStepAttempts: StudentAttempt[] = [
      {
        input: 'wrong attempt',
        isCorrect: false,
        feedback: 'Not quite right',
        timestamp: new Date(),
        stepNumber: 2 // Next step after completed step 1
      }
    ];

    render(<StepsHistory history={['Problem', '4x - 12 - x + 5 = 14']} allAttempts={currentStepAttempts} feedbackHistory={emptyFeedbackHistory} isSolved={false} />);
    
    expect(screen.getByText('Previous attempts for current step:')).toBeInTheDocument();
    expect(screen.getByText('wrong attempt')).toBeInTheDocument();
    expect(screen.getByText('Not quite right')).toBeInTheDocument();
  });
}); 