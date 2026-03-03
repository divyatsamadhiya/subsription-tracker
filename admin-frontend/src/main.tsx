import React from "react";
import ReactDOM from "react-dom/client";
import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import App from "./App";
import "./styles.css";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#0f766e"
    },
    secondary: {
      main: "#1d4ed8"
    },
    background: {
      default: "#f4f7f7",
      paper: "#ffffff"
    }
  },
  typography: {
    fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif'
  },
  shape: {
    borderRadius: 12
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
