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

Phase 5: Question Creation & Database Integration
Objective: To add a complete question creation system where educators can create, edit, and manage math problems stored in Convex, seamlessly integrating with the existing Interactive Math Tutor.

Key Components/Modules:

Convex Database Schema: Extended schema for storing math problems with comprehensive metadata and solution steps.

ProblemCreator.tsx: A comprehensive form component for creating new math problems with step-by-step solution building.

ProblemLibrary.tsx: A component for browsing, searching, and managing created problems.

ProblemBrowser.tsx: A public gallery for discovering and selecting problems to solve.

Convex Functions: Complete CRUD operations for problems with search and filtering capabilities.

Technical Challenges & Considerations:

Database Schema Design: Creating a flexible schema that supports current problem types while being extensible for future math topics.

Problems Table Schema:
```typescript
problems: defineTable({
  // Basic Problem Info
  problemStatement: v.string(),
  problemType: v.union(v.literal("SOLVE_EQUATION"), v.literal("SIMPLIFY_EXPRESSION")),
  
  // Solution Steps
  solutionSteps: v.array(v.string()),
  
  // Metadata
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  difficulty: v.union(v.literal("Easy"), v.literal("Medium"), v.literal("Hard")),
  subject: v.optional(v.string()),
  gradeLevel: v.optional(v.string()),
  
  // Management
  createdBy: v.optional(v.id("users")),
  isPublic: v.boolean(),
  tags: v.optional(v.array(v.string())),
  
  // Usage Analytics
  timesAttempted: v.number(),
  averageSteps: v.optional(v.number()),
  successRate: v.optional(v.number()),
}).index("problemType", ["problemType"])
  .index("difficulty", ["difficulty"])
  .index("isPublic", ["isPublic"])
```

Problem Attempts Table:
```typescript
problemAttempts: defineTable({
  problemId: v.id("problems"),
  userId: v.optional(v.id("users")),
  completed: v.boolean(),
  stepsCount: v.number(),
  timeSpent: v.number(),
  hintsUsed: v.number(),
}).index("problemId", ["problemId"])
```

Form Validation & UX: Creating intuitive problem creation workflows with real-time validation and preview capabilities.

Database Integration: Seamlessly transitioning from static problem library to dynamic database-driven problems without breaking existing functionality.

Migration Strategy: Developing a migration path to seed the database with existing problems from the static library.

TDD Testing Scenarios:

Database Operations:
- Test CRUD operations for problems (create, read, update, delete)
- Test search and filtering queries
- Test problem validation before saving

Problem Creator Component:
- Test form validation for required fields
- Test step-by-step solution builder functionality
- Test problem preview generation
- Test save and edit workflows

Problem Library Integration:
- Test loading problems from database
- Test search and filter functionality
- Test problem selection and navigation to tutor

Tutor Integration:
- Test loading database problems in MathTutorApp
- Test problem completion tracking
- Test analytics data collection

Implementation Steps:

Step 1: Database Setup
- Update Convex schema with problems and problemAttempts tables
- Create seed data migration from existing static library
- Write basic CRUD functions (createProblem, updateProblem, deleteProblem, getProblem, etc.)
- Add search and filter query functions

Step 2: Core Problem Creator
- Build ProblemCreator component with form validation
- Implement step-by-step solution builder with dynamic array inputs
- Add problem preview functionality
- Connect to Convex mutations for saving problems

Step 3: Problem Library Integration
- Create ProblemLibrary component with search and filtering
- Implement problem management actions (edit, delete, duplicate, test)
- Add ProblemBrowser component for public problem discovery
- Connect to Convex queries for data loading

Step 4: Tutor Integration
- Update MathTutorApp to load problems from database
- Modify routing to handle dynamic problem IDs
- Add problem selection flow and navigation
- Implement problem completion tracking

Step 5: Enhanced Features
- Add problem validation and testing capabilities
- Implement usage analytics and tracking
- Add problem categorization and tagging
- Create problem duplication and templating features

Phase 6a: Tree-Based Simplification Detection & Validation
Objective: To replace string-based mathematical analysis with powerful expression tree manipulation using math.js filter, traverse, and transform methods. This phase will dramatically improve the accuracy of simplification detection and mathematical validation.

Key Components/Modules:

Advanced Simplification Engine (math-engine-advanced.ts): A new module that leverages math.js expression trees for precise mathematical analysis.

