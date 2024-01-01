import React, { useEffect, useRef, useState } from "react";
import Avatar from "../components/Avatar";
import BotResponse from "../components/BotResponse";
import Error from "../components/Error";
import IntroSection from "../components/IntroSection";
import Loading from "../components/Loading";
import NavContent from "../components/NavContent";
import PhoneNumberForm from "../components/PhoneNumberForm";
import TTSButton from "../components/TTSButton";

import "../tailwind.css";

const Home = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [currentChat, setCurrentChat] = useState("");
  const [inputPrompt, setInputPrompt] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [err, setErr] = useState(false);
  const [responseFromAPI, setReponseFromAPI] = useState(false);
  const [userId, setUserId] = useState(null); // Initialize userId as null
  const [showForm, setShowForm] = useState(false);
  const [followUpQuestions, setFollowUpQuestions] = useState([]);
  const [isMatched, setIsMatched] = useState(false);

  const chatLogRef = useRef(null);
  const followUpRef = useRef(null);

  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [chatLog]); // Add chatLog dependency to the useEffect hook

  useEffect(() => {
    if (followUpRef.current && followUpQuestions.length > 0) {
      followUpRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [followUpQuestions]);

  useEffect(() => {
    // Function to save location to localStorage
    const saveLocationToLocalStorage = (locationStr, type) => {
      localStorage.setItem(
        "userLocation",
        JSON.stringify({ locationStr, type })
      );
    };

    // Get the already-saved location from local storage
    const existingLocation = localStorage.getItem("userLocation");
    if (!existingLocation) {
      // No existing location, fetch IP location and store it
      (async () => {
        try {
          const response = await fetch("http://localhost/api/get-ip-location");
          const data = await response.json();
          const locationStr = `${data.country}, ${data.region}, ${data.city}`;
          saveLocationToLocalStorage(locationStr, "iplocation");
        } catch (error) {
          console.error("Error getting IP location: ", error);
        }
      })();
    }

    // Check if userId is already present in localStorage
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) {
      setUserId(parseInt(storedUserId, 10));
    } else {
      const fetchUserId = async () => {
        try {
          const response = await fetch("http://localhost/api/getId", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });

          const data = await response.json();
          console.log(data);
          localStorage.setItem("userId", data.userId);
          const storedUserId = localStorage.getItem("userId");
          setUserId(parseInt(storedUserId, 10)); // Update the userId state
        } catch (error) {
          console.error("Error fetching userId:", error);
        }
      };

      // Call the fetchUserId function when the component mounts
      fetchUserId();
    }

    let storedNumber = JSON.parse(localStorage.getItem("phoneNumber"));

    if (!storedNumber) {
      console.log("Phone number not found in localStorage");
      storedNumber = { phoneNumber: "", verified: false };
      localStorage.setItem("phoneNumber", JSON.stringify(storedNumber));
    }

    const verified = storedNumber.verified;

    console.log(storedNumber.phoneNumber + " " + verified);

    if (!verified) {
      console.log("Timer tiggered, number not verified");
      const timer = setTimeout(() => {
        setShowForm(true);
      }, 1000 * 60 * 5);

      // Cleanup function to cancel the timeout if the component unmounts earlier
      return () => clearTimeout(timer);
    } else {
      console.log("Timer not triggered, phone number verified already");
      setShowForm(false);
      return () => {};
    }
  }, []);

  const handleSuggestionClick = (question) => {
    // Clear the follow-up questions
    setFollowUpQuestions([]);
    console.log(question);

    // Set the input field's value to the question
    setInputPrompt(question);

    if (question.trim() === "Match me with a mental health proffesional") {
      setIsMatched(true);
      console.log("is matched is now true");
    }

    // Programmatically submit the form
    handleSubmitProgrammatic(question);
  };

  const handleSubmitProgrammatic = (question) => {
    setReponseFromAPI(true);
    setChatLog([...chatLog, { chatPrompt: question }]);

    callAPI(question);

    setInputPrompt("");
  };

  async function callAPI(question) {
    try {
      setFollowUpQuestions([]);
      const response = await fetch("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", name: "mindywell" },
        body: JSON.stringify({
          prompt: question,
          userId: userId,
          fullKey: currentChat,
        }),
      });
      const data = await response.json();

      const parsedData = data.botResponse;

      if (
        parsedData.includes("CODE99023") ||
        parsedData.includes("in-person") ||
        parsedData.includes("in person") ||
        parsedData.includes("HELP5587") ||
        parsedData.includes("LINK:")
      ) {
        await handleBotResponse(question, parsedData);
      } else {
        setChatLog([
          ...chatLog,
          {
            chatPrompt: question,
            botMessage: parsedData,
          },
        ]);
      }
      setErr(false);
    } catch (err) {
      setErr(err);
      console.log(err);
    }
    const followUpResponse = await fetch("http://localhost/api/followup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullKey: currentChat,
      }),
    });

    const followUpData = await followUpResponse.json();
    let follows = followUpData.followup;

    if (chatLog.length > 10 && !isMatched) {
      follows[3] = "Match me with a mental health proffesional";
    }

    setFollowUpQuestions(follows);

    setReponseFromAPI(false);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!responseFromAPI) {
      if (inputPrompt.trim() !== "") {
        // Set responseFromAPI to true before making the fetch request
        setReponseFromAPI(true);
        setChatLog([...chatLog, { chatPrompt: inputPrompt }]);
        callAPI(inputPrompt);

        // hide the keyboard in mobile devices
        e.target.querySelector("input").blur();
      }
    }

    setInputPrompt("");
  };

  const recommend = async (link) => {
    const location = JSON.parse(localStorage.getItem("userLocation"));

    try {
      const response = await fetch(link, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          locationStr: location.locationStr,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const text = json.text.trim();
        return text; // Just return the text
      } else {
        const err = await response.text();
        // Handle error (instead of alert)
        console.error(err);
        return Promise.reject(err); // Reject the promise if there's an error
      }
    } catch (error) {
      console.error("Something went wrong", error);
      return Promise.reject(error); // Return a rejected promise
    }
  };

  const handleBotResponse = async (question, botResponse) => {
    let parsedData = botResponse.trim();

    if (parsedData.includes("LINK:")) {
      // Extract the link and related data from the bot response
      let newData = parsedData.replace("LINK:", "").trim();
      const linkRegex = /(http:\/\/[^ ]+)(?=\s|$)/;
      const linkMatch = newData.match(linkRegex);

      if (linkMatch && linkMatch[0]) {
        const link = linkMatch[0];
        console.log("Found link:", link);
        newData = newData.replace(linkRegex, "Loading...").trim();

        setChatLog([
          ...chatLog,
          {
            chatPrompt: question,
            botMessage: newData,
          },
        ]);

        try {
          // Await the recommendation result from the recommend function
          const recommendation = await recommend(link);
          console.log(recommendation);
          setIsMatched(true);
          const recommendText = newData.replace(
            "Loading...",
            "\n" + recommendation + "\n"
          );
          setChatLog((prevChatLog) => {
            const updatedChatLog = prevChatLog.slice(0, -1);
            updatedChatLog.push({
              containsLink: true,
              chatPrompt: question,
              botMessage: recommendText,
            });
            return updatedChatLog;
          });
        } catch (err) {
          console.error("Failed to get recommendation:", err);
        }
      } else {
        console.log("No valid link found in the bot output");
      }
    }
    if (
      parsedData.includes("CODE99023") ||
      parsedData.includes("in-person") ||
      parsedData.includes("in person")
    ) {
      // Handle geolocation related operations here
      if (parsedData.includes("CODE99023")) {
        parsedData = parsedData.replace("CODE99023", "").trim();
      }
      setChatLog([
        ...chatLog,
        {
          chatPrompt: question,
          botMessage: parsedData,
        },
      ]);

      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              const geoResponse = await fetch(
                `http://localhost/api/user-location?latitude=${latitude}&longitude=${longitude}`,
                {
                  method: "POST",
                }
              );
              const geoData = await geoResponse.json();
              localStorage.setItem(
                "userLocation",
                JSON.stringify({
                  locationStr: geoData.formattedLocation,
                  type: "geolocation",
                })
              );
              console.log(geoData);
            } catch (error) {
              console.error(error);
            }
          },
          (error) => {
            console.error("Error getting user location:", error.message);
          }
        );
      } else {
        console.error("Geolocation is not supported by this browser.");
      }
    }
    if (parsedData.includes("HELP5587")) {
      const newData = parsedData.replace("HELP5587", "").trim();
      setChatLog([
        ...chatLog,
        {
          chatPrompt: question,
          botMessage: newData,
        },
      ]);
    }
  };

  return (
    <>
      <header>
        <div className="menu">
          <button onClick={() => setShowMenu(true)}>
            <svg
              width={24}
              height={24}
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              stroke="#d9d9e3"
              strokeLinecap="round"
            >
              <path d="M21 18H3M21 12H3M21 6H3" />
            </svg>
          </button>
        </div>
        <h1>Mindywell</h1>
      </header>

      {showMenu && (
        <nav>
          {userId !== null && (
            <div className="navItems">
              <NavContent
                chatLog={chatLog}
                setChatLog={setChatLog}
                setShowMenu={setShowMenu}
                currentChat={currentChat}
                setCurrentChat={setCurrentChat}
                userId={userId}
                setFollowUpQuestions={setFollowUpQuestions}
              />
            </div>
          )}

          <div className="navCloseIcon">
            <svg
              fill="#fff"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 100 100"
              xmlSpace="preserve"
              stroke="#fff"
              width={42}
              height={42}
              onClick={() => setShowMenu(false)}
            >
              <path d="m53.691 50.609 13.467-13.467a2 2 0 1 0-2.828-2.828L50.863 47.781 37.398 34.314a2 2 0 1 0-2.828 2.828l13.465 13.467-14.293 14.293a2 2 0 1 0 2.828 2.828l14.293-14.293L65.156 67.73c.391.391.902.586 1.414.586s1.023-.195 1.414-.586a2 2 0 0 0 0-2.828L53.691 50.609z" />
            </svg>
          </div>
        </nav>
      )}
      {userId !== null && (
        <aside className="sideMenu">
          <NavContent
            chatLog={chatLog}
            setChatLog={setChatLog}
            setShowMenu={setShowMenu}
            currentChat={currentChat}
            setCurrentChat={setCurrentChat}
            userId={userId}
            setFollowUpQuestions={setFollowUpQuestions}
          />
        </aside>
      )}

      <section className="chatBox">
        {chatLog.length > 0 ? (
          <div className="chatLogWrapper">
            {chatLog.length > 0 &&
              chatLog.map((chat, idx) => (
                <div className="chatLog" key={idx} ref={chatLogRef}>
                  <div className="chatPromptMainContainer">
                    <div className="chatPromptWrapper">
                      <Avatar bg="#5437DB" className="userSVG">
                        <svg
                          stroke="currentColor"
                          fill="none"
                          strokeWidth={1.9}
                          viewBox="0 0 24 24"
                          // strokeLinecap="round"
                          // strokeLinejoin="round"
                          className="h-6 w-6"
                          height={40}
                          width={40}
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx={12} cy={7} r={4} />
                        </svg>
                      </Avatar>
                      <div id="chatPrompt">{chat.chatPrompt}</div>
                    </div>
                  </div>

                  <div className="botMessageMainContainer">
                    <div className="botMessageWrapper">
                      <Avatar bg="#11a27f" className="openaiSVG"></Avatar>
                      {chat.botMessage ? (
                        <div id="botMessage">
                          <TTSButton botResponse={chat.botMessage} />

                          <BotResponse
                            response={chat.botMessage}
                            chatLogRef={chatLogRef}
                            containsLink={chat.containsLink}
                          />
                          {showForm && idx === chatLog.length - 1 && (
                            <div className="chatLog">
                              <div className="botMessageMainContainer">
                                <div className="botMessageWrapper">
                                  <div id="botMessage">
                                    <PhoneNumberForm
                                      setShowForm={setShowForm}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : err ? (
                        <Error err={err} />
                      ) : (
                        <Loading />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            {followUpQuestions.length > 0 && (
              <div>
                <h1 className="my-8 text-lg font-bold">Quick Follow-Ups</h1>
                <div className=" md:p-0 mx-auto w-full md:w-[65%] grid gap-2 grid-cols-2">
                  {followUpQuestions.map((question, index) => (
                    <div
                      key={index}
                      ref={
                        index === followUpQuestions.length - 1
                          ? followUpRef
                          : null
                      }
                      className={`flex flex-col items-start p-2 rounded-lg border border-gray-600 text-center cursor-pointer ${
                        question.trim() ===
                          "Match me with a mental health proffesional" &&
                        !isMatched
                          ? "bg-green-500 text-black"
                          : ""
                      }`}
                      onClick={() => handleSuggestionClick(question)}
                    >
                      <p
                        className={`text-sm mx-auto  ${
                          question.trim() ===
                            "Match me with a mental health proffesional" &&
                          !isMatched
                            ? "text-black text-center"
                            : "text-[#c5c5d2]"
                        }`}
                      >
                        {question}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <IntroSection
            onSuggestionClick={handleSuggestionClick}
            currentChat={currentChat}
          />
        )}

        <form className="promptForm" onSubmit={handleSubmit}>
          <div className="inputPromptWrapper">
            <input
              name="inputPrompt"
              id=""
              className="inputPrompttTextarea"
              type="text"
              rows="1"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              autoFocus
            ></input>
            <button aria-label="form submit" type="submit">
              <svg
                fill="#ADACBF"
                width={15}
                height={20}
                viewBox="0 0 32 32"
                xmlns="http://www.w3.org/2000/svg"
                stroke="#212023"
                strokeWidth={0}
              >
                <title>{"submit form"}</title>
                <path
                  d="m30.669 1.665-.014-.019a.73.73 0 0 0-.16-.21h-.001c-.013-.011-.032-.005-.046-.015-.02-.016-.028-.041-.05-.055a.713.713 0 0 0-.374-.106l-.05.002h.002a.628.628 0 0 0-.095.024l.005-.001a.76.76 0 0 0-.264.067l.005-.002-27.999 16a.753.753 0 0 0 .053 1.331l.005.002 9.564 4.414v6.904a.75.75 0 0 0 1.164.625l-.003.002 6.259-4.106 9.015 4.161c.092.043.2.068.314.068H28a.75.75 0 0 0 .747-.695v-.002l2-27.999c.001-.014-.008-.025-.008-.039l.001-.032a.739.739 0 0 0-.073-.322l.002.004zm-4.174 3.202-14.716 16.82-8.143-3.758zM12.75 28.611v-4.823l4.315 1.992zm14.58.254-8.32-3.841c-.024-.015-.038-.042-.064-.054l-5.722-2.656 15.87-18.139z"
                  stroke="none"
                />
              </svg>
            </button>
          </div>
        </form>
      </section>
    </>
  );
};

export default Home;
