import os
import json
import logging
import asyncio
import threading
from datetime import datetime
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory, render_template_string
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from telegram import Bot, Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__, 
            static_folder='static',
            template_folder='templates')
CORS(app)

# Database configuration (Railways PostgreSQL)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
if not app.config['SQLALCHEMY_DATABASE_URI']:
    raise ValueError("DATABASE_URL environment variable is required")
    
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-change-this-in-production')

db = SQLAlchemy(app)

# Payment accounts from environment variables
CBE_ACCOUNT_NAME = os.environ.get('CBE_ACCOUNT_NAME', 'SAMSON MESFIN')
CBE_ACCOUNT_NUMBER = os.environ.get('CBE_ACCOUNT_NUMBER', '100348220032')
TELEBIRR_NAME = os.environ.get('TELEBIRR_NAME', 'NITSU')
TELEBIRR_NUMBER = os.environ.get('TELEBIRR_NUMBER', '0976233815')
YOUR_PHONE_NUMBER = os.environ.get('YOUR_PHONE_NUMBER', '0941043869')

# Telegram bot configuration
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')
ADMIN_CHAT_ID = os.environ.get('ADMIN_CHAT_ID')
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')

# Game configuration
SYNC_CONFIG = {
    'SELECTION_DURATION': 30,
    'WINNER_ANNOUNCEMENT_DURATION': 10,
    'READY_DURATION': 5,
    'CALL_INTERVAL': 4,
    'GENESIS_EPOCH': 1738368000,
    'ENTRY_FEE': 10
}

# Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    telegram_id = db.Column(db.String(64), unique=True, nullable=False)
    username = db.Column(db.String(128))
    first_name = db.Column(db.String(128))
    last_name = db.Column(db.String(128))
    phone = db.Column(db.String(20))
    balance = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    type = db.Column(db.String(20))  # deposit, withdrawal, entry, win
    amount = db.Column(db.Float, nullable=False)
    round_id = db.Column(db.Integer, nullable=True)
    status = db.Column(db.String(20), default='pending')
    reference = db.Column(db.String(100))
    sms_text = db.Column(db.Text)
    metadata = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)

    user = db.relationship('User', backref='transactions')

