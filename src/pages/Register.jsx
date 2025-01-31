import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import image from "../asset/image.jpeg";
import axios from "axios";
import API_URL from "./config";

function Register() {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [qrCode, setQrCode] = useState(""); // Added for TOTP QR code
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password.trim()) {
      alert("All fields are required.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      alert("Please enter a valid email address.");
      return;
    }
    try {
      const normalizedUsername = username.toLowerCase().trim(); // Normalize username
      const response = await axios.post(`${API_URL}/api/auth/signup`, { username: normalizedUsername, email, password });
      console.log(response.data);
      if (response.data.token) {
        localStorage.setItem("userToken", response.data.token); // Save token in localStorage
      }
      setQrCode(response.data.qrcode); // Store the QR code for display
    } catch (error) {
      alert(error.response?.data?.msg || "Registration failed.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-black via-gray-900 to-black p-4 font-montserrat">
      <h1 className="text-4xl font-bold text-white">Srpski AI</h1>
      <div className="flex items-center justify-center">
        <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4 md:p-8 rounded-3xl shadow-2xl flex flex-col-reverse md:flex-row w-full max-w-[900px] border border-gray-800 gap-6">
          <div className="w-full md:w-1/2">
            <h1 className="text-3xl md:text-4xl font-bold mb-6 text-white text-center md:text-left">Create Account</h1>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <div className="relative">
                    <i className="fas fa-user absolute left-3 top-3 text-gray-400"></i>
                    <input
                      type="text"
                      name="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10 w-full p-2 bg-gray-800 border-gray-700 border rounded-lg focus:outline-none focus:border-blue-500 text-white"
                      placeholder="Username"
                    />
                  </div>
                </div>
                <div>
                  <div className="relative">
                    <i className="fas fa-envelope absolute left-3 top-3 text-gray-400"></i>
                    <input
                      type="email"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 w-full p-2 bg-gray-800 border-gray-700 border rounded-lg focus:outline-none focus:border-blue-500 text-white"
                      placeholder="Email"
                    />
                  </div>
                </div>
                <div>
                  <div className="relative">
                    <i className="fas fa-lock absolute left-3 top-3 text-gray-400"></i>
                    <input
                      type="password"
                      name="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 w-full p-2 bg-gray-800 border-gray-700 border rounded-lg focus:outline-none focus:border-blue-500 text-white"
                      placeholder="Password"
                    />
                  </div>
                </div>
                <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Sign Up</button>
              </div>
            </form>
            <p className="text-center text-gray-400 mt-4">
              Already have an account?{" "}
              <span className="text-blue-500 cursor-pointer hover:text-blue-400" onClick={() => navigate("/")}>
                Sign in
              </span>
            </p>
          </div>
          <div className="w-full md:w-1/2 h-[200px] md:h-auto">
            <img src={image} alt="Futuristic robot with glowing elements in dark atmosphere" className="w-full h-full object-cover rounded-2xl opacity-80" />
          </div>
        </div>
      </div>
      {qrCode ? (
        <div className="mt-6 text-center">
          <h3 className="text-white">Scan this QR Code with your authenticator app:</h3>
          <img src={`data:image/png;base64,${qrCode}`} alt="TOTP QR Code" />
          <button className="mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700" onClick={() => navigate("/main")}>
            Proceed to Main
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default Register;
