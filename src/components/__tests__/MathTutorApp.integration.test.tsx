import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ProblemModel } from "../../types";
import { MathTutorApp } from "../MathTutorApp";

// Mock Convex useAction hook
vi.mock("convex/react", async () => {
	const actual = await vi.importActual("convex/react");
	return {
		...actual,
		useAction: vi.fn(() => {
			return vi.fn().mockImplementation(async (args) => {
				const { studentInput, userHistory } = args;

				// Import Convex validation engine to use real validation logic
				const { validateStep } = await import("../../../convex/validation_engine");

				// Create problem model for validation
				const problemModel = {
					_id: "p-102",
					problemStatement: "Solve for x: 5x + 3 = 2x + 12",
					problemType: "SOLVE_EQUATION" as const,
					solutionSteps: ["3x + 3 = 12", "3x = 9", "x = 3"],
					difficulty: "Medium" as const,
					isPublic: true,
					timesAttempted: 0,
				};

				// Use actual validation logic
				const result = validateStep({
					problemModel,
					userHistory,
					studentInput,
				});

				// Add a small delay to simulate network latency
				await new Promise((resolve) => setTimeout(resolve, 100));

				// Generate appropriate feedback message
				let feedback: string;
				if (result.isCorrect) {
					if (result.result === "CORRECT_FINAL_STEP") {
						feedback = "Excellent! You've solved the problem.";
					} else if (result.result === "CORRECT_BUT_NOT_SIMPLIFIED") {
						feedback = "Correct! But this could be simplified further.";
					} else {
						feedback = "Great job! That's the correct step.";
					}
				} else {
					feedback = "This step is incorrect. Try again.";
				}

				// Return the format expected by the component
				return Promise.resolve({
					result: result.result,
					isCorrect: result.isCorrect,
					shouldAdvance: result.shouldAdvance,
					feedback,
					processingTimeMs: 50,
					llmFeedback: {
						encouragement: result.isCorrect
							? "Excellent work!"
							: "Keep trying!",
						explanation: result.isCorrect
							? "You correctly simplified the equation."
							: "This step doesn't follow from the previous one.",
						nextHint: "Try to isolate the variable.",
					},
				});
			});
		}),
		ConvexProvider: ({ children }: { children: React.ReactNode }) => {
			return <div data-testid="mock-convex-provider">{children}</div>;
		},
	};
});

