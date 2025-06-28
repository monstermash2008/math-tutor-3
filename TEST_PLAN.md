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

Phase 5: Question Creation & Database Integration Testing
Testing Goal: To verify the complete question creation workflow, database integration with Convex, and seamless integration with the existing math tutor functionality. This phase ensures data persistence, CRUD operations, and user interface reliability for educators creating and managing math problems.

Tools: Vitest, React Testing Library (RTL), Convex Testing Utilities

Key Test Suites:

convex/problems.test.ts (Database Function Tests)

ProblemCreator.test.tsx (Component Tests)

ProblemLibrary.test.tsx (Component Tests)

App.integration.database.test.tsx (End-to-End Database Integration)

Detailed Test Cases & Scenarios:

Convex Database Functions Suite (convex/problems.test.ts):

CRUD Operations:

it('should create a new problem with valid data'): Call createProblem mutation with valid problem data and assert successful creation with returned document ID.

it('should reject problem creation with invalid data'): Attempt to create a problem with missing required fields and assert appropriate validation errors.

it('should retrieve a problem by ID'): Create a problem, then use getProblemById query to retrieve it and assert all fields match.

it('should update an existing problem'): Create a problem, modify it using updateProblem mutation, and assert changes are persisted.

it('should delete a problem'): Create a problem, delete it, and assert it no longer exists in queries.

Query Operations:

it('should filter problems by type'): Create problems of different types and assert getProblemsByType returns only matching problems.

it('should filter problems by difficulty'): Create problems with different difficulty levels and test filtering functionality.

it('should search problems by text'): Create problems with distinct titles/descriptions and test search functionality.

it('should return only public problems for non-owners'): Test visibility rules for public vs private problems.

Analytics Operations:

it('should increment attempt count when problem is attempted'): Test incrementAttempts mutation updates timesAttempted field.

it('should track problem completion statistics'): Test tracking of completion rates and average steps.

ProblemCreator Component Suite (ProblemCreator.test.tsx):

Form Validation:

it('should require problem statement'): Submit form with empty problem statement and assert validation error appears.

it('should require at least one solution step'): Submit form with empty solution steps and assert validation error.

it('should validate problem type selection'): Test form validation for required problem type.

it('should allow optional metadata fields'): Test that title, description, and other optional fields can be left empty.

Step Builder Functionality:

it('should allow adding new solution steps'): Click "Add Step" button and assert new input field appears.

it('should allow removing solution steps'): Add multiple steps, remove one, and assert it's removed from the list.

it('should allow reordering solution steps'): Test drag-and-drop or arrow button reordering of steps.

it('should preserve step content during reordering'): Ensure step content doesn't get lost during reordering operations.

Problem Preview:

it('should show live preview of problem as user types'): Enter problem statement and assert preview updates in real-time.

it('should display solution steps in preview'): Add solution steps and assert they appear correctly in preview.

Save/Edit Workflow:

it('should save new problem successfully'): Fill out form completely and assert successful save with redirect to problem library.

it('should handle save errors gracefully'): Mock save failure and assert appropriate error message is displayed.

it('should load existing problem for editing'): Test editing workflow by loading an existing problem and verifying all fields populate correctly.

ProblemLibrary Component Suite (ProblemLibrary.test.tsx):

Display and Navigation:

it('should display list of problems with metadata'): Render component with mock problems and assert all are displayed with correct titles, types, and difficulty levels.

it('should handle empty problem list'): Render with no problems and assert appropriate "no problems" message.

it('should navigate to problem editor on edit click'): Click edit button and assert navigation to edit route with correct problem ID.

it('should navigate to tutor when testing problem'): Click "Test Problem" button and assert navigation to tutor with problem loaded.

Search and Filtering:

it('should filter problems by search term'): Enter search term and assert only matching problems are displayed.

it('should filter by problem type'): Select problem type filter and assert only matching problems shown.

it('should filter by difficulty level'): Select difficulty filter and assert correct filtering behavior.

it('should combine multiple filters'): Apply multiple filters simultaneously and assert correct results.

Problem Management Actions:

it('should delete problem with confirmation'): Click delete button, confirm in modal, and assert problem is removed.

it('should duplicate problem'): Click duplicate button and assert new problem is created with copied content.

it('should handle bulk actions'): Test selecting multiple problems and performing bulk operations.

App Integration Suite (App.integration.database.test.tsx):

Database-Driven Problem Loading:

it('should load problem from database by ID'): Navigate to /problem/:id route and assert problem loads from database instead of static library.

it('should handle invalid problem IDs gracefully'): Navigate to non-existent problem ID and assert appropriate error handling.

it('should fall back to static library when database unavailable'): Mock database failure and assert fallback to static problems.

Problem Selection Flow:

it('should allow selecting problem from library'): Navigate to /library, click on a problem, and assert navigation to tutor with selected problem.

it('should maintain problem context during solving'): Start solving a database problem and assert all tutor functionality works identically to static problems.

Usage Tracking Integration:

it('should track problem attempts'): Start solving a problem and assert attempt is recorded in database.

it('should track completion status'): Complete a problem and assert completion is recorded with correct statistics.

it('should track time spent on problems'): Solve problem over time and assert duration tracking works correctly.

Routing and Navigation:

it('should support all new routes'): Test navigation to /create, /library, /problem/:id, and /problem/:id/edit routes.

it('should handle route parameters correctly'): Test dynamic route parameters are passed correctly to components.

it('should maintain browser history'): Test back/forward navigation works correctly with new routes.

Performance and Error Handling:

it('should handle slow database queries'): Mock slow Convex queries and assert loading states are displayed appropriately.

it('should recover from database errors'): Mock database errors and assert graceful error handling with user-friendly messages.

it('should maintain application state during database operations'): Ensure UI state isn't lost during database operations.

Mock Data and Test Utilities:

Mock Problem Data Factory: Create utility functions to generate consistent test problem data with various configurations.

Convex Test Helpers: Utilities for mocking Convex queries and mutations in tests.

Component Test Helpers: Reusable helpers for rendering components with required providers and mock data.

Integration Test Scenarios: End-to-end test scenarios that cover complete user workflows from problem creation to solving.