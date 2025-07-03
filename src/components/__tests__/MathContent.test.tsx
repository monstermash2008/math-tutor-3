import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MathContent } from "../MathContent";

// Mock KaTeX since it's not available in the test environment
vi.mock("katex", () => ({
  default: {
    render: vi.fn(),
  },
}));

// Mock the LaTeXRenderer component
vi.mock("../LaTeXRenderer", () => ({
  LaTeXRenderer: ({ latex, className }: { latex: string; className?: string }) => (
    <div data-testid="latex-renderer" className={className}>
      {latex}
    </div>
  ),
}));

describe("MathContent Component", () => {
  describe("LaTeX Detection", () => {
    it("should detect dollar-delimited math expressions", () => {
      const { getByTestId } = render(
        <MathContent content="Solve for x: $5x + 3 = 2x + 12$" />
      );
      
      expect(getByTestId("latex-renderer")).toBeInTheDocument();
    });

    it("should detect double dollar-delimited expressions", () => {
      const { getByTestId } = render(
        <MathContent content="$$x^2 + y^2 = r^2$$" />
      );
      
      expect(getByTestId("latex-renderer")).toBeInTheDocument();
    });

    it("should detect LaTeX commands with backslashes", () => {
      const { getByTestId } = render(
        <MathContent content="The fraction \\frac{1}{2} is equal to 0.5" />
      );
      
      expect(getByTestId("latex-renderer")).toBeInTheDocument();
    });

    it("should detect LaTeX braces", () => {
      const { getByTestId } = render(
        <MathContent content="Function f(x) = {x + 1}" />
      );
      
      expect(getByTestId("latex-renderer")).toBeInTheDocument();
    });

    it("should detect common math symbols", () => {
      const { getByTestId } = render(
        <MathContent content="\\alpha + \\beta = \\gamma" />
      );
      
      expect(getByTestId("latex-renderer")).toBeInTheDocument();
    });
  });

  describe("Plain Text Fallback", () => {
    it("should render plain text for non-LaTeX content", () => {
      const { queryByTestId } = render(
        <MathContent content="This is just regular text" />
      );
      
      expect(queryByTestId("latex-renderer")).not.toBeInTheDocument();
    });

    it("should render simple equations without LaTeX markers as plain text", () => {
      const { queryByTestId } = render(
        <MathContent content="x = 3" />
      );
      
      expect(queryByTestId("latex-renderer")).not.toBeInTheDocument();
    });
  });

  describe("Props Passing", () => {
    it("should pass displayMode prop to LaTeXRenderer", () => {
      const { getByTestId } = render(
        <MathContent content="$x + y = z$" displayMode={true} />
      );
      
      expect(getByTestId("latex-renderer")).toBeInTheDocument();
    });

    it("should pass className prop correctly", () => {
      const { getByTestId, container } = render(
        <MathContent content="$x + y = z$" className="test-class" />
      );
      
      // For mixed content with dollar signs, className is applied to the wrapper span
      const wrapperSpan = container.querySelector("span");
      expect(wrapperSpan).toHaveClass("test-class");
      
      // LaTeXRenderer should still be present
      expect(getByTestId("latex-renderer")).toBeInTheDocument();
    });

    it("should apply className to plain text span", () => {
      const { container } = render(
        <MathContent content="plain text" className="test-class" />
      );
      
      const span = container.querySelector("span");
      expect(span).toHaveClass("test-class");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty content", () => {
      const { container } = render(<MathContent content="" />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it("should handle content with mixed LaTeX and plain text", () => {
      const { getByTestId } = render(
        <MathContent content="The equation $x + 1 = 2$ is simple" />
      );
      
      expect(getByTestId("latex-renderer")).toBeInTheDocument();
    });

    it("should handle escaped dollar signs (not LaTeX)", () => {
      const { queryByTestId } = render(
        <MathContent content="This costs 5 dollars" />
      );
      
      // Should not detect as LaTeX since no $ symbols
      expect(queryByTestId("latex-renderer")).not.toBeInTheDocument();
    });
  });
}); 