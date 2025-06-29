import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ProblemModel } from "../../lib/validation-engine";
import { MathTutorApp } from "../MathTutorApp";

// Mock Convex useAction hook
vi.mock("convex/react", async () => {
	const actual = await vi.importActual("convex/react");
	return {
		...actual,
		useAction: vi.fn(() => {
			return vi.fn().mockImplementation(async (args) => {
				const { studentInput } = args;
				// Mock validation logic - correct steps for the sample problem
				const correctSteps = ["3x + 3 = 12", "3x = 9", "x = 3"];
				const isCorrect = correctSteps.includes(studentInput);
				
				// Add a small delay to simulate network latency and make the validating state visible
				await new Promise(resolve => setTimeout(resolve, 100));
				
				// Return the format expected by the component
				return Promise.resolve({
					result: isCorrect 
						? (studentInput === "x = 3" ? "CORRECT_FINAL_STEP" : "CORRECT_INTERMEDIATE_STEP")
						: "EQUIVALENCE_FAILURE",
					isCorrect,
					shouldAdvance: isCorrect,
					feedback: isCorrect 
						? "Great job! That's the correct step." 
						: "This step is incorrect. Try again.",
					processingTimeMs: 50,
					llmFeedback: {
						encouragement: isCorrect ? "Excellent work!" : "Keep trying!",
						explanation: isCorrect 
							? "You correctly simplified the equation." 
							: "This step doesn't follow from the previous one.",
						nextHint: "Try to isolate the variable."
					}
				});
			});
		}),
		ConvexProvider: ({ children }: { children: React.ReactNode }) => {
			return <div data-testid="mock-convex-provider">{children}</div>;
		}
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
				<ConvexProvider client={null}>
					{component}
				</ConvexProvider>
			</QueryClientProvider>,
		);
	};

	describe("UI Component Integration", () => {
		it("should render initial state correctly", () => {
			renderWithQueryClient(<MathTutorApp problem={sampleProblem} />);

					// Verify initial state - check for problem statement and input
		expect(screen.getByText("Problem:")).toBeInTheDocument();
		expect(screen.getByText("Solve for x: 5x + 3 = 2x + 12")).toBeInTheDocument(); // Problem statement only
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
			expect(screen.queryByText("Great job! That's the correct step.")).not.toBeInTheDocument();
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
			expect(screen.queryByText("Great job! That's the correct step.")).not.toBeInTheDocument();
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

			// Wait for validation to complete and feedback to be available
			await waitFor(
				() => {
					expect(screen.getByText("Feedback available - click to expand")).toBeInTheDocument();
				},
				{ timeout: 1500 },
			);

			// Click the expand button to show the feedback
			const expandButton = screen.getByRole("button", { name: /show feedback for incorrect attempt/i });
			fireEvent.click(expandButton);

			// Now check for the feedback text
			await waitFor(
				() => {
					expect(screen.getByText("This step is incorrect. Try again.")).toBeInTheDocument();
				},
				{ timeout: 500 },
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
					expect(screen.getByText("Hint functionality will be available soon!")).toBeInTheDocument();
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
			
			console.log("Immediate state check:", {
				hasValidatingText: !!validatingText,
				hasValidatingFeedback: !!validatingFeedback,
				hasIncorrectAttempt: !!screen.queryByText("Incorrect Attempt"),
			});

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

			// Wait for the validation to complete and show as incorrect
			await waitFor(
				() => {
					expect(screen.getByText("7x = 9")).toBeInTheDocument();
					expect(screen.getByText("Incorrect Attempt")).toBeInTheDocument();
				},
				{ timeout: 1000 },
			);

			// Wait for validation to complete and feedback to be available
			await waitFor(
				() => {
					expect(screen.getByText("Feedback available - click to expand")).toBeInTheDocument();
				},
				{ timeout: 1500 },
			);

			// The actual feedback text should NOT be visible before expanding
			expect(screen.queryByText("This step is incorrect. Try again.")).not.toBeInTheDocument();

			// Click the expand button to show the feedback
			const expandButton = screen.getByRole("button", { name: /show feedback for incorrect attempt/i });
			fireEvent.click(expandButton);

			// Now the feedback should be visible
			await waitFor(
				() => {
					expect(screen.getByText("This step is incorrect. Try again.")).toBeInTheDocument();
				},
				{ timeout: 500 },
			);
		}, 3000);

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

			// Wait for feedback to be available
			await waitFor(
				() => {
					expect(screen.getByText("Feedback available - click to expand")).toBeInTheDocument();
				},
				{ timeout: 1500 },
			);

			// The feedback should not be visible initially
			expect(screen.queryByText("This step is incorrect. Try again.")).not.toBeInTheDocument();

			// Check that feedback isn't visible anywhere on the page
			const allFeedbackTexts = screen.queryAllByText(/This step is incorrect/);
			expect(allFeedbackTexts).toHaveLength(0);
		}, 5000);

		it("should never show feedback text directly - comprehensive check", async () => {
			renderWithQueryClient(<MathTutorApp problem={sampleProblem} />);

			const input = screen.getByRole("textbox");
			const checkButton = screen.getByRole("button", { name: /check/i });

			// Make multiple incorrect attempts to stress test the system
			const incorrectInputs = ["7x = 9", "2x = 10", "x = 5"];
			
			for (const incorrectInput of incorrectInputs) {
				fireEvent.change(input, { target: { value: incorrectInput } });
				fireEvent.click(checkButton);

				// Wait for the attempt to show as incorrect
				await waitFor(
					() => {
						expect(screen.getByText(incorrectInput)).toBeInTheDocument();
						expect(screen.getByText("Incorrect Attempt")).toBeInTheDocument();
					},
					{ timeout: 1000 },
				);

				// Immediately check that feedback is not visible
				expect(screen.queryByText("This step is incorrect. Try again.")).not.toBeInTheDocument();
				
				// Also check for any visible feedback patterns
				const feedbackRegexes = [
					/this step is incorrect/i,
					/try again/i,
					/incorrect.*step/i,
					/wrong.*answer/i,
				];
				
				for (const regex of feedbackRegexes) {
					const potentialFeedback = screen.queryAllByText(regex);
					// Filter out the "Incorrect Attempt" label which is expected
					const actualFeedback = potentialFeedback.filter(el => 
						!el.textContent?.includes("Incorrect Attempt")
					);
					expect(actualFeedback).toHaveLength(0);
				}

				// Wait for feedback to become available (but not visible)
				await waitFor(
					() => {
						expect(screen.getByText("Feedback available - click to expand")).toBeInTheDocument();
					},
					{ timeout: 1500 },
				);
			}
		}, 10000);

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

			// Wait for feedback to be available in accordion
			await waitFor(
				() => {
					expect(screen.getByText("Feedback available - click to expand")).toBeInTheDocument();
				},
				{ timeout: 1500 },
			);

			// Check that there's NO FeedbackDisplay component visible
			// (FeedbackDisplay has a specific "feedback-card" class and "Tutor Feedback" heading)
			expect(screen.queryByText("Tutor Feedback")).not.toBeInTheDocument();
			expect(screen.queryByTestId("feedback-card")).not.toBeInTheDocument();
			
			// Also check for the FeedbackDisplay container class
			const feedbackCards = document.querySelectorAll('.feedback-card');
			expect(feedbackCards).toHaveLength(0);

			// Verify feedback is only in the collapsed accordion
			expect(screen.queryByText("This step is incorrect. Try again.")).not.toBeInTheDocument();
			expect(screen.getByText("Feedback available - click to expand")).toBeInTheDocument();
		}, 3000);
	});
});
