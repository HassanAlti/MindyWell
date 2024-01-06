import React from "react";
import NavLinks from "./NavLink";

const NavLinksContainer = ({ chatLog, setChatLog }) => {
  return (
    <div className="navLinks" style={{ position: "absolute", bottom: "10px" }}>
      {chatLog.length > 0 && <NavLinks setChatLog={setChatLog} />}
      <NavLinks
        svg={
          <svg
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            width={25}
            height={25}
          >
            <path
              stroke="#fff"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6H7a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-5m-6 0 7.5-7.5M15 3h6v6"
            />
          </svg>
        }
        text="Privacy Policy"
        link="/privacy"
      />
    </div>
  );
};

export default NavLinksContainer;
