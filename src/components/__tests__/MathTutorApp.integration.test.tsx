import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ProblemModel } from '../../lib/validation-engine';
import { MathTutorApp } from '../MathTutorApp';

describe('MathTutorApp - Phase 3 Integration Tests', () => {
  const sampleProblem: ProblemModel = {
    problemId: 'p-102',
    problemStatement: 'Solve for x: 5x + 3 = 2x + 12',
    problemType: 'SOLVE_EQUATION',
    teacherModel: {
      type: 'sequential_steps',
      steps: [
        '3x + 3 = 12',
        '3x = 9',
        'x = 3'
      ]
    }
  };



    describe('UI Component Integration', () => {
    it('should render initial state correctly', () => {
      render(<MathTutorApp problem={sampleProblem} />);

      // Verify initial state
      expect(screen.getByText('Solve for x: 5x + 3 = 2x + 12')).toBeInTheDocument();
      expect(screen.getByText('Step 1:')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /check/i })).toBeInTheDocument();
    });

    it('should show loading state when check button is clicked', () => {
      render(<MathTutorApp problem={sampleProblem} />);

      const input = screen.getByRole('textbox');
      const checkButton = screen.getByRole('button', { name: /check/i });

      // Enter some input and click check
      fireEvent.change(input, { target: { value: '3x + 3 = 12' } });
      fireEvent.click(checkButton);

      // Assert loading state appears immediately
      expect(screen.getByText('Checking your answer...')).toBeInTheDocument();
      expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    });
  });

  describe('Async Validation Flow', () => {
    it('should process correct step after delay', async () => {
      render(<MathTutorApp problem={sampleProblem} />);

      const input = screen.getByRole('textbox');
      const checkButton = screen.getByRole('button', { name: /check/i });

      // Enter correct first step
      fireEvent.change(input, { target: { value: '3x + 3 = 12' } });
      fireEvent.click(checkButton);

      // Wait for async processing to complete
      await waitFor(
        () => {
          expect(screen.getByText('Great job! That\'s the correct next step. Keep going!')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      // Verify step was added to history
      expect(screen.getByText('3x + 3 = 12')).toBeInTheDocument();
      expect(screen.getByText('Step 2:')).toBeInTheDocument();
    }, 10000);
  });

  describe('Error Handling', () => {
    it('should display error for incorrect answer', async () => {
      render(<MathTutorApp problem={sampleProblem} />);

      const input = screen.getByRole('textbox');
      const checkButton = screen.getByRole('button', { name: /check/i });

      // Enter incorrect step
      fireEvent.change(input, { target: { value: '7x = 9' } });
      fireEvent.click(checkButton);

      // Wait for error message to appear
      await waitFor(
        () => {
          expect(screen.getByRole('heading', { name: 'Tutor Feedback' })).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      // Assert error styling
      expect(screen.getByLabelText('Error')).toBeInTheDocument();
    }, 10000);
  });

  describe('State Synchronization', () => {
    it('should handle malformed input gracefully', async () => {
      render(<MathTutorApp problem={sampleProblem} />);

      const input = screen.getByRole('textbox');
      const checkButton = screen.getByRole('button', { name: /check/i });

      // Enter malformed expression
      fireEvent.change(input, { target: { value: '3x ++ 5 = 12' } });
      fireEvent.click(checkButton);

      // Wait for parsing error message (check in feedback section)
      await waitFor(
        () => {
          const feedbackElement = screen.getByRole('heading', { name: 'Tutor Feedback' }).parentElement;
          expect(feedbackElement).toHaveTextContent('Invalid mathematical expression: consecutive operators detected');
        },
        { timeout: 2000 }
      );

      expect(screen.getByLabelText('Error')).toBeInTheDocument();
    }, 10000);
  });
}); 