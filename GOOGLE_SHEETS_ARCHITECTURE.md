# Google Sheets Integration Architecture

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (index.html)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  • User types message                                     │  │
│  │  • Selects mode (Learning/Standard/Fast)                 │  │
│  │  • Optionally uploads file                               │  │
│  │  • Clicks send                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ POST /chat or /chat-with-file
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND API (main.py)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  1. Receive user message + metadata                      │  │
│  │  2. Extract user_id from client IP                       │  │
│  │  3. Process file (if uploaded)                           │  │
│  │  4. Call AI module                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                       AI MODULE (ai.py)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  1. Validate input                                        │  │
│  │  2. Get/create user history                              │  │
│  │  3. Build conversation context                           │  │
│  │  4. Select model (gpt-4o or gpt-4o-mini)                │  │
│  │  5. Call OpenAI API                                      │  │
│  │  6. Extract response + token usage                       │  │
│  │  7. Update history & summarize if needed                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└───┬───────────────────────┬─────────────────────────────────────┘
    │                       │
    │                       │ Parallel Logging
    │                       ▼
    │         ┌──────────────────────────────────┐
    │         │  GOOGLE SHEETS LOGGER             │
    │         │  (google_sheets_logger.py)        │
    │         │  ┌─────────────────────────────┐  │
    │         │  │ Collect data:               │  │
    │         │  │ • User message & response   │  │
    │         │  │ • Token counts              │  │
    │         │  │ • Processing time           │  │
    │         │  │ • Mode & model used         │  │
    │         │  │ • File info (if uploaded)   │  │
    │         │  │ • Success/error status      │  │
    │         │  └─────────────────────────────┘  │
    │         └────────────┬─────────────────────┘
    │                      │
    │                      │ POST request with JSON
    │                      ▼
    │         ┌──────────────────────────────────┐
    │         │   GOOGLE APPS SCRIPT (Web App)   │
    │         │  ┌─────────────────────────────┐  │
    │         │  │ doPost(e):                  │  │
    │         │  │ 1. Receive POST data        │  │
    │         │  │ 2. Parse JSON               │  │
    │         │  │ 3. Determine target sheet   │  │
    │         │  │ 4. Format row data          │  │
    │         │  │ 5. Append to sheet          │  │
    │         │  │ 6. Return success           │  │
    │         │  └─────────────────────────────┘  │
    │         └────────────┬─────────────────────┘
    │                      │
    │                      ▼
    │         ┌──────────────────────────────────┐
    │         │        GOOGLE SHEETS             │
    │         │                                  │
    │         │  ┌──────────────────────────┐   │
    │         │  │  📊 ChatHistory          │   │
    │         │  │  • All conversations     │   │
    │         │  │  • Token counts          │   │
    │         │  │  • Timestamps            │   │
    │         │  └──────────────────────────┘   │
    │         │                                  │
    │         │  ┌──────────────────────────┐   │
    │         │  │  💰 TokenUsage           │   │
    │         │  │  • Usage by model        │   │
    │         │  │  • Cost estimates        │   │
    │         │  └──────────────────────────┘   │
    │         │                                  │
    │         │  ┌──────────────────────────┐   │
    │         │  │  👥 UserSessions         │   │
    │         │  │  • Session analytics     │   │
    │         │  │  • Usage patterns        │   │
    │         │  └──────────────────────────┘   │
    │         │                                  │
    │         │  ┌──────────────────────────┐   │
    │         │  │  ⚠️  Errors              │   │
    │         │  │  • Error tracking        │   │
    │         │  │  • Debug info            │   │
    │         │  └──────────────────────────┘   │
    │         └──────────────────────────────────┘
    │
    │ Response returned to user
    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      USER SEES RESPONSE                          │
