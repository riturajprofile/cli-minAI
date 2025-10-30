# Google Sheets Integration Setup Guide

This guide will help you set up Google Sheets logging for MinAI chat history, token usage, and analytics.

## Overview

The integration logs:
- **Chat History**: User messages, AI responses, timestamps, modes
- **Token Usage**: Token consumption, costs, model usage
- **User Sessions**: Session analytics, message counts, duration
- **Errors**: Error tracking and debugging info

## Step 1: Create Google Apps Script

### 1.1 Create a New Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it "MinAI Analytics" (or your preferred name)
4. Create the following sheets (tabs):
   - `ChatHistory`
   - `TokenUsage`
   - `UserSessions`
   - `Errors`
   - `WebAnalytics` (for analytics.js)

### 1.2 Add Headers to Each Sheet

**ChatHistory Sheet Headers:**
```
timestamp | user_id | mode | model | user_message | ai_response | message_length | response_length | processing_time | success | error | has_file | file_name | file_size | tokens_prompt | tokens_completion | tokens_total | metadata
```

**TokenUsage Sheet Headers:**
```
timestamp | user_id | model | mode | tokens_prompt | tokens_completion | tokens_total | cost_estimate | success
```

**UserSessions Sheet Headers:**
```
timestamp | user_id | session_start | session_end | message_count | total_tokens | duration_seconds | modes_used
```

**Errors Sheet Headers:**
```
timestamp | user_id | error_type | error_message | context
```

### 1.3 Create Google Apps Script

1. In your Google Sheet, click **Extensions** → **Apps Script**
2. Delete the default `myFunction()` code
3. Paste the following code:

