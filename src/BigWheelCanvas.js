import React, { useRef, useEffect, useState } from "react";
import confetti from "canvas-confetti";

const BigWheelCanvas = ({ participants, size = 1200 }) => {
  const canvasRef = useRef(null);
  const [rotation, setRotation] = useState(0); // radians
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState(null);

  // draw wheel
  const drawWheel = (ctx, rot = 0) => {
    const n = participants.length;
    const center = size / 2;
    const radius = center - 20;
    const anglePer = (2 * Math.PI) / n;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(rot);

    // draw segments
    for (let i = 0; i < n; i++) {
      const start = i * anglePer;
      const end = start + anglePer;

      // alternate color
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = i % 2 === 0 ? "#f4c542" : "#1f3c88"; // vàng / xanh
      ctx.fill();
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1;
      ctx.stroke();

      // draw text
      ctx.save();
      ctx.rotate(start + anglePer / 2);
      ctx.translate(radius * 0.65, 0);
      ctx.rotate(Math.PI / 2); // rotate text upright
      ctx.fillStyle = "#fff";
      ctx.font = `${Math.max(12, 14 - n / 40)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const name = participants[i];
      const maxLen = 15;
      const shortName = name.length > maxLen ? name.slice(0, maxLen - 3) + "…" : name;
      ctx.fillText(shortName, 0, 0);
      ctx.restore();
    }

    ctx.restore();

    // draw pointer
    ctx.fillStyle = "#ff3d00";
    ctx.beginPath();
    ctx.moveTo(center + radius + 10, center);
    ctx.lineTo(center + radius + 40, center - 20);
    ctx.lineTo(center + radius + 40, center + 20);
    ctx.closePath();
    ctx.fill();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    drawWheel(ctx, rotation);
  }, [participants, rotation]);

  const spin = () => {
    if (isSpinning) return;
    const spinCount = 5 + Math.random() * 5; // 5 to 10 full rounds
    const n = participants.length;
    const winnerIdx = Math.floor(Math.random() * n);
    setWinner(participants[winnerIdx]);

    const finalRot = (2 * Math.PI * spinCount) + (2 * Math.PI * (n - winnerIdx) / n);
    setIsSpinning(true);

    const duration = 4000;
    const start = performance.now();

    const animate = (time) => {
      const t = Math.min(1, (time - start) / duration);
      const ease = 1 - Math.pow(1 - t, 3); // easing out
      setRotation(finalRot * ease);
      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        // fire confetti
        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.6 }
        });
      }
    };
    requestAnimationFrame(animate);
  };

  return (
    <div style={{ position: "relative", width: "100%", textAlign: "center" }}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ maxWidth: "90vw", maxHeight: "90vh" }}
      />
      <button
        onClick={spin}
        disabled={isSpinning}
        style={{
          marginTop: "20px",
          padding: "12px 24px",
          backgroundColor: "#f4c542",
          border: "none",
          borderRadius: "8px",
          fontWeight: "bold",
          color: "#1f3c88",
          cursor: isSpinning ? "not-allowed" : "pointer",
        }}
      >
        🌀 Quay Vòng
      </button>

      {winner && !isSpinning && (
        <div style={{ marginTop: "20px", fontSize: "22px", color: "#28a745" }}>
          🎉 Người trúng: <strong>{winner}</strong> 🎉
        </div>
      )}
    </div>
  );
};

export default BigWheelCanvas;
