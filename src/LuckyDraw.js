import React, { useState, useEffect, useRef } from "react";
import { Wheel } from "react-custom-roulette";
import confetti from "canvas-confetti";
import * as XLSX from "xlsx";
import "./LuckyDrawWheel.css";

const LuckyDrawWheel = () => {
  const [fullData, setFullData] = useState([]);      // 200 người thật
  const [displayData, setDisplayData] = useState([]); // 50 người hiển thị
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [winner, setWinner] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  const spinAudio = useRef(new Audio("/sound.mp3"));

  // ===== chọn ngẫu nhiên 50 người để hiển thị =====
  const pickRandom50 = (arr) => {
    return [...arr].sort(() => Math.random() - 0.5).slice(0, 130);
  };

  // ============================
  //  📄 Load Excel Local (200 người)
  // ============================
  useEffect(() => {
    fetch("/employees.xlsx")
      .then((res) => res.arrayBuffer())
      .then((buffer) => {
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        const formatted = jsonData
          .map((row) => ({
            code:
              row.code ||
              row.Code ||
              row["Mã nhân viên"] ||
              row["Mã"] ||
              row["ID"] ||
              "",
            name:
              row.name ||
              row.Name ||
              row["Họ tên"] ||
              row["Tên"] ||
              "",
          }))
          .filter((x) => x.code && x.name);

        setFullData(formatted);
        setDisplayData(pickRandom50(formatted));
      });
  }, []);   // 👈 chạy 1 lần DUY NHẤT
  useEffect(() => {
    if (!showPopup) return;

    const duration = 2500;
    const end = Date.now() + duration;

    const fire = () => {
      confetti({
        particleCount: 25,
        spread: 360,
        startVelocity: 45,
        ticks: 60,
        scalar: 1.2,
        origin: { x: 0.5, y: 0.7 },
        zIndex: 9999,
      });

      if (Date.now() < end) requestAnimationFrame(fire);
    };

    fire();
  }, [showPopup]);
  // ============================
  //  🎡 CLICK để quay
  // ============================
  const handleSpinClick = () => {
    if (mustSpin || fullData.length === 0) return;

    // random từ danh sách 200 người
    const newPrize = Math.floor(Math.random() * fullData.length);

    setPrizeNumber(newPrize);
    setWinner(null);
    setShowPopup(false);
    setMustSpin(true);

    spinAudio.current.currentTime = 0;
    spinAudio.current.play();
  };

  // ============================
  //  🎉 PHÁO HOA
  // ============================
  const launchConfetti = () => {
    const duration = 3500;
    const end = Date.now() + duration;

    const timer = setInterval(() => {
      if (Date.now() > end) return clearInterval(timer);

      confetti({
        particleCount: 80,
        startVelocity: 40,
        spread: 360,
        ticks: 60,
        origin: { x: Math.random(), y: Math.random() * 0.5 },
      });
    }, 250);
  };

  // chỉ hiển thị 50 người
  const wheelData = displayData.map((item) => ({ option: item.code }));

  return (
  <>
    {/* ✅ Overlay mờ nền */}
    <div className="blur-overlay"></div>

    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        background: "rgba(255,255,255,0.3)",
        backdropFilter: "blur(30px)",
        border: "1px solid rgba(255,215,0,0.35)",
        borderRadius: "22px",
        boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
        width: "900px",
        height: "900px",
        padding: "36px",
        textAlign: "center",
        fontFamily: "'Segoe UI', sans-serif",
        zIndex: 10,
      }}
    >
      <img
        src="/Logo.png"
        alt="Logo"
        style={{ width: "120px", marginBottom: "20px" }}
      />

      <h1 style={{ color: "#1f3c88" }}>🌟 Lucky Draw 🌟</h1>

      {fullData.length === 0 && (
        <p style={{ color: "#b00", fontWeight: "bold" }}>
          ⏳ Đang tải danh sách từ Excel...
        </p>
      )}

      {fullData.length > 0 && (
        <div className="wheel-container" onClick={() => !mustSpin && handleSpinClick()}>
        <div className="wheel-wrapper">
          <div className="wheel-blur-rectangle"></div>

    <Wheel
      pointerProps={{
        style: {
          position: "absolute",
          top: "30%",
          left: "94%",
          transform: "translateY(-50%)",
          width: "40px",
          height: "40px",
          backgroundColor: "transparent",
          zIndex: 10,
        },
        children: (
          <svg
            viewBox="0 0 100 100"
            width="24"
            height="24"
            xmlns="http://www.w3.org/2000/svg"
            style={{ transform: "rotate(180deg)" }}
          >
            <path
              d="M50,0 C77,0 100,23 100,50 C100,77 77,100 50,100 C23,100 0,77 0,50 C0,23 23,0 50,0 Z"
              fill="#e74c3c"
            />
          </svg>
        ),
      }}
      mustStartSpinning={mustSpin}
      prizeNumber={prizeNumber % 50}
      data={wheelData}
      backgroundColors={["#eeb211", "#3369e8", "#d50f25", "#009925"]}
      textColors={["#fff"]}
      textDistance={93}
      radius={300}
      fontSize={7}
      radiusLineWidth={0.0}
      outerBorderWidth={1}
      outerBorderColor="#dce2daff"
      onStopSpinning={() => {
        setMustSpin(false);
        const result = fullData[prizeNumber];
        setWinner(result);
        setShowPopup(true);
        launchConfetti();
        spinAudio.current.pause();
        spinAudio.current.currentTime = 0;
      }}
    />
    <div className="wheel-center-circle">
 <p className="wheel-center-text">Lucky Draw</p>

    </div>
  </div>
</div>
      )}
    </div>

    {showPopup && winner && (
      <div className="popup-overlay" onClick={() => setShowPopup(false)}>
        <div className="popup" onClick={(e) => e.stopPropagation()}>
          <canvas id="popup-fireworks"></canvas>
          <h2>🎉 Chúc mừng! 🎉</h2>
          <p className="popup-winner">
            {winner.code} – {winner.name}
          </p>
        </div>
      </div>
    )}
  </>
);
};

export default LuckyDrawWheel;
