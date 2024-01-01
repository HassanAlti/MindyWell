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
}) => {
  const [convoHistory, setConvoHistory] = useState([]);

  const fetchData = async () => {
    try {
      const response = await fetch("http://localhost/api/keys", {
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
        }
      }
      const currentDate = Date.now();
      const key = `${currentDate}-${userId}-mindywell`;
      const newConvo = {
        date: currentDate,
        key: key,
      };
      setConvoHistory((prevConvoHistory) => [newConvo, ...prevConvoHistory]);
      setCurrentChat(key);
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
        {convoHistory.map((convo) => (
          <NavPrompt
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
      <NavLinksContainer chatLog={chatLog} setChatLog={setChatLog} />
    </>
  );
};

export default NavContent;