Tree Pattern Detection: Functions that use node.filter() to identify specific mathematical patterns like constant arithmetic operations, like terms, and combinable expressions.

Tree Traversal Validation: Functions that use node.traverse() to walk through expression trees and validate mathematical transformations.

Enhanced Validation Results: Expanded validation result types that provide specific feedback about what operations can be performed.

Technical Challenges & Considerations:

Pattern Recognition Complexity: Creating comprehensive filters that can identify all types of unsimplified mathematical patterns (constant operations, like terms, distributive opportunities, etc.).

Node Type Handling: Understanding and properly handling all math.js node types (ConstantNode, SymbolNode, OperatorNode, FunctionNode, etc.) in traversal and filtering operations.

Performance Optimization: Ensuring tree traversal operations remain fast even for complex expressions with many nodes.

False Positive Prevention: Avoiding incorrect simplification detection for expressions that are actually already in their simplest form.

TDD Testing Scenarios:

Tree-Based Simplification Detection:
- Expression '2 + 3 + x' -> should detect constant arithmetic operation (2 + 3)
- Expression '3x + 2x + 5' -> should detect like terms (3x + 2x)
- Expression '4(x + 2) + 3' -> should detect distributive opportunity
- Expression 'x + 5' -> should return no simplification needed
- Expression '2x + 3y' -> should return no simplification needed

Pattern Filter Testing:
- node.filter() should correctly identify all ConstantNode operations
- node.filter() should correctly identify like terms with same variables
- node.filter() should handle nested expressions and complex structures

Tree Traversal Validation:
- node.traverse() should visit all nodes in correct order
- Tree traversal should correctly identify operation types and validate transformations
- Traversal should handle edge cases like single terms and complex nested structures

Implementation Steps:

Step 1: Core Tree Analysis Functions
- Implement hasConstantOperations() using node.filter() for constant arithmetic detection
- Create findLikeTerms() using node.filter() for identifying combinable terms
- Build hasUnsimplifiedOperations() using node.traverse() for comprehensive analysis

Step 2: Enhanced Validation Integration
- Replace string-based isFullySimplified() with tree-based implementation
- Update validation engine to use tree analysis results
- Add specific feedback generation based on detected patterns

Step 3: Pattern Detection Library
- Create comprehensive pattern detection functions for all common simplification opportunities
- Implement coefficient detection and normalization using tree traversal
- Add support for detecting distributive property opportunities

Phase 6b: Canonical Form Enhancement via Tree Transformation
Objective: To implement robust canonical form generation using math.js tree transformation methods, ensuring mathematically equivalent expressions always produce identical canonical representations.

Key Components/Modules:

Tree Transformation Engine: Functions that use node.transform() to systematically convert expressions to canonical form.

Term Ordering System: Logic to consistently order variables, coefficients, and terms using tree manipulation.

Coefficient Normalization: Tree transformation functions to handle coefficient representation (e.g., 1*x becomes x, -1*x becomes -x).

Canonical Comparison Utils: Enhanced comparison functions that work with canonicalized expression trees rather than strings.

Technical Challenges & Considerations:

Consistent Transformation Rules: Establishing a comprehensive set of transformation rules that produce identical canonical forms for all equivalent expressions.

Variable Ordering Standards: Implementing alphabetical variable ordering (x before y) and power ordering (x^2 before x) consistently across all expressions.

Coefficient Handling: Properly handling implicit coefficients, negative coefficients, and fractional coefficients in tree transformations.

Equation vs Expression Handling: Maintaining separate canonical form rules for equations (A = B → A - B) versus pure expressions.

TDD Testing Scenarios:

Tree Transformation Testing:
- '2x + 10' and '10 + 2x' -> should produce identical canonical trees
- '3x^2 + 2x + 1' and '1 + 2x + 3x^2' -> should produce identical canonical trees
- 'x + y' and 'y + x' -> should produce identical canonical trees (alphabetical ordering)
- '1*x + 0*y' -> should transform to 'x' (coefficient normalization)

Canonical Form Consistency:
- Multiple equivalent expressions should all produce the same canonical tree structure
- Canonical trees should be deterministic (same input always produces same output)
- Tree comparison should be faster and more reliable than string comparison

