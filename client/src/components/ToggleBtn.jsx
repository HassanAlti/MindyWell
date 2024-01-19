import React, { useState } from "react";
import "../toggle.css";

const ToggleBtn = ({ onToggle }) => {
  const initialState =
    !JSON.parse(localStorage.getItem("autoPlayToggle")) || false;
  const [isOn, setIsOn] = useState(initialState);

  // Function to handle toggle change
  const handleToggle = () => {
    const newState = !isOn;
    setIsOn(newState);
    localStorage.setItem("autoPlayToggle", JSON.stringify(newState)); // Set in localStorage on toggle
    onToggle(newState);
  };

  return (
    <div style={{ marginBottom: "25%" }}>
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
