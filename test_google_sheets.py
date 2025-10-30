"""
Test script for Google Sheets integration
Run this to verify your Google Sheets setup is working
"""

import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Check environment variables
print("=" * 60)
print("Google Sheets Integration Test")
print("=" * 60)

enabled = os.getenv("GOOGLE_SHEETS_ENABLED", "false").lower() == "true"
url = os.getenv("GOOGLE_SHEETS_URL", "")

print(f"\nGOOGLE_SHEETS_ENABLED: {enabled}")
print(f"GOOGLE_SHEETS_URL: {url[:50]}..." if url else "GOOGLE_SHEETS_URL: Not set")

if not enabled:
    print("\n⚠️  Google Sheets is DISABLED")
    print("To enable, set GOOGLE_SHEETS_ENABLED=true in .env")
    exit(0)

if not url:
    print("\n❌ GOOGLE_SHEETS_URL is not set!")
    print("Please set it in your .env file")
    exit(1)

# Try to import the logger
print("\n" + "=" * 60)
print("Testing Google Sheets Logger...")
print("=" * 60)

try:
    from google_sheets_logger import sheets_logger, calculate_token_cost
    print("✓ Google Sheets logger imported successfully")
except ImportError as e:
    print(f"❌ Failed to import: {e}")
    print("\nMake sure google_sheets_logger.py exists in the same directory")
    exit(1)

# Test chat interaction logging
print("\n📝 Testing chat interaction logging...")
try:
    result = sheets_logger.log_chat_interaction(
        user_id="test_user_" + datetime.now().strftime("%H%M%S"),
        user_message="This is a test message from the test script",
        ai_response="This is a test response to verify Google Sheets integration is working correctly.",
        mode="standard",
        processing_time=1.23,
        tokens_used={"prompt": 15, "completion": 25, "total": 40},
        model_name="gpt-4o",
        success=True,
        has_file=False
    )
    
    if result:
        print("✅ Chat interaction logged successfully!")
    else:
        print("⚠️  Logging returned False (check logs)")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()

# Test token usage logging
print("\n💰 Testing token usage logging...")
try:
    tokens = {"prompt": 100, "completion": 200, "total": 300}
    cost = calculate_token_cost(tokens, "gpt-4o")
    
    result = sheets_logger.log_token_usage(
        user_id="test_user_tokens",
        model_name="gpt-4o",
        tokens_used=tokens,
        cost_estimate=cost,
        mode="standard",
        success=True
    )
    
    if result:
        print(f"✅ Token usage logged! Estimated cost: ${cost:.6f}")
    else:
        print("⚠️  Logging returned False")
        
except Exception as e:
    print(f"❌ Error: {e}")

# Test error logging
print("\n⚠️  Testing error logging...")
try:
    result = sheets_logger.log_error(
        user_id="test_user_error",
        error_type="TestError",
        error_message="This is a test error message",
        context={"test": True, "timestamp": datetime.now().isoformat()}
    )
    
    if result:
        print("✅ Error logged successfully!")
    else:
        print("⚠️  Logging returned False")
        
except Exception as e:
    print(f"❌ Error: {e}")

# Test session logging
print("\n📊 Testing session logging...")
try:
    result = sheets_logger.log_user_session(
        user_id="test_user_session",
        session_start=datetime.now(),
        message_count=5,
        total_tokens=500,
        session_duration=120.5,
        modes_used=["standard", "learning", "fast"]
    )
    
    if result:
        print("✅ Session logged successfully!")
    else:
        print("⚠️  Logging returned False")
        
except Exception as e:
    print(f"❌ Error: {e}")

# Summary
print("\n" + "=" * 60)
print("Test Complete!")
print("=" * 60)
print("\n📋 Next Steps:")
print("1. Open your Google Sheet")
print("2. Check the following tabs for new entries:")
print("   - ChatHistory")
print("   - TokenUsage")
print("   - UserSessions")
print("   - Errors")
print("\n3. If you see the test data, the integration is working! ✅")
print("\n4. If no data appears:")
print("   - Check the Google Apps Script execution log")
print("   - Verify the URL in .env is correct")
print("   - Make sure the web app deployment is set to 'Anyone'")
print("\nFor detailed setup instructions, see GOOGLE_SHEETS_SETUP.md")
print("=" * 60)
