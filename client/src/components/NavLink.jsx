import React from "react";

const NavLinks = ({ svg, link, text }) => {
  return (
    <a
      href={link} // Changed from 'to' to 'href'
      target="_blank"
      rel="noreferrer noopener" // Added noopener for security
      style={{ textDecoration: "none" }}
    >
      <div className="navPrompt">
        {svg}
        <p>{text}</p>
      </div>
    </a>
  );
};

export default NavLinks;
