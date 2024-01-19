import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelope,
  faUser,
  faAt,
  faComment,
  faPaperPlane,
  faTimesCircle,
} from "@fortawesome/free-solid-svg-icons";
import "../contact.css";

const Contact = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    message: "",
  });

  // State for managing the visibility of the contact modal
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent the default form submission behavior

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      // Clear the form if the email was sent successfully, or handle errors
      if (response.ok) {
        console.log("Email sent successfully:", data.message);
        setFormData({
          fullName: "",
          email: "",
          message: "",
        });

        // Uncheck the checkbox (close the modal) by setting isModalVisible to false
        setIsModalVisible(false);
      } else {
        // Display error message from the server, if any
        console.log("An error occurred:", data.message);
      }
    } catch (error) {
      console.error("Failed to send email:", error);
    }
  };

  return (
    <div>
      <label id="contact-btn" className="btn-open" htmlFor="frmContactForm">
        <FontAwesomeIcon icon={faEnvelope} />
        <span className="ml-half">Contact Us</span>
      </label>
      <input
        type="checkbox"
        id="frmContactForm"
        checked={isModalVisible}
        onChange={(e) => setIsModalVisible(e.target.checked)}
      />
      <div className="contact-modal">
        <div className="contact-form">
          <form onSubmit={handleSubmit}>
            <div className="contact-wrapper">
              <div className="contact-section">
                <h2 className="p-none m-none mb-quarter text-white">
                  <FontAwesomeIcon icon={faEnvelope} />
                  <span className="ml-half">Contact Us</span>
                </h2>
              </div>
              <div className="contact-section">
                <div className="form-item">
                  <input
                    type="text"
                    id="txtFullName"
                    name="fullName"
                    placeholder="Full Name (Optional)"
                    value={formData.fullName}
                    onChange={handleChange}
                  />
                  <label className="lbl-floating" htmlFor="txtFullName">
                    Full Name (Optional)
                  </label>
                  <FontAwesomeIcon icon={faUser} className="icon text-white" />
                </div>
                <div className="form-item">
                  <input
                    type="email"
                    id="txtEmail"
                    name="email"
                    placeholder="E-Mail Address"
                    value={formData.email}
                    onChange={handleChange}
                  />
                  <label className="lbl-floating" htmlFor="txtEmail">
                    E-Mail Address
                  </label>
                  <FontAwesomeIcon icon={faAt} className="icon text-white" />
                </div>
                <div className="form-item">
                  <textarea
                    id="txtContent"
                    name="message"
                    placeholder="Your message to the developer"
                    rows="5"
                    value={formData.message}
                    onChange={handleChange}
                  ></textarea>
                  <label className="lbl-floating" htmlFor="txtContent">
                    Your message
                  </label>
                  <FontAwesomeIcon
                    icon={faComment}
                    className="icon text-white"
                  />
                </div>
              </div>
              <div className="contact-section text-right">
                <label className="contact-cancel" htmlFor="frmContactForm">
                  <FontAwesomeIcon icon={faTimesCircle} />
                  <span className="ml-quarter">Cancel</span>
                </label>
                <button
                  style={{ display: "inline" }}
                  type="submit"
                  className="btn-open ml-whole"
                >
                  <FontAwesomeIcon icon={faPaperPlane} />
                  <span className="ml-half">Send</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Contact;