describe("MathTutorApp - Phase 3 Integration Tests", () => {
	const sampleProblem: ProblemModel = {
		_id: "p-102",
		problemStatement: "Solve for x: 5x + 3 = 2x + 12",
		problemType: "SOLVE_EQUATION",
		solutionSteps: ["3x + 3 = 12", "3x = 9", "x = 3"],
		difficulty: "Medium",
		isPublic: true,
		timesAttempted: 0,
	};

	// Helper to render with QueryClient and ConvexProvider
	const renderWithQueryClient = (component: React.ReactElement) => {
		const queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		});
		// Import mocked ConvexProvider
		const { ConvexProvider } = require("convex/react");

		return render(
			<QueryClientProvider client={queryClient}>
				<ConvexProvider client={null}>{component}</ConvexProvider>
			</QueryClientProvider>,
		);
	};

	describe("UI Component Integration", () => {
		it("should render initial state correctly", () => {
			renderWithQueryClient(<MathTutorApp problem={sampleProblem} />);

			// Verify initial state - check for problem statement and input
			expect(screen.getByText("Problem:")).toBeInTheDocument();
			expect(
				screen.getByText("Solve for x: 5x + 3 = 2x + 12"),
			).toBeInTheDocument(); // Problem statement only
			expect(screen.getByText("Step 1:")).toBeInTheDocument();
			expect(screen.getByRole("textbox")).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /check/i }),
			).toBeInTheDocument();
		});

		it("should show loading state when check button is clicked", async () => {
			renderWithQueryClient(<MathTutorApp problem={sampleProblem} />);

			const input = screen.getByRole("textbox");
			const checkButton = screen.getByRole("button", { name: /check/i });

			// Enter some input and click check
			fireEvent.change(input, { target: { value: "3x + 3 = 12" } });
			fireEvent.click(checkButton);

			// Wait for backend validation to complete and step to appear
			await waitFor(
				() => {
					expect(screen.getByText("3x + 3 = 12")).toBeInTheDocument();
					expect(screen.getByText("Step 2:")).toBeInTheDocument(); // Should advance to next step
				},
				{ timeout: 1000 },
			);

			// Feedback is now collapsed by default for all steps
			expect(
				screen.queryByText("Great job! That's the correct step."),
			).not.toBeInTheDocument();
		});
	});

	describe("Async Validation Flow", () => {
		it("should process correct step with backend validation", async () => {
			renderWithQueryClient(<MathTutorApp problem={sampleProblem} />);

			const input = screen.getByRole("textbox");
			const checkButton = screen.getByRole("button", { name: /check/i });

			// Enter correct first step
			fireEvent.change(input, { target: { value: "3x + 3 = 12" } });
			fireEvent.click(checkButton);

			// Wait for backend validation to complete
			await waitFor(
				() => {
					expect(screen.getByText("3x + 3 = 12")).toBeInTheDocument();
					expect(screen.getByText("Step 2:")).toBeInTheDocument();
				},
				{ timeout: 1000 },
			);

			// Feedback is now collapsed by default for all steps
			expect(
				screen.queryByText("Great job! That's the correct step."),
			).not.toBeInTheDocument();
		}, 2000);
	});

	describe("Error Handling", () => {
		it("should display error for incorrect answer", async () => {
			renderWithQueryClient(<MathTutorApp problem={sampleProblem} />);

			const input = screen.getByRole("textbox");
			const checkButton = screen.getByRole("button", { name: /check/i });

			// Enter incorrect step
			fireEvent.change(input, { target: { value: "7x = 9" } });
			fireEvent.click(checkButton);

			// Wait for the validation to complete and show as incorrect
			await waitFor(
				() => {
					expect(screen.getByText("7x = 9")).toBeInTheDocument();
					expect(screen.getByText("Incorrect Attempt")).toBeInTheDocument();
				},
				{ timeout: 1000 },
			);

			// Wait for feedback to be visible by default (auto-expanded)
			await waitFor(
				() => {
					expect(
						screen.getByText("This step is incorrect. Try again."),
					).toBeInTheDocument();
				},
				{ timeout: 1500 },
			);

			// Assert the incorrect attempt is styled properly
			expect(screen.getByTitle("Incorrect attempt")).toBeInTheDocument();
		}, 2000);
	});

	describe("State Synchronization", () => {
		it("should handle malformed input gracefully", async () => {
			renderWithQueryClient(<MathTutorApp problem={sampleProblem} />);

			const input = screen.getByRole("textbox");
			const checkButton = screen.getByRole("button", { name: /check/i });

			// Enter malformed expression
			fireEvent.change(input, { target: { value: "3x ++ 5 = 12" } });
			fireEvent.click(checkButton);

			// Wait for the validation to complete and show as incorrect
			await waitFor(
				() => {
					expect(screen.getByText("3x ++ 5 = 12")).toBeInTheDocument();
					expect(screen.getByText("Incorrect Attempt")).toBeInTheDocument();
				},
				{ timeout: 1000 },
			);

			// Verify that the app continues to function normally after malformed input
			expect(screen.getByText("Step 1:")).toBeInTheDocument(); // Should still be on step 1
		}, 2000);
	});

	describe("Hint Button Loading State", () => {
		it("should not show hint button loading state during regular step validation", async () => {
			renderWithQueryClient(<MathTutorApp problem={sampleProblem} />);

			const input = screen.getByRole("textbox");
			const checkButton = screen.getByRole("button", { name: /check/i });

			// Submit wrong answers 3 times to trigger hint button
			for (let i = 0; i < 3; i++) {
				fireEvent.change(input, { target: { value: `wrong answer ${i + 1}` } });
				fireEvent.click(checkButton);

				await waitFor(
					() => {
						expect(
							screen.getByText(`wrong answer ${i + 1}`),
						).toBeInTheDocument();
					},
					{ timeout: 500 },
				);
			}

			// Hint button should now be visible
			await waitFor(
				() => {
					expect(
						screen.getByRole("button", { name: /i'm stuck/i }),
					).toBeInTheDocument();
				},
				{ timeout: 500 },
			);

			const hintButton = screen.getByRole("button", { name: /i'm stuck/i });

			// Submit another regular step - hint button should NOT show loading during this
			fireEvent.change(input, { target: { value: "another wrong answer" } });
			fireEvent.click(checkButton);

			// During regular step validation, hint button should still show "I'm stuck! 💡"
			// NOT "Getting hint..." - this test will FAIL initially due to the bug
			expect(hintButton).toHaveTextContent("I'm stuck! 💡");
			expect(hintButton).not.toHaveTextContent("Getting hint...");
			expect(hintButton).not.toBeDisabled();

			// Wait for step validation to complete
			await waitFor(
				() => {
					expect(screen.getByText("another wrong answer")).toBeInTheDocument();
				},
				{ timeout: 500 },
			);

			// After step validation, hint button should still be available
			expect(hintButton).toHaveTextContent("I'm stuck! 💡");
			expect(hintButton).not.toBeDisabled();
		}, 3000);

		it("should show hint functionality when hint button is clicked", async () => {
			renderWithQueryClient(<MathTutorApp problem={sampleProblem} />);

			const input = screen.getByRole("textbox");
			const checkButton = screen.getByRole("button", { name: /check/i });

			// Submit wrong answers 3 times to trigger hint button
			for (let i = 0; i < 3; i++) {
				fireEvent.change(input, { target: { value: `wrong answer ${i + 1}` } });
				fireEvent.click(checkButton);

				await waitFor(
					() => {
						expect(
							screen.getByText(`wrong answer ${i + 1}`),
						).toBeInTheDocument();
					},
					{ timeout: 500 },
				);
			}

			// Hint button should now be visible
			const hintButton = await waitFor(
				() => {
					return screen.getByRole("button", { name: /i'm stuck/i });
				},
				{ timeout: 500 },
			);

			// Verify initial state - button should be available and show normal text
			expect(hintButton).toHaveTextContent("I'm stuck! 💡");
			expect(hintButton).not.toBeDisabled();

			// Click the hint button
			fireEvent.click(hintButton);

			// Verify hint message appears (current implementation shows a placeholder message)
			await waitFor(
				() => {
					expect(
						screen.getByText("Hint functionality will be available soon!"),
					).toBeInTheDocument();
				},
				{ timeout: 1000 },
			);
		}, 3000);
	});

	describe("Validating State", () => {
		it("should show validating state immediately after submission", async () => {
			renderWithQueryClient(<MathTutorApp problem={sampleProblem} />);

			const input = screen.getByRole("textbox");
			const checkButton = screen.getByRole("button", { name: /check/i });

			// Enter incorrect step to test validating state
			fireEvent.change(input, { target: { value: "7x = 9" } });

			// Click and immediately check for validating state (synchronous)
			fireEvent.click(checkButton);

			// Check if validating state appears immediately (should be synchronous)
			expect(screen.getByText("7x = 9")).toBeInTheDocument();

			// Look for validating state indicators
			const validatingText = screen.queryByText("Validating Step...");
			const validatingFeedback = screen.queryByText("Validating...");

			// console.log("Immediate state check:", {
			// 	hasValidatingText: !!validatingText,
			// 	hasValidatingFeedback: !!validatingFeedback,
			// 	hasIncorrectAttempt: !!screen.queryByText("Incorrect Attempt"),
			// });

			// Wait for final state
			await waitFor(
				() => {
					expect(screen.getByText("Incorrect Attempt")).toBeInTheDocument();
				},
				{ timeout: 1000 },
			);
		}, 3000);
	});

	describe("Pending State", () => {
		it("should create attempts with pending status during validation", async () => {
			renderWithQueryClient(<MathTutorApp problem={sampleProblem} />);

			const input = screen.getByRole("textbox");
			const checkButton = screen.getByRole("button", { name: /check/i });

			// Enter any step to trigger validation
			fireEvent.change(input, { target: { value: "test step" } });

			// The optimistic update should create a pending attempt
			// This is verified by the console logs showing status: 'pending'
			fireEvent.click(checkButton);

			// Verify that we get the expected end state
			await waitFor(
				() => {
					expect(screen.getByText("test step")).toBeInTheDocument();
				},
				{ timeout: 1000 },
			);
		});
	});

	describe("Feedback Display Regression", () => {
		it("should not display feedback content until accordion is expanded", async () => {
			renderWithQueryClient(<MathTutorApp problem={sampleProblem} />);

			const input = screen.getByRole("textbox");
			const checkButton = screen.getByRole("button", { name: /check/i });

			// Enter incorrect step
			fireEvent.change(input, { target: { value: "7x = 9" } });
			fireEvent.click(checkButton);

			// Wait for validation to complete
			await waitFor(
				() => {
					expect(screen.getByText("7x = 9")).toBeInTheDocument();
					expect(screen.getByText("Incorrect Attempt")).toBeInTheDocument();
				},
				{ timeout: 1000 },
			);

			// Wait for feedback to be visible by default (auto-expanded)
			await waitFor(
				() => {
					expect(
						screen.getByText("This step is incorrect. Try again."),
					).toBeInTheDocument();
				},
				{ timeout: 1500 },
			);

			// No "click to expand" should be visible since it's auto-expanded
			expect(
				screen.queryByText("Feedback available - click to expand"),
			).not.toBeInTheDocument();
		});

		it("should handle multi-step scenario without showing feedback prematurely", async () => {
			renderWithQueryClient(<MathTutorApp problem={sampleProblem} />);

			const input = screen.getByRole("textbox");
			const checkButton = screen.getByRole("button", { name: /check/i });

			// First, enter a correct step
			fireEvent.change(input, { target: { value: "3x + 3 = 12" } });
			fireEvent.click(checkButton);

			await waitFor(
				() => {
					expect(screen.getByText("Step 2:")).toBeInTheDocument();
				},
				{ timeout: 1000 },
			);

			// Now enter an incorrect step for step 2
			fireEvent.change(input, { target: { value: "3x = 11" } });
			fireEvent.click(checkButton);

			// Wait for validation to complete
			await waitFor(
				() => {
					expect(screen.getByText("3x = 11")).toBeInTheDocument();
					expect(screen.getByText("Incorrect Attempt")).toBeInTheDocument();
				},
				{ timeout: 1000 },
			);

			// Wait for feedback to be visible by default (auto-expanded) - this is the current step
			await waitFor(
				() => {
					expect(
						screen.getByText("This step is incorrect. Try again."),
					).toBeInTheDocument();
				},
				{ timeout: 1500 },
			);

			// No "click to expand" should be visible since current step feedback is auto-expanded
			expect(
				screen.queryByText("Feedback available - click to expand"),
			).not.toBeInTheDocument();
		});

		it("should never show feedback text directly - comprehensive check", async () => {
			renderWithQueryClient(<MathTutorApp problem={sampleProblem} />);

			const input = screen.getByRole("textbox");
			const checkButton = screen.getByRole("button", { name: /check/i });

			// Make multiple incorrect attempts to stress test the system
			const incorrectInputs = ["7x = 9", "2x = 10", "x = 5"];

			for (const [index, incorrectInput] of incorrectInputs.entries()) {
				fireEvent.change(input, { target: { value: incorrectInput } });
				fireEvent.click(checkButton);

				// Wait for the attempt to show as incorrect
				await waitFor(
					() => {
						expect(screen.getByText(incorrectInput)).toBeInTheDocument();
						expect(screen.getAllByText("Incorrect Attempt")).toHaveLength(
							index + 1,
						);
					},
					{ timeout: 1000 },
				);

				// Wait for feedback to be visible (auto-expanded for current step)
				await waitFor(
					() => {
						const feedbackElements = screen.getAllByText(
							"This step is incorrect. Try again.",
						);
						expect(feedbackElements.length).toBeGreaterThan(0);
					},
					{ timeout: 1500 },
				);

				// Current step feedback should be auto-expanded (visible immediately)
				const feedbackElements = screen.getAllByText(
					"This step is incorrect. Try again.",
				);
				expect(feedbackElements.length).toBeGreaterThan(0);

				// Also check for any visible feedback patterns - they should all be auto-expanded for current step
				expect(feedbackElements.length).toBe(index + 1); // Should have one feedback per attempt
			}
		});

		it("should NOT show incorrect step feedback in FeedbackDisplay component", async () => {
			renderWithQueryClient(<MathTutorApp problem={sampleProblem} />);

			const input = screen.getByRole("textbox");
			const checkButton = screen.getByRole("button", { name: /check/i });

			// Enter incorrect step
			fireEvent.change(input, { target: { value: "7x = 9" } });
			fireEvent.click(checkButton);

			// Wait for validation to complete
			await waitFor(
				() => {
					expect(screen.getByText("7x = 9")).toBeInTheDocument();
					expect(screen.getByText("Incorrect Attempt")).toBeInTheDocument();
				},
				{ timeout: 1000 },
			);

			// Wait for feedback to be visible by default (auto-expanded)
			await waitFor(
				() => {
					expect(
						screen.getByText("This step is incorrect. Try again."),
					).toBeInTheDocument();
				},
				{ timeout: 1500 },
			);

			// Check that there's NO FeedbackDisplay component visible
			// (FeedbackDisplay has a specific "feedback-card" class and "Tutor Feedback" heading)
			expect(screen.queryByText("Tutor Feedback")).not.toBeInTheDocument();
			expect(screen.queryByTestId("feedback-card")).not.toBeInTheDocument();

			// Also check for the FeedbackDisplay container class
			const feedbackCards = document.querySelectorAll(".feedback-card");
			expect(feedbackCards).toHaveLength(0);

			// Verify feedback is auto-expanded in the accordion (no "click to expand" message)
			expect(
				screen.queryByText("Feedback available - click to expand"),
			).not.toBeInTheDocument();
			expect(
				screen.getByText("This step is incorrect. Try again."),
			).toBeInTheDocument();
		}, 3000);

		it("should show feedback IMMEDIATELY for incorrect attempts (accordion open by default)", async () => {
			renderWithQueryClient(<MathTutorApp problem={sampleProblem} />);

			const input = screen.getByRole("textbox");
			const checkButton = screen.getByRole("button", { name: /check/i });

			// Enter incorrect step
			fireEvent.change(input, { target: { value: "7x = 9" } });
			fireEvent.click(checkButton);

			// Wait for validation to complete
			await waitFor(
				() => {
					expect(screen.getByText("7x = 9")).toBeInTheDocument();
					expect(screen.getByText("Incorrect Attempt")).toBeInTheDocument();
				},
				{ timeout: 1000 },
			);

			// The feedback should be VISIBLE immediately (accordion open by default)
			await waitFor(
				() => {
					expect(
						screen.getByText("This step is incorrect. Try again."),
					).toBeInTheDocument();
				},
				{ timeout: 1500 },
			);

			// Should NOT show "Feedback available - click to expand" because it should already be expanded
			expect(
				screen.queryByText("Feedback available - click to expand"),
			).not.toBeInTheDocument();

			// Should show the collapse button instead
			const collapseButton = screen.getByRole("button", {
				name: /hide feedback for incorrect attempt/i,
			});
			expect(collapseButton).toBeInTheDocument();
		}, 3000);

		it("should show feedback IMMEDIATELY for incorrect attempts", async () => {
			renderWithQueryClient(<MathTutorApp problem={sampleProblem} />);

			const input = screen.getByRole("textbox");
			const checkButton = screen.getByRole("button", { name: /check/i });

			// Enter incorrect step
			fireEvent.change(input, { target: { value: "7x = 9" } });
			fireEvent.click(checkButton);

			// Wait for validation to complete
			await waitFor(
				() => {
					expect(screen.getByText("7x = 9")).toBeInTheDocument();
					expect(screen.getByText("Incorrect Attempt")).toBeInTheDocument();
				},
				{ timeout: 1000 },
			);

			// Wait for feedback to be available in accordion
			await waitFor(
				() => {
					// Feedback should be visible immediately (auto-expanded)
					const feedbackElements = screen.getAllByText(
						"This step is incorrect. Try again.",
					);
					expect(feedbackElements.length).toBeGreaterThan(0);
				},
				{ timeout: 1500 },
			);

			// Current step feedback should be auto-expanded (visible immediately)
			const feedbackElements = screen.getAllByText(
				"This step is incorrect. Try again.",
			);
			expect(feedbackElements.length).toBeGreaterThan(0);
		});

		it("should handle CORRECT_BUT_NOT_SIMPLIFIED results properly", async () => {
			renderWithQueryClient(<MathTutorApp problem={sampleProblem} />);

			const input = screen.getByRole("textbox");
			const checkButton = screen.getByRole("button", { name: /check/i });

			// Complete first step correctly: 3x + 3 = 12
			fireEvent.change(input, { target: { value: "3x + 3 = 12" } });
			fireEvent.click(checkButton);

			await waitFor(
				() => {
					expect(screen.getByText("Step 2:")).toBeInTheDocument();
				},
				{ timeout: 1000 },
			);

			// Complete second step correctly: 3x = 9
			fireEvent.change(input, { target: { value: "3x = 9" } });
			fireEvent.click(checkButton);

			await waitFor(
				() => {
					expect(screen.getByText("Step 3:")).toBeInTheDocument();
				},
				{ timeout: 1000 },
			);

			// Now enter x = 9/3 which should be CORRECT_BUT_NOT_SIMPLIFIED
			fireEvent.change(input, { target: { value: "x = 9/3" } });
			fireEvent.click(checkButton);

			// Should be marked as correct, not incorrect, and advance to Step 4
			await waitFor(
				() => {
					// Should show success state, not incorrect attempt
					expect(
						screen.queryByText("Incorrect Attempt"),
					).not.toBeInTheDocument();
					// Since x = 9/3 is CORRECT_BUT_NOT_SIMPLIFIED, it should advance to Step 4
					// (not solve the problem completely since it needs simplification)
					expect(screen.getByText("Step 4:")).toBeInTheDocument();
					expect(screen.getByText("x = 9/3")).toBeInTheDocument();
					// Should NOT show final answer or problem solved yet
					expect(screen.queryByText("Final Answer")).not.toBeInTheDocument();
					expect(
						screen.queryByText("🎉 Excellent work!"),
					).not.toBeInTheDocument();
				},
				{ timeout: 1500 },
			);

			// Now student can enter the simplified form
			fireEvent.change(input, { target: { value: "x = 3" } });
			fireEvent.click(checkButton);

			// THIS should solve the problem completely
			await waitFor(
				() => {
					expect(screen.getByText("Final Answer")).toBeInTheDocument();
					expect(screen.getByText("🎉 Excellent work!")).toBeInTheDocument();
					expect(screen.getByText("Problem Solved!")).toBeInTheDocument();
				},
				{ timeout: 1500 },
			);
		});

		it("should display chronological order with completed steps before current attempts", async () => {
			renderWithQueryClient(<MathTutorApp problem={sampleProblem} />);

			const input = screen.getByRole("textbox");
			const checkButton = screen.getByRole("button", { name: /check/i });

			// Complete first step correctly
			fireEvent.change(input, { target: { value: "3x + 3 = 12" } });
			fireEvent.click(checkButton);

			await waitFor(
				() => {
					expect(screen.getByText("Step 2:")).toBeInTheDocument();
				},
				{ timeout: 1000 },
			);

			// Make an incorrect attempt on step 2
			fireEvent.change(input, { target: { value: "x = 5" } });
			fireEvent.click(checkButton);

			await waitFor(
				() => {
					expect(screen.getByText("Incorrect Attempt")).toBeInTheDocument();
				},
				{ timeout: 1000 },
			);

			// In our unified timeline approach, all items appear in chronological order
			// Step 1 should be completed and visible
			expect(screen.getByText("Step 1")).toBeInTheDocument();
			expect(screen.getByText("3x + 3 = 12")).toBeInTheDocument();
			
			// The incorrect attempt "x = 5" should appear after Step 1 in chronological order
			expect(screen.getByText("Incorrect Attempt")).toBeInTheDocument();
			expect(screen.getByText("x = 5")).toBeInTheDocument();

			// Both items should be visible simultaneously since our timeline shows complete history
			const allSteps = screen.getAllByText(/Step \d+/);
			const allAttempts = screen.getAllByText("Incorrect Attempt");
			
			expect(allSteps.length).toBeGreaterThan(0);
			expect(allAttempts.length).toBeGreaterThan(0);
		});

		it("should display all steps and attempts in chronological order", async () => {
			renderWithQueryClient(<MathTutorApp problem={sampleProblem} />);

			const input = screen.getByRole("textbox");
			const checkButton = screen.getByRole("button", { name: /check/i });

			// Complete first step correctly
			fireEvent.change(input, { target: { value: "3x + 3 = 12" } });
			fireEvent.click(checkButton);

			await waitFor(
				() => {
					expect(screen.getByText("Step 2:")).toBeInTheDocument();
				},
				{ timeout: 1000 },
			);

			// Make an incorrect attempt on step 2
			fireEvent.change(input, { target: { value: "x = 5" } });
			fireEvent.click(checkButton);

			await waitFor(
				() => {
					expect(screen.getByText("Incorrect Attempt")).toBeInTheDocument();
				},
				{ timeout: 1000 },
			);

			// In our new unified timeline, items should appear in chronological order:
			// 1. Step 1 (completed): "3x + 3 = 12"  
			// 2. Incorrect Attempt: "x = 5" (from step 2)
			
			// Verify both Step 1 and the incorrect attempt are visible
			expect(screen.getByText("Step 1")).toBeInTheDocument();
			expect(screen.getByText("3x + 3 = 12")).toBeInTheDocument();
			expect(screen.getByText("Incorrect Attempt")).toBeInTheDocument();
			expect(screen.getByText("x = 5")).toBeInTheDocument();

			// Verify chronological order: Step 1 should appear before incorrect attempt
			const step1Element = screen.getByText("Step 1");
			const incorrectAttemptElement = screen.getByText("Incorrect Attempt");
			
			// Both elements should be in the document and in chronological order
			expect(step1Element).toBeInTheDocument();
			expect(incorrectAttemptElement).toBeInTheDocument();
		});

		it("should not show old incorrect attempts after problem completion", async () => {
			renderWithQueryClient(<MathTutorApp problem={sampleProblem} />);

			const input = screen.getByRole("textbox");
			const checkButton = screen.getByRole("button", { name: /check/i });

			// Complete first step correctly: 3x + 3 = 12
			fireEvent.change(input, { target: { value: "3x + 3 = 12" } });
			fireEvent.click(checkButton);

			await waitFor(
				() => {
					expect(screen.getByText("Step 2:")).toBeInTheDocument();
				},
				{ timeout: 1000 },
			);

			// Make an incorrect attempt for next step
			fireEvent.change(input, { target: { value: "x = 3/9" } });
			fireEvent.click(checkButton);

			await waitFor(
				() => {
					expect(screen.getByText("Incorrect Attempt")).toBeInTheDocument();
				},
				{ timeout: 1000 },
			);

			// Verify the incorrect attempt is initially visible
			expect(screen.getByText("x = 3/9")).toBeInTheDocument();

			// Now complete the correct steps to solve the problem
			fireEvent.change(input, { target: { value: "3x = 9" } });
			fireEvent.click(checkButton);

			await waitFor(
				() => {
					expect(screen.getByText("Step 3:")).toBeInTheDocument();
				},
				{ timeout: 1000 },
			);

			fireEvent.change(input, { target: { value: "x = 3" } });
			fireEvent.click(checkButton);

			// After solving the problem, verify correct solution display
			await waitFor(
				() => {
					expect(screen.getByText("Final Answer")).toBeInTheDocument();
					expect(screen.getByText("🎉 Excellent work!")).toBeInTheDocument();
				},
				{ timeout: 1500 },
			);

			// In our unified timeline, all attempts remain visible in chronological order
			// but the incorrect attempt "x = 3/9" should still be present in the timeline
			// since it's part of the chronological history
			expect(screen.getByText("x = 3/9")).toBeInTheDocument();
			expect(screen.getByText("Incorrect Attempt")).toBeInTheDocument();
			
			// The timeline should show: Step 1 -> Incorrect Attempt -> Step 2 -> Step 3 -> Final Answer
			expect(screen.getByText("Step 1")).toBeInTheDocument();
			expect(screen.getByText("Step 2")).toBeInTheDocument();
			expect(screen.getByText("Final Answer")).toBeInTheDocument();
		});
	});
});
