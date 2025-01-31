import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MainComponent from "./pages/MainComponent";

function App() {
  return (
    <Router>
      <Routes>
        {/* Default route set to Login */}
        <Route path="/" element={<Login />} />
        
        {/* MainComponent route */}
        <Route path="/main" element={<MainComponent />} />
        
        {/* Register route */}
        <Route path="/register" element={<Register />} />
      </Routes>
    </Router>
  );
}

export default App;
