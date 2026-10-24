import "./App.css";
import Routers from "./router";
import { BrowserRouter } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

function App() {
  return (
    <BrowserRouter>
      <Routers />
      <Analytics />
      <SpeedInsights />
    </BrowserRouter>
  );
}

export default App;
