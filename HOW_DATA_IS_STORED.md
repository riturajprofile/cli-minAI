# How Data Is Stored in Google Sheets

## 📊 Complete Data Flow Explanation

Let me show you **exactly** how your chat data gets from the chatbot to Google Sheets!

---

## 🔄 Step-by-Step Process

### Step 1: User Sends a Message

```
User types: "Hello, how are you?"
Mode: "standard"
```

### Step 2: Python Backend Processes It

In `ai.py`, after getting the AI response:

```python
# Extract token usage from AI response
tokens_used = {
    "prompt": 15,        # User message tokens
    "completion": 25,    # AI response tokens
    "total": 40          # Total tokens
}

# Calculate cost
cost = calculate_token_cost(tokens_used, "gpt-4o")
# Result: $0.000500 (15*$5/1M + 25*$15/1M)

# Prepare data dictionary
log_data = {
    "sheet": "ChatHistory",                    # Which sheet to write to
    "timestamp": "2025-10-30T14:23:45.123Z",   # Current time
    "user_id": "192.168.1.100",                # User IP address
    "mode": "standard",                        # Response mode
    "model": "gpt-4o",                         # AI model used
    "user_message": "Hello, how are you?",     # User's message
    "ai_response": "I'm doing well, thanks!",  # AI's response
    "message_length": 19,                      # Character count
    "response_length": 24,                     # Character count
    "processing_time": 1.23,                   # Seconds
    "success": True,                           # No errors
    "error": "",                               # No error message
    "has_file": False,                         # No file uploaded
    "file_name": "",                           # No file
    "file_size": 0,                            # 0 bytes
    "tokens_prompt": 15,                       # Input tokens
    "tokens_completion": 25,                   # Output tokens
    "tokens_total": 40,                        # Total
    "metadata": ""                             # Extra info (JSON)
}
```

### Step 3: Send to Google Apps Script

```python
# In google_sheets_logger.py
import requests

# Send HTTP POST request
response = requests.post(
    "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec",
    json=log_data,  # Data as JSON
    headers={"Content-Type": "application/json"},
    timeout=5
)
```

**What happens:**
- Python converts dictionary to JSON string
- Sends HTTP POST request to Google's servers
- Google Apps Script receives the request

### Step 4: Google Apps Script Receives Data

```javascript
// In Google Apps Script (doPost function)
function doPost(e) {
  // Parse incoming JSON
  let data = JSON.parse(e.postData.contents);
  
  // data now contains:
  // {
  //   "sheet": "ChatHistory",
  //   "timestamp": "2025-10-30T14:23:45.123Z",
  //   "user_id": "192.168.1.100",
  //   ... (all other fields)
  // }
  
  // Get the spreadsheet
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Get or create the sheet
  let sheet = ss.getSheetByName("ChatHistory");
  
  if (!sheet) {
    // Create new sheet with headers
    sheet = ss.insertSheet("ChatHistory");
    sheet.appendRow([
      'timestamp', 'user_id', 'mode', 'model', 
      'user_message', 'ai_response', 'message_length',
      'response_length', 'processing_time', 'success',
      'error', 'has_file', 'file_name', 'file_size',
      'tokens_prompt', 'tokens_completion', 'tokens_total', 'metadata'
    ]);
  }
  
  // Build row data array
  let rowData = [
    data.timestamp,           // Column A
    data.user_id,             // Column B
    data.mode,                // Column C
    data.model,               // Column D
    data.user_message,        // Column E (truncated to 1000 chars)
    data.ai_response,         // Column F (truncated to 2000 chars)
    data.message_length,      // Column G
    data.response_length,     // Column H
    data.processing_time,     // Column I
    data.success,             // Column J
    data.error,               // Column K
    data.has_file,            // Column L
    data.file_name,           // Column M
    data.file_size,           // Column N
    data.tokens_prompt,       // Column O
    data.tokens_completion,   // Column P
    data.tokens_total,        // Column Q
    data.metadata             // Column R
  ];
  
  // Append row to sheet
  sheet.appendRow(rowData);
  
  // Return success
  return ContentService.createTextOutput(
    JSON.stringify({ success: true })
  );
}
```

### Step 5: Data Appears in Your Google Sheet

Your Google Sheet now has a new row:

```
Row 2:
┌──────────────────────┬────────────────┬──────────┬────────┬─────────────────────┬─────────────────────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐
│ timestamp            │ user_id        │ mode     │ model  │ user_message        │ ai_response         │ msg_ │ res_ │ proc │ succ │ err  │ file │ file │ file │ tok_ │ tok_ │ tok_ │ meta │
│                      │                │          │        │                     │                     │ len  │ len  │ time │ ess  │ or   │      │ name │ size │ prmt │ cmpl │ totl │ data │
├──────────────────────┼────────────────┼──────────┼────────┼─────────────────────┼─────────────────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ 2025-10-30T14:23:45  │ 192.168.1.100  │ standard │ gpt-4o │ Hello, how are you? │ I'm doing well...   │  19  │  24  │ 1.23 │ TRUE │      │ FALSE│      │   0  │  15  │  25  │  40  │      │
└──────────────────────┴────────────────┴──────────┴────────┴─────────────────────┴─────────────────────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘
```

