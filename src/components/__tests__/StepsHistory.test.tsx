import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { StudentAttempt } from "../MathTutorApp";
import { StepsHistory } from "../StepsHistory";

describe("StepsHistory Component", () => {
	const mockAttempts: StudentAttempt[] = [
		{
			input: "4x - 12 - x + 5 = 14",
			isCorrect: true,
			status: "correct",
			feedback: "Great job!",
			timestamp: new Date("2024-01-01T10:00:00"),
			stepNumber: 1,
		},
		{
			input: "4x - 12 - x - 5 = 14",
			isCorrect: false,
			status: "incorrect",
			feedback: "Check your arithmetic",
			timestamp: new Date("2024-01-01T09:55:00"),
			stepNumber: 1,
		},
		{
			input: "3x - 7 = 14",
			isCorrect: true,
			status: "correct",
			feedback: "Correct!",
			timestamp: new Date("2024-01-01T10:05:00"),
			stepNumber: 2,
		},
	];

	// Empty feedback history for tests
	const emptyFeedbackHistory = {};

	it("should render a list of steps when history is provided", () => {
		const history = [
			"Solve for x: 4(x - 3) - (x - 5) = 14",
			"4x - 12 - x + 5 = 14",
			"3x - 7 = 14",
		];

		render(
			<StepsHistory
				history={history}
				allAttempts={[]}
				feedbackHistory={emptyFeedbackHistory}
			/>,
		);

		// Should render 2 steps (excluding the problem statement)
		expect(screen.getByText("Step 1")).toBeInTheDocument();
		expect(screen.getByText("Step 2")).toBeInTheDocument();
		expect(screen.getByText("4x - 12 - x + 5 = 14")).toBeInTheDocument();
		expect(screen.getByText("3x - 7 = 14")).toBeInTheDocument();
	});

	it("should render nothing for an empty history array", () => {
		const { container } = render(
			<StepsHistory
				history={[]}
				allAttempts={[]}
				feedbackHistory={emptyFeedbackHistory}
			/>,
		);
		expect(container.firstChild).toBeNull();
	});

	it("should render nothing when history only contains problem statement", () => {
		const history = ["Solve for x: 4(x - 3) - (x - 5) = 14"];
		const { container } = render(
			<StepsHistory
				history={history}
				allAttempts={[]}
				feedbackHistory={emptyFeedbackHistory}
			/>,
		);
		expect(container.firstChild).toBeNull();
	});

	it("should display steps with correct styling and icons", () => {
		const history = [
			"Solve for x: 4(x - 3) - (x - 5) = 14",
			"4x - 12 - x + 5 = 14",
		];

		render(
			<StepsHistory
				history={history}
				allAttempts={[]}
				feedbackHistory={emptyFeedbackHistory}
			/>,
		);

		// Check for step styling - get the parent div that has the bg-green-50 class
		const stepElement = screen.getByText("4x - 12 - x + 5 = 14");
		const stepContainer = stepElement.closest(".bg-green-50");
		expect(stepContainer).toBeInTheDocument();
		expect(stepContainer).toHaveClass("bg-green-50");
		expect(stepContainer).toHaveClass("border-green-200");

		// Check for SVG check mark
		const checkIcon = screen.getByLabelText("Step completed successfully");
		expect(checkIcon).toBeInTheDocument();
	});

	it("should highlight the final answer when problem is solved", () => {
		const history = [
			"Solve for x: 4(x - 3) - (x - 5) = 14",
			"4x - 12 - x + 5 = 14",
			"3x - 7 = 14",
			"x = 7",
		];

		render(
			<StepsHistory
				history={history}
				allAttempts={[]}
				feedbackHistory={emptyFeedbackHistory}
				isSolved={true}
			/>,
		);

		// Check for final answer special styling
		expect(screen.getByText("Final Answer")).toBeInTheDocument();
		expect(screen.getByText("🎉 Excellent work!")).toBeInTheDocument();

		// Check that the final step has blue styling
		const finalStepElement = screen.getByText("x = 7");
		const finalStepContainer = finalStepElement.closest(".bg-blue-50");
		expect(finalStepContainer).toBeInTheDocument();
	});

	it("should not highlight final step when problem is not solved", () => {
		const history = [
			"Solve for x: 4(x - 3) - (x - 5) = 14",
			"4x - 12 - x + 5 = 14",
			"3x - 7 = 14",
		];

		render(
			<StepsHistory
				history={history}
				allAttempts={[]}
				feedbackHistory={emptyFeedbackHistory}
				isSolved={false}
			/>,
		);

		// Should not show "Final Answer" label
		expect(screen.queryByText("Final Answer")).not.toBeInTheDocument();
		expect(screen.queryByText("🎉 Excellent work!")).not.toBeInTheDocument();

		// All steps should have green styling
		const allSteps = screen.getAllByText(/Step \d+/);
		expect(allSteps).toHaveLength(2);
		expect(screen.getByText("Step 1")).toBeInTheDocument();
		expect(screen.getByText("Step 2")).toBeInTheDocument();
	});

	it("renders nothing when no history or attempts", () => {
		const { container } = render(
			<StepsHistory
				history={["Problem statement"]}
				allAttempts={[]}
				feedbackHistory={emptyFeedbackHistory}
			/>,
		);
		expect(container.firstChild).toBeNull();
	});

	it("displays correct steps with green styling", () => {
		render(
			<StepsHistory
				history={["Problem", "4x - 12 - x + 5 = 14", "3x - 7 = 14"]}
				allAttempts={mockAttempts}
				feedbackHistory={emptyFeedbackHistory}
			/>,
		);

		expect(screen.getByText("Step 1")).toBeInTheDocument();
		expect(screen.getByText("Step 2")).toBeInTheDocument();
		expect(screen.getByText("4x - 12 - x + 5 = 14")).toBeInTheDocument();
		expect(screen.getByText("3x - 7 = 14")).toBeInTheDocument();
	});

	it("displays incorrect attempts with red styling", () => {
		render(
			<StepsHistory
				history={["Problem", "4x - 12 - x + 5 = 14"]}
				allAttempts={mockAttempts}
				feedbackHistory={emptyFeedbackHistory}
			/>,
		);

		const incorrectAttempts = screen.getAllByText("Incorrect Attempt");
		expect(incorrectAttempts.length).toBeGreaterThan(0);
		expect(screen.getByText("4x - 12 - x - 5 = 14")).toBeInTheDocument();

		// Incorrect attempt feedback should be available via accordion
		expect(
			screen.getByText("Feedback available - click to expand"),
		).toBeInTheDocument();
		expect(screen.queryByText("Check your arithmetic")).not.toBeInTheDocument();

		// Click to expand and check feedback is now visible
		const expandButton = screen.getByLabelText(
			"Show feedback for incorrect attempt",
		);
		fireEvent.click(expandButton);
		expect(screen.getByText("Check your arithmetic")).toBeInTheDocument();

		// Correct step feedback is now also collapsed by default (no auto-expansion)
		expect(screen.queryByText("Great job!")).not.toBeInTheDocument();
	});

	it("shows final answer with special styling when solved", () => {
		render(
			<StepsHistory
				history={["Problem", "x = 7"]}
				allAttempts={mockAttempts}
				feedbackHistory={emptyFeedbackHistory}
				isSolved={true}
			/>,
		);

		expect(screen.getByText("Final Answer")).toBeInTheDocument();
		expect(screen.getByText("🎉 Excellent work!")).toBeInTheDocument();
	});

	it("groups attempts by step number correctly", () => {
		const multiStepAttempts: StudentAttempt[] = [
			{
				input: "wrong1",
				isCorrect: false,
				status: "incorrect",
				feedback: "Try again",
				timestamp: new Date(),
				stepNumber: 1,
			},
			{
				input: "wrong2",
				isCorrect: false,
				status: "incorrect",
				feedback: "Still wrong",
				timestamp: new Date(),
				stepNumber: 1,
			},
			{
				input: "correct1",
				isCorrect: true,
				status: "correct",
				feedback: "Good job",
				timestamp: new Date(),
				stepNumber: 1,
			},
		];

		render(
			<StepsHistory
				history={["Problem", "correct1"]}
				allAttempts={multiStepAttempts}
				feedbackHistory={emptyFeedbackHistory}
			/>,
		);

		expect(screen.getAllByText("Incorrect Attempt")).toHaveLength(2);
		expect(screen.getByText("wrong1")).toBeInTheDocument();
		expect(screen.getByText("wrong2")).toBeInTheDocument();
		expect(screen.getByText("correct1")).toBeInTheDocument();
	});

	it("shows current step incorrect attempts when not solved", () => {
		const currentStepAttempts: StudentAttempt[] = [
			{
				input: "wrong attempt",
				isCorrect: false,
				status: "incorrect",
				feedback: "Not quite right",
				timestamp: new Date(),
				stepNumber: 2, // Next step after completed step 1
			},
		];

		render(
			<StepsHistory
				history={["Problem", "4x - 12 - x + 5 = 14"]}
				allAttempts={currentStepAttempts}
				feedbackHistory={emptyFeedbackHistory}
				isSolved={false}
			/>,
		);

		// Check that the incorrect attempt is shown
		expect(screen.getByText("wrong attempt")).toBeInTheDocument();

		// Feedback should be collapsed by default
		expect(screen.queryByText("Not quite right")).not.toBeInTheDocument();
		expect(
			screen.getByText("Feedback available - click to expand"),
		).toBeInTheDocument();

		// Click to expand feedback
		const expandButton = screen.getByLabelText(
			"Show feedback for incorrect attempt",
		);
		fireEvent.click(expandButton);

		// Now the feedback should be visible
		expect(screen.getByText("Not quite right")).toBeInTheDocument();
		expect(
			screen.queryByText("Feedback available - click to expand"),
		).not.toBeInTheDocument();

		// The button should now show "Hide feedback"
		const collapseButton = screen.getByLabelText(
			"Hide feedback for incorrect attempt",
		);

		// Click the collapse button to hide feedback
		fireEvent.click(collapseButton);

		// Now the feedback should be hidden again
		expect(screen.queryByText("Not quite right")).not.toBeInTheDocument();
		expect(
			screen.getByText("Feedback available - click to expand"),
		).toBeInTheDocument();
	});

	it("should hide all previous feedback in collapsed accordions after multiple steps with incorrect attempts", () => {
		// Scenario: Student gets first step correct, second step incorrect twice, then correct
		const fullScenarioAttempts: StudentAttempt[] = [
			// Step 1: Student gets it correct on first try
			{
				input: "4x - 12 - x + 5 = 14",
				isCorrect: true,
				status: "correct",
				feedback: "Great job simplifying!",
				timestamp: new Date("2024-01-01T10:00:00"),
				stepNumber: 1,
			},
			// Step 2: Student gets it wrong first
			{
				input: "3x - 17 = 14", // Wrong arithmetic
				isCorrect: false,
				status: "incorrect",
				feedback: "Check your arithmetic when combining like terms",
				timestamp: new Date("2024-01-01T10:01:00"),
				stepNumber: 2,
			},
			// Step 2: Student gets it wrong again
			{
				input: "3x + 7 = 14", // Still wrong
				isCorrect: false,
				status: "incorrect",
				feedback: "Remember: -12 + 5 = -7, not +7",
				timestamp: new Date("2024-01-01T10:02:00"),
				stepNumber: 2,
			},
			// Step 2: Student finally gets it correct
			{
				input: "3x - 7 = 14",
				isCorrect: true,
				status: "correct",
				feedback: "Perfect! Now you have the equation in standard form",
				timestamp: new Date("2024-01-01T10:03:00"),
				stepNumber: 2,
			},
		];

		const history = [
			"Solve for x: 4(x - 3) - (x - 5) = 14", // Problem statement
			"4x - 12 - x + 5 = 14", // Step 1 - correct
			"3x - 7 = 14", // Step 2 - correct after attempts
		];

		render(
			<StepsHistory
				history={history}
				allAttempts={fullScenarioAttempts}
				feedbackHistory={emptyFeedbackHistory}
			/>,
		);

		// Verify both completed steps are shown
		expect(screen.getByText("Step 1")).toBeInTheDocument();
		expect(screen.getByText("Step 2")).toBeInTheDocument();
		expect(screen.getByText("4x - 12 - x + 5 = 14")).toBeInTheDocument();
		expect(screen.getByText("3x - 7 = 14")).toBeInTheDocument();

		// Verify that Step 1 has no incorrect attempts shown (it was correct on first try)
		const step1Section = screen.getByText("Step 1").closest(".space-y-2");
		expect(step1Section).toBeInTheDocument();

		// Step 1 feedback should NOT be shown directly (only current step shows feedback directly)
		expect(
			screen.queryByText("Great job simplifying!"),
		).not.toBeInTheDocument();

		// Verify that Step 2 has incorrect attempts that are initially collapsed
		expect(screen.getAllByText("Incorrect Attempt")).toHaveLength(2);
		expect(screen.getByText("3x - 17 = 14")).toBeInTheDocument();
		expect(screen.getByText("3x + 7 = 14")).toBeInTheDocument();

		// All incorrect attempt feedback should be initially hidden (collapsed)
		expect(
			screen.getAllByText("Feedback available - click to expand"),
		).toHaveLength(2);
		expect(
			screen.queryByText("Check your arithmetic when combining like terms"),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText("Remember: -12 + 5 = -7, not +7"),
		).not.toBeInTheDocument();

		// Step 2 correct feedback should NOT be shown directly since it's a completed step
		// Only current step attempts show feedback directly
		expect(
			screen.queryByText("Perfect! Now you have the equation in standard form"),
		).not.toBeInTheDocument();

		// Test expanding the first incorrect attempt
		const expandButtons = screen.getAllByLabelText(
			"Show feedback for incorrect attempt",
		);
		expect(expandButtons).toHaveLength(2);

		fireEvent.click(expandButtons[0]);

		// First feedback should now be visible
		expect(
			screen.getByText("Check your arithmetic when combining like terms"),
		).toBeInTheDocument();
		// Second feedback should still be hidden
		expect(
			screen.queryByText("Remember: -12 + 5 = -7, not +7"),
		).not.toBeInTheDocument();
		// Should have one less "click to expand" text
		expect(
			screen.getAllByText("Feedback available - click to expand"),
		).toHaveLength(1);

		// Test expanding the second incorrect attempt
		fireEvent.click(expandButtons[1]);

		// Both feedbacks should now be visible
		expect(
			screen.getByText("Check your arithmetic when combining like terms"),
		).toBeInTheDocument();
		expect(
			screen.getByText("Remember: -12 + 5 = -7, not +7"),
		).toBeInTheDocument();
		// No more "click to expand" text should remain
		expect(
			screen.queryByText("Feedback available - click to expand"),
		).not.toBeInTheDocument();

		// Test collapsing the first attempt
		const collapseButtons = screen.getAllByLabelText(
			"Hide feedback for incorrect attempt",
		);
		expect(collapseButtons).toHaveLength(2);

		fireEvent.click(collapseButtons[0]);

		// First feedback should be hidden again
		expect(
			screen.queryByText("Check your arithmetic when combining like terms"),
		).not.toBeInTheDocument();
		// Second feedback should still be visible
		expect(
			screen.getByText("Remember: -12 + 5 = -7, not +7"),
		).toBeInTheDocument();
		// Should have one "click to expand" text again
		expect(
			screen.getAllByText("Feedback available - click to expand"),
		).toHaveLength(1);

		// Test that completed step feedback is not shown directly
		// Only current step attempts show feedback directly, completed steps don't
		expect(
			screen.queryByText("Great job simplifying!"),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText("Perfect! Now you have the equation in standard form"),
		).not.toBeInTheDocument();
	});

	it("should maintain independent accordion state for attempts across different steps", () => {
		// Test that accordion state is independent between different steps
		const multiStepAttempts: StudentAttempt[] = [
			// Step 1: One incorrect attempt
			{
				input: "4x - 12 - x - 5 = 14", // Wrong arithmetic
				isCorrect: false,
				status: "incorrect",
				feedback: "Check your signs carefully",
				timestamp: new Date("2024-01-01T09:59:00"),
				stepNumber: 1,
			},
			{
				input: "4x - 12 - x + 5 = 14",
				isCorrect: true,
				status: "correct",
				feedback: "Great job!",
				timestamp: new Date("2024-01-01T10:00:00"),
				stepNumber: 1,
			},
			// Step 2: Two incorrect attempts
			{
				input: "3x - 17 = 14",
				isCorrect: false,
				status: "incorrect",
				feedback: "Arithmetic error in combining terms",
				timestamp: new Date("2024-01-01T10:01:00"),
				stepNumber: 2,
			},
			{
				input: "3x + 7 = 14",
				isCorrect: false,
				status: "incorrect",
				feedback: "Still incorrect arithmetic",
				timestamp: new Date("2024-01-01T10:02:00"),
				stepNumber: 2,
			},
			{
				input: "3x - 7 = 14",
				isCorrect: true,
				status: "correct",
				feedback: "Perfect!",
				timestamp: new Date("2024-01-01T10:03:00"),
				stepNumber: 2,
			},
		];

		const history = [
			"Solve for x: 4(x - 3) - (x - 5) = 14",
			"4x - 12 - x + 5 = 14",
			"3x - 7 = 14",
		];

		render(
			<StepsHistory
				history={history}
				allAttempts={multiStepAttempts}
				feedbackHistory={emptyFeedbackHistory}
			/>,
		);

		// Should have 3 incorrect attempts total (1 from step 1, 2 from step 2)
		expect(screen.getAllByText("Incorrect Attempt")).toHaveLength(3);
		expect(
			screen.getAllByText("Feedback available - click to expand"),
		).toHaveLength(3);

		// Get all expand buttons
		const expandButtons = screen.getAllByLabelText(
			"Show feedback for incorrect attempt",
		);
		expect(expandButtons).toHaveLength(3);

		// Expand the first step's incorrect attempt
		fireEvent.click(expandButtons[0]);
		expect(screen.getByText("Check your signs carefully")).toBeInTheDocument();

		// Expand one of the second step's incorrect attempts
		fireEvent.click(expandButtons[1]);
		expect(
			screen.getByText("Arithmetic error in combining terms"),
		).toBeInTheDocument();

		// Verify that the third attempt is still collapsed
		expect(
			screen.queryByText("Still incorrect arithmetic"),
		).not.toBeInTheDocument();
		expect(
			screen.getAllByText("Feedback available - click to expand"),
		).toHaveLength(1);

		// Verify that completed step feedback is not shown directly
		expect(screen.queryByText("Great job!")).not.toBeInTheDocument(); // Step 1 feedback is hidden
		expect(screen.queryByText("Perfect!")).not.toBeInTheDocument(); // Step 2 feedback is also hidden (completed step)
	});

	it("should show feedback for current step attempts via accordion expansion", () => {
		// Test the case where a student has incorrect attempts on the current step
		// This feedback should be available via accordion expansion
		const currentStepAttempts: StudentAttempt[] = [
			{
				input: "x = 21", // Incorrect attempt
				isCorrect: false,
				status: "incorrect",
				feedback: "Remember to isolate x by adding 7 to both sides first",
				timestamp: new Date("2024-01-01T10:01:00"),
				stepNumber: 2, // Current step after completing step 1
			},
		];

		const history = [
			"Solve for x: 3x - 7 = 14", // Problem statement
			"3x = 21", // Step 1 completed correctly
		];

		render(
			<StepsHistory
				history={history}
				allAttempts={currentStepAttempts}
				feedbackHistory={emptyFeedbackHistory}
				isSolved={false}
			/>,
		);

		// The incorrect attempt should be shown
		expect(screen.getByText("x = 21")).toBeInTheDocument();

		// The feedback should be collapsed by default (new behavior)
		expect(
			screen.queryByText("Remember to isolate x by adding 7 to both sides first"),
		).not.toBeInTheDocument();

		// There should be a "click to expand" message 
		expect(
			screen.getByText("Feedback available - click to expand"),
		).toBeInTheDocument();

		// Click to expand the feedback
		const expandButton = screen.getByLabelText("Show feedback for incorrect attempt");
		fireEvent.click(expandButton);

		// Now the feedback should be visible
		expect(
			screen.getByText("Remember to isolate x by adding 7 to both sides first"),
		).toBeInTheDocument();

		// The accordion should now show "Hide feedback" button since it's expanded
		expect(
			screen.getByLabelText("Hide feedback for incorrect attempt"),
		).toBeInTheDocument();
	});
});
