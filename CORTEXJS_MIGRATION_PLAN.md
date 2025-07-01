# CortexJS Migration Plan

## Overview

This document outlines the migration strategy from MathJS to the CortexJS ecosystem, specifically integrating:

- **CortexJS Compute Engine** to replace MathJS for mathematical computation
- **CortexJS MathField** to replace the basic HTML input component
- **KaTeX** for static math rendering where needed

## Current State Analysis

### Existing MathJS Usage

- **Primary Location**: `convex/math_engine.ts` (1,017 lines)
- **Key Functions**: `parse()`, `simplify()`, `MathNode` types from MathJS
- **Core Capabilities**: Expression parsing, simplification, equivalence checking, canonical forms
- **Test Coverage**: many passing tests across multiple mathematical domains

### Current Input System

- **Component**: `src/components/UserInput.tsx`
- **Type**: Basic HTML `<input>` with text input
- **Limitations**: No LaTeX support, no mathematical symbols, poor UX for complex expressions

## Migration Goals

### Primary Objectives

1. **LaTeX Support**: Enable LaTeX input from students and LaTeX output for displaying steps
2. **Enhanced Math Input**: Replace basic text input with rich mathematical input using MathField
3. **Backward Compatibility**: Ensure all existing tests pass

### Success Criteria

- ✅ All existing unit tests pass
- ✅ Students can input mathematical expressions using LaTeX syntax
- ✅ Math steps are displayed with proper LaTeX rendering
- ✅ No regression in mathematical accuracy or capabilities
- ✅ Enhanced user experience for math input

## Phase 1: Dependency Setup and Environment Preparation

### 1.1 Install CortexJS Dependencies

```bash
# Core CortexJS packages
pnpm add @cortex-js/compute-engine @cortex-js/mathfield

# Optional: KaTeX for static rendering (if needed)
pnpm add katex
pnpm add -D @types/katex
```

### 1.2 Update Development Dependencies

```bash
# Additional type definitions if needed
pnpm add -D @types/mathfield
```

### 1.3 Configure Import Maps/Module Resolution

Update `vite.config.ts` if needed to handle ES modules from CortexJS packages.

## Phase 2: Math Engine Migration

### 2.1 Create New Compute Engine Module

**File**: `convex/cortex_math_engine.ts`

```typescript
import { ComputeEngine } from "@cortex-js/compute-engine";
import { MathParsingError } from "../src/types";
import type { SimplificationPattern, TreeAnalysisResult } from "../src/types";

// Initialize CortexJS Compute Engine
const ce = new ComputeEngine();

// Core migration functions
export function parseLatexExpression(latex: string) {
  return ce.parse(latex);
}

export function parseTextExpression(text: string) {
  // Handle both LaTeX and plain text input
  try {
    return ce.parse(text);
  } catch {
    // Fallback: try parsing as LaTeX if direct parse fails
    return ce.parse(`\\text{${text}}`);
  }
}

export function simplifyExpression(expr: any) {
  return expr.simplify();
}

export function checkEquivalence(expr1: string, expr2: string): boolean {
  const parsed1 = ce.parse(expr1);
  const parsed2 = ce.parse(expr2);
  return parsed1.isEqual(parsed2);
}
```

### 2.2 Create Migration Bridge

**File**: `convex/math_engine_bridge.ts`

This file will gradually replace MathJS functions with CortexJS equivalents while maintaining the same API:

```typescript
// Bridge to maintain existing API while migrating internals
import { ComputeEngine } from "@cortex-js/compute-engine";
import type { MathNode } from "mathjs"; // Keep for backward compatibility during migration

const ce = new ComputeEngine();

// Gradual replacement of existing functions
export function validateMathInputSyntax(input: string) {
  // Migrate this function to use CortexJS parsing
  // Keep existing return type structure
}

export function getCanonical(input: string) {
  // Replace MathJS implementation with CortexJS
  // Return compatible structure
}

export function areEquivalent(expr1: string, expr2: string): boolean {
  // Replace MathJS comparison with CortexJS
}

export function isFullySimplified(input: string): boolean {
  // Implement using CortexJS simplification detection
}
```

### 2.3 Migration Strategy

1. **Function-by-Function Migration**: Replace each function in `math_engine.ts` incrementally
2. **API Compatibility**: Maintain existing function signatures during transition
3. **Test-Driven Migration**: Ensure each migrated function passes existing tests
4. **Progressive Enhancement**: Add LaTeX-specific capabilities after core migration

## Phase 3: Enhanced UserInput Component with MathField

### 3.1 Create New MathField Input Component

**File**: `src/components/MathInput.tsx`

```typescript
import { useEffect, useRef, useState } from "react";
import { MathfieldElement } from "@cortex-js/mathfield";

interface MathInputProps {
  onCheckStep: (input: string, latex: string) => void;
  isSolved: boolean;
  stepNumber: number;
  placeholder?: string;
}

export function MathInput({
  onCheckStep,
  isSolved,
  stepNumber,
  placeholder = "Enter your mathematical expression...",
}: MathInputProps) {
  const mathfieldRef = useRef<MathfieldElement>(null);
  const [value, setValue] = useState("");

  const handleCheck = () => {
    if (mathfieldRef.current && value.trim()) {
      const latex = mathfieldRef.current.value; // LaTeX format
      const text = mathfieldRef.current.$text(); // Plain text format
      onCheckStep(text, latex);
      mathfieldRef.current.value = ""; // Clear input
      setValue("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCheck();
    }
  };

  useEffect(() => {
    const mathfield = mathfieldRef.current;
    if (mathfield) {
      mathfield.addEventListener("keydown", handleKeyDown);
      mathfield.addEventListener("input", (e) => {
        setValue(mathfield.$text());
      });

      return () => {
        mathfield.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, []);

  return (
    <div className="mt-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {isSolved ? "Problem Solved!" : `Step ${stepNumber}:`}
      </label>
      <div className="flex items-center space-x-3">
        <math-field
          ref={mathfieldRef}
          class="flex-grow w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder={isSolved ? "Great job!" : placeholder}
          disabled={isSolved}
        />
        <button
          type="button"
          onClick={handleCheck}
          disabled={isSolved || !value.trim()}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Check
        </button>
      </div>
    </div>
  );
}
```