└─────────────────────────────────────────────────────────────────┘
```

## Parallel Analytics System

```
┌──────────────────────────────────────────────────────────────┐
│                    FRONTEND ANALYTICS                         │
│                     (analytics.js)                            │
│                                                               │
│  On page load:                                               │
│  • Collect browser fingerprint                               │
│  • Get geolocation (IP-based)                               │
│  • Capture device info                                       │
│  • Generate unique user ID                                   │
│  • Send to Google Sheets                                     │
│                                                               │
│  Logs to: WebAnalytics sheet                                 │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            │ POST to Apps Script
                            ▼
                   ┌──────────────────┐
                   │  GOOGLE SHEETS   │
                   │  WebAnalytics    │
                   │  sheet tab       │
                   └──────────────────┘
```

## Key Features

### 1. Automatic Logging
- ✅ Every chat automatically logged
- ✅ No manual intervention needed
- ✅ Non-blocking (doesn't slow responses)
- ✅ Error-resistant (failures don't break chat)

### 2. Comprehensive Data
```python
ChatHistory columns:
├── timestamp          # When message was sent
├── user_id           # Unique user identifier
├── mode              # learning/standard/fast
├── model             # gpt-4o or gpt-4o-mini
├── user_message      # User's input (truncated)
├── ai_response       # AI's reply (truncated)
├── message_length    # Character count
├── response_length   # Character count
├── processing_time   # Seconds
├── success           # Boolean
├── error             # Error message if failed
├── has_file          # File uploaded?
├── file_name         # File name
├── file_size         # File size in bytes
├── tokens_prompt     # Input tokens
├── tokens_completion # Output tokens
├── tokens_total      # Total tokens
└── metadata          # JSON extra data
```

### 3. Cost Tracking
```python
TokenUsage columns:
├── timestamp
├── user_id
├── model
├── mode
├── tokens_prompt
├── tokens_completion
├── tokens_total
└── cost_estimate     # Calculated cost in USD
```

### 4. Similar to analytics.js
Both systems use the same pattern:
1. Collect data in JavaScript/Python
2. Format as JSON
3. POST to Google Apps Script
4. Apps Script writes to sheet
5. Data available for analysis

## Configuration

### Enable/Disable
```env
# .env file
GOOGLE_SHEETS_ENABLED=true   # or false
GOOGLE_SHEETS_URL=https://script.google.com/macros/s/.../exec
```

### Security
- Apps Script verifies data format
- Rate limiting via Google quotas
- Optional API key authentication
- No PII logged by default

## Benefits

1. **Real-time Monitoring**: See conversations as they happen
2. **Cost Control**: Track token usage and expenses
3. **User Insights**: Understand usage patterns
4. **Error Tracking**: Debug issues quickly
5. **Analytics**: Create charts and dashboards
6. **Export**: Download for further analysis
7. **Audit Trail**: Complete history of interactions

## Integration Points

### In ai.py
```python
# After successful AI response
if SHEETS_LOGGING_AVAILABLE:
    sheets_logger.log_chat_interaction(...)
    sheets_logger.log_token_usage(...)
```

### In main.py
```python
# After file upload processing
if SHEETS_LOGGING_AVAILABLE and file:
    sheets_logger.log_chat_interaction(
        has_file=True,
        file_info={"name": ..., "size": ...}
    )
```

### Error Handling
```python
# On any error
if SHEETS_LOGGING_AVAILABLE:
    sheets_logger.log_error(
        error_type=...,
        error_message=...,
        context=...
    )
```

## Testing

Run the test script:
```bash
python test_google_sheets.py
```

Expected output:
```
✅ Chat interaction logged successfully!
✅ Token usage logged! Estimated cost: $0.000500
✅ Error logged successfully!
✅ Session logged successfully!
```

Then check your Google Sheet for the test data!

---

**This completes the Google Sheets integration** 🎉

Your MinAI chatbot now has:
- ✅ Full conversation logging
- ✅ Token usage and cost tracking
- ✅ User analytics
- ✅ Error monitoring
- ✅ File upload tracking

All data flows automatically to your Google Sheet for easy analysis!