---

## 📋 Data Structures

### ChatHistory Sheet Structure

```python
{
    "sheet": "ChatHistory",           # Target sheet name
    "timestamp": "ISO 8601 datetime", # When message was sent
    "user_id": "string",              # Unique user identifier (IP-based)
    "mode": "standard|learning|fast", # Response mode
    "model": "gpt-4o|gpt-4o-mini",   # AI model used
    "user_message": "string",         # User's input (max 1000 chars)
    "ai_response": "string",          # AI's response (max 2000 chars)
    "message_length": int,            # Character count of user message
    "response_length": int,           # Character count of AI response
    "processing_time": float,         # Time in seconds
    "success": bool,                  # True if no errors
    "error": "string",                # Error message if failed
    "has_file": bool,                 # True if file was uploaded
    "file_name": "string",            # Name of uploaded file
    "file_size": int,                 # Size in bytes
    "tokens_prompt": int,             # Input tokens used
    "tokens_completion": int,         # Output tokens used
    "tokens_total": int,              # Total tokens
    "metadata": "JSON string"         # Additional data as JSON
}
```

### TokenUsage Sheet Structure

```python
{
    "sheet": "TokenUsage",
    "timestamp": "2025-10-30T14:23:45Z",
    "user_id": "192.168.1.100",
    "model": "gpt-4o",
    "mode": "standard",
    "tokens_prompt": 15,         # Input tokens
    "tokens_completion": 25,     # Output tokens
    "tokens_total": 40,          # Sum
    "cost_estimate": 0.000500,   # Calculated cost in USD
    "success": True
}
```

**Cost Calculation:**
```python
# For GPT-4o:
prompt_cost = (15 / 1_000_000) * $5.00 = $0.000075
completion_cost = (25 / 1_000_000) * $15.00 = $0.000375
total_cost = $0.000450

# For GPT-4o-mini:
prompt_cost = (15 / 1_000_000) * $0.15 = $0.0000023
completion_cost = (25 / 1_000_000) * $0.60 = $0.000015
total_cost = $0.0000173
```

### UserSessions Sheet Structure

```python
{
    "sheet": "UserSessions",
    "timestamp": "2025-10-30T14:30:00Z",   # When session ended
    "user_id": "192.168.1.100",
    "session_start": "2025-10-30T14:00:00Z",
    "session_end": "2025-10-30T14:30:00Z",
    "message_count": 10,              # Total messages
    "total_tokens": 500,              # All tokens used
    "duration_seconds": 1800.5,       # 30 minutes
    "modes_used": "standard,learning" # Comma-separated modes
}
```

### Errors Sheet Structure

```python
{
    "sheet": "Errors",
    "timestamp": "2025-10-30T14:25:00Z",
    "user_id": "192.168.1.100",
    "error_type": "ValidationError",
    "error_message": "Input too long",
    "context": '{"mode": "standard", "input_length": 15000}' # JSON string
}
```

---

## 🔐 Data Transmission Details

### HTTP POST Request

```http
POST https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
Content-Type: application/json

{
  "sheet": "ChatHistory",
  "timestamp": "2025-10-30T14:23:45.123Z",
  "user_id": "192.168.1.100",
  "mode": "standard",
  "model": "gpt-4o",
  "user_message": "Hello!",
  "ai_response": "Hi there!",
  "tokens_total": 40
}
```

### Response from Apps Script

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "sheet": "ChatHistory"
}
```

---

## 💾 Storage Location

### Physical Storage

```
Your Google Drive
└── Google Sheets
    └── "MinAI Analytics" (or your sheet name)
        ├── ChatHistory (tab)
        │   └── Rows of conversation data
        ├── TokenUsage (tab)
        │   └── Rows of token usage data
        ├── UserSessions (tab)
        │   └── Rows of session data
        └── Errors (tab)
            └── Rows of error data
