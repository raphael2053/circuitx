# Feature Specification: AI Code Agent MVP

**Feature Branch**: `001-ai-agent-mvp`  
**Created**: 2026-01-08  
**Status**: Draft  
**Input**: User description: "Build an AI code agent MVP that has welcome page, chat box, session history and LLM Providers"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - First-Time User Asks Question (Priority: P1)

A developer installs CircuitX for the first time and immediately asks a question without any prior configuration.

**Why this priority**: This is the core value proposition - zero-config usability. Users must be able to get value within seconds of installation without reading documentation or configuring providers.

**Independent Test**: Install extension, open webview in right sidebar, type question on welcome page, press Enter. Session is created automatically and user sees loading state followed by a response (even if it's an error about missing provider configuration - that's handled later in P3).

**Acceptance Scenarios**:

1. **Given** fresh installation with no sessions, **When** user opens CircuitX welcome page, **Then** welcome page displays with input box and toolbar (➕ New, 🕒 History, ⚙️ Settings)
2. **Given** welcome page is open, **When** user types question and presses Enter, **Then** system creates new session with title from first 30 characters of question
3. **Given** new session created from welcome page, **When** system transitions, **Then** user navigates to Active Chat page showing their question and response stream
4. **Given** Active Chat page is displayed, **When** page renders, **Then** current session title is visible in header area

---

### User Story 2 - Continuing Conversations (Priority: P1)

A developer wants to have a multi-turn conversation with the AI agent within the same session, asking follow-up questions and seeing the full conversation history.

**Why this priority**: Multi-turn conversations are essential for exploration and debugging workflows. This is the "chatting" core loop that users will spend most time in.

**Independent Test**: Create a session (via US1), send a message, see response, send another message in same session. Verify all messages appear in chronological order and context is maintained.

**Acceptance Scenarios**:

1. **Given** user is in Active Chat page with existing session, **When** user types message in bottom input box and presses Enter, **Then** message is appended to current session's message stream
2. **Given** message is sent, **When** system processes, **Then** loading state appears within 100ms and LLM response streams back
3. **Given** Active Chat page with multiple messages, **When** user scrolls, **Then** all previous messages in session are visible in chronological order
4. **Given** user is viewing a session, **When** user clicks 🕒 toolbar button, **Then** user navigates to Session History page (full page transition, not sidebar)
5. **Given** user is viewing a session, **When** user clicks ➕ toolbar button, **Then** user returns to Welcome page (full page transition)

---

### User Story 3 - Managing LLM Providers (Priority: P2)

A developer needs to configure one or more LLM providers (e.g., local Ollama, OpenAI-compatible endpoint) and set which provider to use by default for new sessions.

**Why this priority**: While zero-config is ideal, users need provider configuration to actually get responses. This enables the core functionality but is ranked P2 because the UI can function without it (showing helpful errors).

**Independent Test**: Navigate to LLM Providers page, add a provider with name/base URL/model, set it as default, create new session and verify it uses that provider.

**Acceptance Scenarios**:

1. **Given** user clicks ⚙️ toolbar button, **When** LLM Providers page loads, **Then** page displays table with columns: Name, Base URL, Model, Actions
2. **Given** LLM Providers page is open, **When** user clicks "+ Add Provider" button, **Then** form/modal appears with fields: Name (required), Base URL (required), Model (required), API Key (optional)
3. **Given** add provider form is filled, **When** user saves, **Then** provider appears in table and is persisted to configuration file
4. **Given** provider exists in table, **When** user clicks Edit action, **Then** form opens with current values pre-filled for editing
5. **Given** provider exists in table, **When** user clicks Delete action, **Then** confirmation dialog appears before deletion
6. **Given** multiple providers exist, **When** user sets one as default (via ⭐ or radio), **Then** that provider is marked as default and used for new sessions
7. **Given** user attempts to delete the default provider, **When** confirmation is given, **Then** system prevents deletion or requires selecting new default first

---

### User Story 4 - Managing Session History (Priority: P2)

A developer wants to review past conversations, rename sessions for clarity, and delete old sessions they no longer need.

