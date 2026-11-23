import { DisconnectReason, fetchLatestBaileysVersion, makeWASocket, useMultiFileAuthState } from '@whiskeysockets/baileys';
import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import pino from 'pino';
import QRCode from 'qrcode';

const app = express();
app.use(express.json({ limit: '2mb' }));

const PORT = Number(process.env.WHATSAPP_PORT || 3005);
const SESSION_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes max lifetime
const logger = pino({ level: 'silent' });

/** @type {Map<string, any>} */
const sessions = new Map();

function normalizePhone(rawPhone) {
  const digits = String(rawPhone || '').replace(/\D/g, '');
  if (!digits) return null;
  return `${digits}@s.whatsapp.net`;
}

function cleanupSessionFiles(authDir) {
  try {
    if (authDir && fs.existsSync(authDir)) {
      fs.rmSync(authDir, { recursive: true, force: true });
    }
  } catch {
    // ignore cleanup errors
  }
}

async function destroySession(sessionId, finalStatus = null, errorMessage = null) {
  const session = sessions.get(sessionId);
  if (!session) return;

  if (session.timeoutHandle) {
    clearTimeout(session.timeoutHandle);
    session.timeoutHandle = null;
  }

  if (finalStatus) {
    session.status = finalStatus;
  }
  if (errorMessage) {
    session.error = errorMessage;
  }
  session.qr = null;

  if (session.sock) {
    try {
      await session.sock.logout();
    } catch {
      try {
        session.sock.end(undefined);
      } catch {
        // ignore
      }
    }
    session.sock = null;
  }

  cleanupSessionFiles(session.authDir);
  session.sessionClosed = true;

  // Keep status readable for 2 minutes, then remove from memory
  setTimeout(() => {
    sessions.delete(sessionId);
  }, 2 * 60 * 1000);
}

async function startBaileysForSession(session) {
  const { state, saveCreds } = await useMultiFileAuthState(session.authDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: ['Tiesdi Events', 'Chrome', '1.0.0'],
    syncFullHistory: false,
  });

  session.sock = sock;
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && session.status === 'waiting_qr') {
      try {
        session.qr = await QRCode.toDataURL(qr, { width: 280, margin: 2 });
      } catch {
        // ignore qr render error
      }
    }

    if (connection === 'open' && !session.isSending) {
      session.isSending = true;
      session.status = 'sending';
      session.qr = null;

      try {
        for (const recipient of session.recipients) {
          if (session.cancelled) break;

          const jid = normalizePhone(recipient.phone);
          if (!jid) {
            session.failedCount += 1;
            session.results.push({
              guest_id: recipient.guest_id,
              name: recipient.name,
              status: 'failed',
              reason: 'Número inválido',
            });
            continue;
          }

          try {
            await sock.sendMessage(jid, { text: recipient.message });
            session.sentCount += 1;
            session.results.push({
              guest_id: recipient.guest_id,
              name: recipient.name,
              status: 'sent',
            });
          } catch (err) {
            session.failedCount += 1;
            session.results.push({
              guest_id: recipient.guest_id,
              name: recipient.name,
              status: 'failed',
              reason: err?.message || 'Error al enviar mensaje',
            });
          }

          // Small delay between messages to avoid rate limiting
          if (session.recipients.length > 1) {
            await new Promise((r) => setTimeout(r, 1200));
          }
        }

        // Wait briefly so WhatsApp flushes outgoing packets before logout
        await new Promise((r) => setTimeout(r, 1500));
        await destroySession(session.id, session.cancelled ? 'cancelled' : 'completed');
      } catch (err) {
        await destroySession(session.id, 'error', err?.message || 'Error enviando invitaciones');
      }
    }

    if (connection === 'close' && !session.isSending && !session.sessionClosed) {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode === DisconnectReason.restartRequired) {
        // Baileys requires one reconnect right after pairing QR
        startBaileysForSession(session).catch((err) => {
          destroySession(session.id, 'error', err?.message || 'Error al reconectar WhatsApp');
        });
      } else if (!session.cancelled) {
        await destroySession(
          session.id,
          'error',
          'La conexión con WhatsApp se cerró antes de completar el envío.'
        );
      }
    }
  });
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', active_sessions: sessions.size });
});

app.post('/sessions', async (req, res) => {
  const { recipients } = req.body || {};

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return res.status(422).json({ message: 'Se requiere al menos un destinatario con teléfono.' });
  }

  const sessionId = crypto.randomUUID();
  const authDir = path.join(os.tmpdir(), `tiesdi-wa-${sessionId}`);
  fs.mkdirSync(authDir, { recursive: true });

  const session = {
    id: sessionId,
    authDir,
    status: 'waiting_qr',
    qr: null,
    recipients,
    totalCount: recipients.length,
    sentCount: 0,
    failedCount: 0,
    results: [],
    error: null,
    isSending: false,
    cancelled: false,
    sessionClosed: false,
    sock: null,
    timeoutHandle: null,
  };

  session.timeoutHandle = setTimeout(() => {
    if (!session.sessionClosed) {
      void destroySession(sessionId, 'expired', 'El tiempo para escanear el código QR expiró.');
    }
  }, SESSION_TIMEOUT_MS);

  sessions.set(sessionId, session);

  startBaileysForSession(session).catch((err) => {
    void destroySession(sessionId, 'error', err?.message || 'No se pudo iniciar WhatsApp Web.');
  });

  return res.status(201).json({
    session_id: sessionId,
    status: session.status,
    total: session.totalCount,
  });
});

app.get('/sessions/:id', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ message: 'Sesión de WhatsApp no encontrada o expirada.' });
  }

  return res.json({
    session_id: session.id,
    status: session.status,
    qr: session.qr,
    total: session.totalCount,
    sent: session.sentCount,
    failed: session.failedCount,
    session_closed: session.sessionClosed,
    error: session.error,
    results: session.results,
  });
});

app.delete('/sessions/:id', async (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    return res.json({ message: 'Sesión ya cerrada.' });
  }
  session.cancelled = true;
  await destroySession(session.id, 'cancelled');
  return res.json({ message: 'Sesión cancelada y eliminada de forma segura.' });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Tiesdi WhatsApp ephemeral service listening on http://127.0.0.1:${PORT}`);
});

