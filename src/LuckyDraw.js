import React, { useState, useRef } from "react";
import { Wheel } from "react-custom-roulette";
import confetti from "canvas-confetti";
import './LuckyDrawWheel.css';

const data = [
  { option: 'Nguyễn Minh Tuấn' },
  { option: 'Nguyễn Việt Anh' },
  { option: 'Hà Phương Nhung' },
  { option: 'Nguyễn Tuấn Anh' },
  { option: 'Ngô Anh Tuấn' },
  { option: 'Đỗ Việt Phương' },
  { option: 'Nguyễn Đức Minh' },
  // 👉 Thêm nhiều người vào đây nếu cần
];

const LuckyDrawWheel = () => {
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [winner, setWinner] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  const spinAudio = useRef(new Audio("/sound.mp3")); // 🔊 Âm thanh quay

  const handleSpinClick = () => {
    const newPrizeNumber = Math.floor(Math.random() * data.length);
    setPrizeNumber(newPrizeNumber);
    setMustSpin(true);
    setWinner(null);
    setShowPopup(false);

    // 🔊 Play spin sound
    if (spinAudio.current) {
      spinAudio.current.currentTime = 0;
      spinAudio.current.play();
    }
  };

  const launchConfetti = () => {
    const duration = 4000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
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
    <>
      {/* VÒNG QUAY */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "rgba(255, 255, 255, 0.3)",
          backdropFilter: "blur(30px)",
          border: "1px solid rgba(255, 215, 0, 0.35)",
          padding: "36px",
          borderRadius: "22px",
          boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
          maxWidth: "700px",
          width: "90%",
          textAlign: "center",
          fontFamily: "'Segoe UI', sans-serif",
          zIndex: 10
        }}
      >
        <img
          src="/Logo.png"
          alt="Logo HIT"
          style={{ width: "120px", marginBottom: "20px" }}
        />

        <h1 style={{ color: "#1f3c88" }}>🌟 Lucky Draw 🌟</h1>

        {/* CLICK TRỰC TIẾP VÀO VÒNG QUAY */}
        <div
          className={`wheel-container ${mustSpin ? 'spinning' : ''}`}
          onClick={() => {
            if (!mustSpin) handleSpinClick();
          }}
        >
          <Wheel
            mustStartSpinning={mustSpin}
            prizeNumber={prizeNumber}
            data={data}
            backgroundColors={['#f4c542', '#1f3c88']}
            textColors={['#fff']}
            radiusLineWidth={1}
            outerBorderWidth={4}
            outerBorderColor="#fff"
            fontSize={16}
            onStopSpinning={() => {
              setMustSpin(false);
              const winnerName = data[prizeNumber].option;
              setWinner(winnerName);
              setShowPopup(true);
              launchConfetti();

              // 🔇 Dừng nhạc
              if (spinAudio.current) {
                spinAudio.current.pause();
                spinAudio.current.currentTime = 0;
              }
            }}
          />
        </div>
      </div>

      {/* POPUP TRÚNG THƯỞNG */}
      {showPopup && winner && (
        <div className="popup-overlay" onClick={() => setShowPopup(false)}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <h2>🎉 Congratulation! 🎉</h2>
            <p className="popup-winner">{winner}</p>
          </div>
        </div>
      )}
    </>
  );
};

export default LuckyDrawWheel;
