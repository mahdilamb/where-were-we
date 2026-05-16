import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const root = document.getElementById("app");
if (!root) throw new Error("missing #app root");
createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
