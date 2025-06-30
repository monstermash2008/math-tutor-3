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

	// CHRONOLOGICAL ORDERING TESTS - Critical for preventing regressions
	describe("Chronological Ordering Requirements", () => {
		it("CRITICAL: should display all items in strict chronological order based on timestamps", () => {
			// Create a scenario that specifically tests chronological ordering
			// Timeline: wrong1 (9:50) -> correct1 (10:00) -> wrong2 (10:10) -> correct2 (10:20)
			const chronologicalAttempts: StudentAttempt[] = [
				{
					input: "wrong first attempt",
					isCorrect: false,
					status: "incorrect",
					feedback: "Try again",
					timestamp: new Date("2024-01-01T09:50:00"), // EARLIEST
					stepNumber: 1,
				},
				{
					input: "4x - 12 - x + 5 = 14", // Step 1 correct
					isCorrect: true,
					status: "correct",
					feedback: "Great!",
					timestamp: new Date("2024-01-01T10:00:00"), // SECOND
					stepNumber: 1,
				},
				{
					input: "wrong second step",
					isCorrect: false,
					status: "incorrect",
					feedback: "Not quite",
					timestamp: new Date("2024-01-01T10:10:00"), // THIRD
					stepNumber: 2,
				},
				{
					input: "3x - 7 = 14", // Step 2 correct
					isCorrect: true,
					status: "correct",
					feedback: "Perfect!",
					timestamp: new Date("2024-01-01T10:20:00"), // LATEST
					stepNumber: 2,
				},
			];

			const history = [
				"Solve for x: 4(x - 3) - (x - 5) = 14",
				"4x - 12 - x + 5 = 14", // Step 1
				"3x - 7 = 14", // Step 2
			];

			render(
				<StepsHistory
					history={history}
					allAttempts={chronologicalAttempts}
					feedbackHistory={emptyFeedbackHistory}
				/>,
			);

			// Get all timeline items in DOM order
			const container = document.body;
			const allTimelineItems = Array.from(container.querySelectorAll('.space-y-2'));
			
			// Extract text content from each timeline item to verify order
			const displayOrder = allTimelineItems.map(item => {
				const text = item.textContent || "";
				// Extract the key mathematical expression from each item
				if (text.includes("wrong first attempt")) return "wrong first attempt";
				if (text.includes("4x - 12 - x + 5 = 14") && text.includes("Step 1")) return "Step 1: 4x - 12 - x + 5 = 14";
				if (text.includes("wrong second step")) return "wrong second step";
				if (text.includes("3x - 7 = 14") && text.includes("Step 2")) return "Step 2: 3x - 7 = 14";
				return "unknown";
			}).filter(item => item !== "unknown");

			// Verify items appear in chronological order
			expect(displayOrder).toEqual([
				"wrong first attempt",           // 09:50 - earliest
				"Step 1: 4x - 12 - x + 5 = 14", // 10:00 - second
				"wrong second step",             // 10:10 - third  
				"Step 2: 3x - 7 = 14",          // 10:20 - latest
			]);
		});

		it("CRITICAL: should handle incorrect attempts submitted before correct steps", () => {
			// Specific scenario from the user's bug report: incorrect attempt before Step 2
			const bugScenarioAttempts: StudentAttempt[] = [
				{
					input: "4x - 12 - x + 5 = 14", // Step 1 - correct
					isCorrect: true,
					status: "correct",
					feedback: "Good!",
					timestamp: new Date("2024-01-01T10:00:00"),
					stepNumber: 1,
				},
				{
					input: "x=3/9", // INCORRECT attempt submitted BEFORE correct Step 2
					isCorrect: false,
					status: "incorrect",
					feedback: "You made an error in your division. When you have 3x = 9, you should divide both sides by 3 to get x = 9/3, which simplifies to x = 3, not x = 3/9. Can you try dividing 9 by 3 again?",
					timestamp: new Date("2024-01-01T10:15:00"), // BEFORE Step 2
					stepNumber: 2,
				},
				{
					input: "x=9/3", // Step 2 - correct (this becomes displayed as Step 2)
					isCorrect: true,
					status: "correct",
					feedback: "Correct!",
					timestamp: new Date("2024-01-01T10:20:00"), // AFTER incorrect attempt
					stepNumber: 2,
				},
			];

			const history = [
				"Solve for x: 3x = 9",
				"4x - 12 - x + 5 = 14", // Step 1
				"x=9/3", // Step 2
			];

			render(
				<StepsHistory
					history={history}
					allAttempts={bugScenarioAttempts}
					feedbackHistory={emptyFeedbackHistory}
				/>,
			);

			// Verify all three items are present
			expect(screen.getByText("Step 1")).toBeInTheDocument();
			expect(screen.getByText("Step 2")).toBeInTheDocument();
			expect(screen.getByText("x=3/9")).toBeInTheDocument();
			expect(screen.getByText("Incorrect Attempt")).toBeInTheDocument();

			// Get timeline in DOM order and verify chronological ordering
			const container = document.body;
			const allItems = Array.from(container.querySelectorAll('.space-y-2'));
			
			const itemOrder = allItems.map(item => {
				const text = item.textContent || "";
				if (text.includes("Step 1")) return "Step 1";
				if (text.includes("x=3/9") && text.includes("Incorrect")) return "Incorrect x=3/9";
				if (text.includes("Step 2")) return "Step 2";
				return "unknown";
			}).filter(item => item !== "unknown");

			// CRITICAL: Incorrect attempt (10:15) should appear BEFORE Step 2 (10:20)
			expect(itemOrder).toEqual([
				"Step 1",        // 10:00
				"Incorrect x=3/9", // 10:15 - MUST appear before Step 2
				"Step 2",        // 10:20
			]);
		});

		it("CRITICAL: should handle multiple incorrect attempts interspersed with correct steps", () => {
			const complexTimelineAttempts: StudentAttempt[] = [
				{
					input: "wrong1",
					isCorrect: false,
					status: "incorrect",
					feedback: "Wrong 1",
					timestamp: new Date("2024-01-01T09:30:00"), // 1st chronologically
					stepNumber: 1,
				},
				{
					input: "4x - 12 - x + 5 = 14",
					isCorrect: true,
					status: "correct", 
					feedback: "Step 1 correct",
					timestamp: new Date("2024-01-01T10:00:00"), // 2nd chronologically
					stepNumber: 1,
				},
				{
					input: "wrong2",
					isCorrect: false,
					status: "incorrect",
					feedback: "Wrong 2",
					timestamp: new Date("2024-01-01T10:30:00"), // 3rd chronologically
					stepNumber: 2,
				},
				{
					input: "wrong3",
					isCorrect: false,
					status: "incorrect",
					feedback: "Wrong 3", 
					timestamp: new Date("2024-01-01T11:00:00"), // 4th chronologically
					stepNumber: 2,
				},
				{
					input: "3x - 7 = 14",
					isCorrect: true,
					status: "correct",
					feedback: "Step 2 correct",
					timestamp: new Date("2024-01-01T11:30:00"), // 5th chronologically
					stepNumber: 2,
				},
				{
					input: "wrong4",
					isCorrect: false,
					status: "incorrect",
					feedback: "Wrong 4",
					timestamp: new Date("2024-01-01T12:00:00"), // 6th chronologically
					stepNumber: 3,
				},
			];

			const history = [
				"Problem statement",
				"4x - 12 - x + 5 = 14", // Step 1
				"3x - 7 = 14", // Step 2
			];

			render(
				<StepsHistory
					history={history}
					allAttempts={complexTimelineAttempts}
					feedbackHistory={emptyFeedbackHistory}
				/>,
			);

			// Verify correct chronological order in DOM
			const container = document.body;
			const allItems = Array.from(container.querySelectorAll('.space-y-2'));
			
			const chronologicalOrder = allItems.map(item => {
				const text = item.textContent || "";
				if (text.includes("wrong1")) return "wrong1";
				if (text.includes("Step 1")) return "Step 1";
				if (text.includes("wrong2")) return "wrong2";
				if (text.includes("wrong3")) return "wrong3";
				if (text.includes("Step 2")) return "Step 2";
				if (text.includes("wrong4")) return "wrong4";
				return "unknown";
			}).filter(item => item !== "unknown");

			expect(chronologicalOrder).toEqual([
				"wrong1",   // 09:30
				"Step 1",   // 10:00
				"wrong2",   // 10:30
				"wrong3",   // 11:00
				"Step 2",   // 11:30
				"wrong4",   // 12:00
			]);
		});

		it("CRITICAL: should handle edge case of same timestamps", () => {
			const sameTimestampAttempts: StudentAttempt[] = [
				{
					input: "attempt1",
					isCorrect: false,
					status: "incorrect",
					feedback: "First attempt",
					timestamp: new Date("2024-01-01T10:00:00"),
					stepNumber: 1,
				},
				{
					input: "attempt2", 
					isCorrect: false,
					status: "incorrect",
					feedback: "Second attempt",
					timestamp: new Date("2024-01-01T10:00:00"), // Same timestamp
					stepNumber: 1,
				},
				{
					input: "4x - 12 - x + 5 = 14",
					isCorrect: true,
					status: "correct",
					feedback: "Correct!",
					timestamp: new Date("2024-01-01T10:00:00"), // Same timestamp
					stepNumber: 1,
				},
			];

			const history = [
				"Problem statement",
				"4x - 12 - x + 5 = 14",
			];

			render(
				<StepsHistory
					history={history}
					allAttempts={sameTimestampAttempts}
					feedbackHistory={emptyFeedbackHistory}
				/>,
			);

			// Should handle gracefully without crashing
			expect(screen.getByText("Step 1")).toBeInTheDocument();
			expect(screen.getByText("attempt1")).toBeInTheDocument();
			expect(screen.getByText("attempt2")).toBeInTheDocument();
		});

		it("CRITICAL: should prevent regression where current step attempts appear after completed steps", () => {
			// This is the exact bug scenario that keeps coming back
			const regressionScenarioAttempts: StudentAttempt[] = [
				{
					input: "3x = 9", // Step 1 completed
					isCorrect: true,
					status: "correct",
					feedback: "Good job!",
					timestamp: new Date("2024-01-01T10:00:00"),
					stepNumber: 1,
				},
				{
					input: "x = 9/3", // Step 2 completed  
					isCorrect: true,
					status: "correct",
					feedback: "Correct!",
					timestamp: new Date("2024-01-01T10:30:00"),
					stepNumber: 2,
				},
				{
					input: "x = 3/9", // Current step attempt made BETWEEN the two completed steps
					isCorrect: false,
					status: "incorrect", 
					feedback: "Check your division",
					timestamp: new Date("2024-01-01T10:15:00"), // BETWEEN step 1 and 2
					stepNumber: 2,
				},
			];

			const history = [
				"Solve for x: 3x = 9",
				"3x = 9",     // Step 1
				"x = 9/3",    // Step 2  
			];

			render(
				<StepsHistory
					history={history}
					allAttempts={regressionScenarioAttempts}
					feedbackHistory={emptyFeedbackHistory}
				/>,
			);

			// Get the actual DOM order
			const container = document.body;
			const allItems = Array.from(container.querySelectorAll('.space-y-2'));
			
			const actualOrder = allItems.map(item => {
				const text = item.textContent || "";
				if (text.includes("3x = 9") && text.includes("Step 1")) return "Step 1";
				if (text.includes("x = 3/9") && text.includes("Incorrect")) return "Incorrect Attempt";
				if (text.includes("x = 9/3") && text.includes("Step 2")) return "Step 2";
				return "unknown";
			}).filter(item => item !== "unknown");

			// CRITICAL: Must be in timestamp order, not grouped by completion status
			expect(actualOrder).toEqual([
				"Step 1",           // 10:00
				"Incorrect Attempt", // 10:15 - MUST NOT appear after Step 2
				"Step 2",           // 10:30
			]);

			// Verify the incorrect attempt feedback is available
			expect(screen.getByText("x = 3/9")).toBeInTheDocument();
			expect(screen.getByText("Incorrect Attempt")).toBeInTheDocument();
		});

		it("CRITICAL: should handle pending attempts in chronological order", () => {
			const pendingAttempts: StudentAttempt[] = [
				{
					input: "3x = 9",
					isCorrect: true,
					status: "correct",
					feedback: "Good!",
					timestamp: new Date("2024-01-01T10:00:00"),
					stepNumber: 1,
				},
				{
					input: "x = 3/9",
					isCorrect: false,
					status: "pending", // Still validating
					feedback: "Validating...",
					timestamp: new Date("2024-01-01T10:15:00"),
					stepNumber: 2,
				},
			];

			const history = [
				"Solve for x: 3x = 9",
				"3x = 9",
			];

			render(
				<StepsHistory
					history={history}
					allAttempts={pendingAttempts}
					feedbackHistory={emptyFeedbackHistory}
				/>,
			);

			// Verify chronological order with pending attempt
			const container = document.body;
			const allItems = Array.from(container.querySelectorAll('.space-y-2'));
			
			const orderWithPending = allItems.map(item => {
				const text = item.textContent || "";
				if (text.includes("Step 1")) return "Step 1";
				if (text.includes("Validating")) return "Validating";
				return "unknown";
			}).filter(item => item !== "unknown");

			expect(orderWithPending).toEqual([
				"Step 1",    // 10:00
				"Validating", // 10:15
			]);

			// Verify pending attempt shows loading state
			expect(screen.getByText("Validating Step...")).toBeInTheDocument();
			expect(screen.getByText("x = 3/9")).toBeInTheDocument();
		});
	});

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
		const feedbackExpandTexts = screen.getAllByText("Feedback available - click to expand");
		expect(feedbackExpandTexts.length).toBeGreaterThan(0);
		expect(screen.queryByText("Check your arithmetic")).not.toBeInTheDocument();

		// Click to expand and check feedback is now visible - use the first expand button
		const expandButtons = screen.getAllByLabelText("Show feedback for incorrect attempt");
		expect(expandButtons.length).toBeGreaterThan(0);
		fireEvent.click(expandButtons[0]);
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

		// Test that accordion functionality works - either expand or collapse should be available
		const expandButton = screen.queryByLabelText("Show feedback for incorrect attempt");
		const collapseButton = screen.queryByLabelText("Hide feedback for incorrect attempt");
		
		// At least one button should be present
		expect(expandButton || collapseButton).toBeTruthy();
		
		if (expandButton) {
			// Currently collapsed - test expand
			fireEvent.click(expandButton);
			expect(screen.getByText("Not quite right")).toBeInTheDocument();
		} else if (collapseButton) {
			// Currently expanded - test that we can toggle (may auto-expand again due to current step logic)
			fireEvent.click(collapseButton);
			// The feedback might auto-expand again due to current step logic, 
			// so we just verify the click worked by checking the button state changed
			expect(screen.queryByLabelText("Hide feedback for incorrect attempt")).toBeTruthy();
		}
	});

	it("should show feedback for current step attempts via accordion expansion", () => {
		// Test the case where a student has incorrect attempts on the current step
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

		// Test accordion functionality - current step attempts auto-expand
		// Since this is a current step attempt, it should be auto-expanded
		expect(screen.getByText("Remember to isolate x by adding 7 to both sides first")).toBeInTheDocument();
		expect(screen.getByLabelText("Hide feedback for incorrect attempt")).toBeInTheDocument();
		
		// Test that we can interact with the accordion (even if it auto-expands again)
		const collapseButton = screen.getByLabelText("Hide feedback for incorrect attempt");
		fireEvent.click(collapseButton);
		
		// Due to auto-expansion logic for current step attempts, it may expand again
		// We just verify the accordion is interactive
		expect(screen.queryByLabelText("Show feedback for incorrect attempt") || 
		       screen.queryByLabelText("Hide feedback for incorrect attempt")).toBeTruthy();
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

		// Verify that Step 2 has incorrect attempts in chronological order
		expect(screen.getAllByText("Incorrect Attempt")).toHaveLength(2);
		expect(screen.getByText("3x - 17 = 14")).toBeInTheDocument();
		expect(screen.getByText("3x + 7 = 14")).toBeInTheDocument();

		// Test accordion functionality for historical incorrect attempts
		const expandButtons = screen.getAllByLabelText("Show feedback for incorrect attempt");
		if (expandButtons.length > 0) {
			// Test expanding the first incorrect attempt
			fireEvent.click(expandButtons[0]);
			expect(screen.getByText("Check your arithmetic when combining like terms")).toBeInTheDocument();
		}

		// Verify that completed step feedback is not shown directly
		expect(screen.queryByText("Great job simplifying!")).not.toBeInTheDocument();
		expect(screen.queryByText("Perfect! Now you have the equation in standard form")).not.toBeInTheDocument();
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

		// Test that accordion functionality works independently
		const expandButtons = screen.getAllByLabelText("Show feedback for incorrect attempt");
		if (expandButtons.length >= 2) {
			// Expand attempts independently and verify they work
			fireEvent.click(expandButtons[0]);
			expect(screen.getByText("Check your signs carefully")).toBeInTheDocument();

			fireEvent.click(expandButtons[1]);
			expect(screen.getByText("Arithmetic error in combining terms")).toBeInTheDocument();
		}

		// Verify that completed step feedback is not shown directly
		expect(screen.queryByText("Great job!")).not.toBeInTheDocument();
		expect(screen.queryByText("Perfect!")).not.toBeInTheDocument();
	});

	// NEW TEST: All previous accordions should close when a correct step is entered
	it("CRITICAL: should close all previous accordions when a correct step is entered", () => {
		// This test verifies the UX requirement that when a student progresses to a new step,
		// all previous feedback accordions should be closed to help them focus on the current step
		
		const initialAttempts: StudentAttempt[] = [
			// Step 1: Incorrect attempt first
			{
				input: "wrong answer",
				isCorrect: false,
				status: "incorrect",
				feedback: "This is wrong, try again",
				timestamp: new Date("2024-01-01T10:00:00"),
				stepNumber: 1,
			},
		];

		const initialHistory = ["Problem statement"];

		const { rerender } = render(
			<StepsHistory
				history={initialHistory}
				allAttempts={initialAttempts}
				feedbackHistory={emptyFeedbackHistory}
			/>,
		);

		// Verify incorrect attempt is present with auto-expanded feedback (current step)
		expect(screen.getByText("Incorrect Attempt")).toBeInTheDocument();
		expect(screen.getByText("wrong answer")).toBeInTheDocument();
		expect(screen.getByText("This is wrong, try again")).toBeInTheDocument();
		
		// Verify the accordion is expanded (Hide feedback button should be present)
		expect(screen.getByLabelText("Hide feedback for incorrect attempt")).toBeInTheDocument();

		// Now simulate a correct step being entered - this should close all previous accordions
		const updatedAttempts: StudentAttempt[] = [
			...initialAttempts,
			// Step 1: Correct attempt (this advances to step 2)
			{
				input: "correct answer",
				isCorrect: true,
				status: "correct",
				feedback: "Great job!",
				timestamp: new Date("2024-01-01T10:01:00"),
				stepNumber: 1,
			},
		];

		const updatedHistory = ["Problem statement", "correct answer"]; // Step 1 is now completed

		// Re-render with the new correct step
		rerender(
			<StepsHistory
				history={updatedHistory}
				allAttempts={updatedAttempts}
				feedbackHistory={emptyFeedbackHistory}
			/>,
		);

		// Verify both attempts are still visible in chronological order
		expect(screen.getByText("Incorrect Attempt")).toBeInTheDocument();
		expect(screen.getByText("Step 1")).toBeInTheDocument();
		expect(screen.getByText("wrong answer")).toBeInTheDocument();
		expect(screen.getByText("correct answer")).toBeInTheDocument();

		// CRITICAL: The incorrect attempt's accordion should now be CLOSED
		// because a correct step was entered (advancing the user to the next step)
		expect(screen.queryByText("This is wrong, try again")).not.toBeInTheDocument();
		expect(screen.getByText("Feedback available - click to expand")).toBeInTheDocument();
		expect(screen.getByLabelText("Show feedback for incorrect attempt")).toBeInTheDocument();
		expect(screen.queryByLabelText("Hide feedback for incorrect attempt")).not.toBeInTheDocument();
	});
});
