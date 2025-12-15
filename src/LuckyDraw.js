import React, { useState, useEffect, useRef } from "react";
import { Wheel } from "react-custom-roulette";
import confetti from "canvas-confetti";
import * as XLSX from "xlsx";
import "./LuckyDrawWheel.css";

/* ===== CƠ CẤU GIẢI ===== */
const PRIZES = [
  { key: "special", label: "Grand Prize (Giải Đặc Biệt)", quantity: 1 },
  { key: "first",   label: "First Prize (Giải Nhất)", quantity: 2 },
  { key: "second",  label: "Second Prize (Giải Nhì)", quantity: 4 },
  { key: "third",   label: "Third Prize (Giải Ba)", quantity: 8 },
  { key: "bonus",   label: "Consolation Prize (Khuyến Khích)", quantity: 20 },
];

const PRIZE_COLOR_CLASS = {
  special: "core-gold",
  first: "core-blue",
  second: "core-green",
  third: "core-purple",
  bonus: "core-silver",
};
const LuckyDrawWheel = () => {
  const [fullData, setFullData] = useState([]);
  const [displayData, setDisplayData] = useState([]);

  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);

  const [winner, setWinner] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  const [winnersByPrize, setWinnersByPrize] = useState({});
  const [currentPrizeIndex, setCurrentPrizeIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);


  const spinAudio = useRef(new Audio("/sound.mp3"));

  /* ===== Load Excel ===== */
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
        setDisplayData(formatted); // ban đầu tất cả đều được quay
      });
  }, []);

  const currentPrize = PRIZES[currentPrizeIndex];

  /* ===== Popup confetti ===== */
  useEffect(() => {
    if (!showPopup) return;

    const end = Date.now() + 2000;
    const fire = () => {
      confetti({
        particleCount: 30,
        spread: 360,
        startVelocity: 45,
        ticks: 60,
        origin: { x: 0.5, y: 0.7 },
        zIndex: 9999,
      });
      if (Date.now() < end) requestAnimationFrame(fire);
    };
    fire();
  }, [showPopup]);

  /* ===== Spin ===== */
  const handleSpinClick = () => {
    if (mustSpin || displayData.length === 0) return;

    setHasStarted(true);   // 👈 DÒNG QUAN TRỌNG
    setMustSpin(true);

    if (!currentPrize) {
      alert("🎉 Đã quay xong tất cả giải!");
      return;
    }

    const index = Math.floor(Math.random() * displayData.length);
    setPrizeNumber(index);
    setMustSpin(true);
    setShowPopup(false);

    spinAudio.current.currentTime = 0;
    spinAudio.current.play();
  };

  const wheelData = displayData.map((i) => ({ option: i.code }));

  return (
    <>
      <div className="blur-overlay"></div>

      <div className="main-container">
      
        <div className="lucky-draw-layout">
          {/* ================= Wheel ================= */}
          <div
            className={`wheel-container ${mustSpin ? "spinning" : ""}`}
            onClick={() => !mustSpin && handleSpinClick()}
          >
            <div className="wheel-wrapper">
              <div className="wheel-blur-rectangle"></div>

              {wheelData.length > 0 ? (
                <Wheel
                  mustStartSpinning={mustSpin}
                  prizeNumber={prizeNumber % wheelData.length}
                  data={wheelData}
                  backgroundColors={[
                    "#eeb211",
                    "#3369e8",
                    "#d50f25",
                    "#009925",
                  ]}
                  textColors={["#fff"]}
                  textDistance={93}
                  radius={300}
                  fontSize={7}
                  radiusLineWidth={0}
                  outerBorderWidth={1}
                  outerBorderColor="#dce2daff"
                 
                  pointerProps={{
                    style: {
                      position: "absolute",
                      top: "28%",
                      left: "95%",
                      width: "50px",
                      height: "50px",
                      backgroundColor: "transparent",
                      zIndex: 20,
                    },
                    children: (
                      <div className={`pointer-svg ${mustSpin ? "spin" : ""}`}>
                        <svg
                          viewBox="0 0 100 100"
                          width="30"
                          height="30"
                        >
                          <path
                            d="M50,0 C78,0 100,22 100,50 C100,78 78,100 50,100 C22,100 0,78 0,50 C0,22 22,0 50,0 Z"
                            fill="#e74c3c"
                          />
                        </svg>
                      </div>
                    ),
                  }}
                  onStopSpinning={() => {
                    setMustSpin(false);

                    const prize = PRIZES[currentPrizeIndex];
                    const result = displayData[prizeNumber];
                    if (!result) return;

                    setWinner(result);
                    setShowPopup(true);

                    // ✅ Lưu theo giải
                    setWinnersByPrize((prev) => {
                      const list = prev[prize.key] || [];
                      return {
                        ...prev,
                        [prize.key]: [...list, result],
                      };
                    });

                    // ❌ Loại khỏi danh sách quay tiếp
                    setDisplayData((prev) =>
                      prev.filter((_, i) => i !== prizeNumber)
                    );

                    // 👉 kiểm tra đủ số lượng giải
                    const count =
                      (winnersByPrize[prize.key]?.length || 0) + 1;
                    if (count >= prize.quantity) {
                      setCurrentPrizeIndex((i) => i + 1);
                    }

                    spinAudio.current.pause();
                    spinAudio.current.currentTime = 0;
                    
                  }}
                />
              ) : (
                <p className="loading-text">⏳ Đang tải vòng quay...</p>
              )}

              <div className="wheel-center-circle level-3d">
                <div className="wheel-center-ring">
                  <div
                    className={`wheel-center-core ${
                      PRIZE_COLOR_CLASS[PRIZES[currentPrizeIndex]?.key] || ""
                    }`}
                  >
                    <div className="wheel-center-text-wrap">
                      {!hasStarted ? (
                        /* ===== LÚC CHƯA QUAY ===== */
                        <img src="/logo1.png" alt="Logo" className="wheel-center-logo"/>
                      ) : (
                        /* ===== ĐANG QUAY / ĐÃ QUAY ===== */
                        <>
                       
                          <div className="wheel-center-prize">
                            <div className="prize-en">
                              {PRIZES[currentPrizeIndex]?.label?.split("(")[0]?.trim()}
                            </div>
                            <div className="prize-vi">
                              ({PRIZES[currentPrizeIndex]?.label?.split("(")[1]}
                            </div>
                          </div>

                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>


            </div>
          </div>

          {/* ================= Result Table ================= */}
          <div className="result-panel">
            <h3>📋 Lucky Draw Results</h3>

            {PRIZES.map((p) => (
              <div key={p.key} style={{ marginBottom: 16 }}>
                <h4 style={{ color: "#1f3c88", marginBottom: 6 }}>
                  🏆 {p.label} ({p.quantity})
                </h4>

                {(!winnersByPrize[p.key] ||
                  winnersByPrize[p.key].length === 0) && (
                  <p className="empty-text">None</p>
                )}

                {winnersByPrize[p.key]?.map((w, i) => (
                  <div key={i} style={{ fontSize: 14, padding: "4px 0" }}>
                    {i + 1}. {w.code} – {w.name}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ================= Popup ================= */}
      {showPopup && winner && (
        <div className="popup-overlay" onClick={() => setShowPopup(false)}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <h2>🎉 Congratulations! 🎉</h2>
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
