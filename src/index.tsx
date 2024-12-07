import React from "react";
import App from "./App";
import { createRoot } from "react-dom/client";
import "./style.css";
import { Buffer } from "buffer";
import { currentVersion } from "./contants/versions";
import { ThemeProvider } from "@mui/material/styles";
import { createTheme } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import "./styles/theme.scss";

window.Buffer = Buffer;

const dbname = "mpDatabase";
const versionKey = "nautilus-versions";
const version = Number(localStorage.getItem(versionKey) || "0");
if (version < currentVersion) {
  localStorage.clear();
  localStorage.setItem(versionKey, `${currentVersion}`);
  indexedDB.deleteDatabase(dbname);
}
const container = document.getElementById("root");
const root = createRoot(container!);

const theme = createTheme();

root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
