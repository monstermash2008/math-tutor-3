# Math Tutor 3 - AI Coding Instructions

## Architecture Overview

This is an **interactive math tutor** built with React + TanStack Router frontend and Convex backend. The app validates student math work step-by-step using a sophisticated Computer Algebra System (CAS) and provides AI-generated feedback through OpenRouter LLM integration.

### Tech Stack
- **Frontend**: React 19, TanStack Router, Tailwind CSS, Vite
- **Backend**: Convex (serverless), CortexJS + MathJS math engines  
- **AI**: OpenRouter API for dynamic feedback generation
- **Testing**: Vitest + React Testing Library, 45% coverage threshold
- **Package Manager**: pnpm (never use npm/yarn)

## Key Architecture Patterns

### Math Engine Bridge Pattern
The app is migrating from MathJS to CortexJS through a bridge pattern in `convex/math_engine_bridge.ts`:
```typescript
// Feature flag controls migration
const USE_CORTEX_JS = true;

// All math functions use bridge with fallback
export function areEquivalent(expr1: string, expr2: string): boolean {
  if (USE_CORTEX_JS) {
    try {
      return checkEquivalence(expr1, expr2);
    } catch {
      return mathJSAreEquivalent(expr1, expr2); // Fallback
    }
  }
}
```

**Critical**: Never use regex for math comparison - always use the CAS through the bridge pattern.

### Validation Flow Architecture
1. **Frontend** (`MathTutorApp.tsx`) - User inputs math step
2. **Convex Action** (`validation.ts`) - Validates with math engine + generates LLM feedback
3. **Math Engine** - Tree-based expression analysis and canonical form comparison
4. **LLM Service** - Context-aware feedback generation via OpenRouter

### State Management Pattern
Uses `useReducer` with optimistic updates:
```typescript
// Immediately show "Validating..." while backend processes
dispatch({ type: "CHECK_STEP_START", payload: { step: inputForValidation }});

// Backend validation updates with real result
const validationResponse = await validateStepAction({...});
```

## Critical Development Conventions

### Environment & Config
- **API Keys**: Store in `.env.local` as `VITE_OPENROUTER_API_KEY` (development only)
- **Package Manager**: Always use `pnpm` - configured in `.cursor/rules/package-manager.mdc`
- **Math Validation**: Never use regex - use CAS functions via bridge pattern

### Testing Patterns
Run tests with: `pnpm test` or `pnpm test:coverage`

**Important Test Patterns**:
```typescript
// Integration tests mock backend actions
const mockValidateStep = vi.fn().mockResolvedValue({
  result: "CORRECT_INTERMEDIATE_STEP",
  isCorrect: true,
  feedback: "Great job!"
});

// Focus on business logic, not external API calls
// LLM API tests are skipped - too complex to mock reliably
```

### Database Schema Patterns
Convex uses type-safe schema in `convex/schema.ts`:
```typescript
problems: defineTable({
  problemStatement: v.string(),
  solutionSteps: v.array(v.string()),
  problemType: v.union(v.literal("SOLVE_EQUATION"), v.literal("SIMPLIFY_EXPRESSION")),
  difficulty: v.union(v.literal("Easy"), v.literal("Medium"), v.literal("Hard")),
  // ... metadata and analytics fields
}).index("problemType", ["problemType"])
```

## Key Files & Responsibilities

### Core Math Engine
- `convex/math_engine_bridge.ts` - Bridge between MathJS→CortexJS with fallbacks
- `convex/validation_engine.ts` - Step validation logic with tree analysis
- `convex/cortex_math_engine.ts` - CortexJS implementation (new)
- `convex/math_engine.ts` - MathJS implementation (legacy)

### Frontend Components
- `src/components/MathTutorApp.tsx` - Main app with state management and backend integration
- `src/components/UserInput.tsx` - Math input with MathQuill LaTeX editor
- `src/components/StepsHistory.tsx` - Shows student progress with feedback
- `src/components/ProblemView.tsx` - Displays problem statement

### Backend Integration
- `convex/validation.ts` - Main validation action called by frontend
- `convex/llm_service.ts` - LLM feedback generation via OpenRouter
- `convex/problems.ts` - CRUD operations for math problems

## Common Development Tasks

### Adding New Problem Types
1. Update `problemType` union in `src/types/index.ts` and `convex/schema.ts`
2. Add validation logic in `convex/validation_engine.ts`
3. Update LLM prompts in `convex/llm_service.ts`
4. Add test cases in `src/components/__tests__/`

### Math Engine Updates
Always modify through the bridge pattern:
1. Add new function to appropriate engine file (`cortex_math_engine.ts` preferred)
2. Add bridge function in `math_engine_bridge.ts` with fallback
3. Update validation engine to use bridge function
4. Test with both `USE_CORTEX_JS = true/false`

### Testing Strategy
- **Unit Tests**: Math engine functions, validation logic
- **Integration Tests**: Full user workflows through MathTutorApp
- **Manual Testing**: Real LLM API calls (tests can't reliably mock)
- **Coverage**: 45% threshold, focused on business logic

### Debugging Validation Issues
1. Check math engine bridge fallbacks
2. Verify canonical form generation
3. Test step equivalence with both engines
4. Examine LLM prompt construction in `constructPrompt()`

## Important Constraints

### Security
- **API Keys**: Client-side storage is development-only (visible in bundle)
- **Production**: Requires backend proxy to protect OpenRouter API key

### Performance
- **Local Validation**: <500ms for CAS operations
- **LLM Feedback**: 3s timeout with loading states
- **Backend**: Convex actions include performance timing

### Math Engine Migration
- **Never break fallbacks** - always test both CortexJS and MathJS paths
- **Canonical forms must match** between engines during migration
- **Gradual rollout** - use feature flags for safe deployment

Remember: This is a sophisticated math education app with complex validation logic. Always test mathematical equivalence thoroughly and maintain the bridge pattern during engine migration.
