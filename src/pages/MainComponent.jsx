"use client";
import React from "react";
import { v4 as uuidv4 } from "uuid";
import { useUpload } from "../utilities/runtime-helpers";
import { useState } from "react";
import { useHandleStreamResponse } from "../hooks/useHandleStreamResponse";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import remarkMdx from 'remark-mdx';
import remarkToc from 'remark-toc';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'; // For custom code block rendering
import { solarizedlight } from 'react-syntax-highlighter/dist/esm/styles/prism'; // Syntax highlighting style
import rehypeRaw from 'rehype-raw'; // Allow raw HTML in Markdown
import remarkMath from 'remark-math'; // Support for math
import rehypeKatex from 'rehype-katex'; // Support for rendering math with KaTeX
import remarkEmoji from 'remark-emoji'; // Support for emojis

import 'katex/dist/katex.min.css'; // Import KaTeX CSS for math rendering
import 'highlight.js/styles/github.css'; // Import highlight.js CSS for syntax highlighting
import { useNavigate } from "react-router-dom";
import API_URL from "./config";
console.log(API_URL)

function MainComponent() {
  const isGuestUser = () => localStorage.getItem("userToken") === "guest";
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [upload, { loading }] = useUpload();
  const [file, setFile] = useState(null);
  const [showFileManager, setShowFileManager] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chatLanguage, setChatLanguage] = useState("en");
  const [imageLanguage, setImageLanguage] = useState("en");
  const [language, setLanguage] = useState("en");
  const [translations, setTranslations] = useState({});
  const [userToken, setUserToken] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [textareaHeight, setTextareaHeight] = useState("auto");
  const [messages, setMessages] = useState([]);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [hasInteracted, setHasInteracted] = useState(false);
  const [loadingResponse, setLoadingResponse] = useState(false); // Add loading state
  const [userDetails, setUserDetails] = useState({ username: "", email: "" });
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
  const languages = [
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "it", name: "Italian" },
    { code: "pt", name: "Portuguese" },
    { code: "nl", name: "Dutch" },
    { code: "pl", name: "Polish" },
    { code: "ru", name: "Russian" },
    { code: "ja", name: "Japanese" },
    { code: "ko", name: "Korean" },
    { code: "zh", name: "Chinese" },
    { code: "ar", name: "Arabic" },
    { code: "hi", name: "Hindi" },
    { code: "bn", name: "Bengali" },
    { code: "sr", name: "Serbian" },
  ];
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setFile(file);
      const { url } = await upload({ file });
      console.log("Uploaded file URL:", url);
      setShowFileManager(false);
    }
  };

  
  const handleCameraClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "camera";
    input.click();
  
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          // Step 1: Convert image to Base64
          const reader = new FileReader();
          reader.onload = async () => {
            const base64Image = reader.result; // Base64 data URL
            
            // Step 2: Upload the image to the backend
            const formData = new FormData();
            formData.append("image", file);
  
            const uploadResponse = await fetch(`${API_URL}/api/upload-image`, {
              method: "POST",
              body: formData,
            });
  
            const uploadData = await uploadResponse.json();
  
            if (uploadResponse.ok) {
              const uploadedImageUrl = uploadData.imageUrl;
  
              // Display image as user message
              const userMessage = {
                role: "user",
                content: `![📷 Image Uploaded!](${uploadedImageUrl})`,
              };
              setMessages((prevMessages) => [...prevMessages, userMessage]);
              setHasInteracted(true);
  
              // Step 3: Send Base64 image to process API
              setLoadingResponse(true); // Show loading indicator
              const processResponse = await fetch(`${API_URL}/api/process-image`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ base64Image }),
              });
  
              const processData = await processResponse.json();
              setLoadingResponse(false); // Reset loading indicator
  
              if (processResponse.ok) {
                const assistantMessage = {
                  role: "assistant",
                  content: processData.extractedText, // Processed text
                };
                setMessages((prevMessages) => [...prevMessages, assistantMessage]);
              } else {
                console.error("Image processing error:", processData.error);
              }
            } else {
              console.error("Image upload failed:", uploadData.error);
            }
          };
  
          // Read the file as a Base64 string
          reader.readAsDataURL(file);
        } catch (err) {
          console.error("Error:", err);
        } finally {
          setLoadingResponse(false); // Reset loading indicator
        }
      }
    };
  };
  
  

  const openFileManager = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.click();
    input.onchange = handleFileChange;
  };

  const staticTranslations = {
    "What do you want to know?": "Šta želite da saznate?",
    "Search anything...": "Pretražujte bilo šta...",
    "History": "Istorija",
    "Supported formats: PDF, DOC, DOCX, TXT, PNG, JPG": "Podržani formati: PDF, DOC, DOCX, TXT, PNG, JPG",
    "Cancel": "Otkaži",
    "Chat Language:": "Jezik chat-a:",
    "Image Language:": "Jezik slike:",
    "Bitcoin price analysis": "Analiza cena Bitcoina",
    "AI technology trends": "Trendovi u AI tehnologiji",
    "Tech conference details": "Detalji tehnološke konferencije",
    "Create image": "Kreiraj sliku",
    "Surprise me": "Iznenadi me",
    "Summarize text": "Sumiraj tekst",
    "Analyze images": "Analiziraj slike",
    "Get advice": "Dobij savet",
    "Help me write": "Pomozite mi da pišem",
    "Code": "Kod",
    "Brainstorm": "Brainstorming",
    "Select Language": "Izaberite jezik",
    "Unlock boundless creativity and innovation with Spark.AI—your ultimate partner in writing, learning, and brainstorming. Empower yourself to achieve, discover, and create with ease and intuition.": 
      "Otključajte beskrajnu kreativnost i inovaciju sa Spark.AI—vašim ultimativnim partnerom u pisanju, učenju i brainstorming-u. Osnažite sebe da postignete, otkrijete i stvarate sa lakoćom i intuicijom.",
    "Sparkstart.AI is here to help!": "Spark.AI je tu da pomogne!",
    "Ask me anything...": "Pitajte me bilo šta...",
    "What is the current Bitcoin price?": "Koja je trenutna cena Bitcoina?",
    "Tell me about recent AI trends": "Reci mi o recentnim trendovima u AI",
    "What are the upcoming tech conferences?": "Koje su nadolazeće tehnološke konferencije?",
    "Help me analyze an image": "Pomozite mi da analiziram sliku",
    "I need advice": "Treba mi savet",
    "Help me write something": "Pomozite mi da napišem nešto",
    "Help me with coding": "Pomozite mi sa kodiranjem",
    "Let's brainstorm ideas": "Hajde da brainstorm-ujemo ideje",
    "Bitcoin price": "Cena Bitcoina",
    "AI trends": "AI trendovi",
    "Conferences": "Konferencije",
    "John Doe": "John Doe",
    "john@example.com": "john@example.com"
  };

  const reversedTranslations = Object.fromEntries(
    Object.entries(staticTranslations).map(([key, value]) => [value, key])
  );

  React.useEffect(() => {
    const translateText = async () => {
      const textsToTranslate = [
        "What do you want to know?",
        "Search anything...",
        "History",
        "Supported formats: PDF, DOC, DOCX, TXT, PNG, JPG",
        "Cancel",
        "Chat Language:",
        "Image Language:",
        "Bitcoin price analysis",
        "AI technology trends",
        "Tech conference details",
        "Create image",
        "Surprise me",
        "Summarize text",
        "Analyze images",
        "Get advice",
        "Help me write",
        "Code",
        "Brainstorm",
        "Select Language",
        "Unlock boundless creativity and innovation with Spark.AI—your ultimate partner in writing, learning, and brainstorming. Empower yourself to achieve, discover, and create with ease and intuition.",
        "Spark.AI is here to help!",
        "Ask me anything...",
        "What is the current Bitcoin price?",
        "Tell me about recent AI trends",
        "What are the upcoming tech conferences?",
        "Help me analyze an image",
        "I need advice",
        "Help me write something",
        "Help me with coding",
        "Let's brainstorm ideas",
        "Bitcoin price",
        "AI trends",
        "Conferences",
        "John Doe",
        "john@example.com",
      ];

      const newTranslations = textsToTranslate.reduce((acc, text) => {
        if (language === "sr") {
          // Use static translations for Serbian
          acc[text] = staticTranslations[text] || text; // Use static translation or fallback to original text
        } else if (language === "en") {
          // Use reversed translations for English
          acc[text] = reversedTranslations[text] || text; // Assuming reversedTranslations contains Serbian translations
        }
        return acc;
      }, {});
      setTranslations(newTranslations);
    };
    //   } else {
    //     // Future: Implement translation API for other languages
    //     // const responses = await Promise.all(
    //     //   textsToTranslate.map((text) =>
    //     //     fetch("/translate", {
    //     //       method: "POST",
    //     //       body: new URLSearchParams({
    //     //         q: text,
    //     //         target: language,
    //     //         source: "en",
    //     //       }),
    //     //     }).then((res) => res.json())
    //     //   )
    //     // );
    //     // const newTranslations = {};
    //     // responses.forEach((response, index) => {
    //     //   newTranslations[textsToTranslate[index]] =
    //     //     response.data.translations[0].translatedText;
    //     // });
    //     // setTranslations(newTranslations);
    //   }
    // };
    translateText();
  }, [language]);

  const getTranslation = (text) => {
    if (translations[text]) {
      return translations[text];
    }
    if (language === "sr" && staticTranslations[text]) {
      return staticTranslations[text]; // Fallback to Serbian if the translation isn't available
    }
    return text; // Default to English or the input text if translation is not available
  };

  const handleButtonClick = (text) => {
    setQuery(text);
    const textarea = document.querySelector('textarea[name="query"]');
    if (textarea) {
      textarea.focus();
    }
    const chatContainer = document.querySelector(".chat-container");
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    setHasInteracted(true); // Set's Chat interaction so that Clear Default response menu
  };

  const handleStreamResponse = useHandleStreamResponse({
    onChunk: setStreamingMessage,
    onFinish: (message) => {
      setMessages((prev) => [...prev, { role: "assistant", content: message }]);
      setStreamingMessage("");
    },
  });

  React.useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) {
      console.error("No token found in localStorage");
      return;
    }
    setUserToken(token);

    if (token) {
      fetch(`${API_URL}/api/chat-history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to fetch chat history: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => setChatHistory(data.history))
        .catch((err) => console.error("Error fetching chat history:", err));
    }
  }, []);

  const handleSubmit = async () => {
    console.log("handleSubmit called with query:", query);

    if (!query.trim()) {
      console.log("Query is empty, exiting handleSubmit.");
      return;
    }
    setLoadingResponse(true); // Set loading to true
    setHasInteracted(true); // Set chat interaction to clear default response menu
    const userMessage = { role: "user", content: query };
    console.log("User message created:", JSON.stringify(userMessage, null, 2));

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages); // Update state immediately for user experience
    setQuery("");

    try {
      const isGuest = isGuestUser();
      const userToken = localStorage.getItem("userToken");
      let endpointUrl;
      let requestBody;

      // Decide whether to start or continue a chat based on message history
      if (!messages || messages.length === 0) {
        console.log("Starting a new chat session...");
        endpointUrl = `${API_URL}/api/start-chat`;
        requestBody = { message: query }; // Include the user query for a new session
      } else {
        console.log("Continuing the chat session...");
        const currentMessages = [...messages, userMessage];
        console.log(
          "Calling backend with messages:",
          JSON.stringify(currentMessages, null, 2)
        );
        endpointUrl = `${API_URL}/api/continue-chat`;
        requestBody = {
          session_id: chatHistory?.[0]?.session_id || null, // Safe access to session_id
          messages: updatedMessages,
        };
      }

      // Fetch the response with streaming
      const headers = {
        "Content-Type": "application/json",
        ...(isGuestUser()
          ? { "Guest-Login": "true" }
          : { Authorization: `Bearer ${userToken}` }),
      };

      // Fetch response with streaming
      const response = await fetch(endpointUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `HTTP error! Backend response: ${response.status} - ${errorData.error}`
        );
      }

      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let assistantMessage = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value);
          assistantMessage += chunk;
          setLoadingResponse(false); // Stop showing the spinner once the first chunk arrives
          setStreamingMessage((prev) => prev + chunk);
        }
      }

      // Clear streamingMessage and update the messages
      setStreamingMessage("");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: assistantMessage },
      ]);

      // Skip history update for guest users
      if (!isGuest) {
        // Update sidebar dynamically
        setChatHistory((prev) => {
          const newHistory = [...(prev || [])];
          if (!messages || messages.length === 0) {
            // New chat session
            const newSession = {
              session_id: uuidv4(), // Generate session ID for frontend
              messages: [{ user_message: query }],
              last_updated: new Date(),
            };
            newHistory.unshift(newSession);
          } else {
            // Update existing session
            const currentSession = newHistory[0];
            currentSession.messages.push({ user_message: query });
            currentSession.last_updated = new Date();
          }
          return newHistory;
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      if (loadingResponse) {
        // Fallback in case no chunks arrive (e.g., server-side error)
        setLoadingResponse(false);
      }
    }
  };

  React.useEffect(() => {
    const chatContainer = document.querySelector(".chat-container");
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [messages, chatHistory]);

  React.useEffect(() => {
    if (isGuestUser()) {
      console.log("Guest user detected. Skipping chat history fetch.");
      setChatHistory([]); // Reset chat history
      setMessages([]);
      return;
    }
    const fetchChatHistory = async () => {
      const token = localStorage.getItem("userToken");
      if (!token) {
        console.error("No token found in localStorage");
        window.location.href = `${API_URL}/`;
        return;
      }
      try {
        const response = await fetch(`${API_URL}/api/chat-history`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });

        if (!response.ok) {
          if (response.status === 401) {
            alert("Session expired. Please log in again.");
            window.location.href = `${API_URL}/`;
          } else {
            throw new Error("Failed to fetch chat history.");
          }
        }
        const data = await response.json();
        if (data.history) {
          setChatHistory(data.history);
        }
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    };

    fetchChatHistory();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("userToken");
    sessionStorage.clear(); // Example: Clear session data
    window.location.href = `${API_URL}/`;
  };
  const fetchSessionMessages = async (sessionId) => {
    if (isGuestUser()) {
      console.log("Guest user detected. Returning empty messages.");
      setMessages([]); // Return empty messages for guest users
      setChatHistory([]); // Reset chat history
      return;
    }
    const token = localStorage.getItem("userToken");
    if (!token) {
      window.location.href = `${API_URL}/`;
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/chat-session/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch session messages.");
      }

      const data = await response.json();
      if (data.messages) {
        setMessages(data.messages); // Load all messages (user + assistant) into chat interface
      }
    } catch (error) {
      console.error("Error fetching session messages:", error);
    }
  };

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
  };

  React.useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) {
        setUserDetails({ username: "Guest User", email: "guestuser@gmail.com" });
        return;
    }

    // Fetch user details for logged-in users
    fetch(`${API_URL}/api/auth/check-auth`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    })
        .then((res) => res.json())
        .then((data) => {
            if (data.authenticated) {
                setUserDetails({
                    username: data.user.username || "Guest User",
                    email: data.user.email || "guestuser@gmail.com",
                });
            } else {
                setUserDetails({ username: "Guest User", email: "guestuser@gmail.com" });
            }
        })
        .catch((err) => {
            console.error("Error fetching user details:", err);
            setUserDetails({ username: "Guest User", email: "guestuser@gmail.com" });
        });
}, []);

  React.useEffect(() => {
    const chatContainer = document.querySelector(".chat-container");
    const bottomChat = document.querySelector("#bottom-chat");
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    if (bottomChat) {
      bottomChat.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingMessage, query]);

  // Function to delete a session
  const deleteSession = async (sessionId) => {
    const token = localStorage.getItem("userToken");
    try {
      const response = await fetch(`${API_URL}/api/chat-history/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error deleting session:", errorData);
        throw new Error("Failed to delete session.");
      }

      setChatHistory((prev) =>
        prev.filter((session) => session.session_id !== sessionId)
      );
      alert("Chat session deleted successfully.");
    } catch (error) {
      console.error("Error deleting chat session:", error);
      alert("Failed to delete chat session.");
    }
  };

  // Function to clear all chat sessions
  const clearAllSessions = async () => {
    const userToken = localStorage.getItem("userToken");

    try {
      const response = await fetch(`${API_URL}/api/chat-history`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${userToken}` },
      });

      if (!response.ok) {
        throw new Error("Failed to clear chat history.");
      }

      setChatHistory([]); // Clear chat history locally
      alert("All chat history cleared.");
    } catch (error) {
      console.error("Error clearing chat history:", error);
      alert("Failed to clear chat history.");
    }
  };

  // Function to handle New Chat
  const handleNewChat = async () => {
    setMessages([]); // Clear current messages
    setHasInteracted(false);
    // Create a new chat session for logged-in users
    const userToken = localStorage.getItem("userToken");
    const endpointUrl = `${API_URL}/api/start-chat`;

    try {
      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ message: "New session initialized" }),
      });

      if (!response.ok) {
        throw new Error("Failed to start a new chat session.");
      }

      const data = await response.json();
      const newSession = {
        session_id: data.session_id || uuidv4(), // Use backend session ID if available
        messages: [],
        last_updated: new Date(),
        name: "New Chat",
      };

      // Avoid adding duplicate "New Chat" entries
      setChatHistory((prev) => {
        const existingNewChat = prev.find(
          (session) => session.name === "New Chat"
        );

        if (existingNewChat) {
          return prev.map((session) =>
            session.name === "New Chat" ? newSession : session
          );
        }

        return [newSession, ...prev];
      });
    } catch (error) {
      console.error("Error initializing new chat session:", error);
    }

    // Scroll chat container to the top
    const chatContainer = document.querySelector(".chat-container");
    if (chatContainer) {
      chatContainer.scrollTop = 0;
    }
  };

  const handleUserlogout = () => {
    try {
        // Step 1: Clear local storage and session data
        localStorage.removeItem("userToken");
        sessionStorage.clear();
        
        // Step 2: Redirect to the login page
        const loginUrl = `${API_URL}/`; 
        window.location.href = loginUrl; // Redirects to the first page or login
    } catch (error) {
        console.error("Error during logout:", error);
        alert("Logout failed. Please try again.");
    }
};


  

  
  return (
    <div
      className={`flex flex-col md:flex-row min-h-screen ${
        isDarkMode ? "bg-[#1C1C1C] text-white" : "bg-white text-black"
      } font-montserrat`}
    >
      <button
        onClick={() => setIsDarkMode(!isDarkMode)}
        className="fixed top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 shadow-lg z-30"
        style={{
          backgroundColor: isDarkMode ? "#2C2C2C" : "#f3f4f6",
        }}
      >
        <i
          className={`fas ${isDarkMode ? "fa-sun" : "fa-moon"} text-lg ${
            isDarkMode ? "text-white" : "text-gray-800"
          }`}
        ></i>
      </button>

      <div
        className={`${
          isSidebarOpen ? "w-full md:w-64" : "w-0"
        } transform transition-all duration-500 ease-in-out ${
          isDarkMode ? "bg-[#2C2C2C]" : "bg-gray-100"
        } overflow-hidden flex flex-col h-screen fixed md:relative z-50`}
        style={{
          opacity: isSidebarOpen ? 1 : 0,
          visibility: isSidebarOpen ? "visible" : "hidden",
          transform: `translateX(${isSidebarOpen ? "0" : "-100%"})`,
        }}
      >
        <div className="p-4 flex-1">
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="text-gray-400 hover:text-current transition-colors duration-300"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="mb-2 text-sm text-gray-400"></div>
          <h2 className="text-xl font-medium mb-4">
            {getTranslation("Chat History")}
          </h2>
          <div className="flex flex-col gap-4 mb-4">
            {!isGuestUser() && userToken && (
              <>
                <button
                  onClick={handleNewChat}
                  className={`w-full ${
                    isDarkMode
                      ? "bg-gray-800 text-white hover:bg-gray-700"
                      : "bg-gray-200 text-black hover:bg-gray-300"
                  } px-4 py-2 rounded-lg transition-colors duration-300`}
                >
                  <i className="fas fa-comments mr-2"></i> New Chat
                </button>
                <button
                  onClick={clearAllSessions}
                  className={`w-full ${
                    isDarkMode
                      ? "bg-gray-800 text-white hover:bg-gray-700"
                      : "bg-gray-200 text-black hover:bg-gray-300"
                  } px-4 py-2 rounded-lg transition-colors duration-300`}
                >
                  <i className="fas fa-trash mr-2"></i> Clear All Sessions
                </button>
              </>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {chatHistory?.length > 0 ? (
              chatHistory.map((session) => (
                <div
                  key={session.session_id}
                  className="p-2 hover:bg-gray-700 rounded cursor-pointer flex justify-between items-center"
                  onClick={() => {
                    fetchSessionMessages(session.session_id);
                    setHasInteracted(true);
                  }}
                >
                  <div className="truncate flex-1">
                    {session.messages?.[0]?.user_message || "New Chat"}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.session_id);
                    }}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              ))
            ) : (
              <p className="text-gray-400">No chat history available</p>
            )}
          </div>
        </div>
        <div
          className={`p-4 border-t ${
            isDarkMode ? "border-gray-700" : "border-gray-300"
          }`}
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                <i className="fas fa-user text-gray-300"></i>
              </div>
              <div>
                <div className="text-sm font-medium">
                  {userDetails.username}
                </div>
                <div className="text-xs text-gray-400">{userDetails.email}</div>
              </div>
            </div>
            <button
              onClick={handleUserlogout}
              className={`w-full px-4 py-2 rounded-lg text-center transition-colors duration-300 ${
                isDarkMode
                  ? "bg-gray-800 text-white hover:bg-gray-700"
                  : "bg-gray-200 text-black hover:bg-gray-300"
              }`}
            >
              <i className="fas fa-sign-out-alt mr-2"></i> Logout
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-2 flex flex-col h-screen">
        <div className="md:fixed md:top-0 md:left-0 md:right-0 md:z-50 md:bg-inherit">
          <div
            onClick={() => {
              // Toggle between English and Serbian
              setLanguage((prevLanguage) =>
                prevLanguage === "en" ? "sr" : "en"
              );
            }}
            className="relative mx-auto md:fixed md:left-1/2 md:top-4 md:-translate-x-1/2 cursor-pointer mb-8 w-full max-w-[160px] px-2 transition-all duration-300"
          >
            <div className="relative">
              <div
                className={`w-full h-[32px] rounded-full p-1 transition-colors duration-300 ${
                  isDarkMode ? "bg-[#2C2C2C]" : "bg-gray-200"
                } flex items-center relative`}
              >
                <div
                  className={`absolute w-[calc(50%-4px)] h-[24px] bg-white rounded-full transition-all duration-300 ${
                    language === "sr"
                      ? "translate-x-[calc(100%+4px)]"
                      : "translate-x-[4px]"
                  }`}
                ></div>
                <span
                  className={`flex-1 text-xs text-center z-10 transition-colors duration-300 ${
                    language === "en" ? "text-black" : "text-gray-400"
                  }`}
                >
                  English
                </span>
                <span
                  className={`flex-1 text-xs text-center z-10 transition-colors duration-300 ${
                    language === "sr" ? "text-black" : "text-gray-400"
                  }`}
                >
                  Spark
                </span>
              </div>
            </div>
          </div>
        </div>

        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 text-gray-400 hover:text-white"
          >
            <i className="fas fa-bars"></i>
          </button>
        )}

        {!hasInteracted && (
          <div className="max-w-2xl mx-auto mt-12 md:mt-24 px-2 flex-grow">
            <h1 className="text-2xl font-medium text-center mb-2 mt-8">
              {getTranslation("Spark.AI is here to help!")}
            </h1>
            <p className="text-sm text-gray-400 text-center mb-6">
              {getTranslation(
                "Unlock boundless creativity and innovation with Spark.AI—your ultimate partner in writing, learning, and brainstorming. Empower yourself to achieve, discover, and create with ease and intuition."
              )}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1 mb-6">
              <button
                onClick={() =>
                  handleButtonClick(
                    getTranslation("What is the current Bitcoin price?")
                  )
                }
                className={`p-1.5 rounded-lg text-center hover:bg-[#3C3C3C] transition-colors ${
                  isDarkMode ? "bg-[#2C2C2C]" : "bg-gray-100"
                }`}
              >
                <i className="fab fa-bitcoin mb-1 text-base"></i>
                <div className="text-[10px]">
                  {getTranslation("Bitcoin price")}
                </div>
              </button>
              <button
                onClick={() =>
                  handleButtonClick(
                    getTranslation("Tell me about recent AI trends")
                  )
                }
                className={`p-1.5 rounded-lg text-center hover:bg-[#3C3C3C] transition-colors ${
                  isDarkMode ? "bg-[#2C2C2C]" : "bg-gray-100"
                }`}
              >
                <i className="fas fa-robot mb-1 text-base"></i>
                <div className="text-[10px]">{getTranslation("AI trends")}</div>
              </button>
              <button
                onClick={() =>
                  handleButtonClick(
                    getTranslation("What are the upcoming tech conferences?")
                  )
                }
                className={`p-1.5 rounded-lg text-center hover:bg-[#3C3C3C] transition-colors ${
                  isDarkMode ? "bg-[#2C2C2C]" : "bg-gray-100"
                }`}
              >
                <i className="fas fa-calendar mb-1 text-base"></i>
                <div className="text-[10px]">
                  {getTranslation("Conferences")}
                </div>
              </button>
              <button
                onClick={() =>
                  handleButtonClick(getTranslation("Help me analyze an image"))
                }
                className={`p-1.5 rounded-lg text-center hover:bg-[#3C3C3C] transition-colors ${
                  isDarkMode ? "bg-[#2C2C2C]" : "bg-gray-100"
                }`}
              >
                <i className="fas fa-image mb-1 text-base"></i>
                <div className="text-[10px]">
                  {getTranslation("Analyze images")}
                </div>
              </button>
              <button
                onClick={() =>
                  handleButtonClick(getTranslation("I need advice"))
                }
                className={`p-1.5 rounded-lg text-center hover:bg-[#3C3C3C] transition-colors ${
                  isDarkMode ? "bg-[#2C2C2C]" : "bg-gray-100"
                }`}
              >
                <i className="fas fa-lightbulb mb-1 text-base"></i>
                <div className="text-[10px]">
                  {getTranslation("Get advice")}
                </div>
              </button>
              <button
                onClick={() =>
                  handleButtonClick(getTranslation("Help me write something"))
                }
                className={`p-1.5 rounded-lg text-center hover:bg-[#3C3C3C] transition-colors ${
                  isDarkMode ? "bg-[#2C2C2C]" : "bg-gray-100"
                }`}
              >
                <i className="fas fa-pen mb-1 text-base"></i>
                <div className="text-[10px]">
                  {getTranslation("Help me write")}
                </div>
              </button>
              <button
                onClick={() =>
                  handleButtonClick(getTranslation("Help me with coding"))
                }
                className={`p-1.5 rounded-lg text-center hover:bg-[#3C3C3C] transition-colors ${
                  isDarkMode ? "bg-[#2C2C2C]" : "bg-gray-100"
                }`}
              >
                <i className="fas fa-code mb-1 text-base"></i>
                <div className="text-[10px]">{getTranslation("Code")}</div>
              </button>
              <button
                onClick={() =>
                  handleButtonClick(getTranslation("Let's brainstorm ideas"))
                }
                className={`p-1.5 rounded-lg text-center hover:bg-[#3C3C3C] transition-colors ${
                  isDarkMode ? "bg-[#2C2C2C]" : "bg-gray-100"
                }`}
              >
                <i className="fas fa-brain mb-1 text-base"></i>
                <div className="text-[10px]">
                  {getTranslation("Brainstorm")}
                </div>
              </button>
            </div>
          </div>
        )}

        {(messages.length > 0 || streamingMessage || loadingResponse) && (
          <div
            className="max-w-2xl mx-auto w-full px-2 flex-1 mt-16 mb-4 chat-container"
            style={{
              overflowY: "auto",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            <div className="flex flex-col min-h-0">
              {messages?.map((message, index) => (
                <div
                  key={index}
                  className={`mb-4 flex items-start gap-2 ${
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === "user"
                        ? isDarkMode
                          ? "bg-[#3C3C3C]"
                          : "bg-blue-100"
                        : isDarkMode
                        ? "bg-[#2C2C2C]"
                        : "bg-gray-100"
                    }`}
                  >
                    <i
                      className={`${
                        message.role === "user" ? "fas fa-user" : "fas fa-robot"
                      } text-sm ${
                        isDarkMode ? "text-gray-300" : "text-gray-600"
                      }`}
                    ></i>
                  </div>
                  <div className="flex flex-col gap-2 max-w-[80%]">
                    <div
                      className={`inline-block p-3 rounded-lg ${
                        message.role === "user"
                          ? isDarkMode
                            ? "bg-[#3C3C3C]"
                            : "bg-blue-100"
                          : isDarkMode
                          ? "bg-[#2C2C2C]"
                          : "bg-gray-100"
                      }`}
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath, remarkEmoji]}
                        rehypePlugins={[rehypeHighlight, rehypeRaw, rehypeKatex]}
                        components={{
                          // Custom rendering for code blocks
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            return inline ? (
                              <code {...props}>{children}</code>
                            ) : (
                              <SyntaxHighlighter
                                style={solarizedlight}
                                language={match ? match[1] : ''}
                                PreTag="div"
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            );
                          },
                          // Custom rendering for blockquotes
                          blockquote({ children }) {
                            return <blockquote style={{ borderLeft: '4px solid #ccc', padding: '0.5em 1em', color: '#555' }}>{children}</blockquote>;
                          },
                          // Custom rendering for images
                          img({ alt, src }) {
                            return <img alt={alt} src={src} style={{ maxWidth: '100%', height: 'auto' }} />;
                          },
                          // Custom rendering for links
                          a({ href, children }) {
                            return (
                              <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'blue', textDecoration: 'underline' }}>
                                {children}
                              </a>
                            );
                          },
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                      
                    </div>
                    {message.role === "assistant" && (
                      <button
                        onClick={() => handleCopyText(message.content)}
                        className="self-end text-gray-400 hover:text-current text-sm"
                      >
                        <i className="fas fa-copy"></i>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {loadingResponse && (
                <div className="loading-indicator">
                  <i className="fas fa-spinner fa-spin"></i> Loading...
                </div>
              )}
              {streamingMessage && (
                <div className="flex items-start gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isDarkMode ? "bg-[#2C2C2C]" : "bg-gray-100"
                    }`}
                  >
                    <i
                      className={`fas fa-robot text-sm ${
                        isDarkMode ? "text-gray-300" : "text-gray-600"
                      }`}
                    ></i>
                  </div>
                  <div className="flex flex-col gap-2 max-w-[80%]">
                    <div
                      className={`inline-block p-3 rounded-lg ${
                        isDarkMode ? "bg-[#2C2C2C]" : "bg-gray-100"
                      }`}
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath, remarkEmoji]}
                        rehypePlugins={[rehypeHighlight, rehypeRaw, rehypeKatex]}
                        components={{
                          // Custom rendering for code blocks
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            return inline ? (
                              <code {...props}>{children}</code>
                            ) : (
                              <SyntaxHighlighter
                                style={solarizedlight}
                                language={match ? match[1] : ''}
                                PreTag="div"
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            );
                          },
                          // Custom rendering for blockquotes
                          blockquote({ children }) {
                            return <blockquote style={{ borderLeft: '4px solid #ccc', padding: '0.5em 1em', color: '#555' }}>{children}</blockquote>;
                          },
                          // Custom rendering for images
                          img({ alt, src }) {
                            return <img src={src} alt={alt}  style={{ maxWidth: '100%', height: 'auto' }} />;
                          },
                          // Custom rendering for links
                          a({ href, children }) {
                            return (
                              <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'blue', textDecoration: 'underline' }}>
                                {children}
                              </a>
                            );
                          },
                        }}
                      >
                        {streamingMessage}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div
          id="bottom-chat"
          className="max-w-2xl mx-auto w-full px-2 py-4 mt-auto"
        >
          <div
            className={`flex flex-col sm:flex-row items-center ${
              isDarkMode ? "bg-[#2C2C2C]" : "bg-gray-100"
            } rounded-lg shadow-lg border ${
              isDarkMode ? "border-gray-700" : "border-gray-200"
            }`}
          >
            <textarea
              name="query"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value === "") {
                  setTextareaHeight("48px");
                } else {
                  setTextareaHeight("auto");
                  setTextareaHeight(`${e.target.scrollHeight}px`);
                }
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={getTranslation("Ask me anything...")}
              style={{
                height: textareaHeight,
                minHeight: "48px",
                maxHeight: "160px",
              }}
              className={`w-full bg-transparent p-3 resize-none ${
                isDarkMode
                  ? "text-white placeholder-gray-400"
                  : "text-black placeholder-gray-500"
              } focus:outline-none text-base`}
            />
            <div className="flex items-center gap-3 p-2 sm:pr-4 w-full sm:w-auto justify-end">
              <button
                onClick={handleCameraClick}
                className="text-gray-400 hover:text-current px-1.5 py-0.5"
              >
                <i className="fas fa-camera text-lg"></i>
              </button>
              <div className="h-6 w-[1px] bg-gray-600"></div>
              <button
                onClick={handleSubmit}
                className="text-gray-400 hover:text-current px-1.5"
              >
                <i className="fas fa-arrow-right text-lg"></i>
              </button>
            </div>
          </div>
          {showFileManager && (
            <div
              className={`mt-2 p-4 rounded-lg shadow-lg ${
                isDarkMode
                  ? "bg-[#2C2C2C] border border-gray-700"
                  : "bg-white border border-gray-200"
              }`}
            >
              <div className="flex flex-col gap-4">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="block w-full text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#1C1C1C] file:text-white hover:file:bg-[#3C3C3C]"
                />
                <div className="text-sm text-gray-400">
                  {getTranslation(
                    "Supported formats: PDF, DOC, DOCX, TXT, PNG, JPG"
                  )}
                </div>
                <button
                  onClick={() => setShowFileManager(false)}
                  className="text-gray-400 hover:text-current text-sm"
                >
                  {getTranslation("Cancel")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

<style jsx global>{`
  .chat-container::-webkit-scrollbar {
    display: none;
  }
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
  .loading-indicator {
    font-size: 14px;
    color: gray;
    display: flex;
    align-items: center;
    gap: 8px;
  }
`}</style>;

export default MainComponent;
