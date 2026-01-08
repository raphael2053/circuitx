# Tasks: AI Code Agent MVP

**Input**: Design documents from `/specs/001-ai-agent-mvp/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: TDD is NON-NEGOTIABLE per Constitution Principle II. Tests are written first and must fail before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Project Foundation)

**Purpose**: Initialize project structure and configure build tools

- [X] T001 Update package.json with webview view contribution, viewsContainers, and activation events
- [X] T002 [P] Create directory structure: src/webview/{pages,components,styles}, src/services, src/models, src/utils
- [X] T003 [P] Create CSS variables stylesheet for VS Code theming in src/webview/styles/main.css
- [X] T004 [P] Create UUID utility module using crypto.randomUUID() in src/utils/uuid.ts
- [X] T005 [P] Create error handling utilities with custom error types in src/utils/errors.ts
- [X] T006 [P] Create TypeScript interfaces for Session, Message entities in src/models/Session.ts
- [X] T007 [P] Create TypeScript interfaces for LLMProvider entity in src/models/LLMProvider.ts
- [X] T008 [P] Create TypeScript interfaces for webview message protocol in src/models/WebviewMessages.ts

---

## Phase 2: Foundational (Core Infrastructure)

**Purpose**: Core services that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

> **TDD REMINDER**: Write each test first, verify it fails, then implement to make it pass

### SessionService (File-based CRUD)

- [ ] T009 Write unit tests for SessionService.create() in src/test/unit/SessionService.test.ts
- [ ] T010 Write unit tests for SessionService.load(), update(), delete(), list() in src/test/unit/SessionService.test.ts
- [ ] T011 Implement SessionService with file system operations using vscode.workspace.fs in src/services/SessionService.ts

### ProviderService (Settings + SecretStorage)

- [ ] T012 Write unit tests for ProviderService CRUD operations in src/test/unit/ProviderService.test.ts
- [ ] T013 Write unit tests for API key storage/retrieval in src/test/unit/ProviderService.test.ts
- [ ] T014 Implement ProviderService with vscode.workspace.getConfiguration() and context.secrets in src/services/ProviderService.ts

### LLMService (OpenAI-compatible streaming)

- [ ] T015 Write unit tests for LLMService.sendMessage() with mock fetch in src/test/unit/LLMService.test.ts
- [ ] T016 Write unit tests for SSE stream parsing in src/test/unit/LLMService.test.ts
- [ ] T017 Implement LLMService with fetch() and SSE parsing in src/services/LLMService.ts

### WebviewViewProvider (Extension host)

- [ ] T018 Write contract tests for webview postMessage protocol in src/test/contract/webview-messaging.test.ts
- [ ] T019 Create base WebviewViewProvider class with resolveWebviewView() in src/webview/WebviewProvider.ts
- [ ] T020 Implement message routing for webview-to-extension messages in src/webview/WebviewProvider.ts
- [ ] T021 Add webview HTML generation with CSP and nonce in src/webview/WebviewProvider.ts
- [ ] T022 Register WebviewViewProvider in extension.ts activate() function

### Shared UI Components (Pure TypeScript DOM)

- [ ] T023 [P] Create Toolbar component returning HTML string with ➕🕒⚙️ buttons in src/webview/components/Toolbar.ts
- [ ] T024 [P] Create InputBox component with event handling in src/webview/components/InputBox.ts
- [ ] T025 [P] Create Button component with VS Code styling in src/webview/components/Button.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - First-Time User Asks Question (Priority: P1) 🎯 MVP

**Goal**: Developer installs extension and immediately asks a question without configuration

**Independent Test**: Install extension, open CircuitX panel in right sidebar, type question on Welcome page, press Enter. Session is created automatically with loading state shown.

**Acceptance Criteria**: FR-001 to FR-007

> **TDD CYCLE**: Write test → Verify it fails → Implement → Verify it passes → Refactor

### Tests First (Write these before implementation)

- [ ] T026 Write integration test: Welcome page displays on first activation in src/test/integration/welcome.test.ts
- [ ] T027 Write integration test: Session created when question submitted from Welcome in src/test/integration/session-creation.test.ts
- [ ] T028 Write integration test: Navigation to Chat page after session creation in src/test/integration/session-creation.test.ts

### Implementation (Only after tests are written and failing)

- [ ] T029 Implement WelcomePage.render() with input box and branding in src/webview/pages/WelcomePage.ts
- [ ] T030 Add page state management and routing logic in src/webview/WebviewProvider.ts
- [ ] T031 Implement sendMessage handler for Welcome page submissions in src/webview/WebviewProvider.ts
- [ ] T032 Add session title auto-generation from first 30 chars in src/services/SessionService.ts
- [ ] T033 Implement Welcome → Chat navigation transition in src/webview/WebviewProvider.ts

**Checkpoint**: User Story 1 complete - user can ask first question and session is created

**Validation**: Run tests T026-T028, verify all pass. Manually test: open extension → type question → see Chat page.

---

## Phase 4: User Story 2 - Continuing Conversations (Priority: P1) 🎯 MVP

**Goal**: Developer has multi-turn conversations within a session, seeing streamed responses

**Independent Test**: Create session, send message, see streamed response chunk by chunk, send follow-up, verify all messages display chronologically.

**Acceptance Criteria**: FR-008 to FR-015

> **TDD CYCLE**: Write test → Verify it fails → Implement → Verify it passes → Refactor

### Tests First (Write these before implementation)

- [ ] T034 Write integration test: LLM response streams progressively in src/test/integration/chat-streaming.test.ts
- [ ] T035 Write integration test: Multi-turn conversation maintains context in src/test/integration/multi-turn.test.ts
- [ ] T036 Write integration test: Loading state appears within 100ms in src/test/integration/chat-streaming.test.ts
- [ ] T037 Write integration test: Error shown when no provider configured in src/test/integration/chat-errors.test.ts

### Implementation (Only after tests are written and failing)

- [ ] T038 [P] Create MessageList component rendering messages chronologically in src/webview/components/MessageList.ts
- [ ] T039 Implement ChatPage.render() with message stream and input in src/webview/pages/ChatPage.ts
- [ ] T040 Add loading state display (spinner/indicator) to ChatPage in src/webview/pages/ChatPage.ts
- [ ] T041 Implement chatChunk message handler for progressive streaming in src/webview/WebviewProvider.ts
- [ ] T042 Add chatComplete and chatError handlers in src/webview/WebviewProvider.ts
- [ ] T043 Implement message appending to active session in src/services/SessionService.ts
- [ ] T044 Add auto-scroll to bottom when new messages arrive in src/webview/components/MessageList.ts
- [ ] T045 Implement "no provider configured" error handling (FR-045) in src/webview/WebviewProvider.ts

**Checkpoint**: User Stories 1 AND 2 complete - full chat experience works

**Validation**: Run tests T034-T037, verify all pass. Manually test: send 5 messages in one session, verify streaming and chronological order.

---

## Phase 5: User Story 3 - Managing LLM Providers (Priority: P2)

**Goal**: Developer configures LLM providers and sets default for new sessions

**Independent Test**: Navigate to Providers page via ⚙️, add provider (name: "Local Ollama", baseUrl: "http://localhost:11434/v1", model: "llama2"), set as default, create new session and verify it uses that provider.

**Acceptance Criteria**: FR-023 to FR-031

> **TDD CYCLE**: Write test → Verify it fails → Implement → Verify it passes → Refactor

### Tests First (Write these before implementation)

- [ ] T046 Write integration test: Add provider with all fields in src/test/integration/provider-crud.test.ts
- [ ] T047 Write integration test: Edit existing provider in src/test/integration/provider-crud.test.ts
- [ ] T048 Write integration test: Delete provider with confirmation in src/test/integration/provider-crud.test.ts
- [ ] T049 Write integration test: Set provider as default in src/test/integration/provider-default.test.ts
- [ ] T050 Write integration test: Prevent deletion of default provider in src/test/integration/provider-crud.test.ts

### Implementation (Only after tests are written and failing)

- [ ] T051 [P] Create ProviderForm component for add/edit modal in src/webview/components/ProviderForm.ts
- [ ] T052 [P] Create ProviderTable component with Name/URL/Model columns in src/webview/components/ProviderTable.ts
- [ ] T053 Implement ProvidersPage.render() with table and add button in src/webview/pages/ProvidersPage.ts
- [ ] T054 Add form validation (required fields, URL format) in src/webview/components/ProviderForm.ts
- [ ] T055 Implement addProvider message handler in src/webview/WebviewProvider.ts
- [ ] T056 Implement updateProvider message handler in src/webview/WebviewProvider.ts
- [ ] T057 Add delete confirmation dialog logic in src/webview/pages/ProvidersPage.ts
- [ ] T058 Implement deleteProvider with default check in src/services/ProviderService.ts
- [ ] T059 Add setDefaultProvider functionality in src/services/ProviderService.ts
- [ ] T060 Implement testProvider connection check in src/services/LLMService.ts
- [ ] T061 Add loadProviders message handler in src/webview/WebviewProvider.ts

**Checkpoint**: User Stories 1, 2, AND 3 complete - full provider management works

**Validation**: Run tests T046-T050, verify all pass. Manually test: add 3 providers, set one as default, delete non-default.

---

## Phase 6: User Story 4 - Managing Session History (Priority: P2)

**Goal**: Developer reviews, renames, and deletes past conversation sessions

**Independent Test**: Create 3 sessions with different questions, navigate to History page via 🕒, click Edit on one session and rename it to "Binary Search Discussion", click Delete on another and confirm, verify changes persist.

**Acceptance Criteria**: FR-016 to FR-022

> **TDD CYCLE**: Write test → Verify it fails → Implement → Verify it passes → Refactor

### Tests First (Write these before implementation)

- [ ] T062 Write integration test: Session list displays sorted by updatedAt in src/test/integration/history-list.test.ts
- [ ] T063 Write integration test: Click session title navigates to Chat in src/test/integration/history-navigation.test.ts
- [ ] T064 Write integration test: Rename session updates title in src/test/integration/history-crud.test.ts
- [ ] T065 Write integration test: Delete session with confirmation in src/test/integration/history-crud.test.ts
- [ ] T066 Write integration test: Empty state shown when no sessions in src/test/integration/history-list.test.ts
- [ ] T067 Write integration test: Pagination handles 1000+ sessions in src/test/integration/history-pagination.test.ts

### Implementation (Only after tests are written and failing)

- [ ] T068 [P] Create SessionListItem component with title/timestamp/actions in src/webview/components/SessionListItem.ts
- [ ] T069 [P] Create SessionList component with vertical list layout in src/webview/components/SessionList.ts
- [ ] T070 Implement HistoryPage.render() with session list in src/webview/pages/HistoryPage.ts
- [ ] T071 Add pagination logic (20 sessions per page) in src/services/SessionService.ts
- [ ] T072 Implement loadSessionList message handler with pagination in src/webview/WebviewProvider.ts
- [ ] T073 Add inline/modal rename editor to SessionListItem in src/webview/components/SessionListItem.ts
- [ ] T074 Implement renameSession message handler in src/webview/WebviewProvider.ts
- [ ] T075 Add delete confirmation dialog in src/webview/pages/HistoryPage.ts
- [ ] T076 Implement deleteSession with file removal in src/services/SessionService.ts
- [ ] T077 Add click handler for session title → navigate to Chat in src/webview/pages/HistoryPage.ts
- [ ] T078 Implement empty state message display in src/webview/pages/HistoryPage.ts

**Checkpoint**: All user stories complete - full MVP functionality

**Validation**: Run tests T062-T067, verify all pass. Manually test with 50+ sessions: list, rename, delete, navigate.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: NFRs and improvements affecting multiple user stories

> **Constitution Compliance**: Performance requirements, error handling, state persistence

### Performance & Reliability (NFRs from spec.md)

- [ ] T079 [P] Implement webview state persistence for VS Code restart recovery in src/webview/WebviewProvider.ts
- [ ] T080 [P] Add retry logic: single retry with 2-second delay (FR-042) in src/services/LLMService.ts
- [ ] T081 [P] Implement 30-second timeout for LLM API calls (FR-044) in src/services/LLMService.ts
- [ ] T082 [P] Add AbortController for canceling ongoing requests in src/services/LLMService.ts
- [ ] T083 [P] Create actionable error messages with suggested actions (FR-043, FR-046) in src/utils/errors.ts
- [ ] T084 [P] Add extension activation time measurement (<1s target) in src/extension.ts

### Code Quality & Testing

- [ ] T085 Run ESLint across all source files and fix violations
- [ ] T086 Verify TypeScript strict mode compliance, no `any` types except VS Code API boundaries
- [ ] T087 Code review: check Single Responsibility Principle for all services/components
- [ ] T088 Calculate test coverage, ensure >80% for core logic (SessionService, ProviderService, LLMService)
- [ ] T089 Add missing edge case tests from spec.md (network failures, concurrent deletion, etc.)

### Performance Validation

- [ ] T090 Measure extension activation time with 100 cached sessions (<1s target)
- [ ] T091 Test Session History page with 1000+ sessions (<2s load, no lag)
- [ ] T092 Verify memory footprint during idle with 100 sessions (<200MB target)
- [ ] T093 Test UI responsiveness: button clicks, navigation (<100ms target)
- [ ] T094 Load test: create 500 sessions, verify file operations stay async

### Documentation & Finalization

- [ ] T095 [P] Update quickstart.md with actual implementation patterns
- [ ] T096 [P] Add JSDoc comments to all public APIs
- [ ] T097 [P] Create README.md with setup and usage instructions
- [ ] T098 Run through quickstart.md step-by-step, verify accuracy
- [ ] T099 Final review: check all FRs (FR-001 to FR-046) are implemented
- [ ] T100 Create demo: record video showing all 4 user stories working end-to-end

**Final Checkpoint**: Feature complete, all tests passing, performance targets met, ready for deployment

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
      │
      ▼
Phase 2 (Foundational) ◄──── CRITICAL BLOCKER: Must complete before any user story
      │
      ▼
  ┌───┴───────────────────────────────────┐
  │   All user stories can start now      │
  │   (after foundational is complete)    │
  └───┬───────────────────────────────────┘
      │
      ├──► Phase 3 (US1 - First Question) ──┐
      │                                       │
      └──► Phase 4 (US2 - Conversations) ◄───┘ (depends on US1)
                    │
         ┌──────────┴──────────┐
         │                     │
         ▼                     ▼
    Phase 5 (US3)         Phase 6 (US4)
    Providers             History
         │                     │
         └──────────┬──────────┘
                    │
                    ▼
              Phase 7 (Polish)
```

