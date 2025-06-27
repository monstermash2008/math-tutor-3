import { render, screen } from '@testing-library/react';
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
    
    let feedbackContainer = screen.getByText('Success message').closest('.feedback-card');
    expect(feedbackContainer?.classList.contains('bg-green-50')).toBe(true);
    expect(feedbackContainer?.classList.contains('border-green-200')).toBe(true);

    rerender(<FeedbackDisplay status="error" message="Error message" />);
    feedbackContainer = screen.getByText('Error message').closest('.feedback-card');
    expect(feedbackContainer?.classList.contains('bg-red-50')).toBe(true);
    expect(feedbackContainer?.classList.contains('border-red-200')).toBe(true);

    rerender(<FeedbackDisplay status="warning" message="Warning message" />);
    feedbackContainer = screen.getByText('Warning message').closest('.feedback-card');
    expect(feedbackContainer?.classList.contains('bg-yellow-50')).toBe(true);
    expect(feedbackContainer?.classList.contains('border-yellow-200')).toBe(true);
  });
}); 