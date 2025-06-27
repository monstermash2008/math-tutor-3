Automated Testing Plan: Interactive Math Tutor
This document outlines the automated testing strategy for the Interactive Math Solver Engine project. The plan is aligned with the four phases of the implementation plan, enabling a Test-Driven Development (TDD) approach where tests are written before the corresponding features.

Testing Stack:

Test Runner/Framework: Vitest

Component/DOM Testing: React Testing Library (RTL)

API Mocking: Mock Service Worker (MSW)

Phase 1: Unit Testing the Core Mathematical Engine
Testing Goal: To achieve high confidence in the mathematical logic by rigorously testing the pure functions in the validation.js module. These tests will be fast, isolated, and will form the foundation of the application's reliability.

Tools: Vitest

Key Test Suites:

getCanonical.test.js

isFullySimplified.test.js

validateStep.test.js

Detailed Test Cases & Scenarios:

getCanonical Suite:

Expressions:

it('should handle simple expressions'): input '2x + 10', expect node equivalent to 2x + 10.

it('should handle reordered terms'): input '10 + 2x', expect node equivalent to 2x + 10.

it('should handle expressions with distribution'): input '4(x - 3)', expect node equivalent to 4x - 12.

Equations:

it('should convert a simple equation to a subtraction expression'): input '3x = 9', expect node equivalent to 3x - 9.

it('should handle complex equations'): input '4(x - 3) = 10', expect node equivalent to 4x - 22.

Edge Cases & Errors:

it('should handle double unary operators'): input '--x', expect node equivalent to x.

it('should throw a ParsingError for malformed equations'): input '5x = = 9', expect toThrow(ParsingError).

it('should handle empty strings and whitespace'): input ' ', expect to throw an error or return null.

isFullySimplified Suite:

it('should return true for simplified integers'): input 'x = 3', expect true.

it('should return false for unsimplified fractions'): input 'x = 9/3', expect false.

it('should return false for expressions with uncombined terms'): input '4x - x - 7', expect false.

it('should return true for simplified expressions'): input '3x - 7', expect true.

validateStep Suite (The main business logic):

Correct Paths:

it('should identify a correct intermediate step'): validateStep('5x+3=2x+12', '3x+3=12') -> returns { result: 'CORRECT_INTERMEDIATE_STEP' }.

it('should identify a correct final step'): validateStep('3x = 9', 'x = 3') -> returns { result: 'CORRECT_FINAL_STEP' }.

Incorrect Paths:

it('should identify an equivalence failure'): validateStep('3x-7=14', '3x=20') -> returns { result: 'EQUIVALENCE_FAILURE', ... }.

Nuanced Paths:

it('should identify a correct but unsimplified final answer'): validateStep('3x = 9', 'x = 9/3') -> returns { result: 'CORRECT_BUT_NOT_SIMPLIFIED' }.

it('should identify a valid step that makes no progress'): validateStep('5x+3=2x+12', '3+5x=2x+12') -> returns { result: 'VALID_BUT_NO_PROGRESS' }.

Phase 2: Component Testing the UI Scaffolding
Testing Goal: To verify that React components render correctly based on props and that user interactions trigger the appropriate callbacks. Logic is mocked, and the focus is purely on the component's contract with its parent.

Tools: Vitest, React Testing Library (RTL)

Key Test Suites:

StepsHistory.test.jsx

UserInput.test.jsx

FeedbackDisplay.test.jsx

Detailed Test Cases & Scenarios:

StepsHistory Suite:

it('should render a list of steps when history is provided'): Pass a history array and assert that the correct number of <li> (or div) elements are rendered with the correct text content.

it('should render nothing for an empty history array'): Pass history={[]} and assert the component renders null or an empty container.

UserInput Suite:

it('should call the onCheckStep prop with the input value on button click'): Use fireEvent to simulate a click and assert the mock callback (vi.fn()) was called once with the correct payload.

it('should call onCheckStep on Enter key press'): Use fireEvent.keyDown to simulate the "Enter" key and assert the callback was called.

it('should disable the input and button when isSolved prop is true'): Render the component with isSolved={true} and assert that both the <input> and <button> elements have the disabled attribute.

FeedbackDisplay Suite:

it('should display a loading state'): Render the component with props like status='loading' and assert that a spinner or loading text is present.

it('should display a success message'): Render with status='success' and message='Correct!' and assert the message is displayed with the correct CSS classes (e.g., bg-green-50).

it('should display an error message'): Render with status='error' and assert the message is displayed with error-related styles.

Phase 3: Integration Testing the Connected Application
Testing Goal: To verify that the UI components and the core validation engine work together as expected. These tests will simulate user flows within the main App.jsx component, mocking only what is external (i.e., the LLM API).

Tools: Vitest, RTL

Key Test Suites:

App.integration.test.jsx

Detailed Test Cases & Scenarios:

The "Golden Path" User Flow:

it('should allow a user to complete a problem step-by-step'):

Render the full <App /> component.

Simulate the user typing a correct first step (3x+3=12) and clicking "Check".

Assert that the step history is updated and a placeholder success message is shown.

Simulate the user typing the next correct step (3x=9) and clicking "Check".

Repeat until the final step (x=3) is entered.

Assert the final history is correct and the UserInput component becomes disabled.

Incorrect Answer Flow:

it('should display an error and not update history for an incorrect answer'):

Render <App />.

Assert the initial number of steps in the history.

Simulate the user typing an incorrect step (7x=9) and clicking "Check".

Assert the step history length has not changed.

Assert the input field retains the incorrect value (7x=9).

Assert a placeholder error message is shown in the feedback component.

Unsimplified Final Answer Flow:

it('should show a "please simplify" message for a correct but unsimplified final answer'):

Programmatically advance the state to the penultimate step (3x=9).

Simulate the user typing x=9/3 and clicking "Check".

Assert the step is added to the history.

Assert the feedback message specifically prompts for simplification.

Assert the UserInput is not disabled yet.

Phase 4: End-to-End and Service Mocking for LLM Integration
Testing Goal: To verify the final piece of the application: the asynchronous communication with the OpenRouter API. This ensures prompts are correctly formatted and API responses (both success and failure) are handled gracefully in the UI.

Tools: Vitest, RTL, Mock Service Worker (MSW)

Key Test Suites:

LLMFeedbackService.test.js (Unit Tests for prompt construction)

App.integration.llm.test.jsx (Integration Tests with API mocking)

Detailed Test Cases & Scenarios:

LLMFeedbackService Suite (Unit Tests):

it('should construct the correct prompt for an EQUIVALENCE_FAILURE'): Call constructPrompt with the context for a specific error and assert the output string contains all the key pieces of information (problem statement, user history, input, error code).

it('should construct the correct prompt for a CORRECT_BUT_NOT_SIMPLIFIED state'): Do the same for the simplification scenario.

App Integration Suite (with MSW):

Setup: Use msw to set up request handlers that intercept outgoing fetch calls to https://openrouter.ai/api/v1/chat/completions.

Successful Feedback Flow:

Define an msw handler for the OpenRouter endpoint that returns a successful mock JSON response (e.g., { choices: [{ message: { content: 'Mocked AI feedback!' } }] }).

Render <App /> and simulate an incorrect user input (7x=9).

Assert that a loading state appears in the FeedbackDisplay component immediately after the click.

Await the API response and assert that the FeedbackDisplay component now renders the "Mocked AI feedback!" text.

API Error Flow:

Define an msw handler that returns an error status (e.g., 401 Unauthorized).

Simulate an incorrect user input.

Assert that a loading state appears, then is replaced by a user-friendly error message (e.g., "Sorry, I couldn't get feedback right now.").