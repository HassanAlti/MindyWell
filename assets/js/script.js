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

let isFetching = true; // Initially set to true

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

  var selectedCountry = "United States";

  document.addEventListener("click", function (event) {
    // Check if the clicked element matches the specified selector
    if (
      event.target.matches(
        ".iti__country, .iti__standard, .iti__flag-box, .iti__country-name, .iti__dial-code"
      )
    ) {
      selectedCountry = event.target
        .closest(".iti__country")
        .querySelector(".iti__country-name").textContent;
    }
    if (event.target.matches(".iti__selected-flag, .iti__arrow, .iti__flag ")) {
      const element = document.querySelector(".iti__country-list");

      // Remove the class
      element.classList.remove("iti__country-list--dropup");
      element.classList.add("iti__country-list--dropdown");
    }
  });

  document.addEventListener("keyup", function (event) {
    if (event.target.id === "phone") {
      var phoneField = event.target;
      if (selectedCountry === "United States" || selectedCountry === "Canada") {
        var phoneValue = phoneField.value;
        var output;
        phoneValue = phoneValue.replace(/[^0-9]/g, "");
        var area = phoneValue.substr(0, 3);
        var pre = phoneValue.substr(3, 3);
        var tel = phoneValue.substr(6, 4);
        if (area.length < 3) {
          output = "(" + area;
        } else if (area.length === 3 && pre.length < 3) {
          output = "(" + area + ")" + " " + pre;
        } else if (area.length === 3 && pre.length === 3) {
          output = "(" + area + ")" + " " + pre + " - " + tel;
        }
        phoneField.value = output;
      }
    }
  });
});

