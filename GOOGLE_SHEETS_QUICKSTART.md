# Google Sheets Integration - Quick Start

## Overview
Your MinAI chatbot now logs everything to Google Sheets:
- ✅ Chat history (user messages + AI responses)
- ✅ Token usage and costs
- ✅ User sessions and analytics
- ✅ Error tracking
- ✅ File upload information

## Quick Setup (5 minutes)

### 1. Create Google Sheet & Apps Script

1. **Create a new Google Sheet**: https://sheets.google.com
2. **Add these sheet tabs**: `ChatHistory`, `TokenUsage`, `UserSessions`, `Errors`
3. **Open Apps Script**: Extensions → Apps Script
4. **Copy the Apps Script code** from `GOOGLE_SHEETS_SETUP.md`
5. **Deploy**: Deploy → New deployment → Web app
   - Execute as: **Me**
   - Who has access: **Anyone**
6. **Copy the deployment URL** (ends with `/exec`)

### 2. Configure MinAI

Edit your `.env` file:

```env
GOOGLE_SHEETS_ENABLED=true
GOOGLE_SHEETS_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

### 3. Install Dependencies

```bash
uv pip install requests
# or
pip install requests
```

### 4. Test It

```bash
python test_google_sheets.py
```

Check your Google Sheet - you should see test data! 🎉

## What Gets Logged

### ChatHistory Sheet
Every chat interaction with:
- Timestamp, User ID, Mode (learning/standard/fast)
- User message and AI response
- Token counts and processing time
- File upload info (if applicable)
- Success/error status

### TokenUsage Sheet
Token consumption tracking:
- Prompt tokens, completion tokens, total
- Estimated costs
- Model used (gpt-4o vs gpt-4o-mini)

### UserSessions Sheet
Session analytics:
- Session duration
- Message counts
- Modes used
- Total tokens per session

### Errors Sheet
Error tracking for debugging:
- Error types and messages
- User context
- Timestamps

## Analytics Dashboard

Create charts in Google Sheets:

1. **Token Usage Over Time** (Line chart)
2. **Cost Analysis** (Line chart)
3. **Messages by Mode** (Pie chart)
4. **Average Response Time** (Line chart)
5. **Error Rate** (Bar chart)

## How It Works

```
User Message → MinAI Backend → AI Response
                      ↓
              Google Sheets Logger
                      ↓
           Google Apps Script (Web App)
                      ↓
              Google Sheets (Data)
```

**Similar to analytics.js** which logs visitor data from the frontend, the backend logger tracks all chat interactions automatically.

## Viewing Your Data

Open your Google Sheet and explore:
- **ChatHistory**: See all conversations
- **TokenUsage**: Track API costs
- **UserSessions**: Understand usage patterns
- **Errors**: Monitor system health

## Privacy & Security

- ✅ Data stays in your Google account
- ✅ Apps Script URL is public but secured
- ✅ No sensitive data exposed
- ✅ Optional API key authentication available (see setup guide)

## Cost Tracking

The system automatically calculates costs:

**GPT-4o**: $5/1M input + $15/1M output tokens
**GPT-4o-mini**: $0.15/1M input + $0.60/1M output tokens

View total costs in the TokenUsage sheet with a SUM formula:
```
=SUM(TokenUsage!H:H)
```

## Troubleshooting

**No data appearing?**
1. Check Google Apps Script execution log
2. Verify URL in `.env` is correct
3. Ensure deployment has "Anyone" access
4. Run `python test_google_sheets.py`

**CORS errors?**
- Redeploy the Apps Script web app
- Verify "Execute as: Me" setting

**Rate limits?**
- Free Google accounts: 1,200 executions/day
- Consider upgrading for higher limits

## Advanced Features

### Add API Key Authentication
See `GOOGLE_SHEETS_SETUP.md` for secure API key setup

### Automatic Data Retention
Add a script to delete logs older than 90 days

### Email Reports
Set up Google Apps Script triggers for daily summaries

### Export Data
Download as CSV/Excel for external analysis

## Files Created

- `google_sheets_logger.py` - Backend logging module
- `GOOGLE_SHEETS_SETUP.md` - Detailed setup guide
- `test_google_sheets.py` - Test script
- Updates to `ai.py` and `main.py` - Integrated logging

## Need Help?

1. Check `GOOGLE_SHEETS_SETUP.md` for detailed instructions
2. Run `python test_google_sheets.py` for diagnostics
3. Check Google Apps Script execution logs
4. Review server logs in `server.log`

---

**Ready to start?** Follow the Quick Setup above! 🚀
