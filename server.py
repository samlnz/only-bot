import sys

# Check if we're in build mode
if os.environ.get('RAILWAY_BUILD') or len(sys.argv) > 1 and sys.argv[1] == 'build':
    print("Build mode detected, exiting gracefully")
    sys.exit(0)
# In server.py, update the telegram bot section
import threading
from telegram import Bot
from telegram.ext import Application

def start_telegram_bot():
    """Start Telegram bot in background"""
    TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')
    
    if not TELEGRAM_BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN not set. Telegram bot disabled.")
        return
    
    async def main():
        try:
            application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
            
            # Add your command handlers here
            from telegram.ext import CommandHandler, MessageHandler, filters
            
            async def start_command(update, context):
                await update.message.reply_text("Bot is running!")
            
            application.add_handler(CommandHandler("start", start_command))
            
            await application.initialize()
            await application.start()
            logger.info("Telegram bot started successfully")
            
            # Keep the bot running
            await application.updater.start_polling()
            
            # Wait for shutdown
            await asyncio.Event().wait()
            
        except Exception as e:
            logger.error(f"Failed to start Telegram bot: {e}")
    
    # Run in new event loop
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(main())

# Start bot in background thread only if not in build mode
if not os.environ.get('RAILWAY_BUILD') and os.environ.get('TELEGRAM_BOT_TOKEN'):
    bot_thread = threading.Thread(target=start_telegram_bot, daemon=True)
    bot_thread.start()