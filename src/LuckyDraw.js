import React, { useState } from "react";
import { Wheel } from "react-custom-roulette";
import confetti from "canvas-confetti";
import './LuckyDrawWheel.css';

const data = [
  { option: 'Nguyễn Văn A' },
  { option: 'Trần Thị B' },
  { option: 'Lê Văn C' },
  { option: 'Phạm Thị D' },
  { option: 'Hoàng Văn E' },
  { option: 'Đặng Thị F' },
  { option: 'Vũ Văn G' },
];

const LuckyDrawWheel = () => {
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [winner, setWinner] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  const handleSpinClick = () => {
    const newPrizeNumber = Math.floor(Math.random() * data.length);
    setPrizeNumber(newPrizeNumber);
    setMustSpin(true);
    setWinner(null);
    setShowPopup(false);
  };

  const launchConfetti = () => {
    const duration = 4 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      confetti(Object.assign({}, defaults, {
        particleCount: 60,
        origin: {
          x: Math.random(),
          y: Math.random() * 0.6
        }
      }));
    }, 250);
  };

  return (
    <div
      style={{
        background: "#fff",
        padding: "40px",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        maxWidth: "700px",
        margin: "40px auto",
        textAlign: "center",
        fontFamily: "'Segoe UI', sans-serif",
        position: 'relative'
      }}
    >
      {/* LOGO */}
      <img
        src="/Logo.png"
        alt="Logo HIT"
        style={{ width: "120px", marginBottom: "20px" }}
      />

      <h1 style={{ color: "#1f3c88" }}>🌟 Vòng Quay May Mắn 🌟</h1>
    

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          margin: "30px 0",
        }}
      >
        <Wheel
          mustStartSpinning={mustSpin}
          prizeNumber={prizeNumber}
          data={data}
          backgroundColors={['#f4c542', '#1f3c88']}
          textColors={['#fff']}
          onStopSpinning={() => {
            setMustSpin(false);
            const winnerName = data[prizeNumber].option;
            setWinner(winnerName);
            setShowPopup(true);
            launchConfetti();
          }}
        />
      </div>

      <button
        onClick={handleSpinClick}
        disabled={mustSpin}
        style={{
          padding: "10px 20px",
          backgroundColor: "#f4c542",
          border: "none",
          borderRadius: "6px",
          fontWeight: "bold",
          color: "#1f3c88",
          cursor: mustSpin ? "not-allowed" : "pointer",
          marginTop: "20px",
        }}
      >
        🌀 Quay Vòng
      </button>

      {/* POPUP NGƯỜI TRÚNG */}
      {showPopup && winner && (
        <div
          className="popup-overlay"
          onClick={() => setShowPopup(false)} // bấm nền để tắt
        >
          <div
            className="popup"
            onClick={(e) => e.stopPropagation()} // chặn sự kiện tắt nếu bấm vào popup
          >
            <h2>🎉 Chúc mừng! 🎉</h2>
            <p className="popup-winner">{winner}</p>
            
          </div>
        </div>
      )}
    </div>
  );
};

export default LuckyDrawWheel;