### Critical Path (Minimum Viable Product)

**MVP = US1 + US2 only** (Can ask questions and have conversations)

```
T001-T008 (Setup) → T009-T025 (Foundational) → T026-T033 (US1) → T034-T045 (US2)
```

**Time estimate**: ~3-5 days for experienced developer following TDD

### Full Feature Delivery

```
MVP → T046-T061 (US3 Providers) → T062-T078 (US4 History) → T079-T100 (Polish)
```

**Time estimate**: ~7-10 days total for full feature with all user stories

### User Story Dependencies

| Story | Priority | Depends On | Can Start After | Notes |
|-------|----------|------------|----------------|-------|
| US1 | P1 | Phase 2 (Foundational) | T025 complete | Welcome page + session creation |
| US2 | P1 | US1 + Phase 2 | T033 complete | Extends Chat page from US1 |
| US3 | P2 | Phase 2 only | T025 complete | Independent - provider management |
| US4 | P2 | US1 + Phase 2 | T033 complete | Needs session files to exist |

**Parallel Opportunities**:
- US3 (Providers) can be developed in parallel with US1/US2
- US4 (History) depends on US1 but can proceed while US2 is in progress

### TDD Workflow (Per Task)

For every implementation task:

1. **Red**: Write test first, run it, verify it FAILS
2. **Green**: Write minimum code to make test PASS
3. **Refactor**: Clean up while keeping tests green
4. **Commit**: Commit test + implementation together

