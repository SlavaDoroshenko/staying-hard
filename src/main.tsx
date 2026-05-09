import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import { bootApp } from "./lib/engine/init";
import "./styles/globals.css";

console.log("[staying-hard] entry", {
  url: window.location.href,
  search: window.location.search,
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

bootApp().catch((err) => {
  console.error("bootApp failed", err);
});
