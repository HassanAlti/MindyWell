import React, { useState, useEffect } from "react";
import NavLinksContainer from "./NavLinksContainer";
import NavPrompt from "./NavPrompt";
import NewChat from "./NewChat";

const NavContent = ({
  chatLog,
  setChatLog,
  setShowMenu,
  currentChat,
  setCurrentChat,
  userId,
  setFollowUpQuestions,
  disableInteraction,
  handleToggle,
}) => {
  const [convoHistory, setConvoHistory] = useState([]);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
        }),
      });
      let data = await response.json();
      data = data.reverse();
      console.log(data);
      if (data.length > 0) {
        setConvoHistory(data);

        if (currentChat === "") {
          setCurrentChat(data[0]);

          try {
            const response = await fetch("/api/retrieve-chats", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ fullKey: data[0].key }),
            });

            if (!response.ok) {
              setChatLog([]);
              throw new Error("Network response was not ok");
            } else {
              // Set chatLog with the response data
              const responseData = await response.json();
              const chats = responseData.chats;

              // Iterate over bot messages and remove specified words and links
              const transformedChats = chats.map((chat) => {
                if (chat.botMessage) {
                  // Remove specified words
                  chat.botMessage = chat.botMessage.replace(
                    /CODE99023|HELP5587|LINK:/g,
                    ""
                  );

                  // Remove links using the linkRegex
                  const linkRegex = /(http:\/\/[^ ]+)/;

                  chat.botMessage = chat.botMessage.replace(linkRegex, "");

                  // Trim any extra spaces
                  chat.botMessage = chat.botMessage.trim();
                }
                return chat;
              });

              setChatLog(transformedChats);
            }
          } catch (error) {
            console.error("Error fetching link:", error);
          }
        }
      } else {
        const currentDate = Date.now();
        const key = `${currentDate}-${userId}-mindywell`;
        const newConvo = {
          date: currentDate,
          key: key,
        };
        setConvoHistory((prevConvoHistory) => [newConvo, ...prevConvoHistory]);
        setCurrentChat(key);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <>
      <NewChat
        setChatLog={setChatLog}
        setShowMenu={setShowMenu}
        setConvoHistory={setConvoHistory}
        setCurrentChat={setCurrentChat}
        userId={userId}
        setFollowUpQuestions={setFollowUpQuestions}
      />
      <div className="navPromptWrapper">
        {convoHistory.map((convo, index) => (
          <NavPrompt
            // isPresent={index === 0 ? true : false}
            chatPrompt={convo.date}
            setShowMenu={setShowMenu}
            key={convo.key}
            linkRef={convo.key}
            setChatLog={setChatLog}
            currentChat={currentChat}
            setCurrentChat={setCurrentChat}
            setFollowUpQuestions={setFollowUpQuestions}
          />
        ))}
      </div>
      <NavLinksContainer
        chatLog={chatLog}
        setChatLog={setChatLog}
        disableInteraction={disableInteraction}
        handleToggle={handleToggle}
      />
    </>
  );
};

export default NavContent;
