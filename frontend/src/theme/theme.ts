import { createTheme, responsiveFontSizes, type PaletteMode } from "@mui/material/styles";

const baseTheme = (mode: PaletteMode) =>
  createTheme({
    spacing: 7,
    palette: {
      mode,
      ...(mode === "light"
        ? {
            primary: { main: "#6750A4" },
            secondary: { main: "#625B71" },
            error: { main: "#B3261E" },
            background: { default: "#F4F2F8", paper: "#FFFBFE" }
          }
        : {
            primary: { main: "#D0BCFF" },
            secondary: { main: "#CCC2DC" },
            error: { main: "#F2B8B5" },
            background: { default: "#141218", paper: "#1D1B20" }
          })
    },
    shape: {
      borderRadius: 12
    },
    typography: {
      fontFamily: '"Plus Jakarta Sans", "Segoe UI", sans-serif',
      h1: {
        fontFamily: '"Space Grotesk", "Avenir Next", sans-serif',
        fontSize: "2.4rem",
        fontWeight: 700,
        lineHeight: 1.14
      },
      h2: {
        fontFamily: '"Space Grotesk", "Avenir Next", sans-serif',
        fontSize: "2rem",
        fontWeight: 700,
        lineHeight: 1.16
      },
      h3: {
        fontFamily: '"Space Grotesk", "Avenir Next", sans-serif',
        fontSize: "1.6rem",
        fontWeight: 700,
        lineHeight: 1.2
      },
      h4: {
        fontFamily: '"Space Grotesk", "Avenir Next", sans-serif',
        fontSize: "1.35rem",
        fontWeight: 700,
        lineHeight: 1.24
      },
      h5: {
        fontFamily: '"Space Grotesk", "Avenir Next", sans-serif',
        fontSize: "1.15rem",
        fontWeight: 700,
        lineHeight: 1.28
      },
      h6: {
        fontFamily: '"Space Grotesk", "Avenir Next", sans-serif',
        fontSize: "1rem",
        fontWeight: 700,
        lineHeight: 1.3
      },
      subtitle1: {
        fontSize: "0.95rem",
        fontWeight: 600,
        lineHeight: 1.35
      },
      subtitle2: {
        fontSize: "0.87rem",
        fontWeight: 600,
        lineHeight: 1.35
      },
      body1: {
        fontSize: "0.98rem",
        fontWeight: 400,
        lineHeight: 1.5
      },
      body2: {
        fontSize: "0.88rem",
        fontWeight: 400,
        lineHeight: 1.45
      },
      caption: {
        fontSize: "0.78rem",
        fontWeight: 600,
        lineHeight: 1.35
      },
      overline: {
        fontSize: "0.72rem",
        fontWeight: 700,
        lineHeight: 1.3,
        letterSpacing: "0.11em",
        textTransform: "uppercase"
      },
      button: {
        textTransform: "none",
        fontSize: "0.9rem",
        fontWeight: 600,
        letterSpacing: "0.01em"
      }
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 14
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 14
          }
        }
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: 14,
            "&:last-child": {
              paddingBottom: 14
            }
          }
        }
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true
        }
      },
      MuiTextField: {
        defaultProps: {
          fullWidth: true,
          variant: "outlined",
          size: "small"
        }
      },
      MuiFormControl: {
        defaultProps: {
          fullWidth: true,
          size: "small"
        }
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            minHeight: 40
          }
        }
      }
    }
  });

export const createAppTheme = (mode: PaletteMode) => responsiveFontSizes(baseTheme(mode));
