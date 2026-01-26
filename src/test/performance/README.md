# Performance Validation Tests

## T090: Extension Activation Time
**Target**: <1s activation with 100 cached sessions

**How to Test**:
1. Create 100+ sessions using the extension
2. Close VS Code
3. Reopen and observe "CircuitX activation completed in Xms" in Debug Console
4. Should be well under 1000ms

## T091: History Page with 1000+ Sessions
**Target**: <2s load, no lag

**How to Test**:
1. Create 1000+ sessions (can use script below)
2. Navigate to History page (🕒)
3. Measure load time in Debug Console
4. Scroll through list - should be smooth

## T092: Memory Footprint
**Target**: <200MB idle with 100 sessions

**How to Test**:
1. Open Extension Development Host
2. Create ~100 sessions
3. Check VS Code memory in Activity Monitor / Task Manager
4. Should stay under 200MB for the extension host process

## T093: UI Responsiveness
**Target**: <100ms button click response

**How to Test**:
1. Click ➕ (New Chat) button - should navigate instantly
2. Click 🕒 (History) button - should show list within 100ms
3. Click ⚙️ (Settings) button - should load providers immediately
4. Send a message - loading indicator should appear within 100ms

## T094: Load Test - 500 Sessions
**Target**: File operations stay async, no UI freeze

**How to Test**:
1. Use the load test script below
2. Create 500 sessions programmatically
3. Navigate to History page
4. Verify UI remains responsive during load

---

## Performance Script (Run in Debug Console)

```javascript
// Create test sessions (paste in Debug Console)
const sessions = [];
for (let i = 0; i < 100; i++) {
  sessions.push({
    id: crypto.randomUUID(),
    title: `Test Session ${i}`,
    providerId: 'test',
    messages: [{ id: crypto.randomUUID(), role: 'user', content: 'Hello', timestamp: new Date().toISOString() }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}
console.log('Created', sessions.length, 'test sessions');
```

---

## Results Log

| Test | Target | Actual | Status |
|------|--------|--------|--------|
| T090 Activation | <1000ms | ~XXms | ⏳ |
| T091 History 1000 | <2000ms | ~XXms | ⏳ |
| T092 Memory | <200MB | ~XXmb | ⏳ |
| T093 UI Response | <100ms | ~XXms | ⏳ |
| T094 Load Test | Async | ✓/✗ | ⏳ |

