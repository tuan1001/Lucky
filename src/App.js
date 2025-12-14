import React from "react";
import LuckyDraw from "./LuckyDraw";
import LuckyDrawRevert from  "./LuckyDrawResevert";

function App() {
  return (
    <>
      {/* ===== BACKGROUND 4K ===== */}
      <div className="bg-fullscreen" />
      <div className="bg-overlay" />

      {/* ===== SAFE ZONE ===== */}
      <div className="safe-zone">
        <LuckyDrawRevert />
      </div>
    </>
  );
}
export default App;
