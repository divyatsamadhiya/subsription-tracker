import type { ReactNode } from "react";
import { Box, Container, Grid } from "@mui/material";

interface AuthLayoutProps {
  primary: ReactNode;
  panel: ReactNode;
  secondary?: ReactNode;
  reverse?: boolean;
}

export const AuthLayout = ({ primary, panel, secondary, reverse = false }: AuthLayoutProps) => {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        py: { xs: 2, md: 3 },
        display: "flex",
        alignItems: "center",
        background:
          "radial-gradient(1100px 520px at -8% -18%, rgba(153, 120, 255, 0.18), transparent 55%), radial-gradient(760px 420px at 100% 0%, rgba(69, 143, 255, 0.14), transparent 62%)"
      }}
    >
      <Container maxWidth="xl" sx={{ px: { xs: 1.25, md: 2.5 } }}>
        <Grid container spacing={1.5} direction={reverse ? "row-reverse" : "row"} alignItems="stretch">
          <Grid size={{ xs: 12, md: secondary ? 4 : 5 }}>{primary}</Grid>
          <Grid size={{ xs: 12, md: secondary ? 4 : 7 }}>{panel}</Grid>
          {secondary ? <Grid size={{ xs: 12, md: 4 }}>{secondary}</Grid> : null}
        </Grid>
      </Container>
    </Box>
  );
};
