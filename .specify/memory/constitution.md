<!--
SYNC IMPACT REPORT - Constitution v1.0.0
Generated: 2026-01-08

VERSION CHANGE: Initial version → 1.0.0
RATIONALE: First formal constitution ratification with four core development principles

MODIFIED PRINCIPLES:
- New: I. Code Quality Standards
- New: II. Testing Standards  
- New: III. User Experience Consistency
- New: IV. Performance Requirements

ADDED SECTIONS:
- Core Principles (4 principles)
- Development Standards (extension lifecycle requirements)
- Governance (amendment procedures)

REMOVED SECTIONS:
- None (initial version)

TEMPLATES STATUS:
✅ plan-template.md - reviewed, constitution check section aligns
✅ spec-template.md - reviewed, requirements sections align  
✅ tasks-template.md - reviewed, test-first workflow aligns

FOLLOW-UP TODOS:
- None
-->

# CircuitX Constitution

## Core Principles

### I. Code Quality Standards

**MUST Requirements:**
- All TypeScript code MUST pass type checking with strict mode enabled (`noEmit` verification required)
- All code MUST pass ESLint checks with no errors (warnings may be justified but discouraged)
- All functions and classes MUST have clear, single responsibilities (Single Responsibility Principle)
- Complex logic (cyclomatic complexity >10) MUST be justified in code comments
- No `any` types except when interfacing with untyped external libraries (must document rationale)

**Rationale:** CircuitX is an AI agent that users trust with their codebase. Code quality directly impacts reliability and maintainability. Strict typing prevents runtime errors and makes refactoring safer.

### II. Testing Standards (NON-NEGOTIABLE)

**MUST Requirements:**
- Test-Driven Development (TDD) MUST be followed: Write tests → Tests fail → Implement → Tests pass
- Every new feature MUST have integration tests covering user-facing scenarios
- Contract tests MUST verify VS Code extension API interactions
- All tests MUST be automated and runnable via `npm test`
- Test coverage MUST be maintained above 80% for core logic (services, models)
- Tests MUST run in CI before any merge to main branch

**Rationale:** As an extension running in users' VS Code environments, untested code risks breaking workflows and losing user trust. The test-first approach ensures features work before deployment.

### III. User Experience Consistency

**MUST Requirements:**
- UI interactions MUST follow VS Code extension UX guidelines (webview patterns, theming)
- All user-facing text MUST be clear, concise, and error messages actionable
- Navigation MUST be predictable: consistent toolbar placement (➕ New, 🕒 History, ⚙️ Settings)
- Users MUST NOT be forced to configure before first use (zero-config first launch)
- State transitions (welcome → chat → history) MUST be reversible without data loss
- Loading states MUST provide feedback (no hanging UI)

**Rationale:** Cognitive load reduction is a design principle per MVP PRD. Consistency builds user confidence and reduces support burden. CircuitX differentiates on explainability - UX must not undermine this.

### IV. Performance Requirements

**MUST Requirements:**
- Extension activation MUST complete within 1 second on typical hardware
- Message sending MUST respond (show loading state) within 100ms
- Session list rendering MUST handle 1000+ sessions without UI lag
- Memory footprint MUST stay below 200MB during idle state
- LLM provider API calls MUST timeout after 30 seconds with clear error messaging
- File operations (session save/load) MUST be asynchronous and non-blocking

**Rationale:** Performance issues frustrate users and break flow state. As an always-on IDE extension, resource efficiency prevents VS Code degradation.

## Development Standards

**Extension Lifecycle:**
- All features MUST support VS Code's activation event model (lazy load when possible)
- Webview state MUST be persisted and restored on VS Code restart
- All external API calls MUST handle network failures gracefully (retry with exponential backoff)

**Versioning:**
- Follow semantic versioning: MAJOR.MINOR.PATCH
- Breaking changes to session storage format require MAJOR bump and migration path
- New features (non-breaking) require MINOR bump
- Bug fixes and clarifications require PATCH bump

**Observability:**
- All errors MUST be logged with context (user action, state, stack trace)
- User-facing errors MUST be actionable ("Try X" or "Check Y")
- Telemetry opt-in (privacy-first, MVP may not include)

## Governance

**Amendment Process:**
1. Proposed changes MUST be documented in a pull request to this constitution
2. Changes MUST include version bump justification (MAJOR/MINOR/PATCH)
3. All template files MUST be updated to reflect constitutional changes
4. Migration plan MUST be provided for any breaking changes

**Compliance:**
- All feature specifications MUST include a "Constitution Check" section verifying alignment
- All code reviews MUST verify compliance with applicable principles
- Violations MUST be justified in writing or corrected before merge
- This constitution supersedes all other practices when conflicts arise

**Version**: 1.0.0 | **Ratified**: 2026-01-08 | **Last Amended**: 2026-01-08
