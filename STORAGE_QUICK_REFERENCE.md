# Google Sheets Storage - Quick Reference

## 🚀 TL;DR - How It Works

```
User Message → Python Backend → HTTP POST → Google Apps Script → Google Sheet Row
```

## 📊 Data Flow in 30 Seconds

### 1. Python Creates Dictionary
```python
log_data = {
    "sheet": "ChatHistory",
    "user_id": "192.168.1.100",
    "user_message": "Hello!",
    "ai_response": "Hi there!",
    "tokens_total": 40
}
```

### 2. Send to Google
```python
requests.post(
    "https://script.google.com/macros/s/YOUR_ID/exec",
    json=log_data  # Converts to JSON automatically
)
```

### 3. Apps Script Receives
```javascript
function doPost(e) {
    let data = JSON.parse(e.postData.contents);
    let sheet = ss.getSheetByName(data.sheet);
    sheet.appendRow([data.user_id, data.user_message, ...]);
}
```

### 4. Appears in Sheet
```
| timestamp | user_id | message | response | tokens |
|-----------|---------|---------|----------|--------|
| 2025-...  | 192...  | Hello!  | Hi there!|   40   |
```

## 📋 What Gets Stored

### ChatHistory Sheet (18 columns)
```
timestamp, user_id, mode, model, user_message, ai_response,
message_length, response_length, processing_time, success,
error, has_file, file_name, file_size, tokens_prompt,
tokens_completion, tokens_total, metadata
```

### TokenUsage Sheet (9 columns)
```
timestamp, user_id, model, mode, tokens_prompt,
tokens_completion, tokens_total, cost_estimate, success
```

### UserSessions Sheet (8 columns)
```
timestamp, user_id, session_start, session_end,
message_count, total_tokens, duration_seconds, modes_used
```

### Errors Sheet (5 columns)
```
timestamp, user_id, error_type, error_message, context
```

## 💡 Key Concepts

### Python Side
- **Dictionary** → Data structure with key-value pairs
- **JSON** → Text format for sending data over HTTP
- **requests.post()** → Sends HTTP request to Google

### Google Side
- **Apps Script** → JavaScript code that runs on Google servers
- **doPost()** → Function that receives HTTP POST requests
- **sheet.appendRow()** → Adds a new row to the sheet

## 🔍 Example Request

### Python Sends
```python
{
    "sheet": "ChatHistory",
    "timestamp": "2025-10-30T14:23:45Z",
    "user_id": "192.168.1.100",
    "mode": "standard",
    "user_message": "Hello!",
    "tokens_total": 40
}
```

### Apps Script Receives
```javascript
// e.postData.contents = '{"sheet":"ChatHistory","timestamp":"2025-10-30T14:23:45Z",...}'

let data = JSON.parse(e.postData.contents);
// Now: data.sheet = "ChatHistory"
//      data.timestamp = "2025-10-30T14:23:45Z"
//      data.user_id = "192.168.1.100"
```

### Sheet Gets
```
| Column A             | Column B        | Column C  | Column D     | Column E  |
|----------------------|-----------------|-----------|--------------|-----------|
| 2025-10-30T14:23:45  | 192.168.1.100   | standard  | Hello!       | 40        |
```

## 💰 Cost Calculation

```python
def calculate_token_cost(tokens, model_name):
    prompt_tokens = tokens["prompt"]
    completion_tokens = tokens["completion"]
    
    if "mini" in model_name:
        # GPT-4o-mini
        prompt_cost = (prompt_tokens / 1_000_000) * 0.15
        completion_cost = (completion_tokens / 1_000_000) * 0.60
    else:
        # GPT-4o
        prompt_cost = (prompt_tokens / 1_000_000) * 5.0
        completion_cost = (completion_tokens / 1_000_000) * 15.0
    
    return prompt_cost + completion_cost

# Example:
# tokens = {"prompt": 15, "completion": 25}
# cost = calculate_token_cost(tokens, "gpt-4o")
# Result: $0.000450
```

## 🔐 Security

- ✅ Data sent over HTTPS (encrypted)
- ✅ Apps Script URL is public but only writes data
- ✅ No sensitive data in URL (all in POST body)
- ✅ Google handles authentication
- ✅ Your sheet, your data, your control

## 🎯 Common Queries

### In Google Sheets

**Total tokens:**
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

**Count by mode:**
```
=COUNTIF(ChatHistory!C:C,"learning")
```

## 📖 Full Documentation

- **Quick Start:** `GOOGLE_SHEETS_QUICKSTART.md`
- **Complete Setup:** `GOOGLE_SHEETS_SETUP.md`
- **How It Works:** `HOW_DATA_IS_STORED.md`
- **Architecture:** `GOOGLE_SHEETS_ARCHITECTURE.md`

## 🔧 File Locations

- **Logger Module:** `google_sheets_logger.py`
- **Test Script:** `test_google_sheets.py`
- **Integration:** `ai.py` and `main.py`
- **Config:** `.env`

## ⚡ Quick Commands

```bash
# Test the integration
python test_google_sheets.py

# Check if enabled
grep GOOGLE_SHEETS_ENABLED .env

# View logs
tail -f server.log | grep -i sheets
```

## 🎉 That's It!

The data flows automatically from your chatbot to Google Sheets. Every conversation, every token, every error - all logged and ready for analysis!

**Next Step:** Follow `GOOGLE_SHEETS_QUICKSTART.md` to set it up in 5 minutes!
