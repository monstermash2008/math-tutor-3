import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FeedbackDisplay, type FeedbackStatus } from '../FeedbackDisplay';

describe('FeedbackDisplay Component', () => {
  it('should display a loading state', () => {
    render(<FeedbackDisplay status="loading" message="Checking your answer..." />);
    
    expect(screen.getByText('Checking...')).toBeDefined();
    expect(screen.getByText('Checking your answer...')).toBeDefined();
    
    // Check for loading spinner
    const loadingIcon = screen.getByLabelText('Loading');
    expect(loadingIcon).toBeDefined();
    expect(loadingIcon.classList.contains('animate-spin')).toBe(true);
  });

  it('should display a success message', () => {
    render(<FeedbackDisplay status="success" message="Correct!" />);
    
    expect(screen.getByText('Tutor Feedback')).toBeDefined();
    expect(screen.getByText('Correct!')).toBeDefined();
    
    // Check for success icon
    const successIcon = screen.getByLabelText('Success');
    expect(successIcon).toBeDefined();
  });

  it('should display an error message', () => {
    render(<FeedbackDisplay status="error" message="That's not correct." />);
    
    expect(screen.getByText('Tutor Feedback')).toBeDefined();
    expect(screen.getByText("That's not correct.")).toBeDefined();
    
    // Check for error icon
    const errorIcon = screen.getByLabelText('Error');
    expect(errorIcon).toBeDefined();
  });

  it('should display a warning message', () => {
    render(<FeedbackDisplay status="warning" message="Please simplify your answer." />);
    
    expect(screen.getByText('Tutor Feedback')).toBeDefined();
    expect(screen.getByText('Please simplify your answer.')).toBeDefined();
    
    // Check for warning icon
    const warningIcon = screen.getByLabelText('Warning');
    expect(warningIcon).toBeDefined();
  });

  it('should render nothing when status is idle', () => {
    const { container } = render(<FeedbackDisplay status="idle" message="Should not show" />);
    expect(container.firstChild).toBeNull();
  });

  it('should render nothing when message is empty', () => {
    const { container } = render(<FeedbackDisplay status="success" message="" />);
    expect(container.firstChild).toBeNull();
  });

  it('should render nothing when message is undefined', () => {
    const { container } = render(<FeedbackDisplay status="success" />);
    expect(container.firstChild).toBeNull();
  });

  it('should apply correct CSS classes for different states', () => {
    const { rerender } = render(<FeedbackDisplay status="success" message="Success message" />);

    const feedbackCard = screen.getByText('Success message').closest('.feedback-card');
    expect(feedbackCard).toHaveClass('bg-green-50', 'border-green-200');

    rerender(<FeedbackDisplay status="error" message="Error message" />);
    const errorCard = screen.getByText('Error message').closest('.feedback-card');
    expect(errorCard).toHaveClass('bg-red-50', 'border-red-200');
  });

  it('should display prompt debug section when prompt is provided', () => {
    const testPrompt = 'You are a helpful math tutor working with a student...';
    render(<FeedbackDisplay status="success" message="Great job!" prompt={testPrompt} />);

    // Debug button should be visible
    expect(screen.getByText('🔍 Debug: View LLM Prompt')).toBeInTheDocument();

    // Prompt should not be visible initially
    expect(screen.queryByText('PROMPT SENT TO LLM:')).not.toBeInTheDocument();

    // Click to expand prompt
    fireEvent.click(screen.getByText('🔍 Debug: View LLM Prompt'));

    // Prompt should now be visible
    expect(screen.getByText('PROMPT SENT TO LLM:')).toBeInTheDocument();
    expect(screen.getByText(testPrompt)).toBeInTheDocument();
  });

  it('should not display prompt debug section when no prompt is provided', () => {
    render(<FeedbackDisplay status="success" message="Great job!" />);

    // Debug button should not be visible
    expect(screen.queryByText('🔍 Debug: View LLM Prompt')).not.toBeInTheDocument();
  });
}); 