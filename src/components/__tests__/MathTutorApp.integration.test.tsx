import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ProblemModel } from "../../lib/validation-engine";
import { MathTutorApp } from "../MathTutorApp";

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

	// Helper to render with QueryClient
	const renderWithQueryClient = (component: React.ReactElement) => {
		const queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		});
		return render(
			<QueryClientProvider client={queryClient}>
				{component}
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

			// Wait for async processing to complete and step to appear with feedback
			await waitFor(
				() => {
					expect(screen.getByText("3x + 3 = 12")).toBeInTheDocument();
					expect(screen.getAllByText("Getting feedback...")).toHaveLength(1); // Only in StepsHistory now
					expect(screen.getByTitle("Loading spinner")).toBeInTheDocument();
				},
				{ timeout: 2000 },
			);
		});
	});

	describe("Async Validation Flow", () => {
		it("should process correct step after delay", async () => {
			renderWithQueryClient(<MathTutorApp problem={sampleProblem} />);

			const input = screen.getByRole("textbox");
			const checkButton = screen.getByRole("button", { name: /check/i });

			// Enter correct first step
			fireEvent.change(input, { target: { value: "3x + 3 = 12" } });
			fireEvent.click(checkButton);

			// Wait for async processing to complete
			// In Phase 4, LLM feedback is requested but in test environment without API key,
			// the mutation gets stuck in loading state
			await waitFor(
				() => {
					expect(screen.getAllByText("Getting feedback...")).toHaveLength(1); // Only in StepsHistory now
				},
				{ timeout: 2000 },
			);

			// Verify step was added to history
			expect(screen.getByText("3x + 3 = 12")).toBeInTheDocument();
			expect(screen.getByText("Step 2:")).toBeInTheDocument();
		}, 10000);
	});

	describe("Error Handling", () => {
		it("should display error for incorrect answer", async () => {
			renderWithQueryClient(<MathTutorApp problem={sampleProblem} />);

			const input = screen.getByRole("textbox");
			const checkButton = screen.getByRole("button", { name: /check/i });

			// Enter incorrect step
			fireEvent.change(input, { target: { value: "7x = 9" } });
			fireEvent.click(checkButton);

			// Wait for incorrect attempt to appear in the UI
			await waitFor(
				() => {
					expect(screen.getByText("Incorrect Attempt")).toBeInTheDocument();
					expect(screen.getByText("7x = 9")).toBeInTheDocument();
					expect(screen.getAllByText("Getting feedback...")).toHaveLength(1); // Only in StepsHistory now
				},
				{ timeout: 2000 },
			);

			// Assert the incorrect attempt is styled properly
			expect(screen.getByTitle("Incorrect attempt")).toBeInTheDocument();
		}, 10000);
	});

	describe("State Synchronization", () => {
		it("should handle malformed input gracefully", async () => {
			renderWithQueryClient(<MathTutorApp problem={sampleProblem} />);

			const input = screen.getByRole("textbox");
			const checkButton = screen.getByRole("button", { name: /check/i });

			// Enter malformed expression
			fireEvent.change(input, { target: { value: "3x ++ 5 = 12" } });
			fireEvent.click(checkButton);

			// Wait for incorrect attempt to appear with loading feedback
			await waitFor(
				() => {
					expect(screen.getByText("Incorrect Attempt")).toBeInTheDocument();
					expect(screen.getByText("3x ++ 5 = 12")).toBeInTheDocument();
					expect(screen.getAllByText("Getting feedback...")).toHaveLength(1); // Only in StepsHistory now
				},
				{ timeout: 2000 },
			);

			// Assert the malformed input is treated as an incorrect attempt
			expect(screen.getByTitle("Incorrect attempt")).toBeInTheDocument();
		}, 10000);
	});
});