// MESSAGING PART
const handleSubmit = async (e) => {
  isFetching = true;

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

  console.log("Before the fetch  " + isFetching);

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
    const json = await response.json();
    const text = json.text;

    let parsedData = text.trim();

    if (parsedData.includes("LINK:")) {
      let newData = parsedData.replace("LINK:", "").trim();

      // Define a regular expression to match the link
      const linkRegex = /(https:\/\/[^ ]+)/;
      const linkMatch = newData.match(linkRegex);

      // Check if a link match is found
      if (linkMatch && linkMatch[0]) {
        const link = linkMatch[0];
        console.log("Found link:", link);

        newData = newData.replace(linkRegex, "").trim();

        const italicizedText = newData.replace(/\*(.*?)\*/g, "<i>$1</i>");
        messageDiv.innerHTML += italicizedText + "\n\n";
        chatContainer.scrollTop = chatContainer.scrollHeight;
        isFetching = false;

        await recommend(link, uniqueId);

        messageDiv.innerHTML += `<br><br><a id="btn-verify" target="_blank" href="/therapists">View All Results</a></br><br>`;

        chatContainer.scrollTop = chatContainer.scrollHeight;

        if (!parsedData.includes("HELP5587")) {
          return;
        }
      } else {
        console.log("No valid link found in the bot output");
      }
    }
    if (!parsedData.includes("LINK:")) {
      if (
        parsedData.includes("CODE99023") ||
        parsedData.includes("in-person") ||
        parsedData.includes("in person")
      ) {
        if (parsedData.includes("CODE99023")) {
          parsedData = parsedData.replace("CODE99023", "").trim();
        }

        messageDiv.innerHTML = parsedData;
        isFetching = false;

        // Check if the Geolocation API is supported
        if ("geolocation" in navigator) {
          // Get the user's current position
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;

              // Send the user's location to the server
              fetch(
                `/user-location?latitude=${latitude}&longitude=${longitude}`,
                {
                  method: "POST",
                }
              )
                .then((response) => response.json())
                .then((data) => console.log(data))
                .catch((error) => console.error(error));
            },
            (error) => {
              console.error("Error getting user location:", error.message);
            }
          );
        } else {
          console.error("Geolocation is not supported by this browser.");
        }
      }
    }

    let timerIsActive = false;

    if (parsedData.includes("HELP5587")) {
      parsedData = parsedData.replace("HELP5587", "").trim();
      messageDiv.innerHTML = parsedData;
      isFetching = false;
      console.log("Timer Triggered");

      const triggerTime = 5 * 60 * 1000; // 5 minutes in milliseconds

      if (!timerIsActive) {
        setTimeout(() => {
          // specific message div
          console.log(isFetching);
          console.log("Timer is finished!");

          if (!isFetching) {
            showForm();
          } else {
            // Check the condition at intervals until it becomes false
            const intervalId = setInterval(() => {
              if (!isFetching) {
                showForm();
                clearInterval(intervalId); // Stop checking once the condition is false
              }
            }, 2000); // Check every 2 second
          }

          function showForm() {
            const uniqueId = generateUniqueId();
            chatContainer.innerHTML += chatStripe(true, " ", uniqueId);

            chatContainer.scrollTop = chatContainer.scrollHeight;

            const formDiv = document.getElementById(uniqueId);

            formDiv.innerHTML = "";

            formDiv.innerHTML += `Hey there! Please Enter your Phone number so we can give you extra help 🙂`;

            formDiv.innerHTML += `<form id="login">
          <p>Enter your phone number:</p>
          <input id="phone" type="tel" name="phone" maxlength="16" />
          <input type="submit" id="btn" class="btn" value="Verify" />
          <span id="valid-msg" class="hide">✓ Valid</span>
          <span id="error-msg" class="hide"></span>
        </form>
       `;

            const input = document.querySelector("#phone");
            const button = document.querySelector("#btn");
            const errorMsg = document.querySelector("#error-msg");
            const validMsg = document.querySelector("#valid-msg");

            const errorMap = [
              "Invalid number",
              "Invalid country code",
              "Too short",
              "Too long",
              "Invalid number",
            ];

            const phoneInput = window.intlTelInput(input, {
              preferredCountries: ["us", "ca"],
              utilsScript:
                "https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js",
            });

            const form = document.getElementById("login");

            var phoneField = document.getElementById("phone");

            const reset = () => {
              if (event && event.type === "keyup" && event.key === "Enter") {
                return;
              }

              input.classList.remove("error");
              errorMsg.innerHTML = "";
              errorMsg.classList.add("hide");
              validMsg.classList.add("hide");
            };

            var numberState = false;

            const validateNumber = (event) => {
              event.preventDefault;

              reset();
              if (input.value.trim()) {
                if (phoneInput.isValidNumber()) {
                  validMsg.classList.remove("hide");
                  numberState = true;
                } else {
                  numberState = false;
                  input.classList.add("error");
                  const errorCode = phoneInput.getValidationError();
                  errorMsg.innerHTML = errorMap[errorCode];
                  errorMsg.classList.remove("hide");
                }
              }
            };
            // on click button: validate the number
            button.addEventListener("click", validateNumber);

            // on keyup / change flag: reset
            input.addEventListener("change", reset);
            input.addEventListener("keyup", reset);

            form.addEventListener("submit", validateNumber);

            document.addEventListener("submit", async function (event) {
              if (
                event.target &&
                event.target.tagName.toLowerCase() === "form" &&
                event.target.id === "login"
              ) {
                event.preventDefault();

                console.log("I got clicked");

                const phoneNumber = phoneInput.getNumber();

                console.log("The phone Number" + phoneNumber);

                if (numberState === true) {
                  formDiv.innerHTML = "";
                  formDiv.innerHTML = `<span><i>You<span><i> <span><i>are<span><i> <span><i>Loved<span><i>. <span><i>You<span><i> <span><i>are<span><i> <span><i>Cared<span><i> <span><i>For<span><i>`;
                  const response = await fetch(
                    "http://localhost:3000/send-otp",
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        phoneNumber: phoneNumber,
                      }),
                    }
                  );

                  if (response.ok) {
                    const json = await response.json();
                    if (json.success) {
                      formDiv.innerHTML = `A code was sent to your phone number, please verify it`;
                      formDiv.innerHTML += `
                  <form id="verifyForm">
                  <p>Enter the code sent to your phone:</p>
                  <input id="otp" name="OTP" maxlength="6" />
                  <input type="submit" id="btn-verify" class="btn-verify" value="Verify" />
                  <span id="valid-msg" class="hide">✓ Valid</span>
                  <span id="error-msg" class="hide"></span>
                </form>`;
                    }
                  } else if (response.status === 500) {
                    const json = await response.json();
                    if (json.success === false) {
                      console.log(json);
                      formDiv.innerHTML =
                        "An error occured. Failed to send OTP. In the meantime, you can continue chatting with Therapex!";
                    }
                  } else if (response.status === 400) {
                    const json = await response.json();
                    if (json.error) {
                      formDiv.innerHTML =
                        "Your phone number is already verified, you can continue chatting with Therapex!";
                    }
                  }
                }
              }
            });

            formDiv.addEventListener("submit", async function (event) {
              // Check if the submitted form is the verifyForm
              if (event.target && event.target.id === "verifyForm") {
                const otpInput = document.getElementById("otp");

                event.preventDefault();

                const otpNumber = otpInput.value.trim();

                if (otpNumber.length === 6) {
                  formDiv.innerHTML = `<span><i>You<span><i> <span><i>are<span><i> <span><i>Loved<span><i>. <span><i>You<span><i> <span><i>are<span><i> <span><i>Cared<span><i> <span><i>For<span><i>`;

                  const response = await fetch(
                    "http://localhost:3000/verify-otp",
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        otp: `${otpNumber}`,
                      }),
                    }
                  );

                  if (response.ok) {
                    formDiv.innerHTML = "";
                    formDiv.innerHTML =
                      "Your phone Number has been verified successfully. Continue chatting with Therapex 🙂";
                  } else if (response.status === 500) {
                    const json = await response.json();
                    if (json.success === false) {
                      console.log(json);
                      formDiv.innerHTML =
                        "An error occured. Failed to verify OTP. In the meantime, you can continue chatting with Therapex!";
                    }
                  } else if (response.status === 400) {
                    const json = await response.json();
                    if (json.error) {
                      formDiv.innerHTML =
                        "Your phone number is already verified, you can continue chatting with Therapex!";
                    }
                  } else if (response.status === 401) {
                    formDiv.innerHTML = "Invalid OTP, please try again";
                    formDiv.innerHTML += `
                <form id="verifyForm">
            <p>Enter the code sent to your phone:</p>
            <input id="otp" name="OTP" maxlength="6" />
            <input type="submit" id="btn-verify" class="btn-verify" value="Verify" />
            <span id="valid-msg" class="hide">✓ Valid</span>
            <span id="error-msg" class="hide"></span>
          </form>`;
                  }
                }
              }
            });
          }

          timerIsActive = false;
        }, triggerTime);
      }

      timerIsActive = true;
      return;
    } else {
      isFetching = false; // Set to false when fetch completes
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
    const json = await response.json();
    const text = json.text;

    const parsedData = text.trim();

    const loadingImg = document.getElementById("svg7");

    messageDiv.removeChild(loadingImg);

    messageDiv.innerHTML += parsedData;

    chatContainer.scrollTop = chatContainer.scrollHeight;
  } else {
    const err = await response.text();

    messageDiv.innerHTML = "Something went wrong";
    alert(err);
  }
}
