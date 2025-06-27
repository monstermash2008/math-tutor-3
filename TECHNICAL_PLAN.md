Implementation Plan: Interactive Math Tutor
This document outlines the phased implementation plan for the Interactive Math Solver Engine. Each phase represents a logical milestone, building upon the previous one. The plan is designed to support a Test-Driven Development (TDD) workflow by providing detailed scenarios and expected behaviors for testing at each stage.

Phase 1: Core Mathematical Engine & Validation Logic
Objective: To build the logical core of the application, completely independent of the UI. This phase will result in a robust, testable JavaScript module that can parse, validate, and compare mathematical inputs.

Key Components/Modules:

CAS Integration: Integrate math.js as the core Computer Algebra System.

Validation Module (validation.js): A collection of pure functions responsible for all mathematical logic.

Technical Challenges & Considerations:

Equation Parsing: math.js does not parse full equations (e.g., 3x = 9) directly. A primary challenge is to create a robust getCanonical function that can transform an equation A = B into a simplified expression A - B to check for equivalence (where the canonical form of a correct equation is 0).

Canonical Form Consistency: Ensuring that all equivalent expressions or equations resolve to the exact same canonical string/object is critical. This includes standardizing variable order (e.g., y + 2x becomes 2x + y), term order (descending powers), and simplifying coefficients.

Error Handling: The parsing functions must gracefully handle malformed or nonsensical input (e.g., 3x ++ 5 =) without crashing.

TDD Testing Scenarios:

Canonical Form Generation (getCanonical):

'2x + 10' -> returns a node equivalent to 2x + 10

'10 + 2x' -> returns a node equivalent to 2x + 10

'3x = 9' -> returns a node equivalent to 3x - 9

'x = 3' -> returns a node equivalent to x - 3

'4(x - 3) = 10' -> returns a node equivalent to 4x - 22

'--x' -> should be handled gracefully (e.g., returns a node for x)

'5x = = 9' -> should throw a specific ParsingError

Simplification Check (isFullySimplified):

'x = 3' -> returns true

'x = 9/3' -> returns false

'3x - 7' -> returns true

'4x - x - 7' -> returns false

'10 + 2x' -> returns true (assuming term order is handled post-simplification)

Main Validator Logic (hypothetical validateStep function):

previousStep: '3x = 9', studentInput: 'x = 3' -> returns { result: 'CORRECT_FINAL_STEP' }

previousStep: '3x = 9', studentInput: 'x = 9/3' -> returns { result: 'CORRECT_BUT_NOT_SIMPLIFIED' }

previousStep: '5x+3=2x+12', studentInput: '3x+3=12' -> returns { result: 'CORRECT_INTERMEDIATE_STEP' }

previousStep: '5x+3=2x+12', studentInput: '5x+3-12=2x' -> returns { result: 'VALID_BUT_NO_PROGRESS' } (or 'CORRECT_INTERMEDIATE_STEP' if path is considered valid).

previousStep: '3x-7=14', studentInput: '3x=20' -> returns { result: 'EQUIVALENCE_FAILURE', reason: 'Arithmetic Error' }

Phase 2: UI Scaffolding & State Management
Objective: To build the static React component structure and set up robust client-side state management. This phase will not include any validation logic but will ensure the UI is ready to be wired up.

Key Components/Modules:

React Components:

ProblemView.jsx: Displays the problem statement.

StepsHistory.jsx: Maps over the history array in state and displays each correct step.

UserInput.jsx: Contains the input field and "Check" button.

FeedbackDisplay.jsx: A component to display feedback, initially with placeholder states (loading, success, error).

App.jsx: The main component that orchestrates the layout and state.

State Management: Use React's useState and useReducer hooks for managing the application state (e.g., userHistory, currentStatus, feedbackMessage).

Technical Challenges & Considerations:

State Normalization: Designing a clean and predictable state object is crucial. A reducer is likely better than multiple useState hooks to handle complex state transitions (e.g., moving from checking to correct to awaiting_next_step).

Component Decoupling: Keep the mathematical logic separate from the UI components. Components should receive props and report user actions via callbacks, without knowing how the validation works.

TDD Testing Scenarios (Component/Integration Tests with a tool like Vitest/RTL):

StepsHistory Component:

Given an empty array, it renders nothing.

Given ['5x+3=2x+12', '3x+3=12'], it renders two distinct history items in the correct order.

UserInput Component:

When the "Check" button is clicked, the onCheckStep callback is fired with the input's current value.

