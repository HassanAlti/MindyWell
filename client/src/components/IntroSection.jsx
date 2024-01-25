import React, { useEffect, useState } from "react";
import Suggest from "./Suggest";
import PhoneNumberForm from "./PhoneNumberForm";

const IntroSection = ({
  onSuggestionClick,
  currentChat,
  showForm,
  setShowForm,
}) => {
  const firstPart = "Introducing MindyWell - ";
  const [secondPart, setSecondPart] = useState("");
  const [isPrinting, setIsPrinting] = useState(true);

  useEffect(() => {
    let index = 1;
    const message = "Navigating Life with AI and Expert Care";
    const intervalId = setInterval(() => {
      if (!isPrinting) {
        clearInterval(intervalId);
        return;
      }
      setSecondPart(message.slice(0, index));

      if (index >= message.length) {
        clearInterval(intervalId);
      }
      index++;
    }, 50);

    return () => clearInterval(intervalId); // clear interval on component unmount
  }, [isPrinting]);

  return (
    <div id="introsection">
      <h1>
        <b>{firstPart}</b>
        <pre>{secondPart}</pre>
      </h1>

      <img className="avatarImg" alt="" />

      {showForm ? (
        <PhoneNumberForm setShowForm={setShowForm} />
      ) : (
        <Suggest
          onSuggestionClick={onSuggestionClick}
          currentChat={currentChat}
        />
      )}
    </div>
  );
};

export default IntroSection;
