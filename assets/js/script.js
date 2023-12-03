const loadingSvg = `<svg id="svg7" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
width="24px" height="30px" viewBox="0 0 24 30" style="enable-background:new 0 0 50 50;" xml:space="preserve">
<rect x="0" y="0" width="4" height="20" fill="#333">
 <animate attributeName="opacity" attributeType="XML"
   values="1; .2; 1" 
   begin="0s" dur="0.6s" repeatCount="indefinite" />
</rect>
<rect x="7" y="0" width="4" height="20" fill="#333">
 <animate attributeName="opacity" attributeType="XML"
   values="1; .2; 1" 
   begin="0.2s" dur="0.6s" repeatCount="indefinite" />
</rect>
<rect x="14" y="0" width="4" height="20" fill="#333">
 <animate attributeName="opacity" attributeType="XML"
   values="1; .2; 1" 
   begin="0.4s" dur="0.6s" repeatCount="indefinite" />
</rect>
</svg>`;

const form = document.querySelector("form");
const chatContainer = document.querySelector("#chat_container");

let loadInterval;

function loader(element) {
  element.textContent = "";

  loadInterval = setInterval(() => {
    // Update the text content of the loading indicator
    element.textContent += ".";

    // If the loading indicator has reached three dots, reset it
    if (element.textContent === "....") {
      element.textContent = "";
    }
  }, 300);
}

function typeText(element, text) {
  let index = 0;

  let interval = setInterval(() => {
    if (index < text.length) {
      element.innerHTML += text.charAt(index);
      index++;
      chatContainer.scrollTop = chatContainer.scrollHeight;
    } else {
      clearInterval(interval);
    }
  }, 5);
}

// generate unique ID for each message div of bot
// necessary for typing text effect for that specific reply
// without unique ID, typing text will work on every element
function generateUniqueId() {
  const timestamp = Date.now();
  const randomNumber = Math.random();
  const hexadecimalString = randomNumber.toString(16);

  return `id-${timestamp}-${hexadecimalString}`;
}

function chatStripe(isAi, value, uniqueId) {
  return `
  <div class="wrapper ${isAi && "ai"}">
  <div class="chat">
      <div class="profile">
          <img 
              src="${isAi ? "/media/bot.svg" : "/media/user.svg"}" 
              alt="${isAi ? "bot" : "user"}" 
          />
      </div>
      <div class="message" id=${uniqueId}>${value}</div>
  </div>
</div>
    `;
}

function generateRandomNumber() {
  const min = 1000000000; // Smallest 10-digit number
  const max = 9999999999; // Largest 10-digit number
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomString(length) {
  const characters =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }
  return result;
}

let userNameClerk = generateRandomString(10);
let userIdClerk = generateRandomNumber();
console.log(userNameClerk + userIdClerk);

document.addEventListener("DOMContentLoaded", () => {
  const uniqueId = generateUniqueId();
  chatContainer.innerHTML += chatStripe(true, " ", uniqueId);

  // to focus scroll to the bottom
  chatContainer.scrollTop = chatContainer.scrollHeight;

  // specific message div
  const messageDiv = document.getElementById(uniqueId);

  messageDiv.innerHTML = " ";

  messageDiv.innerHTML += `Hey there! Welcome to Therapex – your safe space for a chat. I'm here to lend an understanding ear and help you navigate whatever's on your mind. So, how can I support you today?`;

  messageDiv.innerHTML += `<i id="tts1" class="ri-volume-up-line" onclick="textToSpeech(this)"></i>`;
});

const handleSubmit = async (e) => {
  e.preventDefault();

  const data = new FormData(form);

  // user's chatstripe
  chatContainer.innerHTML += chatStripe(false, data.get("prompt"));

  // to clear the textarea input
  form.reset();

  // bot's chatstripe
  const uniqueId = generateUniqueId();
  chatContainer.innerHTML += chatStripe(true, " ", uniqueId);

  // to focus scroll to the bottom
  chatContainer.scrollTop = chatContainer.scrollHeight;

  // specific message div
  const messageDiv = document.getElementById(uniqueId);

  // messageDiv.innerHTML = "..."
  loader(messageDiv);

  console.log(userNameClerk + userIdClerk);

  const originalPrompt = data.get("prompt");
  const response = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      name: "therapex",
    },
    body: JSON.stringify({
      prompt: originalPrompt,
      userId: userIdClerk,
      userName: userNameClerk,
    }),
  });

  clearInterval(loadInterval);
  messageDiv.innerHTML = " ";

  if (response.ok) {
    const json = await response.json(); // Parse the JSON response into a JavaScript object
    const text = json.text;

    let parsedData = text.trim();

    if (parsedData.includes("LINK:")) {
      parsedData = parsedData.replace("LINK:", "").trim();

      // Define a regular expression to match the link
      const linkRegex = /(http:\/\/[^ ]+)/;
      const linkMatch = parsedData.match(linkRegex);

      // Check if a link match is found
      if (linkMatch && linkMatch[0]) {
        const link = linkMatch[0];
        console.log("Found link:", link);

        parsedData = parsedData.replace(linkRegex, "").trim();

        const italicizedText = parsedData.replace(/\*(.*?)\*/g, "<i>$1</i>");
        messageDiv.innerHTML += italicizedText + "\n\n";
        chatContainer.scrollTop = chatContainer.scrollHeight;

        // Now you can fetch the content using the extracted link
        await recommend(link, uniqueId);
      } else {
        console.log("No valid link found in the bot output");
      }
    } else {
      console.log('No "LINK:" found in the bot output');
      const italicizedText = parsedData.replace(/\*(.*?)\*/g, "<i>$1</i>");
      messageDiv.innerHTML += italicizedText;
      messageDiv.innerHTML += `<i id="tts1" class="ri-volume-up-line" onclick="textToSpeech(this)"></i>`;

      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  } else {
    const err = await response.text();

    messageDiv.innerHTML = "Something went wrong";
    alert(err);
  }
};

form.addEventListener("submit", handleSubmit);
form.addEventListener("keyup", (e) => {
  if (e.keyCode === 13) {
    handleSubmit(e);
  }
});

async function recommend(link, msgId) {
  // specific message div
  const messageDiv = document.getElementById(msgId);

  messageDiv.innerHTML += loadingSvg;

  console.log(userNameClerk + userIdClerk);

  const response = await fetch(link, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: userIdClerk,
    }),
  });

  if (response.ok) {
    const json = await response.json(); // Parse the JSON response into a JavaScript object
    const text = json.text;

    const parsedData = text.trim();

    messageDiv.innerHTML += parsedData;

    const loadingImg = document.getElementById("svg7");

    messageDiv.removeChild(loadingImg);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  } else {
    const err = await response.text();

    messageDiv.innerHTML = "Something went wrong";
    alert(err);
  }
}
