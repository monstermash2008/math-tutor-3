import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserInput } from '../UserInput';

describe('UserInput Component', () => {
  const defaultProps = {
    onCheckStep: vi.fn(),
    isSolved: false,
    stepNumber: 1
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call the onCheckStep prop with the input value on button click', () => {
    const mockOnCheckStep = vi.fn();
    render(<UserInput {...defaultProps} onCheckStep={mockOnCheckStep} />);

    const input = screen.getByRole('textbox');
    const button = screen.getByRole('button', { name: /check/i });

    // Type in the input
    fireEvent.change(input, { target: { value: '3x = 21' } });
    
    // Click the button
    fireEvent.click(button);

    expect(mockOnCheckStep).toHaveBeenCalledOnce();
    expect(mockOnCheckStep).toHaveBeenCalledWith('3x = 21');
  });

  it('should call onCheckStep on Enter key press', () => {
    const mockOnCheckStep = vi.fn();
    render(<UserInput {...defaultProps} onCheckStep={mockOnCheckStep} />);

    const input = screen.getByRole('textbox');

    // Type in the input
    fireEvent.change(input, { target: { value: 'x = 7' } });
    
    // Press Enter
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockOnCheckStep).toHaveBeenCalledOnce();
    expect(mockOnCheckStep).toHaveBeenCalledWith('x = 7');
  });

  it('should disable the input and button when isSolved prop is true', () => {
    render(<UserInput {...defaultProps} isSolved={true} />);

    const input = screen.getByRole('textbox');
    const button = screen.getByRole('button', { name: /check/i });

    expect(input).toBeDisabled();
    expect(button).toBeDisabled();
  });

  it('should disable the button when input is empty', () => {
    render(<UserInput {...defaultProps} />);

    const button = screen.getByRole('button', { name: /check/i });
    
    expect(button).toBeDisabled();
  });

  it('should enable the button when input has content', () => {
    render(<UserInput {...defaultProps} />);

    const input = screen.getByRole('textbox');
    const button = screen.getByRole('button', { name: /check/i });

    fireEvent.change(input, { target: { value: '3x = 21' } });
    
    expect(button).not.toBeDisabled();
  });

  it('should show correct step number in label', () => {
    render(<UserInput {...defaultProps} stepNumber={3} />);
    
    expect(screen.getByText('Step 3:')).toBeInTheDocument();
  });

  it('should show "Problem Solved!" when solved', () => {
    render(<UserInput {...defaultProps} isSolved={true} />);
    
    expect(screen.getByText('Problem Solved!')).toBeInTheDocument();
  });

  it('should clear input after successful submission', () => {
    const mockOnCheckStep = vi.fn();
    render(<UserInput {...defaultProps} onCheckStep={mockOnCheckStep} />);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    const button = screen.getByRole('button', { name: /check/i });

    // Type and submit
    fireEvent.change(input, { target: { value: '3x = 21' } });
    fireEvent.click(button);

    // Input should be cleared
    expect(input.value).toBe('');
  });

  it('should not call onCheckStep with empty or whitespace-only input', () => {
    const mockOnCheckStep = vi.fn();
    render(<UserInput {...defaultProps} onCheckStep={mockOnCheckStep} />);

    const input = screen.getByRole('textbox');
    const button = screen.getByRole('button', { name: /check/i });

    // Try with empty input
    fireEvent.click(button);
    expect(mockOnCheckStep).not.toHaveBeenCalled();

    // Try with whitespace-only input
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(button);
    expect(mockOnCheckStep).not.toHaveBeenCalled();
  });
}); 