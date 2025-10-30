
const { makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const fetch = require("node-fetch");
// Keep conversation history per contact
const conversationHistory = new Map();
const HISTORY_LIMIT = 5; // last N exchanges

// List of contacts to exclude
const EXCLUDED_CONTACTS = ["2348118870050@s.whatsapp.net"];

async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("dev_auth_info");

  const sock = makeWASocket({
    auth: state,
    browser: ["Mac OS", "Chrome", "14.4.1"],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, qr }) => {
    if (qr) {
      console.log("Developer Bot is running... scan QR:");
      qrcode.generate(qr, { small: true });
    }
    if (connection === "open") console.log("WhatsApp connected!");
    if (connection === "close") {
      console.log("Connection closed. Reconnecting...");
      startWhatsApp();
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
    else if (msg.message.extendedTextMessage?.text) text = msg.message.extendedTextMessage.text;
    else if (msg.message.imageMessage?.caption) text = msg.message.imageMessage.caption;
    else if (msg.message.videoMessage?.caption) text = msg.message.videoMessage.caption;
    else if (msg.message.stickerMessage) {
      text = "[Sticker received]";
      isSticker = true;
    }

    if (!text.trim()) return;

    const now = Date.now();
    if (lastMsg.has(sender) && now - lastMsg.get(sender) < 2000) return; // prevent spam
    lastMsg.set(sender, now);

    console.log(`Message from ${sender}: ${text}`);

    // Maintain conversation history
    if (!conversationHistory.has(sender)) conversationHistory.set(sender, []);
    const history = conversationHistory.get(sender);

    // Add new user message
    history.push(`User: ${text}`);
    if (history.length > HISTORY_LIMIT * 2) history.shift(); // keep last N exchanges

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
          model: "llama3.2:latest",
          prompt: promptText,
          max_tokens: 200,
          stream: true
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