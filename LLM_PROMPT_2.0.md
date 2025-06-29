# LLM Prompt 2.0: Enhanced Mathematical Context

## 📋 **Overview**

This plan leverages the sophisticated tree-based analysis functions to provide much richer context to the LLM, transforming prompts from basic validation results to comprehensive mathematical understanding.

## **🎯 Goal**
Transform the LLM prompts from basic validation results to **rich mathematical context** using the unused utility functions, giving the AI much better understanding of:
- What mathematical concepts are involved
- What the student attempted to do
- Specific areas that need attention
- Contextual hints for guidance

---

## **🔧 Implementation Strategy**

### **Phase 1: Extend LLM Request Interface** ✅
**File**: `src/lib/llm-feedback-service.ts`

Add new fields to `LLMFeedbackRequest`:
```typescript
interface LLMFeedbackRequest {
  // ... existing fields ...
  
  // New enhanced analysis fields
  contextualHints?: string[];
  stepOperation?: {
    operationType: string;
    isValid: boolean;
    description: string;
  };
  needsSimplification?: boolean;
  simplificationSuggestions?: string[];
}
```

### **Phase 2: Generate Enhanced Analysis**
**File**: `src/components/MathTutorApp.tsx`

Before calling LLM, gather all the enhanced analysis:
```typescript
// After validation, before LLM call
const contextualHints = generateContextualHints(context);
const needsSimpl = needsSimplification(studentInput);
const simplSuggestions = getSimplificationSuggestions(studentInput);

let stepOperation = undefined;
if (state.userHistory.length > 1) {
  stepOperation = analyzeStepOperation(previousStep, studentInput);
}

const enhancedLLMRequest: LLMFeedbackRequest = {
  // ... existing fields ...
  contextualHints,
  stepOperation,
  needsSimplification: needsSimpl,
  simplificationSuggestions: simplSuggestions,
};
```

### **Phase 3: Enhanced Prompt Construction**
**File**: `src/lib/llm-feedback-service.ts`

Modify `constructPrompt()` to include sections for:

1. **Mathematical Context Section**:
   ```
   MATHEMATICAL ANALYSIS:
   - Expression needs simplification: ${needsSimplification}
   - Detected patterns: ${detectedPatterns}
   - Contextual hints: ${contextualHints}
   ```

2. **Step Operation Analysis** (when available):
   ```
   STUDENT'S ATTEMPTED OPERATION:
   - Operation type: ${stepOperation.operationType}
   - Operation description: ${stepOperation.description}
   - Operation validity: ${stepOperation.isValid}
   ```

3. **Specific Guidance Section**:
   ```
   SPECIFIC MATHEMATICAL GUIDANCE:
   ${simplificationSuggestions.join('\n')}
   ```

### **Phase 4: Contextual Prompt Strategies**

Different validation results get different enhanced contexts:

#### **For `EQUIVALENCE_FAILURE`**:
- ✅ Include `stepOperation` analysis to understand what student tried
- ✅ Include `contextualHints` for mathematical guidance  
- ✅ Include `simplificationSuggestions` for concrete next steps

#### **For `CORRECT_BUT_NOT_SIMPLIFIED`**:
- ✅ Focus on `simplificationSuggestions`
- ✅ Include `needsSimplification` confirmation
- ✅ Use `contextualHints` for simplification guidance

#### **For `VALID_BUT_NO_PROGRESS`**:
- ✅ Use `stepOperation` to explain why no progress was made
- ✅ Include `contextualHints` to suggest different approaches

#### **For `CORRECT_INTERMEDIATE_STEP`**:
- ✅ Use `stepOperation` to acknowledge what they did well
- ✅ Include hints about the next logical step

---

## **🎯 Expected Benefits**

### **1. Richer LLM Context**
**Before**: *"Student input failed equivalence check"*  
**After**: *"Student attempted to combine like terms but made an arithmetic error. Specific guidance: You can combine like terms: 3x + 2x → 5x"*

### **2. More Targeted Feedback**
- LLM understands **what mathematical concept** the student is working with
- LLM knows **what operation** the student attempted
- LLM has **specific suggestions** to guide the student

### **3. Better Educational Value**
- Feedback becomes more pedagogically sound
- Students get concrete mathematical guidance
- AI responses become more like a knowledgeable math tutor

---

## **📝 Implementation Order**

1. **✅ Phase 1**: Extend `LLMFeedbackRequest` interface - add the new fields
2. **Phase 2**: Update `MathTutorApp.tsx` - gather enhanced analysis before LLM calls
3. **Phase 3**: Enhance `constructPrompt()` - modify the prompt template
4. **Phase 4**: Test with different scenarios - verify prompts are more informative
5. **Phase 5**: Iterate on prompt templates - refine based on LLM response quality

---

## **🧪 Success Metrics**

- **Prompt informativeness**: LLM prompts contain specific mathematical context
- **Response quality**: LLM responses become more targeted and educational
- **Student guidance**: Feedback includes concrete mathematical steps
- **Code utilization**: All 4 unused functions become actively used

---

## **🔄 Unused Functions Now Utilized**

### **From `src/lib/validation-engine.ts`:**

1. **`generateContextualHints(context: ValidationContext): string[]`** → Used for mathematical guidance
2. **`needsSimplification(expression: string): boolean`** → Used for simplification prompts
3. **`getSimplificationSuggestions(expression: string): string[]`** → Used for specific guidance
4. **`analyzeStepOperation(previousStep: string, currentStep: string)`** → Used for operation understanding

These functions transform from unused code to core components of an enhanced AI tutoring experience. 