Equation Canonicalization:
- '3x = 9' and '9 = 3x' -> should produce identical canonical trees
- '5x + 3 = 2x + 12' -> should canonicalize to consistent form
- Complex equations should maintain mathematical equivalence after canonicalization

Implementation Steps:

Step 1: Basic Tree Transformation
- Implement term reordering using node.transform() for consistent variable ordering
- Create coefficient normalization functions for handling implicit and explicit coefficients
- Build canonical form generator that applies all transformation rules systematically

Step 2: Enhanced Equivalence Checking
- Replace string-based areEquivalent() with tree-based canonical comparison
- Implement fast tree comparison using canonical forms
- Add support for handling edge cases and complex nested expressions

Step 3: Canonical Form Validation
- Create comprehensive test suite for canonical form consistency
- Implement validation functions to ensure canonical forms are mathematically correct
- Add debugging tools to visualize canonical transformation process

Phase 6c: Intelligent Step Analysis & Enhanced Feedback
Objective: To implement sophisticated step-by-step analysis that understands what mathematical operations students performed by comparing expression trees, enabling highly specific and pedagogically valuable feedback.

Key Components/Modules:

Tree Comparison Engine: Functions that analyze the differences between two expression trees to identify what mathematical operation was performed.

Operation Classification System: Logic to classify detected changes (combined like terms, distributed, factored, etc.) and validate their correctness.

Contextual Feedback Generator: Enhanced feedback system that provides specific, actionable guidance based on tree analysis results.

Step Validation Framework: Comprehensive validation that goes beyond equivalence to analyze the pedagogical value and correctness of each step.

Technical Challenges & Considerations:

Operation Detection Complexity: Accurately identifying what mathematical operation was performed by comparing before/after expression trees.

Multi-Step Detection: Handling cases where students perform multiple operations in a single step and providing appropriate feedback.

Invalid Operation Feedback: Providing helpful feedback when students make mathematical errors, including identifying the specific type of error.

Pedagogical Value Assessment: Determining whether a mathematically valid step represents meaningful progress toward the solution.

TDD Testing Scenarios:

Step Analysis Testing:
- From '5x + 3x' to '8x' -> should detect "combined like terms" operation
- From '3(x + 2)' to '3x + 6' -> should detect "distributed" operation
- From '2x + 3x + 5' to '2x + 8' -> should detect error in like term combination
- From 'x^2 + 2x + 1' to '(x + 1)^2' -> should detect "factored" operation

Feedback Generation Testing:
- Correct simplification -> should provide encouraging feedback with next step hint
- Incorrect arithmetic -> should provide specific error correction with explanation
- Valid but unhelpful step -> should suggest more direct approach
- Multiple errors -> should prioritize most important error for feedback

Operation Classification Testing:
- Should correctly identify all standard algebraic operations
- Should handle complex multi-step operations appropriately
- Should distinguish between valid mathematical operations and errors
- Should provide confidence scores for operation detection

Implementation Steps:

Step 1: Tree Comparison Foundation
- Implement expression tree differencing algorithm to identify structural changes
- Create operation classification system for standard algebraic operations
- Build basic step analysis framework that can detect simple operations

Step 2: Enhanced Operation Detection
- Add support for complex operation detection (factoring, expanding, etc.)
- Implement multi-step operation analysis for cases where students combine operations
- Create error detection and classification system for common mathematical mistakes

Step 3: Intelligent Feedback System
- Build contextual feedback generator that provides specific guidance based on detected operations
- Implement progressive hint system that guides students toward correct solutions
- Add support for alternative solution paths and multiple valid approaches

Phase n+1: Authentication & User Management (Future)
Objective: To implement a comprehensive authentication system starting with admin role capabilities, with an extensible foundation for future teacher and student roles. This phase establishes secure access control for problem management and lays the groundwork for role-based permissions.

Key Components/Modules:

Convex Authentication Integration: Leverage Convex's built-in authentication system with support for multiple providers (GitHub, Google, custom email/password).

User Management Schema: Design a flexible user system that can accommodate admin, teacher, and student roles with proper permission inheritance.

