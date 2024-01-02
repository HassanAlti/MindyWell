import React from "react";

const NavPrompt = ({
  chatPrompt,
  setShowMenu,
  linkRef,
  setChatLog,
  currentChat,
  setCurrentChat,
  setFollowUpQuestions,
}) => {
  const dateObject = new Date(chatPrompt);
  const formattedDate = dateObject.toLocaleString();
  const chatPromptCharacters = formattedDate.split("");
  const navPromptHref = linkRef;

  const handleClick = async () => {
    // Fetch link using id
    const id = navPromptHref;
    // Close the menu
    setShowMenu(false);
    setCurrentChat(id);
    setFollowUpQuestions([]);

    try {
      const response = await fetch("/api/retrieve-chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fullKey: id }),
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
  };

  // Determine if this NavPrompt should be highlighted
  const isActive = linkRef === currentChat;

  return (
    // Add the handleClick to the div, and style it accordingly
    <div
      className={`navPrompt ${isActive ? "active" : ""}`}
      id={navPromptHref}
      onClick={handleClick}
      role="button"
      tabIndex="0" // This will make the div focusable and able to respond to keyboard events
    >
      <svg
        viewBox="0 0 16 16"
        xmlns="http://www.w3.org/2000/svg"
        fill="#ECECF1"
        stroke="#ECECF1"
        width={16}
        height={16}
      >
        <path
          fill="#ECECF1"
          fillRule="evenodd"
          d="M15 3.25A2.25 2.25 0 0 0 12.75 1h-9.5A2.25 2.25 0 0 0 1 3.25v11a.75.75 0 0 0 1.26.55l2.801-2.6a.75.75 0 0 1 .51-.2h7.179A2.25 2.25 0 0 0 15 9.75v-6.5zm-2.25-.75a.75.75 0 0 1 .75.75v6.5a.75.75 0 0 1-.75.75H5.572a2.25 2.25 0 0 0-1.531.6L2.5 12.53V3.25a.75.75 0 0 1 .75-.75h9.5z"
          clipRule="evenodd"
        />
      </svg>
      <p>
        {chatPromptCharacters.map((char, idx) => (
          <span key={idx} style={{ animationDelay: `${idx * 0.1}s` }}>
            {char}
          </span>
        ))}
      </p>
    </div>
  );
};

export default NavPrompt;
