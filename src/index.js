import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css"; // Make sure this file exists and has Tailwind setup
import App from "./App";

const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error(
    "No root element found. Make sure your index.html has <div id='root'></div>"
  );
} else {
  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
