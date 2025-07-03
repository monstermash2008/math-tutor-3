import { LaTeXRenderer } from "./LaTeXRenderer";

interface MathContentProps {
  content: string;
  displayMode?: boolean;
  className?: string;
}

/**
 * Universal component for rendering mathematical content with proper LaTeX detection
 * Handles various LaTeX formats including:
 * - Dollar delimited: $x + 1 = 2$ or $$x + 1 = 2$$
 * - Backslash commands: \frac{1}{2}
 * - Mixed content: "Solve for x: $5x + 3 = 2x + 12$"
 */
export function MathContent({
  content,
  displayMode = false,
  className = "",
}: MathContentProps) {
  // Check if content contains dollar-delimited math
  if (content.includes("$")) {
    return (
      <span className={className}>
        {renderMixedContent(content)}
      </span>
    );
  }

  // Enhanced heuristic to detect pure LaTeX content
  const isLaTeX = detectLaTeX(content);

  if (isLaTeX) {
    return (
      <LaTeXRenderer
        latex={content}
        displayMode={displayMode}
        className={className}
      />
    );
  }

  // Fallback to plain text for non-LaTeX content
  return <span className={className}>{content}</span>;
}

/**
 * Renders content that may contain both plain text and math expressions
 */
function renderMixedContent(content: string): React.ReactNode[] {
  const parts = content.split(/(\$\$[^$]+\$\$|\$[^$]+\$)/);
  
  return parts.map((part, index) => {
    // Check if this part is a math expression
    if (part.startsWith('$$') && part.endsWith('$$')) {
      // Display math (block)
      const mathContent = part.slice(2, -2);
      return (
        <LaTeXRenderer
          key={`block-${index}-${mathContent}`}
          latex={mathContent}
          displayMode={true}
        />
      );
    }
    
    if (part.startsWith('$') && part.endsWith('$')) {
      // Inline math
      const mathContent = part.slice(1, -1);
      return (
        <LaTeXRenderer
          key={`inline-${index}-${mathContent}`}
          latex={mathContent}
          displayMode={false}
        />
      );
    }
    
    // Plain text
    return part;
  });
}

/**
 * Improved LaTeX detection function
 */
function detectLaTeX(content: string): boolean {
  // Check for dollar delimiters (most common in our app)
  if (content.includes("$")) {
    return true;
  }

  // Check for LaTeX commands (backslash followed by letters)
  if (/\\[a-zA-Z]+/.test(content)) {
    return true;
  }

  // Check for LaTeX braces and brackets  
  if (content.includes("\\") || content.includes("{") || content.includes("}")) {
    return true;
  }

  // Check for LaTeX symbols and operators
  if (/\\(frac|sqrt|sum|int|lim|infty|alpha|beta|gamma|delta|pi|sigma|theta|mu|lambda|cdot|times|div|pm|geq|leq|neq|approx|subset|supset|in|notin|cap|cup|emptyset|forall|exists|partial|nabla|mathbb|mathcal|mathrm|text)/.test(content)) {
    return true;
  }

  // Check for common math environments
  if (/\\(begin|end)\{/.test(content)) {
    return true;
  }

  return false;
} 