```javascript
/**
 * MinAI Google Sheets Logger
 * Handles logging from both backend (Python) and frontend (JavaScript)
 */

// Main function to handle POST requests
function doPost(e) {
  try {
    // Log incoming request for debugging
    Logger.log('Received POST request');
    
    // Parse the incoming data
    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseError) {
      Logger.log('Parse error: ' + parseError);
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: 'Invalid JSON' })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    Logger.log('Parsed data: ' + JSON.stringify(data).substring(0, 200));
    
    // Get the active spreadsheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Determine which sheet to write to
    const sheetName = data.sheet || 'WebAnalytics';
    let sheet = ss.getSheetByName(sheetName);
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      Logger.log('Creating new sheet: ' + sheetName);
      sheet = ss.insertSheet(sheetName);
      
      // Add headers based on sheet type
      if (sheetName === 'ChatHistory') {
        sheet.appendRow([
          'timestamp', 'user_id', 'mode', 'model', 'user_message', 
          'ai_response', 'message_length', 'response_length', 
          'processing_time', 'success', 'error', 'has_file', 
          'file_name', 'file_size', 'tokens_prompt', 
          'tokens_completion', 'tokens_total', 'metadata'
        ]);
      } else if (sheetName === 'TokenUsage') {
        sheet.appendRow([
          'timestamp', 'user_id', 'model', 'mode', 'tokens_prompt',
          'tokens_completion', 'tokens_total', 'cost_estimate', 'success'
        ]);
      } else if (sheetName === 'UserSessions') {
        sheet.appendRow([
          'timestamp', 'user_id', 'session_start', 'session_end',
          'message_count', 'total_tokens', 'duration_seconds', 'modes_used'
        ]);
      } else if (sheetName === 'Errors') {
        sheet.appendRow([
          'timestamp', 'user_id', 'error_type', 'error_message', 'context'
        ]);
      }
    }
    
    // Write data based on sheet type
    let rowData;
    
    if (sheetName === 'ChatHistory') {
      rowData = [
        data.timestamp || new Date().toISOString(),
        data.user_id || '',
        data.mode || 'standard',
        data.model || 'gpt-4o',
        (data.user_message || '').substring(0, 1000),
        (data.ai_response || '').substring(0, 2000),
        data.message_length || 0,
        data.response_length || 0,
        data.processing_time || 0,
        data.success || false,
        data.error || '',
        data.has_file || false,
        data.file_name || '',
        data.file_size || 0,
        data.tokens_prompt || 0,
        data.tokens_completion || 0,
        data.tokens_total || 0,
        data.metadata || ''
      ];
    } else if (sheetName === 'TokenUsage') {
      rowData = [
        data.timestamp || new Date().toISOString(),
        data.user_id || '',
        data.model || 'gpt-4o',
        data.mode || 'standard',
        data.tokens_prompt || 0,
        data.tokens_completion || 0,
        data.tokens_total || 0,
        data.cost_estimate || 0,
        data.success || false
      ];
    } else if (sheetName === 'UserSessions') {
      rowData = [
        data.timestamp || new Date().toISOString(),
        data.user_id || '',
        data.session_start || '',
        data.session_end || '',
        data.message_count || 0,
        data.total_tokens || 0,
        data.duration_seconds || 0,
        data.modes_used || 'standard'
      ];
    } else if (sheetName === 'Errors') {
      rowData = [
        data.timestamp || new Date().toISOString(),
        data.user_id || '',
        data.error_type || '',
        data.error_message || '',
        data.context || ''
      ];
    } else {
      // WebAnalytics (from analytics.js)
      rowData = [
        data.timestamp || new Date().toISOString(),
        data.sessionId || '',
        JSON.stringify(data.userIdentification || {}),
        JSON.stringify(data.page || {}),
        JSON.stringify(data.browser || {}),
        JSON.stringify(data.device || {}),
        JSON.stringify(data.geolocation || {}),
        data.canvasFingerprint || ''
      ];
    }
    
    // Append the row
    sheet.appendRow(rowData);
    Logger.log('Data written to sheet: ' + sheetName);
    
    // Return success response
    return ContentService.createTextOutput(
      JSON.stringify({ success: true, sheet: sheetName })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function - run this to verify the script works
function testScript() {
  const testData = {
    postData: {
      contents: JSON.stringify({
        sheet: 'ChatHistory',
        timestamp: new Date().toISOString(),
        user_id: 'test_user',
        mode: 'standard',
        model: 'gpt-4o',
        user_message: 'Test message',
        ai_response: 'Test response',
        message_length: 12,
        response_length: 13,
        processing_time: 1.5,
        success: true,
        tokens_total: 100
      })
    }
  };
  
  const result = doPost(testData);
  Logger.log('Test result: ' + result.getContent());
}
```

4. Click **Save** (💾) and name your project "MinAI Logger"

### 1.4 Deploy as Web App

1. Click **Deploy** → **New deployment**
2. Click the gear icon ⚙️ next to "Select type"
3. Choose **Web app**
4. Configure:
   - **Description**: "MinAI Chat Logger"
   - **Execute as**: **Me** (your account)
   - **Who has access**: **Anyone** (required for external access)
5. Click **Deploy**
6. **Authorize** the script (you may see a warning - click "Advanced" → "Go to MinAI Logger (unsafe)")
7. **COPY THE WEB APP URL** - it will look like:
   ```
   https://script.google.com/macros/s/XXXXXXXXXXXXXXXXXXXXXXXXXX/exec
   ```

## Step 2: Configure MinAI Backend

### 2.1 Update `.env` File

Add these lines to your `.env` file:

```env
# Google Sheets Integration
GOOGLE_SHEETS_ENABLED=true
GOOGLE_SHEETS_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID_HERE/exec
```

Replace `YOUR_SCRIPT_ID_HERE` with your actual Apps Script URL.

### 2.2 Install Required Package

```bash
pip install requests
# or with uv
uv pip install requests
```

## Step 3: Test the Integration

### 3.1 Test from Python

Create a test file `test_sheets.py`:

```python
from google_sheets_logger import sheets_logger

# Test chat logging
sheets_logger.log_chat_interaction(
    user_id="test_user_123",
    user_message="Hello, how are you?",
    ai_response="I'm doing well, thanks for asking!",
    mode="standard",
    processing_time=1.5,
    tokens_used={"prompt": 10, "completion": 15, "total": 25},
    model_name="gpt-4o",
    success=True
)

print("✓ Test data sent to Google Sheets!")
print("Check your ChatHistory sheet for the entry.")
```

