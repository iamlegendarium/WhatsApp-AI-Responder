# WhatsApp AI Responder

An AI-powered WhatsApp automation that responds to messages using a local LLM (Llama 3.2) via Ollama. Built with Baileys and Node.js.

## ⚠️ Disclaimer

This project uses the unofficial WhatsApp Web API through Baileys. Use at your own risk:
- Your WhatsApp account could be banned
- This is NOT affiliated with or endorsed by WhatsApp/Meta
- For educational and personal use only
- Use responsibly and respect privacy

## Features

- AI-powered responses using Llama 3.2 via Ollama
- Maintains conversation history (last 5 exchanges)
- Context-aware replies
- Handles text, images, videos, and stickers
- Spam prevention (rate limiting)
- Excluded contacts list
- Group chat filter
- Nigerian Pidgin error messages

## Prerequisites

- Node.js 16+ installed
- [Ollama](https://ollama.ai) installed and running
- Llama 3.2 model downloaded in Ollama

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/iamlegendarium/WhatsApp-AI-Responder.git
cd whatsapp-ai-responder
```

### 2. Install dependencies

```bash
npm init -y
npm install @whiskeysockets/baileys qrcode-terminal
```

### 3. Install and setup Ollama

```bash
# Install Ollama (macOS)
brew install ollama

# Or download from https://ollama.ai

# Start Ollama service
ollama serve

# Pull Llama 3.2 model
ollama pull llama3.2:latest
```

### 4. Configure excluded contacts

Edit `index.js` and update the `EXCLUDED_CONTACTS` array:

```javascript
const EXCLUDED_CONTACTS = [
  "1234567890@s.whatsapp.net", // Replace with actual WhatsApp numbers
  "0987654321@s.whatsapp.net"
];
```

**How to get WhatsApp ID format:**
- Format: `[country_code][phone_number]@s.whatsapp.net`
- Example: For +234 808 848 9874 → `2348088489874@s.whatsapp.net`

## Usage

### Start the bot

```bash
npm start
```

### First time setup

1. Run `npm start`
2. A QR code will appear in your terminal
3. Open WhatsApp on your phone
4. Go to: **Settings → Linked Devices → Link a Device**
5. Scan the QR code
6. Wait for "WhatsApp connected!" message

### How it works

- Bot monitors all incoming messages
- Automatically replies to DMs (not groups)
- Maintains conversation context
- Uses Llama 3.2 for natural responses
- Respects excluded contacts list

## Configuration

### Change AI model

Edit line 82 in `index.js`:

```javascript
model: "llama3.2:latest", // Change to any Ollama model
```

Available models:
- `llama3.2:latest`
- `llama3.1:latest`
- `mistral:latest`
- `codellama:latest`

### Adjust conversation history

Edit line 4:

```javascript
const HISTORY_LIMIT = 5; // Change to desired number of exchanges
```

### Change spam prevention timing

Edit line 52:

```javascript
if (lastMsg.has(sender) && now - lastMsg.get(sender) < 2000) return; // 2 seconds
```

### Customize AI personality

Edit the prompt in line 76:

```javascript
promptText = `You are a friendly AI assistant. Reply naturally, humorously, and contextually...`
```

## Dependencies

```json
{
  "@whiskeysockets/baileys": "^6.x.x",
  "qrcode-terminal": "^0.12.0",
  "node-fetch": "^2.6.1"
}
```

## Important Notes

### Group Chat Protection

The bot includes a filter to prevent replying in group chats:

```javascript
// skip group chats
if (sender.endsWith("@g.us")) return;
```

**DO NOT remove this line** unless you want to get kicked from groups (I learned this the hard way)

### Privacy & Security

- All messages are processed locally via Ollama
- No data is sent to external APIs
- Conversation history is stored in memory only
- Session data is stored in `dev_auth_info/` folder

### Session Management

- Session persists across restarts
- Delete `dev_auth_info/` folder to logout and rescan QR
- Only one device can be linked at a time

## Troubleshooting

### Bot not responding

```bash
# Check if Ollama is running
curl http://127.0.0.1:11434/api/tags

# Restart Ollama
ollama serve
```

### Connection issues

```bash
# Delete auth folder and rescan QR
rm -rf dev_auth_info/
npm start
```

### "AI brain dey rest" error

- Check Ollama is running: `ollama list`
- Verify model is downloaded: `ollama pull llama3.2:latest`
- Check Ollama logs: `ollama serve`

### WhatsApp disconnects frequently

- Ensure stable internet connection
- Don't use WhatsApp Web simultaneously
- Keep the terminal/process running

## Ethical Use Guidelines

**DO:**
- Use for personal automation
- Inform people they're talking to a bot
- Respect privacy and consent
- Keep excluded contacts updated
- Test thoroughly before running

**DON'T:**
- Spam people
- Use for commercial purposes without proper setup
- Violate WhatsApp Terms of Service
- Share session credentials
- Use in groups without permission

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Acknowledgments

- [Baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web API
- [Ollama](https://ollama.ai) - Local LLM hosting
- [Meta AI Llama](https://ai.meta.com/llama/) - Language model

## Support

Found a bug? Have a question?
- Open an issue on GitHub
- Check existing issues first

**⚠️ Remember:** This is an unofficial WhatsApp automation. Your account may be banned. Use responsibly!