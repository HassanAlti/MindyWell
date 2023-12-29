import React from "react";
import img from "../images/avatar.webp";

const Avatar = ({ children, bg, className }) => {
  return (
    <div id="avatar" style={{ backgroundColor: `${bg}` }}>
      {className === "openaiSVG" && (
        <img src={img} class="avatar-image" alt="mindywell-avatar"></img>
      )}
      <div className={className}>{children}</div>
    </div>
  );
};

export default Avatar;
