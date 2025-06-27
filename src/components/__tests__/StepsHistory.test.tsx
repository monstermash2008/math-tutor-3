import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StepsHistory } from '../StepsHistory';

describe('StepsHistory Component', () => {
  it('should render a list of steps when history is provided', () => {
    const history = [
      'Solve for x: 4(x - 3) - (x - 5) = 14',
      '4x - 12 - x + 5 = 14',
      '3x - 7 = 14'
    ];

    render(<StepsHistory history={history} />);

    // Should render 2 steps (excluding the problem statement)
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('4x - 12 - x + 5 = 14')).toBeInTheDocument();
    expect(screen.getByText('3x - 7 = 14')).toBeInTheDocument();
  });

  it('should render nothing for an empty history array', () => {
    const { container } = render(<StepsHistory history={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render nothing when history only contains problem statement', () => {
    const history = ['Solve for x: 4(x - 3) - (x - 5) = 14'];
    const { container } = render(<StepsHistory history={history} />);
    expect(container.firstChild).toBeNull();
  });

  it('should display steps with correct styling and icons', () => {
    const history = [
      'Solve for x: 4(x - 3) - (x - 5) = 14',
      '4x - 12 - x + 5 = 14'
    ];

    render(<StepsHistory history={history} />);

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

    render(<StepsHistory history={history} isSolved={true} />);

    // Check for final answer special styling
    expect(screen.getByText('Final Answer')).toBeInTheDocument();
    expect(screen.getByText('🎉 Excellent work!')).toBeInTheDocument();
    
    // Check that the final step has blue styling
    const finalStepElement = screen.getByText('x = 7');
    const finalStepContainer = finalStepElement.closest('.bg-blue-50');
    expect(finalStepContainer).toBeInTheDocument();
    expect(finalStepContainer).toHaveClass('bg-blue-50');
    expect(finalStepContainer).toHaveClass('border-blue-400');
    
    // Check for trophy icon
    const trophyIcon = screen.getByLabelText('Problem solved successfully');
    expect(trophyIcon).toBeInTheDocument();
    
    // Check that intermediate steps still have green styling
    const intermediateStepElement = screen.getByText('4x - 12 - x + 5 = 14');
    const intermediateStepContainer = intermediateStepElement.closest('.bg-green-50');
    expect(intermediateStepContainer).toBeInTheDocument();
  });

  it('should not highlight final step when problem is not solved', () => {
    const history = [
      'Solve for x: 4(x - 3) - (x - 5) = 14',
      '4x - 12 - x + 5 = 14',
      '3x - 7 = 14'
    ];

    render(<StepsHistory history={history} isSolved={false} />);

    // Should not show "Final Answer" label
    expect(screen.queryByText('Final Answer')).not.toBeInTheDocument();
    expect(screen.queryByText('🎉 Excellent work!')).not.toBeInTheDocument();
    
    // All steps should have green styling
    const allSteps = screen.getAllByText(/Step \d+/);
    expect(allSteps).toHaveLength(2);
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
  });
}); 