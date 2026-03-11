/**
 * Custom render helper that uses React 19's react-dom/client directly,
 * bypassing @testing-library/react's hoisted react-dom@18 in the monorepo.
 */
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

export function renderInto(ui: React.ReactElement): {
  container: HTMLDivElement;
  unmount: () => void;
} {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(ui);
  });

  return {
    container,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

export { act };
