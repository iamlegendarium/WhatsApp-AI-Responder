const {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const fetch = require("node-fetch");

// Keep conversation history per contact
const conversationHistory = new Map();
const HISTORY_LIMIT = 5; // last N exchanges

// List of contacts to exclude
const EXCLUDED_CONTACTS = ["234@s.whatsapp.net"];

async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("dev_auth_info");

  // Fetch the latest WA Web version dynamically
  const { version } = await fetchLatestBaileysVersion();
  console.log("Using WA version:", version);

  const sock = makeWASocket({
    version,
    auth: state,
    browser: ["Ubuntu", "Chrome", "20.0.0"],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, qr, lastDisconnect }) => {
    if (qr) {
      console.log("Scan this QR code with WhatsApp:");
      qrcode.generate(qr, { small: true });
    }
    if (connection === "open") console.log("WhatsApp connected!");
    if (connection === "close") {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
      console.log(
        "Connection closed. Reason:",
        lastDisconnect?.error?.message || "unknown",
      );
      if (shouldReconnect) {
        console.log("Reconnecting...");
        startWhatsApp();
      } else {
        console.log("Logged out. Please delete dev_auth_info and restart.");
      }
    }
  });

  const lastMsg = new Map(); // prevent fast repeated messages

  sock.ev.on("messages.upsert", async (m) => {
    if (m.type !== "notify") return;
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;

    // Skip group chats
    if (sender.endsWith("@g.us")) return;

    // Skip excluded contacts
    if (EXCLUDED_CONTACTS.includes(sender)) return;

    // Determine message content
    let text = "";
    let isSticker = false;
    if (msg.message.conversation) text = msg.message.conversation;
    else if (msg.message.extendedTextMessage?.text)
      text = msg.message.extendedTextMessage.text;
    else if (msg.message.imageMessage?.caption)
      text = msg.message.imageMessage.caption;
    else if (msg.message.videoMessage?.caption)
      text = msg.message.videoMessage.caption;
    else if (msg.message.stickerMessage) {
      text = "[Sticker received]";
      isSticker = true;
    }

    if (!text.trim()) return;

    const now = Date.now();
    if (lastMsg.has(sender) && now - lastMsg.get(sender) < 2000) return;
    lastMsg.set(sender, now);

    console.log(`Message from ${sender}: ${text}`);

    // Maintain conversation history
    if (!conversationHistory.has(sender)) conversationHistory.set(sender, []);
    const history = conversationHistory.get(sender);

    // Add new user message
    history.push(`User: ${text}`);
    if (history.length > HISTORY_LIMIT * 2) history.shift();

    // Build prompt for Ollama
    let promptText;
    if (isSticker) {
      promptText = `You are a friendly AI assistant that reacts naturally to messages. The user sent a sticker. Reply naturally as if reacting to it, funny or empathetic, but make sense in context.\n${history.join("\n")}\nBot:`;
    } else {
      promptText = `You are a friendly AI assistant. Reply naturally, humorously, and contextually. Keep replies coherent with the previous conversation.\n${history.join("\n")}\nBot:`;
    }

    try {
      const response = await fetch("http://127.0.0.1:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "qwen2.5-coder:1.5b",
          prompt: promptText,
          max_tokens: 200,
          stream: true,
        }),
      });

      const textData = await response.text();
      const lines = textData.split("\n").filter(Boolean);
      let aiReply = "";

      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.response) aiReply += json.response;
        } catch {}
      }

      if (!aiReply) aiReply = "Sorry, I got confused!";

      // Save bot message in history
      history.push(`Bot: ${aiReply}`);
      conversationHistory.set(sender, history);

      await sock.sendMessage(sender, { text: aiReply });
    } catch (err) {
      console.error("Error talking to Ollama:", err);
      await sock.sendMessage(sender, {
        text: "AI brain dey rest small. Try again later.",
      });
    }
  });
}

startWhatsApp();
