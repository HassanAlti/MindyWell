import React, { useState, useEffect } from "react";
import "../toggle.css";

const ToggleBtn = ({ onToggle }) => {
  // Retrieve the initial state from localStorage and if it doesn't exist then default to true (autoplay on)
  const [isOn, setIsOn] = useState(() => {
    const storedState = localStorage.getItem("autoPlayToggle");
    // If the storedState is null, it means the user hasn't toggled the button before and we default to true.
    return storedState !== null ? JSON.parse(storedState) : true;
  });

  useEffect(() => {
    // Update the state in the parent component to reflect the current state
    onToggle(isOn);
  }, []); // This will run only once when the component mounts

  // Function to handle toggle change
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
          checked={!isOn} // The checkbox is checked when isOn is false
          onChange={handleToggle}
        />
        <div className="knobs"></div>
        <div className="layer"></div>
      </div>
    </div>
  );
};

export default ToggleBtn;