**Why this priority**: As users accumulate sessions, they need management capabilities. This is separate from the "chatting" mental model and supports long-term organization.

**Independent Test**: Create 3 sessions with different questions, navigate to Session History page, rename one session, delete another, verify changes persist and UI updates correctly.

**Acceptance Scenarios**:

1. **Given** user clicks 🕒 toolbar button, **When** Session History page loads, **Then** page displays vertical list of sessions sorted by last updated time (descending)
2. **Given** Session History page with sessions, **When** each session item is displayed, **Then** it shows: session title, last updated timestamp, Edit button, Delete button
3. **Given** session in history list, **When** user clicks session title, **Then** user navigates to Active Chat page showing that session
4. **Given** session in history list, **When** user clicks Edit button, **Then** inline or modal editor appears allowing title rename only
5. **Given** rename editor is open with new title, **When** user saves, **Then** session title updates in list and in session data
6. **Given** session in history list, **When** user clicks Delete button, **Then** confirmation dialog appears warning about permanent deletion
7. **Given** delete confirmation accepted, **When** system processes, **Then** session is deleted from file system and removed from list
8. **Given** Session History page shows 1000+ sessions, **When** page renders, **Then** list renders without UI lag (virtualization or pagination)

---

### Edge Cases

- **Empty state handling**: What happens when user opens Session History page with zero sessions? Show empty state message: "No sessions yet. Click ➕ to start a conversation."
- **Network failures**: What happens when LLM provider API call fails or times out? Show actionable error message: "Unable to reach LLM provider. Check your connection and provider settings (⚙️)."
- **Missing provider configuration**: What happens when user sends message but no default provider is configured? Show error: "No LLM provider configured. Please set up a provider in Settings (⚙️)."
- **Concurrent session deletion**: What happens when user deletes a session while viewing it in Active Chat? Navigate to Welcome page or most recent session.
- **Session title collision**: What happens when auto-generated title (first 30 chars) matches existing session? Append timestamp or counter to make unique: "My question (2)".
- **Input validation**: What happens when user tries to save provider with empty required fields? Show inline validation errors and prevent save.
- **VS Code restart**: What happens when VS Code restarts mid-session? Extension must restore last active session state via webview state persistence.
- **Large message streams**: What happens when LLM response is very long (10,000+ tokens)? Messages must stream progressively without blocking UI.

## Requirements *(mandatory)*

### Functional Requirements

**Welcome Page:**
- **FR-001**: System MUST display Welcome page on first extension activation with CircuitX branding and toolbar
- **FR-002**: Welcome page MUST show one large input box for user questions
- **FR-003**: Welcome page MUST NOT display session list or provider selection (minimal cognitive load)
- **FR-004**: Welcome page MUST be identical whether user has zero sessions or many (no conditional UI)
- **FR-005**: System MUST create new session automatically when user submits question from Welcome page
- **FR-006**: Session title MUST be auto-generated from first 30 characters of user's question
- **FR-007**: After session creation from Welcome, system MUST navigate to Active Chat page

**Active Chat Page:**
- **FR-008**: Active Chat page MUST display full-width message stream with current session title in header
- **FR-009**: Active Chat page MUST NOT display session list sidebar (single-page-at-a-time navigation via toolbar)
- **FR-010**: Message stream MUST display all messages in current session in chronological order
- **FR-011**: System MUST append new messages to current session when user sends from bottom input box
- **FR-012**: System MUST show loading state within 100ms of message submission
- **FR-013**: System MUST stream LLM responses progressively to message area
- **FR-014**: Users MUST navigate to Session History page (via 🕒 toolbar) to switch sessions
- **FR-015**: Selecting a session from Session History page MUST navigate to Active Chat page for that session

**Session History Page:**
- **FR-016**: Session History page MUST display all sessions in vertical list sorted by last updated time (descending)
- **FR-017**: Each session item MUST show: title, last updated timestamp, Edit action, Delete action
- **FR-018**: Clicking session title MUST navigate to Active Chat page for that session
- **FR-019**: Edit action MUST allow renaming session title only
- **FR-020**: Delete action MUST show confirmation dialog before deletion
- **FR-021**: Deleted sessions MUST be removed from file system permanently
- **FR-022**: Session list MUST handle 1000+ sessions without UI lag

