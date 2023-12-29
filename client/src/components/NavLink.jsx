import React from "react";
import { Link } from "react-router-dom";

const NavLinks = ({ svg, link, text, setChatLog }) => {
  return (
    <Link
      to={link}
      target={link && "_blank"}
      rel="noreferrer"
      style={{ textDecoration: "none" }}
    >
      <div className="navPrompt">
        {svg}
        <p>{text}</p>
      </div>
    </Link>
  );
};

export default NavLinks;
