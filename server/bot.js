
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { Telegraf, Markup } from 'telegraf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');

const DEPOSITS_FILE = path.join(DATA_DIR, 'deposits.json');
const SYSTEM_RECEIPTS_FILE = path.join(DATA_DIR, 'system_receipts.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const WITHDRAWALS_FILE = path.join(DATA_DIR, 'withdrawals.json');
const LEDGER_FILE = path.join(DATA_DIR, 'ledger.json');
const PARTICIPANTS_FILE = path.join(DATA_DIR, 'participants.json');

const onlineUsers = new Map();
const bot = BOT_TOKEN ? new Telegraf(BOT_TOKEN) : null;

async function ensureDataDir() {
  try { await fs.mkdir(DATA_DIR, { recursive: true }); } catch (e) {}
}

async function loadData(file) {
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) { return []; }
}

async function saveData(file, list) {
  try {
    await ensureDataDir();
    await fs.writeFile(file, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) { console.error(`Failed to save data to ${file}:`, e); }
}

function parseSms(text) {
  const amountMatch = text.match(/(?:Amt:|[ብር|birr])\s?(\d+(?:\.\d+)?)/i);
  const refMatch = text.match(/(?:Ref:|TransID:)\s?([A-Z0-9]{6,})/i);
  return {
    amount: amountMatch ? parseFloat(amountMatch[1]) : 0,
    ref: refMatch ? refMatch[1] : null,
    raw: text
  };
}

if (bot) {
  bot.start((ctx) => {
    ctx.reply('Welcome to Star Bingo Pro HUB.\n\n/withdraw [amount] [info]\n/balance - Check status', {
      reply_markup: { inline_keyboard: [[{ text: 'Launch Hub', web_app: { url: APP_URL } }]] }
    });
  });

  bot.on('message', async (ctx) => {
    const text = ctx.message.text || '';
    if (ctx.message.forward_from || /transfer|receipt|ref|telebirr|cbe/i.test(text)) {
      const parsed = parseSms(text);
      const deposits = await loadData(DEPOSITS_FILE);
      const systemReceipts = await loadData(SYSTEM_RECEIPTS_FILE);
      
      const record = {
        id: Date.now(),
        playerId: ctx.from.id.toString(),
        name: `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim(),
        username: ctx.from.username || ctx.from.first_name || 'User',
        amount: parsed.amount,
        ref: parsed.ref,
        text: text,
        date: new Date().toISOString(),
        approved: false,
        matched: false
      };

      const match = systemReceipts.find(s => 
        (parsed.ref && s.ref === parsed.ref) || 
        (s.amount === parsed.amount && (Date.now() - new Date(s.date).getTime() < 600000))
      );

      if (match) {
        record.approved = true;
        record.matched = true;
        match.used = true;
        await saveData(SYSTEM_RECEIPTS_FILE, systemReceipts);
        ctx.reply(`✅ Transaction Verified! ${parsed.amount} ETB added to your wallet.`);
      } else {
        ctx.reply(`⏳ Receipt received. Verifying with bank nodes...`);
      }

      deposits.push(record);
      await saveData(DEPOSITS_FILE, deposits);
      if (ADMIN_CHAT_ID && !match) {
        bot.telegram.sendMessage(ADMIN_CHAT_ID, `Manual Check Required: ${parsed.amount} ETB from ${record.name}`);
      }
    }
  });

  bot.command('withdraw', async (ctx) => {
    const parts = ctx.message.text.split(' ');
    if (parts.length < 3) return ctx.reply('Usage: /withdraw [amount] [account_info]');
    const amount = parseFloat(parts[1]);
    const info = parts.slice(2).join(' ');
    const withdrawals = await loadData(WITHDRAWALS_FILE);
    withdrawals.push({ id: Date.now(), playerId: ctx.from.id.toString(), name: ctx.from.first_name, amount, info, status: 'pending', date: new Date().toISOString() });
    await saveData(WITHDRAWALS_FILE, withdrawals);
    ctx.reply('Withdrawal request submitted for approval.');
  });

  bot.launch().catch(err => console.error('Bot launch error:', err));
}

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/webhook/macrodroid', async (req, res) => {
  const { body, from } = req.body;
  if (!body) return res.sendStatus(400);
  const parsed = parseSms(body);
  const receipts = await loadData(SYSTEM_RECEIPTS_FILE);
  const deposits = await loadData(DEPOSITS_FILE);
  const entry = { id: Date.now(), amount: parsed.amount, ref: parsed.ref, date: new Date().toISOString(), from_phone: from, used: false };
  const pendingClaim = deposits.find(d => !d.approved && d.ref === parsed.ref);
  if (pendingClaim) {
    pendingClaim.approved = true;
    pendingClaim.matched = true;
    entry.used = true;
    if (bot) bot.telegram.sendMessage(pendingClaim.playerId, `✅ Bank confirmation received! ${parsed.amount} ETB credited.`);
    await saveData(DEPOSITS_FILE, deposits);
  }
  receipts.push(entry);
  await saveData(SYSTEM_RECEIPTS_FILE, receipts);
  res.sendStatus(200);
});

app.get('/api/game/participants/:roundId', async (req, res) => {
  const roundId = parseInt(req.params.roundId);
  const allParticipants = await loadData(PARTICIPANTS_FILE);
  const currentParticipants = allParticipants.filter(p => p.roundId === roundId);
  res.json(currentParticipants);
});

app.post('/api/game/participate', async (req, res) => {
  const { playerId, username, cardIds, roundId } = req.body;
  let allParticipants = await loadData(PARTICIPANTS_FILE);
  allParticipants = allParticipants.filter(p => !(p.playerId === playerId && p.roundId === roundId));
  cardIds.forEach(id => {
    allParticipants.push({ playerId, username, cardId: id, roundId });
  });
  await saveData(PARTICIPANTS_FILE, allParticipants);
  res.json({ ok: true });
});

app.get('/api/balance/:playerId', async (req, res) => {
  const playerId = req.params.playerId;
  const [deposits, withdrawals, ledger] = await Promise.all([
    loadData(DEPOSITS_FILE),
    loadData(WITHDRAWALS_FILE),
    loadData(LEDGER_FILE)
  ]);
  const approvedDeposits = deposits.filter(d => d.playerId === playerId && d.approved).reduce((a, b) => a + b.amount, 0);
  const approvedWithdrawals = withdrawals.filter(w => w.playerId === playerId && w.status === 'approved').reduce((a, b) => a + b.amount, 0);
  const gameCredits = ledger.filter(l => l.playerId === playerId && l.type === 'win').reduce((a, b) => a + b.amount, 0);
  const gameDebits = ledger.filter(l => l.playerId === playerId && l.type === 'entry').reduce((a, b) => a + b.amount, 0);
  res.json({ balance: (approvedDeposits + gameCredits + 10) - (approvedWithdrawals + gameDebits) });
});

app.post('/api/game/entry', async (req, res) => {
  const { playerId, amount, roundId } = req.body;
  const ledger = await loadData(LEDGER_FILE);
  ledger.push({ id: Date.now(), playerId, type: 'entry', amount, roundId, date: new Date().toISOString() });
  await saveData(LEDGER_FILE, ledger);
  res.json({ ok: true });
});

app.post('/api/game/win', async (req, res) => {
  const { playerId, amount, roundId } = req.body;
  const ledger = await loadData(LEDGER_FILE);
  if (ledger.find(l => l.playerId === playerId && l.roundId === roundId && l.type === 'win')) {
    return res.status(400).json({ error: 'Already credited' });
  }
  ledger.push({ id: Date.now(), playerId, type: 'win', amount, roundId, date: new Date().toISOString() });
  await saveData(LEDGER_FILE, ledger);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Financial Node on ${PORT}`));
