import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./index.css";
import App from "./App.jsx";
import { GOOGLE_CLIENT_ID } from "./config";
import { AuthProvider } from "./context/AuthProvider";
import { WebSocketProvider } from "./context/WebSocketProvider";
import { JobProvider } from "./context/JobContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <WebSocketProvider>
          <JobProvider>
            <App />
          </JobProvider>
        </WebSocketProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  </StrictMode>
);