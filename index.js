const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

// Load menu from JSON
const menu = JSON.parse(fs.readFileSync('menu.json'));

// Replace with your bot token
const token = '8209353486:AAEe6g1JSRLlw3i0wX7-3B1dI12YzoOxpW4';
const bot = new TelegramBot(token, { polling: true });

// Helper: build inline keyboard
function createKeyboard(options, prefix, addBack = false) {
  const keyboard = options.map(opt => [
    { text: opt, callback_data: `${prefix}>>${opt}` }
  ]);
  if (addBack) {
    const pathParts = prefix.split(">>");
    const parentPath = pathParts.slice(0, -1).join(">>") || "course";
    keyboard.push([{ text: "⬅️ Back", callback_data: parentPath }]);
  }
  return { reply_markup: { inline_keyboard: keyboard } };
}

// Start command → show courses
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const courses = Object.keys(menu);
  bot.sendMessage(chatId, "Choose a course:", createKeyboard(courses, "course"));
});

// Handle button clicks
bot.on('callback_query', (callbackQuery) => {
  const msg = callbackQuery.message;
  const data = callbackQuery.data;

  // Parse the path (ignore first "course")
  const parts = data.split(">>").slice(1);

  let current = menu;
  for (const part of parts) {
    if (part && current[part]) {
      current = current[part];
    }
  }

  // If object → show submenu
  if (typeof current === "object" && !Array.isArray(current)) {
    const options = Object.keys(current);
    bot.editMessageText("Choose an option:", {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      ...createKeyboard(options, data, parts.length > 0)
    });
  }

  // If array → send files
  else if (Array.isArray(current)) {
    if (current.length === 0) {
      bot.sendMessage(msg.chat.id, "⚠️ No files available for this semester.");
    } else {
      bot.sendMessage(msg.chat.id, "📂 Here are your files:");
      current.forEach(filePath => {
        bot.sendDocument(msg.chat.id, fs.createReadStream(filePath));
      });
    }

    // After showing files → add Back button
    const parentPath = data.split(">>").slice(0, -1).join(">>") || "course";
    bot.sendMessage(msg.chat.id, "🔙 Navigation:", createKeyboard([], parentPath, true));
  }
});