Users Table Schema:
```typescript
users: defineTable({
  // Basic User Info
  email: v.string(),
  name: v.optional(v.string()),
  role: v.union(v.literal("admin"), v.literal("teacher"), v.literal("student")),
  
  // Profile Information
  profilePicture: v.optional(v.string()),
  institution: v.optional(v.string()),
  grade: v.optional(v.string()), // For students
  subject: v.optional(v.string()), // For teachers
  
  // Account Management
  isActive: v.boolean(),
  lastLoginTime: v.optional(v.number()),
  preferredName: v.optional(v.string()),
  
  // Permissions (extensible for future roles)
  permissions: v.array(v.string()),
}).index("email", ["email"])
  .index("role", ["role"])
  .index("isActive", ["isActive"])
```

Sessions Table Schema:
```typescript
sessions: defineTable({
  userId: v.id("users"),
  sessionId: v.string(),
  deviceInfo: v.optional(v.string()),
  ipAddress: v.optional(v.string()),
  expiresAt: v.number(),
}).index("sessionId", ["sessionId"])
  .index("userId", ["userId"])
```

Authentication Context & Hooks: React context provider and custom hooks for managing authentication state throughout the application.

Route Protection Components: Higher-order components and route guards for protecting authenticated and role-specific routes.

Admin Dashboard: Initial admin interface for user management, system settings, and comprehensive problem library management.

Permission System: Flexible permission-based access control that can be extended for granular teacher and student permissions.

Technical Challenges & Considerations:

Authentication Provider Integration: Convex supports multiple authentication providers. The system must be flexible enough to handle GitHub OAuth for developers, Google for educational institutions, and email/password for flexibility.

Role-Based Access Control (RBAC): Implementing a scalable permission system that starts simple (admin-only) but can easily expand to include:
- Admin: Full system access, user management, all problem operations
- Teacher: Create/edit/delete own problems, view analytics, manage student assignments
- Student: View assigned problems, attempt problems, view own progress

Session Management: Secure session handling with proper token management, refresh logic, and logout cleanup across devices.

Route Protection Strategy: Implementing both authentication-based (logged in vs. anonymous) and permission-based (admin vs. teacher vs. student) route protection without creating complex nested logic.

Data Migration: Existing problems and attempts need to be associated with users retroactively, requiring careful migration planning.

Security Considerations: Protecting sensitive operations (user management, problem deletion, analytics access) while maintaining good UX for authorized users.

TDD Testing Scenarios:

Authentication Flow Testing:
- Test successful login with various providers (GitHub, Google, email/password)
- Test logout functionality and session cleanup
- Test automatic session refresh and token expiration handling
- Test authentication state persistence across browser refreshes