**Example** (T026-T029):
```bash
# Step 1: Write failing test
git checkout -b task/T026-welcome-test
# Write src/test/integration/welcome.test.ts
npm test  # Verify it fails (RED)
git add src/test/integration/welcome.test.ts
git commit -m "T026: Add failing test for Welcome page display"

# Step 2: Implement to pass
# Write src/webview/pages/WelcomePage.ts
npm test  # Verify it passes (GREEN)

# Step 3: Refactor if needed
# Clean up code
npm test  # Still passes

# Step 4: Commit
git add src/webview/pages/WelcomePage.ts
git commit -m "T029: Implement WelcomePage.render() - passes T026"
```

### Parallel Opportunities

**Phase 1 (All can run in parallel)**:
```
Parallel batch 1:
  T002: Directory structure
  T003: CSS stylesheet  
  T004: UUID utils
  T005: Error utils
  T006: Session models
  T007: Provider models
  T008: Message models
```

**Phase 2 (Test batches, then implementation batches)**:
```
Parallel batch 2 (Tests):
  T009: SessionService tests
  T012: ProviderService tests
  T015: LLMService tests
  
Parallel batch 3 (Services - after batch 2):
  T011: SessionService implementation
  T014: ProviderService implementation
  T017: LLMService implementation

Parallel batch 4 (Components):
  T023: Toolbar component
  T024: InputBox component
  T025: Button component
```

