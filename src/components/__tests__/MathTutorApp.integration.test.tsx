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
			return vi.fn().mockImplementation((args) => {
				const { studentInput } = args;
				// Mock validation logic - correct steps for the sample problem
				const correctSteps = ["3x + 3 = 12", "3x = 9", "x = 3"];
				const isCorrect = correctSteps.includes(studentInput);
				
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

			// Verify initial state
			expect(
				screen.getByText("Solve for x: 5x + 3 = 2x + 12"),
			).toBeInTheDocument();
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

			// Wait for backend validation to complete and step to appear with feedback
			await waitFor(
				() => {
					expect(screen.getByText("3x + 3 = 12")).toBeInTheDocument();
					expect(screen.getByText("Great job! That's the correct step.")).toBeInTheDocument();
					expect(screen.getByText("Step 2:")).toBeInTheDocument(); // Should advance to next step
				},
				{ timeout: 1000 },
			);
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
					expect(screen.getByText("Great job! That's the correct step.")).toBeInTheDocument();
					expect(screen.getByText("Step 2:")).toBeInTheDocument();
				},
				{ timeout: 1000 },
			);
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

			// Wait for incorrect attempt to appear in the UI with backend feedback
			await waitFor(
				() => {
					expect(screen.getByText("Incorrect Attempt")).toBeInTheDocument();
					expect(screen.getByText("7x = 9")).toBeInTheDocument();
					expect(screen.getByText("This step is incorrect. Try again.")).toBeInTheDocument();
				},
				{ timeout: 1000 },
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

			// Wait for incorrect attempt to appear with backend feedback
			await waitFor(
				() => {
					expect(screen.getByText("Incorrect Attempt")).toBeInTheDocument();
					expect(screen.getByText("3x ++ 5 = 12")).toBeInTheDocument();
					expect(screen.getByText("This step is incorrect. Try again.")).toBeInTheDocument();
				},
				{ timeout: 1000 },
			);

			// Assert the malformed input is treated as an incorrect attempt
			expect(screen.getByTitle("Incorrect attempt")).toBeInTheDocument();
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
});
