import React from "react";
import ReactDOM from "react-dom/client";
import { helloCore } from "@hobom-grid/react";

function App() {
  return (
    <div style={{ padding: 16, fontFamily: "system-ui" }}>
      <h1>hobom-grid</h1>
      <p>{helloCore()}</p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