**User Stories (After foundational complete)**:

If you have multiple developers:
```
Developer A: Phase 3 (US1) + Phase 4 (US2)  ← Critical path
Developer B: Phase 5 (US3)                   ← Parallel track
Developer C: Phase 6 (US4)                   ← Starts after US1 done
```

Sequential (single developer):
```
US1 → US2 → [US3 + US4 in either order] → Polish
```

---

## Parallel Example: Phase 2 Foundational Tests

**TDD Principle**: Write all tests first (they will all fail), then implement services to make them pass.

```bash
# Batch 1: Write all service tests in parallel (different developers or sessions)
Task T009: "Write unit tests for SessionService.create() in src/test/unit/SessionService.test.ts"
Task T010: "Write unit tests for SessionService.load(), update(), delete(), list() in src/test/unit/SessionService.test.ts"
Task T012: "Write unit tests for ProviderService CRUD in src/test/unit/ProviderService.test.ts"
Task T013: "Write unit tests for API key storage in src/test/unit/ProviderService.test.ts"
Task T015: "Write unit tests for LLMService.sendMessage() in src/test/unit/LLMService.test.ts"
Task T016: "Write unit tests for SSE stream parsing in src/test/unit/LLMService.test.ts"

# Verify all tests FAIL
$ npm test
# Expected: All tests fail because implementations don't exist yet (RED phase)

# Batch 2: Implement services to make tests pass
Task T011: "Implement SessionService in src/services/SessionService.ts"
Task T014: "Implement ProviderService in src/services/ProviderService.ts"
Task T017: "Implement LLMService in src/services/LLMService.ts"

# Verify all tests PASS
$ npm test
# Expected: All tests pass (GREEN phase)
```

