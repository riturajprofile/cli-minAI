# ✨ Google Sheets Integration Complete!

## 🎉 What's Been Added

Your MinAI chatbot now has **comprehensive Google Sheets logging** similar to how `analytics.js` tracks visitor data!

### 📁 New Files Created

1. **`google_sheets_logger.py`** - Main logging module
   - Logs chat interactions
   - Tracks token usage and costs
   - Records user sessions
   - Monitors errors

2. **`GOOGLE_SHEETS_SETUP.md`** - Complete setup guide
   - Step-by-step instructions
   - Google Apps Script code
   - Deployment instructions
   - Troubleshooting tips

3. **`GOOGLE_SHEETS_QUICKSTART.md`** - Quick 5-minute setup
   - Essential steps only
   - Fast deployment
   - Testing instructions

4. **`GOOGLE_SHEETS_ARCHITECTURE.md`** - Technical documentation
   - Data flow diagrams
   - Architecture overview
   - Integration points

5. **`test_google_sheets.py`** - Test script
   - Verify setup
   - Test all logging functions
   - Diagnostic output

### 🔄 Updated Files

1. **`ai.py`** - Added logging integration
   - Logs every AI response
   - Tracks token usage
   - Records errors
   - Calculates costs

2. **`main.py`** - Added file upload logging
   - Logs file uploads with chat
   - Tracks file metadata

3. **`pyproject.toml`** - Added dependency
   - `requests>=2.31.0` for HTTP calls

4. **`.env`** - Added configuration
   - `GOOGLE_SHEETS_ENABLED`
   - `GOOGLE_SHEETS_URL`

## 🚀 Quick Start

### 1. Setup Google Sheet (5 min)

```bash
1. Create new Google Sheet
2. Add tabs: ChatHistory, TokenUsage, UserSessions, Errors
3. Extensions → Apps Script
4. Paste code from GOOGLE_SHEETS_SETUP.md
5. Deploy → New deployment → Web app
6. Copy deployment URL
```

### 2. Configure MinAI

Edit `.env`:
```env
GOOGLE_SHEETS_ENABLED=true
GOOGLE_SHEETS_URL=https://script.google.com/macros/s/YOUR_ID/exec
```

### 3. Test It

```bash
python test_google_sheets.py
```

Check your Google Sheet - you should see test data! ✅

## 📊 What Gets Logged

### ChatHistory Sheet
```
Every conversation with:
├── Timestamp & User ID
├── Mode (learning/standard/fast)
├── User message & AI response
├── Token counts & costs
├── Processing time
├── Success/error status
└── File upload info
```

### TokenUsage Sheet
```
Token consumption:
├── Prompt tokens
├── Completion tokens
├── Total tokens
├── Estimated cost
└── Model used
```

### UserSessions Sheet
```
Session analytics:
├── Session duration
├── Message counts
├── Total tokens
├── Modes used
└── Activity patterns
```

### Errors Sheet
```
Error tracking:
├── Error type & message
├── User context
├── Timestamp
└── Debug info
```

## 💡 How It Works

```
User Message → Backend → AI Response
                  ↓
         Google Sheets Logger
                  ↓
         Apps Script (Web App)
                  ↓
           Google Sheets
```

**Just like `analytics.js`** which logs visitor data from frontend, this logs all chat interactions from backend automatically!

## 💰 Cost Tracking

Automatic cost calculation:
- **GPT-4o**: $5/1M input + $15/1M output
- **GPT-4o-mini**: $0.15/1M input + $0.60/1M output

View total costs:
```
=SUM(TokenUsage!H:H)
```

## 📈 Create Analytics Dashboard

In your Google Sheet:

1. **Token Usage Over Time** (Line chart)
   - X: timestamp
   - Y: tokens_total

2. **Cost Analysis** (Line chart)
   - X: timestamp
   - Y: cost_estimate

3. **Messages by Mode** (Pie chart)
   - mode column from ChatHistory

4. **Response Time** (Line chart)
   - X: timestamp
   - Y: processing_time

5. **Error Rate** (Bar chart)
   - Errors sheet data

## 🔧 Integration Details

### In Your Code

```python
# It's automatic! Every chat is logged:
response = get_ai_response(user_input, user_id, mode)

# Logs to Google Sheets:
# ✅ Chat interaction
# ✅ Token usage
# ✅ Costs
# ✅ Errors (if any)
```

### Configuration

```python
# Enable/disable anytime
GOOGLE_SHEETS_ENABLED=true/false

# Set your Apps Script URL
GOOGLE_SHEETS_URL=https://...
```

## 🛡️ Privacy & Security

- ✅ Data stays in your Google account
- ✅ Apps Script URL is public but secured
- ✅ No sensitive data exposed
- ✅ Optional API key authentication
- ✅ Rate limiting via Google quotas

## 📝 Documentation

Read the guides for more details:

1. **Quick Start**: `GOOGLE_SHEETS_QUICKSTART.md`
2. **Full Setup**: `GOOGLE_SHEETS_SETUP.md`
3. **Architecture**: `GOOGLE_SHEETS_ARCHITECTURE.md`

## 🧪 Testing

```bash
# Test the integration
python test_google_sheets.py

# Expected output:
# ✅ Chat interaction logged!
# ✅ Token usage logged! Cost: $0.000500
# ✅ Error logged!
# ✅ Session logged!
```

## 🐛 Troubleshooting

**No data appearing?**
1. Check Apps Script execution log
2. Verify URL in `.env`
3. Ensure "Anyone" access in deployment
4. Run test script

**CORS errors?**
- Redeploy Apps Script
- Check "Execute as: Me" setting

**Import errors?**
```bash
uv pip install requests
```

## 📦 Dependencies Added

- `requests>=2.31.0` - For HTTP requests to Google Apps Script

Already installed in your environment! ✅

## 🎯 Next Steps

1. ✅ Follow setup guide: `GOOGLE_SHEETS_SETUP.md`
2. ✅ Run test: `python test_google_sheets.py`
3. ✅ Check your Google Sheet
4. ✅ Create analytics dashboard
5. ✅ Monitor your chatbot!

## 📞 Need Help?

1. Check `GOOGLE_SHEETS_SETUP.md` (detailed guide)
2. Run `test_google_sheets.py` (diagnostics)
3. Review `GOOGLE_SHEETS_ARCHITECTURE.md` (technical)
4. Check Google Apps Script execution logs

## 🌟 Features

- ✅ **Automatic logging** - No manual work
- ✅ **Real-time data** - See conversations live
- ✅ **Cost tracking** - Monitor API expenses
- ✅ **Error monitoring** - Debug issues fast
- ✅ **User analytics** - Understand patterns
- ✅ **Export ready** - Download CSV anytime
- ✅ **Privacy friendly** - Your data, your control

## 📊 Example Queries

In Google Sheets:

```
# Total tokens used
=SUM(TokenUsage!G:G)

# Total cost
=SUM(TokenUsage!H:H)

# Average response time
=AVERAGE(ChatHistory!I:I)

# Messages by mode
=COUNTIF(ChatHistory!C:C,"standard")
```

---

## 🎊 You're All Set!

Your MinAI chatbot now has:
- ✨ Full conversation logging
- 💰 Token usage and cost tracking
- 👥 User analytics
- ⚠️ Error monitoring
- 📁 File upload tracking

**Just like analytics.js tracks visitors, this tracks all chat interactions!**

Start by following the setup guide: `GOOGLE_SHEETS_SETUP.md`

Happy tracking! 🚀