```

### Data Format in Sheet

**ChatHistory Tab:**
```
| A                    | B             | C        | D      | E           | F           | ... |
|----------------------|---------------|----------|--------|-------------|-------------|-----|
| timestamp            | user_id       | mode     | model  | user_msg    | ai_response | ... |
| 2025-10-30T14:23:45  | 192.168.1.100 | standard | gpt-4o | Hello!      | Hi there!   | ... |
| 2025-10-30T14:24:12  | 192.168.1.100 | learning | gpt-4o | Explain...  | Sure, let...| ... |
| 2025-10-30T14:25:01  | 192.168.1.101 | fast     | mini   | Quick ?     | Brief ans...| ... |
```

---

## 🔍 Example: Complete Flow

### 1. User Action
```
User: Types "What is Python?"
Mode: Learning mode selected
File: None
```

### 2. Backend Processing
```python
# In ai.py
response = get_ai_response(
    user_input="What is Python?",
    user_id="192.168.1.100",
    mode="learning"
)

# Result:
{
    "reply": "Python is a high-level programming language...",
    "success": True,
    "tokens_used": {"prompt": 20, "completion": 150, "total": 170},
    "processing_time": 2.45
}
```

### 3. Logging to Sheets
```python
# Automatically called in ai.py
sheets_logger.log_chat_interaction(
    user_id="192.168.1.100",
    user_message="What is Python?",
    ai_response="Python is a high-level...",
    mode="learning",
    processing_time=2.45,
    tokens_used={"prompt": 20, "completion": 150, "total": 170},
    model_name="gpt-4o",
    success=True
)

# Cost calculation:
# Prompt: (20/1M) * $5 = $0.0001
# Completion: (150/1M) * $15 = $0.00225
# Total: $0.00235
```

### 4. HTTP Request
```python
POST to Google Apps Script with:
{
    "sheet": "ChatHistory",
    "timestamp": "2025-10-30T14:23:45Z",
    "user_id": "192.168.1.100",
    "mode": "learning",
    "model": "gpt-4o",
    "user_message": "What is Python?",
    "ai_response": "Python is a high-level programming language...",
    "message_length": 16,
    "response_length": 150,
    "processing_time": 2.45,
    "success": true,
    "tokens_prompt": 20,
    "tokens_completion": 150,
    "tokens_total": 170
}
```

### 5. Apps Script Execution
```javascript
// Receives data
// Finds "ChatHistory" sheet
// Creates array: [timestamp, user_id, mode, ...]
// Appends to sheet
// Returns success
```

### 6. Result in Sheet
```
New row added:
2025-10-30T14:23:45 | 192.168.1.100 | learning | gpt-4o | What is Python? | Python is a high... | 16 | 150 | 2.45 | TRUE | ... | 20 | 150 | 170 | ...
```

### 7. Parallel Token Logging
```python
# Also logs to TokenUsage sheet
{
    "sheet": "TokenUsage",
    "timestamp": "2025-10-30T14:23:45Z",
    "user_id": "192.168.1.100",
    "model": "gpt-4o",
    "mode": "learning",
    "tokens_prompt": 20,
    "tokens_completion": 150,
    "tokens_total": 170,
    "cost_estimate": 0.00235,
    "success": true
}
```

---

## 📊 Query Your Data

### In Google Sheets, you can:

**Total tokens used:**
```
=SUM(ChatHistory!Q:Q)
```

**Total cost:**
```
=SUM(TokenUsage!H:H)
```

**Average response time:**
```
=AVERAGE(ChatHistory!I:I)
```

**Messages by mode:**
```
=COUNTIF(ChatHistory!C:C,"learning")
=COUNTIF(ChatHistory!C:C,"standard")
=COUNTIF(ChatHistory!C:C,"fast")
```

**Cost by model:**
```
=SUMIF(TokenUsage!C:C,"gpt-4o",TokenUsage!H:H)
=SUMIF(TokenUsage!C:C,"gpt-4o-mini",TokenUsage!H:H)
```

---

## 🔄 Real-Time Updates

- **Instant**: Data appears in your sheet within 1-2 seconds
- **Automatic**: No manual intervention needed
- **Reliable**: Retries on failure, logs errors
- **Non-blocking**: Doesn't slow down chatbot responses

---

## 🎯 Summary

**Data Storage Flow:**
```
Python Dict → JSON → HTTP POST → Apps Script → Array → Sheet Row
```

**What gets stored:**
- ✅ Every conversation (user + AI messages)
- ✅ Token counts and costs (auto-calculated)
- ✅ Processing times and performance metrics
- ✅ User sessions and analytics
- ✅ Errors and debugging info
- ✅ File upload metadata

**Where it's stored:**
- ✅ Your Google Drive
- ✅ In a Google Sheet you control
- ✅ Organized in separate tabs (ChatHistory, TokenUsage, etc.)
- ✅ Accessible anytime, anywhere
- ✅ Exportable to CSV/Excel

**How to access:**
- ✅ Open your Google Sheet
- ✅ View any tab to see the data
- ✅ Create charts and dashboards
- ✅ Export for analysis
- ✅ Query with formulas

That's exactly how your chatbot data gets stored in Google Sheets! 🎉
