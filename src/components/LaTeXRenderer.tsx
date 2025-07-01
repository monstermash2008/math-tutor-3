import katex from "katex";
import { useEffect, useRef } from "react";
import "katex/dist/katex.min.css";

interface LaTeXRendererProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
}

export function LaTeXRenderer({
  latex,
  displayMode = false,
  className = "",
}: LaTeXRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && latex) {
      try {
        katex.render(latex, containerRef.current, {
          displayMode,
          throwOnError: false,
          strict: "warn",
          trust: true,
          macros: {
            "\\RR": "\\mathbb{R}",
            "\\ZZ": "\\mathbb{Z}",
            "\\QQ": "\\mathbb{Q}",
            "\\NN": "\\mathbb{N}",
            "\\CC": "\\mathbb{C}",
          },
        });
      } catch (error) {
        console.warn("LaTeX rendering error:", error);
        if (containerRef.current) {
          containerRef.current.textContent = latex;
        }
      }
    }
  }, [latex, displayMode]);

  return <div ref={containerRef} className={className} />;
} 