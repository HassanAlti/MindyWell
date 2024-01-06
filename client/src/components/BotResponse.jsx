import React, { useState, useEffect } from "react";

const BotResponse = ({ response, chatLogRef, containsLink, therapistArr }) => {
  const [botResponse, setBotResponse] = useState("");
  const [viewMore, setViewMore] = useState(false);

  useEffect(() => {
    setBotResponse(response);
  }, [response, chatLogRef]);

  const handleViewMoreClick = () => {
    setViewMore(true);
  };

  const renderTherapistList = () => {
    const listItemStyle = {
      marginBottom: "1em",
      marginTop: "1em",
    };

    return (
      <ol style={{ counterReset: "item", listStyle: "initial" }}>
        {therapistArr.map((therapist, index) => (
          <li key={index} style={listItemStyle}>
            {therapist}
          </li>
        ))}
      </ol>
    );
  };

  return containsLink ? (
    <div>
      <pre>{botResponse}</pre>
      {viewMore && therapistArr.length > 0 ? (
        <>
          <h1 style={{ fontWeight: "800", fontSize: "24px" }}>
            Here is a Full List of Potential Matches:
          </h1>
          {renderTherapistList()}
        </>
      ) : (
        <button className="btn" onClick={handleViewMoreClick}>
          View More
        </button>
      )}
    </div>
  ) : (
    <pre>{botResponse}</pre>
  );
};

export default BotResponse;
