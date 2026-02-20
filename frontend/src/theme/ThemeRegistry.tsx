import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { useAppStore } from "../store/useAppStore";
import { createAppTheme } from "./theme";

interface ThemeRegistryProps {
  children: ReactNode;
}

export const ThemeRegistry = ({ children }: ThemeRegistryProps) => {
  const themePreference = useAppStore((state) => state.settings.themePreference);
  const [systemMode, setSystemMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setSystemMode(media.matches ? "dark" : "light");
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const resolvedMode = themePreference === "system" ? systemMode : themePreference;
  const theme = useMemo(() => createAppTheme(resolvedMode), [resolvedMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};