When the problem is solved (e.g., a prop isSolved={true} is passed), the input and button become disabled.

App Component (Integration):

Simulate a user input and a "check" action.

Mock the validation function to return a "CORRECT_INTERMEDIATE_STEP" result.

Assert that the state is updated and the StepsHistory component re-renders with the new step.

Phase 3: Connecting UI to the Validation Engine
Objective: To bridge the gap between the UI and the core logic. This phase makes the application interactive, with real validation occurring locally.

Key Components/Modules:

Event Handlers in App.jsx: The logic that fires when the user clicks "Check".

State Reducer Logic: The reducer will handle actions like CHECK_STEP_START, CHECK_STEP_SUCCESS, CHECK_STEP_ERROR and update the state accordingly.

Technical Challenges & Considerations:

Flow Control: Managing the flow of data is key: UserInput -> App.jsx handler -> validationModule -> stateReducer -> updated state flows back to all components.

UI State Synchronization: Ensuring the UI accurately reflects the application's state (e.g., showing a loading spinner on the button while checking, displaying the correct feedback message).

TDD Testing Scenarios (Integration Tests):

Full Success Flow:

User sees problem 5x+3=2x+12.

User types 3x+3=12 and clicks "Check".

Assert the UI shows a temporary "checking" state.

Assert the new step 3x+3=12 appears in the StepsHistory.

Assert the input field is cleared.

Assert a placeholder "Correct!" message appears in FeedbackDisplay.

Final Simplification Flow:

User history includes 3x=9. User types x=9/3 and clicks "Check".

Assert the new step appears.

Assert the feedback component shows a "Correct, but please simplify" message.

Failure Flow:

User sees problem 5x+3=2x+12.

User types 7x=9 and clicks "Check".

Assert the StepsHistory does not change.

Assert the input field is not cleared.

Assert an "Incorrect" message appears in FeedbackDisplay.

Phase 4: LLM Integration via OpenRouter
Objective: To replace placeholder feedback with dynamic, context-aware feedback generated by an LLM, managed through direct client-side API calls to OpenRouter.

Key Components/Modules:

React Query Integration: Use useMutation from React Query to handle the API call to OpenRouter. This will manage loading, error, and success states for the asynchronous request.

LLMFeedbackService.js: A module containing the constructPrompt function and the logic to make the fetch call to the OpenRouter API.

FeedbackDisplay.jsx Update: This component will now use the data from the useMutation hook to display loading states, API errors, or the successful LLM response.

Technical Challenges & Considerations:

Client-Side API Key Management: This is now the most critical challenge. Exposing an API key on the client-side is a significant security risk.

Mitigation Strategy: Use Vite's environment variables (VITE_OPENROUTER_API_KEY) to store the key. This keeps it out of source control. However, this key will be visible in the bundled production code.

Documentation: The project README must clearly state that this is for development/prototyping only and that for a public-facing application, a backend proxy (as originally planned) is required to protect the key and manage costs.

OpenRouter API Call Structure: The fetch request to https://openrouter.ai/api/v1/chat/completions must be correctly structured.

Headers: Must include Authorization: Bearer $VITE_OPENROUTER_API_KEY.

Site Identification: For free models, OpenRouter requires site identification via the HTTP-Referer header. This will be automatically handled by the browser but must be configured in the OpenRouter account.

Body: Must include the chosen model and a messages array structured according to the OpenAI spec (e.g., [{ role: 'user', content: 'Your prompt here...' }]).

Prompt Engineering: Crafting prompts that reliably generate safe, accurate, and pedagogically useful feedback is an iterative process.

Latency Management: LLM API calls are slow. React Query's isLoading state is perfect for driving loading indicators.

TDD Testing Scenarios (using a mock service worker like msw):

Prompt Construction:

For each validation result (EQUIVALENCE_FAILURE, etc.), trigger a validation and assert that the constructPrompt function generates the expected prompt string.

React Query useMutation Hook:

Intercept the fetch call using msw. Assert that the request to the OpenRouter endpoint has the correct headers (especially Authorization) and a properly structured body.

Mock a successful API response from OpenRouter. Assert that the FeedbackDisplay component renders the text from the choices[0].message.content field of the mock response.

Mock a network error (e.g., 401 Unauthorized, 429 Rate Limit Exceeded). Assert that the FeedbackDisplay shows a user-friendly error message.

Assert that a loading indicator is shown while the mock API call is "in-flight".