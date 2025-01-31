import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import image from "../asset/image.jpeg";
import axios from "axios";
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import API_URL from "./config";

const firebaseConfig = {
  apiKey: "AIzaSyBg4URtXxhacTdXTeBH7He4hOcik81YyME",
  authDomain: "chatbotai-7fb5d.firebaseapp.com",
  projectId: "chatbotai-7fb5d",
  storageBucket: "chatbotai-7fb5d.firebasestorage.app",
  messagingSenderId: "1016395615865",
  appId: "1:1016395615865:web:194ff005e87ca8e61a8ea8",
  measurementId: "G-6F430E3PLW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState("");
  const navigate = useNavigate();

  // Show popup for 5 seconds
  const showPopup = (message, type) => {
    setPopupMessage(message);
    setPopupType(type);
    setTimeout(() => {
      setPopupMessage("");
    }, 5000);
  };

  // Handle manual login
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate inputs
    if (!username.trim() || !password.trim() || !token.trim()) {
        showPopup("All fields are required.", "error");
        return;
    }

    try {
        const response = await axios.post(
            `${API_URL}/api/auth/login`,
            { username, password, token },
            { withCredentials: true }
        );
        console.log("Login Response:", response.data);

        if (response.data.token) {
            localStorage.setItem("userToken", response.data.token);
            showPopup("Login successful!", "success");
            navigate("/main");
        } else {
            showPopup(
                response.data.message || "Login failed. Please try again.",
                "error"
            );
        }
    } catch (error) {
        console.error("Login Failed:", error.response?.data || error.message);
        showPopup(
            error.response?.data?.msg || "An unexpected error occurred.",
            "error"
        );
    }
};


  // Handle guest login
  const handleGuestLogin = () => {
    localStorage.setItem("userToken", "guest"); // Mark the user as a guest
    navigate("/main");
  };

  // Handle Google login
  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      console.log("Google Login Success:", user);

      // Send Google login details to backend
      const normalizedUsername = user.displayName.toLowerCase().trim();
      const token = await user.getIdToken(); // Get Firebase ID token
      const response = await axios.post(
        `${API_URL}/api/auth/google-login`, // Replace with your actual API endpoint
        {
          username: normalizedUsername,
          email: user.email,
          token: token, // Send Firebase ID token to backend
        },
        { withCredentials: true }
      );

      console.log("Google Login Response:", response.data);

      if (response.data.success) {
        // Store the JWT token in localStorage
        localStorage.setItem("userToken", response.data.token);
        showPopup("Google Login successful!", "success");
        navigate("/main");
      } else {
        showPopup(
          response.data.message || "Google Login failed. Please try again.",
          "error"
        );
      }
    } catch (error) {
      console.error("Google Login Error:", error);
      const message =
        error.response?.data?.msg ||
        error.message ||
        "Google Login failed. Please try again.";
      showPopup(message, "error");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-black via-gray-900 to-black p-4 font-montserrat">
      {popupMessage && (
        <div
          className={`w-full max-w-xs bg-${popupType === "success" ? "green" : "red"}-600 text-white p-4 rounded-lg fixed top-0 left-1/2 transform -translate-x-1/2 transition-all duration-300 ease-in-out`}
        >
          {popupMessage}
        </div>
      )}
      <h1 className="text-4xl font-bold text-white mb-8">ChatBot</h1>
      <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4 md:p-8 rounded-3xl shadow-2xl flex flex-col-reverse md:flex-row w-full max-w-[900px] border border-gray-800 gap-6">
        <div className="w-full md:w-1/2">
          <h1 className="text-3xl md:text-4xl font-bold mb-6 text-white text-center md:text-left">
            Welcome Back!
          </h1>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
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
              <div className="relative">
              <i className="fas fa-key absolute left-3 top-3 text-gray-400"></i>
                <input
                  type="text"
                  name="totp"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="pl-10 w-full p-2 bg-gray-800 border-gray-700 border rounded-lg focus:outline-none focus:border-blue-500 text-white"
                  placeholder="TOTP Token"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Sign In
              </button>
            </div>
          </form>
          <div className="mt-6 text-center">
            <p className="text-gray-400 mb-4">OR</p>
            {/* 
            <button
              className="w-full border border-gray-700 p-2 rounded-lg flex items-center justify-center gap-2 text-white hover:bg-gray-800 mb-2"
              onClick={handleGoogleLogin}
            >
              <i className="fab fa-google text-[#4285F4]"></i>
              Login with Google
            </button>
            */}
            <button
              onClick={handleGuestLogin}
              className="w-full border border-gray-700 p-2 rounded-lg flex items-center justify-center gap-2 text-white hover:bg-gray-800"
            >
              <i className="fas fa-user-secret text-gray-400"></i>
              Guest Login
            </button>
          </div>
          <p className="text-center text-gray-400 mt-4">
            Don't have an account?{" "}
            <span
              className="text-blue-500 cursor-pointer hover:text-blue-400"
              onClick={() => navigate("/register")}
            >
              Create One!
            </span>
          </p>
        </div>
        <div className="w-full md:w-1/2 h-[200px] md:h-auto">
          <img
            src={image} // Replace with actual image URL
            alt="Futuristic robot with glowing elements in dark atmosphere"
            className="w-full h-full object-cover rounded-2xl opacity-80"
          />
        </div>
      </div>
    </div>
  );
}

export default Login;