---

## Implementation Strategy

### MVP-First Approach (Recommended)

**Goal**: Get to working chat experience as fast as possible

**Scope**: User Stories 1 + 2 only (Welcome page + Active chat)

```
Day 1: Setup + Foundational
  - T001-T008: Project structure and models
  - T009-T025: Core services with tests
  
Day 2-3: User Story 1 (First Question)
  - T026-T028: Write tests (failing)
  - T029-T033: Implement (tests pass)
  - Validate: Can ask first question
  
Day 3-4: User Story 2 (Conversations)
  - T034-T037: Write tests (failing)
  - T038-T045: Implement (tests pass)
  - Validate: Can have multi-turn conversations
  
→ DEMO MVP: Working AI chat in VS Code sidebar
```

**Deliverable**: Functional AI chat extension (no provider management UI yet - hardcode one provider for demo)

### Full Feature Delivery

**Goal**: Complete all functionality from spec

```
Day 5-6: User Story 3 (Provider Management)
  - T046-T050: Write tests
  - T051-T061: Implement
  - Validate: Can add/edit/delete providers via UI
  
Day 7: User Story 4 (Session History)
  - T062-T067: Write tests
  - T068-T078: Implement
  - Validate: Can browse/rename/delete sessions
  
Day 8-9: Polish
  - T079-T084: Performance & reliability
  - T085-T094: Code quality & validation
  - T095-T100: Documentation & demo
  
→ RELEASE: Full-featured CircuitX v1.0
```

**Deliverable**: Production-ready extension with all P1 and P2 features

### Incremental Validation

After each user story completes:

1. **Run tests**: `npm test` - all should pass
2. **Manual test**: Follow "Independent Test" from spec.md for that user story
3. **Tag commit**: `git tag us1-complete`, `git tag us2-complete`, etc.
4. **Demo**: Show working feature to stakeholders
5. **Decision point**: Ship MVP or continue to next story?

---

## Notes

- **[P]** = Parallelizable tasks (different files, no dependencies)
- **TDD is mandatory**: Write tests first, verify they fail (RED), implement (GREEN), refactor
- Each user story is independently testable after completion
- Commit after each task or logical group of related tasks
- **MVP scope** (US1 + US2) = minimum viable chat experience
- **Full scope** (US1-US4 + polish) = complete feature set
- Follow constitution principles: strict TypeScript, >80% coverage, <1s activation, <100ms UI response