### 3.2 Add MathField Type Declarations

**File**: `src/types/mathfield.d.ts`

```typescript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "math-field": any;
    }
  }
}

export {};
```

### 3.3 Update MathTutorApp Component

Modify `src/components/MathTutorApp.tsx` to:

1. Import the new `MathInput` component
2. Update `handleCheckStep` to accept both text and LaTeX parameters
3. Enhance validation to work with both formats

## Phase 4: LaTeX Rendering and Display

### 4.1 Static Math Rendering Component

**File**: `src/components/LaTeXRenderer.tsx`

```typescript
import { useEffect, useRef } from "react";
import katex from "katex";
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
        });
      } catch (error) {
        console.warn("LaTeX rendering error:", error);
        containerRef.current.textContent = latex; // Fallback to raw LaTeX
      }
    }
  }, [latex, displayMode]);

  return <div ref={containerRef} className={className} />;
}
```

### 4.2 Enhanced Steps Display

Update `src/components/StepsHistory.tsx` to render mathematical expressions using LaTeX:

```typescript
import { LaTeXRenderer } from "./LaTeXRenderer";

// In step rendering:
<LaTeXRenderer
  latex={step.latex || step.text}
  displayMode={false}
  className="font-medium text-gray-800"
/>;
```

## Phase 5: Testing Strategy

### 5.1 Existing Test Migration

**Target Files**:

- `src/lib/__tests__/math-engine.capabilities.test.ts`
- All existing math engine tests

**Strategy**:

1. **Dual Testing**: Run tests against both MathJS and CortexJS during migration
2. **Assertion Mapping**: Map MathJS expectations to CortexJS equivalents
3. **Enhanced Testing**: Add LaTeX-specific test cases

### 5.2 New Test Categories

**File**: `src/lib/__tests__/cortexjs-integration.test.ts`

```typescript
describe("CortexJS Integration Tests", () => {
  describe("LaTeX Input Processing", () => {
    it("should parse LaTeX expressions correctly", () => {
      // Test LaTeX parsing
    });

    it("should handle mixed LaTeX and plain text", () => {
      // Test input flexibility
    });
  });

  describe("Mathematical Equivalence", () => {
    it("should correctly identify equivalent expressions in LaTeX", () => {
      // Test LaTeX equivalence
    });
  });
});
```

**File**: `src/components/__tests__/MathInput.test.tsx`

```typescript
describe("MathInput Component", () => {
  it("should render MathField correctly", () => {
    // Test MathField integration
  });

  it("should emit both text and LaTeX on submission", () => {
    // Test dual output format
  });

  it("should handle keyboard shortcuts", () => {
    // Test mathematical input shortcuts
  });
});
```

### 5.3 Test Migration Checklist

- [ ] All existing capability tests pass with CortexJS
- [ ] LaTeX input parsing tests
- [ ] MathField component tests
- [ ] LaTeX rendering tests
- [ ] End-to-end integration tests
- [ ] Performance benchmark tests

## Phase 6: Configuration and Optimization

### 6.1 CortexJS Configuration

```typescript
// Configure Compute Engine for optimal performance
const ce = new ComputeEngine({
  // Precision settings
  precision: 15,

  // LaTeX dictionary customization
  latexDictionary: [
    // Add custom LaTeX commands if needed
  ],

  // Symbol definitions
  symbols: {
    // Custom symbols if needed
  },
});
```

### 6.2 MathField Configuration

```typescript
// Global MathField configuration
import { MathfieldElement } from "@cortex-js/mathfield";

MathfieldElement.fontsDirectory = "/fonts/";
MathfieldElement.soundsDirectory = "/sounds/";

// Configure default options
MathfieldElement.prototype.setOptions({
  virtualKeyboardMode: "manual",
  smartFence: true,
  smartSuperscript: true,
  inlineShortcuts: {
    // Custom shortcuts
  },
});
```

## Risk Mitigation

### Technical Risks

1. **API Differences**: CortexJS may have different behavior than MathJS
   - _Mitigation_: Comprehensive testing and API mapping
2. **Performance Impact**: New library may be slower
   - _Mitigation_: Performance benchmarking and optimization
3. **LaTeX Complexity**: Students may struggle with LaTeX syntax
   - _Mitigation_: User education and input assistance features

### User Experience Risks

1. **Learning Curve**: New math input interface
   - _Mitigation_: Progressive disclosure and tooltips
2. **Browser Compatibility**: MathField browser support
   - _Mitigation_: Fallback to text input for unsupported browsers

## Success Metrics

### Technical Metrics

- 100% of existing tests pass

### User Experience Metrics

- Improved math input completion rates
- Reduced input errors
- Positive user feedback on math input experience

### Educational Metrics

- Maintained or improved problem-solving accuracy
- Enhanced step-by-step mathematical reasoning support

This migration will significantly enhance the mathematical capabilities of the tutoring application while maintaining backward compatibility and improving the user experience for mathematical input and display.
