import React, { useEffect } from "react";
import { useState } from "react";

const BotResponse = ({ response, chatLogRef, containsLink }) => {
  const [botResponse, setBotResponse] = useState("");

  useEffect(() => {
    // Set full message immediately
    setBotResponse(response);
  }, [response, chatLogRef]);

  return containsLink ? (
    <div>
      {" "}
      <pre>{botResponse}</pre>
      <a href="/therapists">View More</a>
    </div>
  ) : (
    <pre>{botResponse}</pre>
  );
};

export default BotResponse;
