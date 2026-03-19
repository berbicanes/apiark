import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { setupAppMenu } from "./AppMenu";

import "./lib/i18n";
import "./styles/global.css";

await setupAppMenu();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
