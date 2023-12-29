import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true },
  otp: { type: String, required: true },
  verified: { type: Boolean, default: false },
});

const OtpModel = mongoose.model("Otp", otpSchema);

export default OtpModel;
