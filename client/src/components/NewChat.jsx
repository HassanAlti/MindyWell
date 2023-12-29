import React from "react";

const NewChat = ({
  setChatLog,
  setShowMenu,
  setConvoHistory,
  setCurrentChat,
  userId,
  setFollowUpQuestions,
}) => {
  return (
    <div
      className="sideMenuButton"
      onClick={() => {
        setFollowUpQuestions([]);
        setChatLog([]);
        setShowMenu(false);
        const currentDate = Date.now();
        const key = `${currentDate}-${userId}-mindywell`;
        const newConvo = {
          date: currentDate,
          key: key,
        };
        setConvoHistory((prevConvoHistory) => [newConvo, ...prevConvoHistory]);
        setCurrentChat(key);
      }}
    >
      <span>+</span>
      New chat
    </div>
  );
};

export default NewChat;
