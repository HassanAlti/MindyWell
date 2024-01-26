import React, { useState, useEffect } from "react";
import "../toggle.css";

const ToggleBtn = ({ onToggle }) => {
  const [isOn, setIsOn] = useState(() => {
    const storedState = localStorage.getItem("autoPlayToggle");
    return storedState !== null ? JSON.parse(storedState) : true;
  });

  useEffect(() => {
    onToggle(isOn);
  }, [isOn]); // Include isOn in the dependency array

  const handleToggle = () => {
    const newState = !isOn;
    setIsOn(newState);
    localStorage.setItem("autoPlayToggle", JSON.stringify(newState));
    onToggle(newState);
  };

  return (
    <div style={{ marginBottom: "25%" }}>
      <span style={{ fontWeight: "600" }}>Auto-Play Audio</span>
      <div className="button r" id="button-1">
        <input
          type="checkbox"
          className="checkbox"
          checked={isOn} // Changed to match the standard UI pattern
          onChange={handleToggle}
          aria-label="Auto-play audio toggle" // Added for accessibility
        />
        <div className="knobs"></div>
        <div className="layer"></div>
      </div>
    </div>
  );
};

export default ToggleBtn;