class GameParticipant(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    player_id = db.Column(db.String(64), nullable=False)
    username = db.Column(db.String(128))
    card_id = db.Column(db.Integer, nullable=False)
    round_id = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class SystemReceipt(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float)
    reference = db.Column(db.String(100))
    from_phone = db.Column(db.String(20))
    sms_text = db.Column(db.Text)
    used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Create tables
with app.app_context():
    db.create_all()

# Helper functions
def parse_sms(text):
    """Parse SMS text to extract amount and reference"""
    import re
    
    amount = None
    ref = None
    
    # Amount patterns
    amount_patterns = [
        r'(\d+\.?\d*)\s*(?:ETB|Birr|ብር)',
        r'Amt[:=]\s*(\d+\.?\d*)',
        r'Amount[:=]\s*(\d+\.?\d*)',
        r'(\d+\.?\d*)\s*ብር',
        r'መጠን[:=]\s*(\d+\.?\d*)'
    ]
    
    for pattern in amount_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                amount = float(match.group(1))
                break
            except:
                continue
    
    # Reference patterns
    ref_patterns = [
        r'Ref[:=]\s*([A-Z0-9]{6,})',
        r'TransID[:=]\s*([A-Z0-9]{6,})',
        r'Reference[:=]\s*([A-Z0-9]{6,})',
        r'ID[:=]\s*([A-Z0-9]{6,})',
        r'የግብይት መታወቂያ[:=]\s*([A-Z0-9]{6,})'
    ]
    
    for pattern in ref_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            ref = match.group(1)
            break
    
    return {'amount': amount, 'ref': ref, 'raw': text}

# Telegram Bot Functions
async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command"""
    user = update.effective_user
    
    with app.app_context():
        existing_user = User.query.filter_by(telegram_id=str(user.id)).first()
        if not existing_user:
            new_user = User(
                telegram_id=str(user.id),
                username=user.username,
                first_name=user.first_name,
                last_name=user.last_name,
                balance=10.0  # Initial bonus
            )
            db.session.add(new_user)
            db.session.commit()
            logger.info(f"New user registered: {user.id}")
    
    # Send welcome message
    message = (
        "🎰 *Welcome to Star Bingo Pro!*\n\n"
        "*💎 Deposit Instructions:*\n"
        f"1️⃣ *CBE Bank:*\n"
        f"   Name: `{CBE_ACCOUNT_NAME}`\n"
        f"   Account: `{CBE_ACCOUNT_NUMBER}`\n\n"
        f"2️⃣ *Telebirr:*\n"
        f"   Name: `{TELEBIRR_NAME}`\n"
        f"   Phone: `{TELEBIRR_NUMBER}`\n\n"
        "*📱 How to Deposit:*\n"
        "1. Send money to either account above\n"
        "2. Forward the payment confirmation SMS to this bot\n"
        "3. Your balance will update automatically\n\n"
        "*💰 Balance & Withdraw:*\n"
        "/balance - Check your balance\n"
        "/withdraw [amount] [account info]\n\n"
        "*🎮 Play Now:*"
    )
    
    from telegram import InlineKeyboardMarkup, InlineKeyboardButton
    keyboard = [[
        InlineKeyboardButton(
            "🎮 Launch Star Bingo Pro", 
            web_app={'url': f"https://{request.host}" if 'request' in locals() else os.environ.get('RAILWAY_STATIC_URL', '')}
        )
    ]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(message, parse_mode='Markdown', reply_markup=reply_markup)

async def balance_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /balance command"""
    user = update.effective_user
    
    with app.app_context():
        db_user = User.query.filter_by(telegram_id=str(user.id)).first()
        if db_user:
            await update.message.reply_text(
                f"💰 *Your Balance:* {db_user.balance:.2f} ETB\n"
                f"👤 *Account:* {db_user.first_name or db_user.username}",
                parse_mode='Markdown'
            )
        else:
            await update.message.reply_text("Please use /start first to register.")

async def withdraw_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /withdraw command"""
    if len(context.args) < 2:
        await update.message.reply_text(
            "Usage: /withdraw [amount] [account info]\n"
            "Example: /withdraw 500 0911223344"
        )
        return
    
    try:
        amount = float(context.args[0])
        account_info = ' '.join(context.args[1:])
        user = update.effective_user
        
        with app.app_context():
            db_user = User.query.filter_by(telegram_id=str(user.id)).first()
            if not db_user:
                await update.message.reply_text("❌ Please use /start first to register.")
                return
            
            if db_user.balance < amount:
                await update.message.reply_text(f"❌ Insufficient balance! You have {db_user.balance:.2f} ETB")
                return
            
            if amount < 100:
                await update.message.reply_text("❌ Minimum withdrawal is 100 ETB")
                return
            
            # Create withdrawal transaction
            transaction = Transaction(
                user_id=db_user.id,
                type='withdrawal',
                amount=-amount,
                status='pending',
                metadata={
                    'account_info': account_info,
                    'telegram_user_id': user.id,
                    'username': user.username
                }
            )
            db.session.add(transaction)
            db.session.commit()
            
            # Notify admin
            if ADMIN_CHAT_ID and TELEGRAM_BOT_TOKEN:
                try:
                    bot = Bot(token=TELEGRAM_BOT_TOKEN)
                    admin_msg = (
                        f"📤 *New Withdrawal Request*\n\n"
                        f"👤 User: {db_user.first_name or db_user.username}\n"
                        f"🆔 ID: {user.id}\n"
                        f"💰 Amount: {amount} ETB\n"
                        f"📱 Account: {account_info}\n"
                        f"📊 Balance After: {db_user.balance - amount:.2f} ETB"
                    )
                    await bot.send_message(
                        chat_id=ADMIN_CHAT_ID, 
                        text=admin_msg, 
                        parse_mode='Markdown'
                    )
                except Exception as e:
                    logger.error(f"Failed to notify admin: {e}")
            
            await update.message.reply_text(
                f"✅ Withdrawal request submitted!\n\n"
                f"*Amount:* {amount} ETB\n"
                f"*Account:* {account_info}\n"
                f"*Status:* Pending admin approval\n\n"
                f"You will be notified when processed.",
                parse_mode='Markdown'
            )
            
    except ValueError:
        await update.message.reply_text("❌ Invalid amount. Please use a number.")

async def handle_forwarded_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle forwarded SMS messages for deposits"""
    if not update.message.forward_date:
        return
    
    user = update.effective_user
    text = update.message.text or ""
    
    # Parse SMS
    parsed = parse_sms(text)
    
    if not parsed['amount']:
        await update.message.reply_text(
            "❌ Could not parse amount from SMS.\n"
            "Please forward the complete payment confirmation message."
        )
        return
    
    with app.app_context():
        # Find or create user
        db_user = User.query.filter_by(telegram_id=str(user.id)).first()
        if not db_user:
            db_user = User(
                telegram_id=str(user.id),
                username=user.username,
                first_name=user.first_name,
                last_name=user.last_name,
                balance=0.0
            )
            db.session.add(db_user)
            db.session.commit()
        
        # Create deposit record
        transaction = Transaction(
            user_id=db_user.id,
            type='deposit',
            amount=parsed['amount'],
            status='pending',
            reference=parsed['ref'],
            sms_text=text,
            metadata={
                'forwarded_by': user.id,
                'parsed_amount': parsed['amount'],
                'parsed_ref': parsed['ref']
            }
        )
        db.session.add(transaction)
        db.session.commit()
        
        # Check for matching system receipt (MacroDroid)
        system_receipt = None
        if parsed['ref']:
            system_receipt = SystemReceipt.query.filter_by(
                reference=parsed['ref'],
                used=False
            ).first()
        else:
            # Try to match by amount and recent time
            system_receipt = SystemReceipt.query.filter(
                SystemReceipt.amount == parsed['amount'],
                SystemReceipt.used == False,
                SystemReceipt.created_at > datetime.utcnow().replace(hour=0, minute=0, second=0)
            ).first()
        
        if system_receipt:
            # Auto-approve deposit
            transaction.status = 'completed'
            transaction.completed_at = datetime.utcnow()
            db_user.balance += parsed['amount']
            system_receipt.used = True
            db.session.commit()
            
            await update.message.reply_text(
                f"✅ *Deposit Verified!*\n\n"
                f"💰 Amount: {parsed['amount']} ETB\n"
                f"📊 New Balance: {db_user.balance:.2f} ETB\n"
                f"🔗 Reference: {parsed['ref'] or 'N/A'}\n"
                f"⏱️ Time: {datetime.utcnow().strftime('%H:%M:%S')}",
                parse_mode='Markdown'
            )
        else:
            await update.message.reply_text(
                f"⏳ *Deposit Received*\n\n"
                f"💰 Amount: {parsed['amount']} ETB\n"
                f"📊 Current Balance: {db_user.balance:.2f} ETB\n"
                f"🔗 Reference: {parsed['ref'] or 'N/A'}\n\n"
                f"*Status:* Pending verification\n"
                f"Please wait for admin approval.",
                parse_mode='Markdown'
            )
            
            # Notify admin
            if ADMIN_CHAT_ID and TELEGRAM_BOT_TOKEN:
                try:
                    bot = Bot(token=TELEGRAM_BOT_TOKEN)
                    admin_msg = (
                        f"💰 *New Deposit Request*\n\n"
                        f"👤 User: {db_user.first_name or db_user.username}\n"
                        f"🆔 ID: {user.id}\n"
                        f"💰 Amount: {parsed['amount']} ETB\n"
                        f"🔗 Ref: {parsed['ref'] or 'N/A'}\n"
                        f"📱 Phone: {db_user.phone or 'N/A'}\n\n"
                        f"*SMS Text:*\n{text[:200]}..."
                    )
                    await bot.send_message(
                        chat_id=ADMIN_CHAT_ID, 
                        text=admin_msg, 
                        parse_mode='Markdown'
                    )
                except Exception as e:
                    logger.error(f"Failed to notify admin: {e}")

def run_telegram_bot():
    """Run Telegram bot in background thread"""
    if not TELEGRAM_BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN not set. Telegram bot disabled.")
        return
    
    async def main():
        application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
        
        # Add handlers
        application.add_handler(CommandHandler("start", start_command))
        application.add_handler(CommandHandler("balance", balance_command))
        application.add_handler(CommandHandler("withdraw", withdraw_command))
        application.add_handler(MessageHandler(
            filters.TEXT & filters.FORWARDED, 
            handle_forwarded_message
        ))
        
        # Start bot
        await application.initialize()
        await application.start()
        logger.info("Telegram bot started")
        
        # Keep running
        await asyncio.Event().wait()
    
    # Run in asyncio thread
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(main())

# Start Telegram bot in background thread
if TELEGRAM_BOT_TOKEN:
    import threading
    bot_thread = threading.Thread(target=run_telegram_bot, daemon=True)
    bot_thread.start()

# Flask API Routes
@app.route('/')
def serve_index():
    """Serve the main React app"""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve static files"""
    return send_from_directory(app.static_folder, path)

# API Routes for React frontend
@app.route('/api/balance/<player_id>', methods=['GET'])
def get_balance(player_id):
    """Get user balance"""
    with app.app_context():
        user = User.query.filter_by(telegram_id=player_id).first()
        if user:
            return jsonify({
                'balance': user.balance,
                'username': user.username or user.first_name or f'User-{player_id}'
            })
        else:
            # Create user if not exists (for Telegram WebApp users)
            user = User(
                telegram_id=player_id,
                balance=0.0
            )
            db.session.add(user)
            db.session.commit()
            return jsonify({'balance': 0.0, 'username': f'User-{player_id}'})

@app.route('/api/game/participants/<int:round_id>', methods=['GET'])
def get_participants(round_id):
    """Get participants for a round"""
    with app.app_context():
        participants = GameParticipant.query.filter_by(round_id=round_id).all()
        result = [
            {
                'playerId': p.player_id,
                'username': p.username,
                'cardId': p.card_id
            }
            for p in participants
        ]
        return jsonify(result)

@app.route('/api/game/participate', methods=['POST'])
def participate():
    """Handle game participation"""
    data = request.json
    player_id = data.get('playerId')
    username = data.get('username')
    card_ids = data.get('cardIds', [])
    round_id = data.get('roundId')
    
    with app.app_context():
        # Remove existing participation for this round
        GameParticipant.query.filter_by(
            player_id=player_id, 
            round_id=round_id
        ).delete()
        
        # Add new participation
        for card_id in card_ids:
            participant = GameParticipant(
                player_id=player_id,
                username=username,
                card_id=card_id,
                round_id=round_id
            )
            db.session.add(participant)
        
        db.session.commit()
    
    return jsonify({'ok': True})

@app.route('/api/game/entry', methods=['POST'])
def deduct_entry():
    """Deduct entry fee"""
    data = request.json
    player_id = data.get('playerId')
    amount = data.get('amount')
    round_id = data.get('roundId')
    
    with app.app_context():
        user = User.query.filter_by(telegram_id=player_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Check if already deducted for this round
        existing = Transaction.query.filter_by(
            user_id=user.id,
            round_id=round_id,
            type='entry'
        ).first()
        
        if existing:
            return jsonify({'ok': True, 'already_deducted': True})
        
        # Check balance
        if user.balance < amount:
            return jsonify({'error': 'Insufficient balance'}), 400
        
        # Deduct entry fee
        user.balance -= amount
        
        # Record transaction
        transaction = Transaction(
            user_id=user.id,
            type='entry',
            amount=-amount,
            round_id=round_id,
            status='completed',
            completed_at=datetime.utcnow()
        )
        db.session.add(transaction)
        db.session.commit()
    
    return jsonify({'ok': True})

@app.route('/api/game/win', methods=['POST'])
def credit_win():
    """Credit win amount"""
    data = request.json
    player_id = data.get('playerId')
    amount = data.get('amount')
    round_id = data.get('roundId')
    
    with app.app_context():
        user = User.query.filter_by(telegram_id=player_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Check if already credited for this round
        existing = Transaction.query.filter_by(
            user_id=user.id,
            round_id=round_id,
            type='win'
        ).first()
        
        if existing:
            return jsonify({'ok': True, 'already_credited': True})
        
        # Credit win
        user.balance += amount
        
        # Record transaction
        transaction = Transaction(
            user_id=user.id,
            type='win',
            amount=amount,
            round_id=round_id,
            status='completed',
            completed_at=datetime.utcnow()
        )
        db.session.add(transaction)
        db.session.commit()
    
    return jsonify({'ok': True})

# MacroDroid Webhook
@app.route('/api/webhook/macrodroid', methods=['POST'])
def macrodroid_webhook():
    """Receive SMS from MacroDroid (Source of Truth)"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data received'}), 400
        
        body = data.get('body', '')
        from_phone = data.get('from', '')
        
        parsed = parse_sms(body)
        
        with app.app_context():
            # Store as system receipt
            receipt = SystemReceipt(
                amount=parsed['amount'],
                reference=parsed['ref'],
                from_phone=from_phone,
                sms_text=body
            )
            db.session.add(receipt)
            db.session.commit()
            
            # Try to match with pending user deposits
            if parsed['ref']:
                pending_deposits = Transaction.query.filter_by(
                    type='deposit',
                    status='pending',
                    reference=parsed['ref']
                ).all()
            else:
                # Match by amount and recent time
                pending_deposits = Transaction.query.filter(
                    Transaction.type == 'deposit',
                    Transaction.status == 'pending',
                    Transaction.amount == parsed['amount'],
                    Transaction.created_at > datetime.utcnow().replace(hour=0, minute=0, second=0)
                ).all()
            
            for deposit in pending_deposits:
                deposit.status = 'completed'
                deposit.completed_at = datetime.utcnow()
                receipt.used = True
                
                # Update user balance
                user = User.query.get(deposit.user_id)
                if user:
                    user.balance += deposit.amount
                    
                    # Notify user via Telegram
                    if TELEGRAM_BOT_TOKEN:
                        try:
                            bot = Bot(token=TELEGRAM_BOT_TOKEN)
                            message = (
                                f"✅ *Deposit Verified!*\n\n"
                                f"💰 Amount: {deposit.amount} ETB\n"
                                f"📊 New Balance: {user.balance:.2f} ETB\n"
                                f"🔗 Reference: {parsed['ref'] or 'N/A'}"
                            )
                            asyncio.run(
                                bot.send_message(
                                    chat_id=user.telegram_id,
                                    text=message,
                                    parse_mode='Markdown'
                                )
                            )
                        except Exception as e:
                            logger.error(f"Failed to notify user: {e}")
            
            db.session.commit()
        
        return jsonify({'ok': True, 'processed': True})
    
    except Exception as e:
        logger.error(f"Error in macrodroid webhook: {e}")
        return jsonify({'error': str(e)}), 500

# Admin API (protected with basic auth)
@app.route('/admin/api/deposits', methods=['GET'])
def admin_get_deposits():
    """Get pending deposits (admin only)"""
    auth = request.authorization
    if not auth or auth.username != ADMIN_USERNAME or auth.password != ADMIN_PASSWORD:
        return jsonify({'error': 'Unauthorized'}), 401
    
    with app.app_context():
        deposits = Transaction.query.filter_by(type='deposit', status='pending').all()
        result = []
        for deposit in deposits:
            user = User.query.get(deposit.user_id)
            result.append({
                'id': deposit.id,
                'playerId': user.telegram_id if user else 'Unknown',
                'name': user.first_name or user.username or 'Unknown',
                'amount': deposit.amount,
                'text': deposit.sms_text or '',
                'date': deposit.created_at.isoformat(),
                'approved': deposit.status == 'completed',
                'reference': deposit.reference
            })
        return jsonify(result)

@app.route('/admin/api/withdrawals', methods=['GET'])
def admin_get_withdrawals():
    """Get pending withdrawals (admin only)"""
    auth = request.authorization
    if not auth or auth.username != ADMIN_USERNAME or auth.password != ADMIN_PASSWORD:
        return jsonify({'error': 'Unauthorized'}), 401
    
    with app.app_context():
        withdrawals = Transaction.query.filter_by(type='withdrawal', status='pending').all()
        result = []
        for withdrawal in withdrawals:
            user = User.query.get(withdrawal.user_id)
            result.append({
                'id': withdrawal.id,
                'playerId': user.telegram_id if user else 'Unknown',
                'name': user.first_name or user.username or 'Unknown',
                'amount': abs(withdrawal.amount),
                'info': withdrawal.metadata.get('account_info', '') if withdrawal.metadata else '',
                'date': withdrawal.created_at.isoformat(),
                'status': withdrawal.status
            })
        return jsonify(result)

@app.route('/admin/api/approve/deposit/<int:deposit_id>', methods=['POST'])
def admin_approve_deposit(deposit_id):
    """Approve a deposit"""
    auth = request.authorization
    if not auth or auth.username != ADMIN_USERNAME or auth.password != ADMIN_PASSWORD:
        return jsonify({'error': 'Unauthorized'}), 401
    
    with app.app_context():
        transaction = Transaction.query.get(deposit_id)
        if not transaction or transaction.type != 'deposit':
            return jsonify({'error': 'Deposit not found'}), 404
        
        transaction.status = 'completed'
        transaction.completed_at = datetime.utcnow()
        
        user = User.query.get(transaction.user_id)
        if user:
            user.balance += transaction.amount
        
        db.session.commit()
        
        # Notify user
        if TELEGRAM_BOT_TOKEN and user:
            try:
                bot = Bot(token=TELEGRAM_BOT_TOKEN)
                message = (
                    f"✅ *Deposit Approved!*\n\n"
                    f"💰 Amount: {transaction.amount} ETB\n"
                    f"📊 New Balance: {user.balance:.2f} ETB\n"
                    f"👤 Approved by: Admin"
                )
                asyncio.run(
                    bot.send_message(
                        chat_id=user.telegram_id,
                        text=message,
                        parse_mode='Markdown'
                    )
                )
            except Exception as e:
                logger.error(f"Failed to notify user: {e}")
    
    return jsonify({'ok': True})

@app.route('/admin/api/approve/withdrawal/<int:withdrawal_id>', methods=['POST'])
def admin_approve_withdrawal(withdrawal_id):
    """Approve and process withdrawal"""
    auth = request.authorization
    if not auth or auth.username != ADMIN_USERNAME or auth.password != ADMIN_PASSWORD:
        return jsonify({'error': 'Unauthorized'}), 401
    
    with app.app_context():
        transaction = Transaction.query.get(withdrawal_id)
        if not transaction or transaction.type != 'withdrawal':
            return jsonify({'error': 'Withdrawal not found'}), 404
        
        transaction.status = 'completed'
        transaction.completed_at = datetime.utcnow()
        
        user = User.query.get(transaction.user_id)
        
        # Send payment notification to user
        if TELEGRAM_BOT_TOKEN and user:
            try:
                bot = Bot(token=TELEGRAM_BOT_TOKEN)
                account_info = transaction.metadata.get('account_info', '') if transaction.metadata else ''
                message = (
                    f"✅ *Withdrawal Processed!*\n\n"
                    f"💰 Amount: {abs(transaction.amount)} ETB\n"
                    f"📱 Account: {account_info}\n"
                    f"📊 Remaining Balance: {user.balance:.2f} ETB\n"
                    f"👤 Processed by: Admin"
                )
                asyncio.run(
                    bot.send_message(
                        chat_id=user.telegram_id,
                        text=message,
                        parse_mode='Markdown'
                    )
                )
            except Exception as e:
                logger.error(f"Failed to notify user: {e}")
        
        db.session.commit()
    
    return jsonify({'ok': True})

# Health check
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for Railway"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'service': 'star-bingo-pro',
        'database': 'connected' if db.engine else 'disconnected'
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)