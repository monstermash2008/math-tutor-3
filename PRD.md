Product Requirements Document: Interactive Math Solver Engine (Client-Side & LLM-Powered)




Document Title

PRD: Interactive Math Solver Engine (Client-Side & LLM-Powered)

Author

Gemini AI (Product Management)

Version

2.0

Status

Final Draft

Date

27 June 2025

1. Introduction and Vision
1.1. Vision
To create a next-generation, browser-based mathematics platform that serves as a true educational co-pilot. This platform will leverage client-side processing for instant validation and a Large Language Model (LLM) to provide dynamic, personalized, and context-aware feedback, mimicking the Socratic dialogue of an expert human teacher.

1.2. Problem Statement
Current digital math tools often fail students at their point of need. They typically validate only the final answer, marking a student's work as "Incorrect" without acknowledging valid intermediate steps or identifying the specific conceptual error. This leads to student frustration, hinders learning, and fails to provide teachers with actionable data on student comprehension. For teachers, creating assignments that offer dynamic, responsive feedback is technically prohibitive.

1.3. Target Audience & Personas
Primary User: "Alex", a high school student (Grades 9-12). Alex is often frustrated when their answer is marked wrong without explanation, especially when they feel they've done most of the work correctly. They need guidance, not just a final judgment, and would benefit from partial credit that reflects their effort.

Secondary User: "Ms. Davison", a high school math teacher. Ms. Davison wants to assign meaningful homework that reinforces her teaching, but lacks the time to give every student personalized feedback. She needs a tool that allows her to build rich, interactive problems that can guide students when she isn't available and provide her with insights into where her class is struggling.

2. Goals and Success Metrics
Goal ID

Goal Description

Success Metrics

G-01

Improve Student Learning Outcomes: Increase student understanding and mastery of mathematical processes.

- Increase in average scores on problem sets.<br>- Reduction in the number of attempts required to reach a correct solution over time.<br>- Qualitative feedback from student surveys on confidence levels.

G-02

Enhance Student Engagement: Make the process of learning math more interactive, less frustrating, and more rewarding.

- Increase in user session duration.<br>- Increase in the percentage of assigned problems completed.<br>- High usage rate of the "Check Step" feature vs. just submitting a final answer.

G-03

Empower Teachers: Provide educators with a powerful tool to create high-quality, auto-grading assignments that offer pedagogical value.

- High adoption rate among teachers on the platform.<br>- High number of custom problems created with the step-by-step model.<br>- Teacher-reported time savings on grading.

G-04

Deliver High-Quality, AI-Generated Feedback: Ensure the LLM-provided feedback is accurate, helpful, and pedagogically sound.

- Implementation of a student feedback mechanism (e.g., thumbs up/down on each piece of feedback) with a target >80% positive rating.<br>- Reduction in "hint abuse" (students clicking through hints without attempting steps), suggesting feedback is effective.<br>- Favourable qualitative reviews from teachers on the quality and safety of the AI feedback.

3. System Architecture and Logic
The application will be architected as a purely client-side single-page application (SPA) that runs in the user's browser. It will rely on a secure, minimal backend component solely for API key management.

3.1. Client-Side Modules
Computer Algebra System (CAS) Module: A JavaScript-based library (e.g., math.js) integrated directly into the frontend. It will handle all mathematical parsing, simplification, and equivalence checking locally.

Validation Engine: The core client-side logic that orchestrates the validation lifecycle. It uses the CAS module to analyze student input and determines the validation state (Correct, Partially Correct, Incorrect).

LLM Feedback Service: A dedicated module responsible for constructing prompts and managing communication with the LLM API.

3.2. Secure Backend Component: The API Gateway
To avoid exposing the LLM provider's secret API key in the client-side code (a major security vulnerability), a simple, secure API Gateway will be implemented. This is the only required backend component.

Flow: Client App -> Secure API Gateway (e.g., a serverless function) -> LLM Provider API

Function: The gateway receives a request from the client, attaches the secret API key stored securely on the server, forwards the request to the LLM, and then passes the response back to the client.

3.3. Revised Problem Object Model
The teacherModel is simplified. Hardcoded feedback is removed in favor of dynamic generation.

{
  "problemId": "p-102",
  "problemStatement": "Expand and simplify: 3(x - 2y) + 2(y + 4x)",
  "problemType": "SIMPLIFY_EXPRESSION",
  "teacherModel": {
    "type": "sequential_steps",
    "steps": [
      "3x - 6y + 2y + 8x",
      "11x - 4y"
    ]
  },
  "feedbackConfig": {
    "tone": "encouraging", 
    "verbosity": "medium"   
  }
}