**LLM Provider Management:**
- **FR-023**: LLM Providers page MUST display table with columns: Name, Base URL, Model, Actions
- **FR-024**: System MUST support adding providers with required fields: Name, Base URL, Model
- **FR-025**: System MUST support optional API Key field for provider authentication
- **FR-026**: Provider data MUST be persisted to VS Code configuration file
- **FR-027**: Users MUST be able to edit existing providers (all fields)
- **FR-028**: Users MUST be able to delete providers after confirmation
- **FR-029**: System MUST support setting one provider as default (via ⭐ or radio button)
- **FR-030**: Default provider MUST be used automatically for new sessions
- **FR-031**: System MUST prevent deletion of default provider without selecting new default

**Global Navigation:**
- **FR-032**: Webview MUST be displayed in VS Code's right sidebar panel (left sidebar reserved for VS Code's file explorer and source control)
- **FR-033**: All pages MUST display consistent toolbar with three buttons: ➕ New Session, 🕒 Session History, ⚙️ LLM Providers
- **FR-034**: Navigation MUST be single-page-at-a-time (only one page visible at any moment)
- **FR-035**: ➕ button MUST navigate to Welcome page from any page
- **FR-036**: 🕒 button MUST navigate to Session History page from any page
- **FR-037**: ⚙️ button MUST navigate to LLM Providers page from any page

**Data Persistence:**
- **FR-038**: Session data (messages, metadata) MUST be persisted to file system
- **FR-039**: Provider configuration (name, base URL, model, is_default) MUST be persisted to VS Code settings
- **FR-040**: Provider API keys MUST be stored using VS Code SecretStorage API (OS keychain)
- **FR-041**: System MUST restore last active session on VS Code restart via webview state

**Error Handling:**
- **FR-042**: System MUST retry failed LLM API calls once after 2-second delay before showing error
- **FR-043**: System MUST display actionable error message when LLM API call fails after retry
- **FR-044**: System MUST timeout LLM API calls after 30 seconds with clear error
- **FR-045**: System MUST show helpful error when no default provider is configured
- **FR-046**: All user-facing errors MUST include suggested action (e.g., "Check settings")

### Key Entities

- **Session**: Represents a conversation thread with the AI. Contains: unique ID (UUID v4), title (string, max 100 chars), creation timestamp, last updated timestamp, messages array, provider reference (optional).

- **Message**: Single message in a conversation. Contains: unique ID (UUID v4), role (user or assistant), content (string), timestamp, metadata (optional - for future token count, etc.).

- **LLMProvider**: Configuration for connecting to an LLM service. Contains: unique ID (UUID v4), name (string, user-defined), base URL (string, API endpoint), model (string, model identifier), API key (string, optional, stored in VS Code SecretStorage), is_default (boolean).

### Non-Functional Requirements (Constitution-Aligned)

**Code Quality (Principle I):**
- Code MUST pass TypeScript strict mode checks with no `any` types except for VS Code API boundaries
- Code MUST pass ESLint with zero errors
- Components MUST follow Single Responsibility Principle (e.g., separate components for SessionList, MessageStream, ProviderTable)

**Testing (Principle II):**
- Feature MUST include integration tests for all four user stories
- Contract tests MUST verify VS Code webview API, settings API, and file system API interactions
- Core logic (session management, provider CRUD, message handling) MUST achieve >80% test coverage
- TDD MUST be followed: write tests before implementation

**User Experience (Principle III):**
- UI MUST follow VS Code webview UX guidelines (theming, styling, accessibility)
- Error messages MUST be actionable with specific next steps
- Navigation MUST use consistent toolbar pattern (➕🕒⚙️) across all pages
- Feature MUST work without configuration on first use (graceful degradation with helpful errors)
- All state transitions MUST be reversible (can navigate back without data loss)
- Loading states MUST provide visual feedback (spinners, progress indicators)

