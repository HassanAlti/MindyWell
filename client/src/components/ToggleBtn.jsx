import React, { useState } from "react";
import "../toggle.css";

const ToggleBtn = ({ onToggle }) => {
  const [isOn, setIsOn] = useState(false);

  // Function to handle toggle change
  const handleToggle = () => {
    const newState = !isOn;
    setIsOn(newState);
    onToggle(newState); // Invoke the callback with the new state
  };

  return (
    <div style={{ width: "8rem", marginTop: "3.5rem" }}>
      <span style={{ fontWeight: "600" }}>Auto-Play Audio</span>
      <div className="button r" id="button-1">
        <input
          type="checkbox"
          className="checkbox"
          checked={isOn}
          onChange={handleToggle}
        />
        <div className="knobs"></div>
        <div className="layer"></div>
      </div>
    </div>
  );
};

export default ToggleBtn;