Permission System Testing:
- Test admin access to all problem management functions
- Test unauthorized access attempts return proper error responses
- Test role-based component rendering (admin sees user management, others don't)
- Test permission inheritance and role validation

Route Protection Testing:
- Test anonymous user redirect to login page for protected routes
- Test authenticated user access to appropriate pages based on role
- Test admin-only routes are inaccessible to future teacher/student roles
- Test proper fallback routing for insufficient permissions

Database Security Testing:
- Test that problem creation/editing requires authentication
- Test that user management operations require admin role
- Test that users can only access their own data (except admins)
- Test proper data filtering based on user permissions

Implementation Steps:

Step 1: Authentication Infrastructure
- Set up Convex authentication with GitHub and Google providers
- Create user and session database tables with proper indexes
- Implement authentication context and custom React hooks
- Create login/logout components with provider selection

Step 2: Route Protection & Navigation
- Implement authentication middleware for protected routes
- Create role-based route guards and permission checks
- Update navigation components to show/hide based on authentication state
- Add user profile dropdown with logout and account management

Step 3: Admin Role Implementation
- Create admin dashboard with user management interface
- Implement admin-specific problem management features (view all, delete any, etc.)
- Add system settings and configuration management
- Implement user role assignment and account activation controls

Step 4: Database Migration & Security
- Update existing Convex functions to require authentication
- Implement row-level security for user data access
- Migrate existing problems to be associated with admin users
- Add audit logging for sensitive operations

Step 5: Permission System Foundation
- Create extensible permission checking utilities
- Implement permission-based UI component rendering
- Add role validation middleware for API operations
- Document permission architecture for future teacher/student role implementation

Phase n+2: Production Deployment & CI/CD (Future)
Objective: To establish a robust production deployment pipeline using GitHub Actions for continuous integration and deployment, with comprehensive testing, environment management, and monitoring capabilities.

Key Components/Modules:

GitHub Actions Workflows: Complete CI/CD pipeline configuration with multiple workflow files for different deployment stages and environments.

Environment Management: Proper separation of development, staging, and production environments with secure secrets management.

Build & Test Pipeline: Automated pipeline that runs unit tests, integration tests, linting, type checking, and security scans before deployment.

Deployment Strategy: Zero-downtime deployment to production with rollback capabilities and health checks.

Monitoring & Alerting: Production monitoring setup with error tracking, performance monitoring, and alerting for critical issues.

Technical Challenges & Considerations:

Multi-Environment Setup: Configuring separate Convex deployments for development, staging, and production with proper environment variable management.

Environment Configuration:
```yaml
# Development
VITE_CONVEX_URL: <development-deployment-url>
VITE_APP_ENV: development

# Staging  
VITE_CONVEX_URL: <staging-deployment-url>
VITE_APP_ENV: staging

# Production
VITE_CONVEX_URL: <production-deployment-url>
VITE_APP_ENV: production
VITE_OPENROUTER_API_KEY: <production-api-key>
```

Security & Secrets Management: Secure handling of production API keys, database credentials, and other sensitive configuration using GitHub Secrets and proper secret rotation strategies.

Test Coverage Requirements: Ensuring the CI pipeline maintains high test coverage standards and fails builds that don't meet quality thresholds.

Performance Optimization: Production build optimization including code splitting, asset compression, caching strategies, and CDN configuration.

Database Migration Strategy: Automated database schema migrations and data seeding for production deployments while preserving existing data.

Rollback & Recovery: Implementing quick rollback mechanisms for failed deployments and disaster recovery procedures.

CI/CD Pipeline Structure:

Primary Workflow (.github/workflows/ci.yml):
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
      - name: Setup Node.js and pnpm
      - name: Install dependencies
      - name: Run type checking
      - name: Run linting
      - name: Run unit tests with coverage
      - name: Run integration tests
      - name: Upload coverage reports

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build application
      - name: Run security audit
      - name: Upload build artifacts

  deploy-staging:
    needs: [test, build]
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging
      - name: Run smoke tests
      - name: Notify team

  deploy-production:
    needs: [test, build]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
      - name: Run health checks
      - name: Update monitoring
      - name: Notify stakeholders
```

TDD Testing Scenarios:

CI Pipeline Testing:
- Test that pipeline fails when unit tests fail
- Test that pipeline fails when code coverage drops below threshold
- Test that pipeline fails when linting errors are present
- Test that builds fail with TypeScript errors
- Test security audit failure handling

Deployment Testing:
- Test staging deployment from develop branch
- Test production deployment from main branch
- Test that environment variables are properly set for each environment
- Test database migration execution during deployment
- Test rollback procedures work correctly

Environment Isolation Testing:
- Test that staging and production use separate Convex deployments
- Test that API keys and secrets are environment-specific
- Test that cross-environment data leakage doesn't occur
- Test that feature flags work correctly across environments

Performance & Monitoring Testing:
- Test that production builds meet performance budgets
- Test that monitoring alerts trigger correctly
- Test that error tracking captures and reports issues
- Test that health checks detect application problems

Implementation Steps:

Step 1: Repository Setup & Basic CI
- Configure GitHub repository settings and branch protection rules
- Create basic CI workflow for running tests on pull requests
- Set up pnpm caching and Node.js environment standardization
- Configure automated dependency updates and security scanning

Step 2: Testing & Quality Gates
- Implement comprehensive test coverage reporting
- Add code quality checks (ESLint, TypeScript, Biome)
- Configure test coverage thresholds and quality gates
- Set up automated security vulnerability scanning

Step 3: Environment Management
- Create separate Convex deployments for staging and production
- Configure environment-specific variables and secrets
- Implement environment promotion workflow (develop → staging → main → production)
- Set up proper DNS and domain configuration for production

Step 4: Production Deployment Pipeline
- Create production deployment workflow with approval gates
- Implement zero-downtime deployment strategy
- Configure database migration automation
- Set up deployment notifications and stakeholder communication

Step 5: Monitoring & Maintenance
- Implement error tracking and performance monitoring
- Configure alerting for critical issues and downtime
- Set up automated backup and recovery procedures
- Create runbook documentation for common operational tasks
- Implement log aggregation and analysis tools