**Performance (Principle IV):**
- Extension activation MUST complete within 1 second
- Message sending MUST show loading state within 100ms
- Session History page MUST handle 1000+ sessions without UI lag (use virtualization)
- Memory footprint MUST stay below 200MB during idle
- LLM API calls MUST timeout after 30 seconds
- File operations (session save/load) MUST be asynchronous and non-blocking
- Message streaming MUST not block UI even for 10,000+ token responses
- Page transitions (Welcome → Chat → History → Providers) MUST complete within 100ms

**Observability (MVP):**
- Errors MUST be logged to browser console only (no persistent Output Channel logs)
- No telemetry or analytics in MVP

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can ask their first question within 10 seconds of installing the extension (zero-config first use)
- **SC-002**: Users can complete a 5-message conversation within a single session without errors
- **SC-003**: Extension handles 1000 concurrent sessions stored on disk without performance degradation
- **SC-004**: Users can configure a new LLM provider and send a test message within 30 seconds
- **SC-005**: Session history page loads and displays 500 sessions within 2 seconds
- **SC-006**: 90% of LLM API calls complete or timeout within 30 seconds
- **SC-007**: Extension activation completes in under 1 second on typical hardware (MacBook Pro M1 or equivalent)
- **SC-008**: Memory usage stays below 200MB during idle state with 100 cached sessions
- **SC-009**: UI interactions (button clicks, navigation) respond within 100ms
- **SC-010**: Users can successfully rename and delete sessions with confirmation in under 5 clicks total

## Assumptions *(optional)*

1. **LLM API compatibility**: Assumed all LLM providers support OpenAI-compatible streaming API format (POST to `/chat/completions` with SSE streaming). This is reasonable as most self-hosted solutions (Ollama, vLLM, LocalAI) follow this standard.

2. **File system access**: Assumed VS Code extension has reliable file system access for session persistence. Will use workspace storage API which is standard across all VS Code installations.

3. **Single active session**: MVP assumes users work with one active session at a time (no multi-tab session views). This simplifies state management and aligns with PRD's explicit non-goal of multi-tab support.

4. **Session storage format**: Using JSON for session files is reasonable default for MVP. Format: `{id, title, created_at, updated_at, messages: [...]}`. Future optimization to JSONL or database can be added post-MVP.

5. **Provider authentication**: Assumed API key in header format is sufficient for MVP (`Authorization: Bearer <key>`). More complex auth flows (OAuth, cert-based) are out of scope.

6. **Message ordering**: Assumed server-side timestamps are reliable for message ordering. Client-side timestamps used as fallback.

7. **No offline mode**: MVP requires network connectivity for LLM API calls. Offline caching/replay is post-MVP feature.

## Out of Scope (Explicit Non-Goals)

These items are explicitly excluded from this feature per PRD:

- **RAG/Retrieval**: No codebase indexing, embeddings, or semantic search in MVP
- **Code Editing**: No inline diff generation, code patching, or file editing capabilities
- **Agent Behavior**: No tool calling, multi-step planning, or autonomous actions
- **Advanced Message Operations**: No edit message, regenerate response, branch conversations
- **Cost Tracking**: No token counting dashboards or usage analytics
- **Multi-tab Sessions**: No side-by-side session comparison or parallel conversations
- **Session Export**: No export to markdown, PDF, or other formats
- **Collaborative Features**: No session sharing, comments, or multi-user support
- **Voice Input**: No speech-to-text or audio message support
- **Custom Themes**: Using VS Code's built-in theming only, no custom UI themes

## Clarifications

### Session 2026-01-08

- Q: How should the system generate unique IDs for sessions and messages? → A: UUID v4 (guaranteed unique, standard practice)
- Q: When an LLM API call fails, should the system automatically retry? → A: Single retry with 2-second delay before showing error
- Q: What level of logging should the extension implement? → A: Minimal - errors only to console, no persistent logs (MVP simplicity)
- Q: How should the extension store LLM provider API keys? → A: VS Code SecretStorage API (OS keychain integration)
- Q: Should Welcome page show differently when sessions exist? → A: Identical - always show same clean Welcome page (minimal cognitive load)