3.4. Dynamic Feedback Generation (Prompt Engineering)
When the Validation Engine determines a student's step requires feedback, the LLM Feedback Service will construct a detailed prompt containing the following context:

The Full Problem: The original problem statement and type.

The "Golden Path": The complete list of teacher-defined model steps.

Student History: The student's sequence of previous correct steps.

The Student's Input: The specific step that was just submitted.

The Validation Result: A precise error code from the Validation Engine (e.g., EQUIVALENCE_FAILURE, SIMPLIFICATION_INCOMPLETE).

The Target Audience: The student's grade level.

Teacher Configuration: The desired tone and verbosity from the feedbackConfig.

4. Functional Requirements (MoSCoW Prioritization)
MUST HAVE (MVP for V1.0)
[F-01] Client-Side CAS Integration: The application MUST integrate a JavaScript-based CAS library (math.js or equivalent) to handle all local math processing.

[F-02] Step-Based Model Input: Teachers MUST be able to define a teacherModel containing a sequence of steps for SIMPLIFY_EXPRESSION and SOLVE_EQUATION problem types.

[F-03] LLM Feedback Integration: The application MUST call the LLM API via the secure gateway when feedback is needed.

[F-04] Secure API Gateway: A serverless function or similar lightweight backend MUST be implemented to manage the LLM API key securely.

[F-05] Core Validation Engine: The engine MUST implement the full validation lifecycle (Equivalence and Simplification/Progress checks).

[F-06] Dynamic Feedback Display: The platform MUST display the dynamically generated feedback from the LLM.

[F-07] Support for Linear Expressions & Equations: The CAS and validation logic must fully support simplifying linear expressions and solving single-variable linear equations.

SHOULD HAVE (High-Priority for V1.1)
[F-08] Teacher Feedback Configuration: An interface for teachers to set the feedbackConfig (tone, verbosity) for each problem.

[F-09] Contextual Hint System: A "Hint" button for students that triggers an LLM call specifically asking for a hint based on the student's current step and the teacher's next step.

[F-10] Student Feedback Rating: A simple thumbs up/down mechanism for students to rate the helpfulness of the AI feedback, with data collected for analysis.

[F-11] Alternate Path Acceptance & Feedback: The LLM prompt should be sophisticated enough to generate helpful feedback even when a student takes a valid but different path from the teacher's model.

[F-12] Partial Credit Scoring: The system should calculate and display a score based on the number of valid steps completed.

COULD HAVE (Future Releases)
[F-13] Rich Text/Equation Editor: Implement a LaTeX or graphical equation editor (like MathQuill) for easier input by both students and teachers.

[F-14] Caching LLM Responses: To reduce costs, cache LLM responses for identical requests (e.g., the same common error on the same problem).

[F-15] Offline Mode: A mode where the core CAS validation works offline, with LLM feedback disabled until a connection is restored.

[F-16] Analytics Dashboard for Teachers: A dashboard showing class-wide performance on problems, highlighting common stumbling blocks and errors.

5. Non-Functional Requirements
[NF-01] Performance:

CAS Validation: Local validation must be near-instantaneous (<500ms).

LLM Feedback: API calls will have higher latency. The UI MUST handle this gracefully with loading indicators and a target response time of < 3 seconds.

[NF-02] Accessibility: The platform must be WCAG 2.1 AA compliant, ensuring it is usable via keyboard navigation and screen readers.

[NF-03] Security: API Key Security is paramount. The secret key MUST NOT be stored in the client-side code. It must only reside within the secure API gateway.

[NF-04] Cost Management: API calls to the LLM provider will incur costs. The system must be designed to minimize unnecessary calls, and costs must be monitored closely.

[NF-05] Data Privacy: The privacy policy must be updated to clearly state that non-personally identifiable problem and solution data is sent to a third-party AI provider for the purpose of generating feedback.

[NF-06] Robustness & Safety: A content filtering layer should be applied to all LLM responses to prevent the display of inappropriate, inaccurate, or unsafe content.

6. Out of Scope (For V1.0)
Natural Language Processing (NLP) for word problems.

Geometric proofs or problems requiring visual analysis.

Calculus (derivatives, integrals).

User-to-user collaboration features.

Mobile-native applications (the initial release will be a web application).

On-device/local LLMs. All LLM processing will be via API calls.

7. Assumptions
A stable internet connection is required for the core feedback functionality.

A suitable LLM provider can be chosen that meets our requirements for cost, performance, and content safety.

The computational overhead of the client-side CAS library is acceptable on average student hardware (e.g., Chromebooks).