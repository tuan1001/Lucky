import React, { useState, useEffect, useRef } from "react";
import { Wheel } from "react-custom-roulette";
import confetti from "canvas-confetti";
import './LuckyDrawWheel.css';

const SHEET_JSON_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSqzm35Gflupe0h9AfH5mUVogncOXSJE4Esv2SdxiCjTJRAwCivHsECJZCxmjvLxOH9jDOky3nx_-mU/gviz/tqx?out=json";

const LuckyDrawWheel = () => {
  const [data, setData] = useState([]);
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [winner, setWinner] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  const spinAudio = useRef(new Audio("/audio/spin.mp3"));

  // ✅ Fetch data từ Google Sheets
  useEffect(() => {
    fetch(SHEET_JSON_URL)
      .then(res => res.text())
      .then(text => {
        const json = JSON.parse(text.substr(47).slice(0, -2));
        const rows = json.table.rows;

        const sheetData = rows.map(r => ({
          code: r.c[0]?.v || "",
          name: r.c[1]?.v || ""
        })).filter(item => item.code && item.name);

        setData(sheetData);
      })
      .catch(err => console.error("Lỗi tải Sheet:", err));
  }, []);

  const handleSpinClick = () => {
    const newPrizeNumber = Math.floor(Math.random() * data.length);
    setPrizeNumber(newPrizeNumber);
    setMustSpin(true);
    setWinner(null);
    setShowPopup(false);

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

  const wheelData = data.map(item => ({ option: item.code }));

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "rgba(255,255,255,0.3)",
          backdropFilter: "blur(30px)",
          border: "1px solid rgba(255,215,0,0.35)",
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

        <h1 style={{ color: "#1f3c88" }}>🌟 Vòng Quay May Mắn 🌟</h1>

        <div
          className={`wheel-container ${mustSpin ? 'spinning' : ''}`}
          onClick={() => { if (!mustSpin) handleSpinClick(); }}
        >
          <Wheel
            mustStartSpinning={mustSpin}
            prizeNumber={prizeNumber}
            data={wheelData}
            backgroundColors={['#f4c542', '#1f3c88']}
            textColors={['#fff']}
            radiusLineWidth={1}
            outerBorderWidth={4}
            outerBorderColor="#fff"
            fontSize={16}
            onStopSpinning={() => {
              setMustSpin(false);
              const winnerData = data[prizeNumber];
              setWinner(winnerData);
              setShowPopup(true);
              launchConfetti();

              if (spinAudio.current) {
                spinAudio.current.pause();
                spinAudio.current.currentTime = 0;
              }
            }}
          />
        </div>
      </div>

      {showPopup && winner && (
        <div className="popup-overlay" onClick={() => setShowPopup(false)}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <h2>🎉 Chúc mừng! 🎉</h2>
            <p className="popup-winner">
              {winner.code} - {winner.name}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default LuckyDrawWheel;