Run it:
```bash
python test_sheets.py
```

### 3.2 Check Your Google Sheet

1. Open your Google Sheet
2. Go to the **ChatHistory** tab
3. You should see a new row with your test data!

## Step 4: View Analytics Dashboard

### 4.1 Create Dashboard Charts

In your Google Sheet, you can create charts to visualize:

**Token Usage Over Time:**
- Chart type: Line chart
- Data range: TokenUsage sheet
- X-axis: timestamp
- Y-axis: tokens_total

**Messages by Mode:**
- Chart type: Pie chart
- Data range: ChatHistory sheet
- Labels: mode
- Values: COUNT of mode

**Average Processing Time:**
- Chart type: Line chart
- Data range: ChatHistory sheet
- X-axis: timestamp
- Y-axis: processing_time

**Cost Analysis:**
- Chart type: Line chart
- Data range: TokenUsage sheet
- X-axis: timestamp
- Y-axis: cost_estimate

## Usage in Code

### Logging Chat Interactions

```python
from google_sheets_logger import log_chat_to_sheets, calculate_token_cost

# After getting AI response
tokens = {"prompt": 100, "completion": 200, "total": 300}
cost = calculate_token_cost(tokens, "gpt-4o")

log_chat_to_sheets(
    user_id=user_id,
    user_message=user_input,
    ai_response=ai_response,
    mode=mode,
    processing_time=processing_time,
    tokens_used=tokens,
    model_name="gpt-4o",
    success=True
)
```

### Logging Token Usage

```python
from google_sheets_logger import sheets_logger

sheets_logger.log_token_usage(
    user_id=user_id,
    model_name="gpt-4o",
    tokens_used={"prompt": 100, "completion": 200, "total": 300},
    cost_estimate=0.005,
    mode="standard",
    success=True
)
```

### Logging Errors

```python
sheets_logger.log_error(
    user_id=user_id,
    error_type="ValidationError",
    error_message=str(error),
    context={"mode": mode, "input_length": len(user_input)}
)
```

## Troubleshooting

### Common Issues

**1. CORS Errors**
- Make sure deployment is set to "Anyone" access
- Redeploy the web app if you made changes

**2. No Data Appearing**
- Check the Apps Script execution log: Script Editor → Executions
- Verify the URL in `.env` matches your deployment URL
- Test with the `testScript()` function in Apps Script

**3. Authentication Issues**
- Re-authorize the script
- Check that "Execute as: Me" is set correctly

**4. Rate Limits**
- Google Apps Script has quotas (1200 invocations/day for free accounts)
- Consider batching logs if hitting limits

## Security Notes

- The Apps Script URL is public but doesn't expose your sheet directly
- Only authorized writes can occur
- Consider adding API key authentication for production
- Don't commit your `.env` file with credentials

## Advanced: Add Authentication (Optional)

To add API key authentication, modify the Apps Script:

```javascript
const API_KEY = 'your-secret-api-key-here';

function doPost(e) {
  // Check API key
  const providedKey = e.parameter.apiKey || '';
  if (providedKey !== API_KEY) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: 'Unauthorized' })
    ).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Rest of the code...
}
```

Then update `google_sheets_logger.py` to include the API key:

```python
response = requests.post(
    f"{self.script_url}?apiKey={os.getenv('GOOGLE_SHEETS_API_KEY')}",
    json=data,
    # ...
)
```

## Next Steps

1. ✅ Set up automatic data retention (delete old logs after 90 days)
2. ✅ Create scheduled email reports
3. ✅ Set up alerts for high token usage
4. ✅ Export data for further analysis

---

**Need Help?**
- Check Google Apps Script documentation: https://developers.google.com/apps-script
- Review execution logs in Apps Script editor
- Test with the provided test functions
