import React, { useState } from "react";
import "intl-tel-input/build/css/intlTelInput.css";
import "../phone.css"; // Make sure this path is correct for your styles
import ReactIntlTelInput from "react-intl-tel-input-v2";

const PhoneNumberForm = ({ setShowForm, setDisableInteraction }) => {
  const [phoneInputValue, setPhoneInputValue] = useState({});
  const [otpSent, setOtpSent] = useState(false);
  const [phoneAlreadyVerified, setPhoneAlreadyVerified] = useState(false);
  const [verified, setVerified] = useState(false);
  const [otp, setOtp] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [otpErrorMsg, setOtpErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Handler for when something changes in the phone input
  const onChangeHandler = (value) => {
    setPhoneInputValue(value);
    setErrorMsg(""); // Reset the error message state when user starts editing
  };

  // Handler when the phone input is ready
  const onReadyHandler = (instance) => {
    console.log("ReactIntlTelInput is ready:", instance);
  };

  // Handler for the phone number submit
  const handleSubmit = async (event) => {
    event.preventDefault();

    // Check if number is available and presumably  valid
    if (phoneInputValue.phone && phoneInputValue.dialCode) {
      console.log(phoneInputValue);
      // Add logic to send OTP to the user's phone
      try {
        // Check if the phone number already contains the extension
        const fullPhoneNumber = phoneInputValue.phone.startsWith(
          "+" + phoneInputValue.dialCode
        )
          ? `${phoneInputValue.phone}`
          : `+${phoneInputValue.dialCode}${phoneInputValue.phone}`;

        console.log("Sending OTP to:", fullPhoneNumber);

        setLoading(true);

        const response = await fetch("/api/send-otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ phoneNumber: fullPhoneNumber }),
        });

        const data = await response.json();
        setLoading(false);
        if (response.ok && data.success) {
          // Store the updated object back into localStorage
          localStorage.setItem(
            "phoneNumber",
            JSON.stringify({
              phoneNumber: fullPhoneNumber,
              verified: false,
              verificationNeeded: true,
            })
          );
          setOtpSent(true);
          setErrorMsg("");
        } else if (response.ok && !data.success) {
          localStorage.setItem(
            "phoneNumber",
            JSON.stringify({
              phoneNumber: fullPhoneNumber,
              verified: true,
              verificationNeeded: false,
            })
          );
          setDisableInteraction(false);
          // Handle the case where the phone is already verified
          setPhoneAlreadyVerified(true);
          setTimeout(() => {
            setShowForm(false);
          }, 5000);

          setErrorMsg("Your phone number is already verified.");
        } else {
          setErrorMsg(data.message || "Failed to send OTP.");
        }
      } catch (error) {
        setErrorMsg("There was an error sending the OTP. Please try again.");
      }
    } else {
      setErrorMsg("Please enter a valid phone number.");
    }
  };

  // Handler for OTP change
  const handleOtpChange = (event) => {
    setOtp(event.target.value);
    setOtpErrorMsg(""); // Reset the OTP error message state when user starts editing
  };

  // Handler for the OTP submit
  const handleOtpSubmit = async (event) => {
    event.preventDefault();
    const storedPhoneNumber = JSON.parse(localStorage.getItem("phoneNumber"));
    if (otp) {
      // Add logic to verify the OTP
      try {
        console.log("Verifying OTP:", otp);

        setLoading(true);

        const response = await fetch("/api/verify-otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            otp,
            phoneNumber: storedPhoneNumber.phoneNumber,
          }),
        });

        const data = await response.json();
        setLoading(false);
        console.log(data);
        if (response.ok && data.success) {
          localStorage.setItem(
            "phoneNumber",
            JSON.stringify({
              phoneNumber: storedPhoneNumber.phoneNumber,
              verified: true,
              verificationNeeded: false,
            })
          );
          setDisableInteraction(false);
          setOtpErrorMsg("");
          setVerified(true);
          setTimeout(() => {
            setShowForm(false);
          }, 5000);

          // Update the 'verified' property
          storedPhoneNumber.verified = true;
          storedPhoneNumber.verificationNeeded = false;
          localStorage.setItem(
            "phoneNumber",
            JSON.stringify(storedPhoneNumber)
          );
          // Perform additional actions on successful OTP verification, e.g., redirecting user
        } else if (response.ok && !data.success) {
          localStorage.setItem(
            "phoneNumber",
            JSON.stringify({
              phoneNumber: storedPhoneNumber.phoneNumber,
              verified: true,
              verificationNeeded: false,
            })
          );
          setDisableInteraction(false);
          setTimeout(() => {
            setShowForm(false);
          }, 5000);

          // Update the 'verified' property
          storedPhoneNumber.verified = true;
          storedPhoneNumber.verificationNeeded = false;
          localStorage.setItem(
            "phoneNumber",
            JSON.stringify(storedPhoneNumber)
          );
          setOtpErrorMsg("");
          setPhoneAlreadyVerified(true);
          // Perform additional actions on successful OTP verification, e.g., redirecting user
        } else {
          setOtpErrorMsg(data.message || "Failed to verify OTP.");
          localStorage.setItem(
            "phoneNumber",
            JSON.stringify({
              phoneNumber: storedPhoneNumber.phoneNumber,
              verified: false,
              verificationNeeded: true,
            })
          );
        }
      } catch (error) {
        setOtpErrorMsg(
          "There was an error verifying the OTP. Please try again."
        );
      }
    } else {
      setOtpErrorMsg("Please enter the OTP.");
    }
  };

  return (
    <div className="phone-number-form">
      {!otpSent && !phoneAlreadyVerified ? (
        <form className="phoneForm" onSubmit={handleSubmit}>
          <p style={{ fontWeight: 700 }}>
            Hey there! You need to verify your number before continuing with
            MindyWell
          </p>
          <div className="btn-input-wrapper">
            <ReactIntlTelInput
              className="intl-tel-input"
              inputProps={{ name: "phone" }}
              intlTelOpts={{
                preferredCountries: ["us", "ca"],
                separateDialCode: true,
              }}
              value={phoneInputValue}
              onChange={onChangeHandler}
              onReady={onReadyHandler}
            />
            <button type="submit" className="btn">
              Verify
            </button>
          </div>
          {errorMsg && <div className="error-msg">{errorMsg}</div>}
        </form>
      ) : phoneAlreadyVerified ? (
        <p>Your phone number is already verified.</p>
      ) : verified ? (
        <p>Your phone number has been verified successfully!</p>
      ) : (
        <form onSubmit={handleOtpSubmit}>
          <p>
            A code was sent to your phone number. Please enter the OTP below:
          </p>
          <input
            style={{ color: "black" }}
            type="text"
            value={otp}
            onChange={handleOtpChange}
            maxLength="6"
            className="otp-input"
          />
          <button type="submit" className="btn">
            Submit OTP
          </button>
          {otpErrorMsg && <div className="error-msg">{otpErrorMsg}</div>}
        </form>
      )}
      {loading && <p>Loading...</p>}
    </div>
  );
};

export default PhoneNumberForm;
