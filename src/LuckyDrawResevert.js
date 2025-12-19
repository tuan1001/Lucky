import React, { useState, useEffect, useRef } from "react";
import { Wheel } from "react-custom-roulette";
import confetti from "canvas-confetti";
import * as XLSX from "xlsx";
import "./LuckyDrawWheel.css";

/* ===== CƠ CẤU GIẢI (CHIỀU NGƯỢC) ===== */
const PRIZES = [
  { key: "bonus", label: "Consolation Prize (Khuyến Khích)", quantity: 16 },
  { key: "third", label: "Third Prize (Giải Ba)", quantity: 8 },
  { key: "second", label: "Second Prize (Giải Nhì)", quantity: 4 },
  { key: "first", label: "First Prize (Giải Nhất)", quantity: 2 },
  { key: "special", label: "Grand Prize (Giải Đặc Biệt)", quantity: 1 },
];

const PRIZE_COLOR_CLASS = {
  special: "core-gold",
  first: "core-blue",
  second: "core-green",
  third: "core-purple",
  bonus: "core-silver",
};

// Thứ tự hiển thị bảng kết quả (từ cao xuống thấp)
const PRIZE_DISPLAY_ORDER = [
  "special",
  "first",
  "second",
  "third",
  "bonus",
];

const LuckyDrawWheel = () => {
  const [fullData, setFullData] = useState([]);
  const [displayData, setDisplayData] = useState([]);
  const [spinPool, setSpinPool] = useState([]);     // 250 người để quay

  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);

  const [winner, setWinner] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  const [winnersByPrize, setWinnersByPrize] = useState({});
  const [currentPrizeIndex, setCurrentPrizeIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const saveState = (state) => {
    localStorage.setItem("lucky-draw-state", JSON.stringify(state));
  };
  const spinAudio = useRef(new Audio("sound2.mp3"));

  /* ===== LOAD EXCEL ===== */
  useEffect(() => {
    const stored = localStorage.getItem("lucky-draw-state");

    if (stored) {
      const s = JSON.parse(stored);

      setFullData(s.fullData || []);
      setDisplayData(s.displayData || []);
      setSpinPool(s.spinPool || []);
      setWinnersByPrize(s.winnersByPrize || {});
      setCurrentPrizeIndex(s.currentPrizeIndex ?? 0);
      setHasStarted(s.hasStarted || false);
      setIsFinished(s.isFinished || false);

      console.log("✔ Loaded from localStorage");
      return;
    }
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
              row["ID"] ||
              "",
            name:
              row.name ||
              row.Name ||
              row["Họ tên"] ||
              "",
          }))
          .filter((x) => x.code && x.name);

        // 🔹 250 người thật
        setFullData(formatted);
        setSpinPool(formatted);

        // 🔹 RANDOM 200 người để HIỂN THỊ
        const shuffled = [...formatted].sort(() => Math.random() - 0.5);
        setDisplayData(shuffled.slice(0, 150));
      });
  }, []);


  const currentPrize = PRIZES[currentPrizeIndex];

  /* ===== CONFETTI POPUP ===== */
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

  /* ===== CLICK SPIN ===== */
  const handleSpinClick = () => {
    if (mustSpin || displayData.length === 0) return;
    if (spinPool.length === 0) return;
    // 🔒 ĐÃ QUAY XONG TOÀN BỘ
    if (isFinished) {
      alert("🎉 All prizes have been drawn!");
      return;
    }

    setHasStarted(true);

    const index = Math.floor(Math.random() * spinPool.length);
    setPrizeNumber(index);
    setMustSpin(true);
    setShowPopup(false);

    spinAudio.current.currentTime = 0;
    spinAudio.current.play();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Space hoặc Enter
      if ((e.code === "Space" || e.code === "Enter") && !mustSpin) {
        e.preventDefault(); // ❌ chặn scroll
        handleSpinClick();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mustSpin, handleSpinClick]);

  useEffect(() => {
    if (fullData.length === 0) return;

    const state = {
      fullData,
      displayData,
      spinPool,
      winnersByPrize,
      currentPrizeIndex,
      hasStarted,
      isFinished,
    };

    localStorage.setItem("lucky-draw-state", JSON.stringify(state));
    console.log("💾 Saved state", state);
  }, [
    fullData,
    displayData,
    spinPool,
    winnersByPrize,
    currentPrizeIndex,
    hasStarted,
    isFinished
  ]);

  const handleReset = () => {
    if (!window.confirm("Bạn có chắc muốn RESET toàn bộ kết quả không?")) return;

    localStorage.removeItem("lucky-draw-state");

    // Load lại Excel từ đầu
    fetch("/employees.xlsx")
      .then(res => res.arrayBuffer())
      .then(buffer => {
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        const formatted = jsonData
          .map((row) => ({
            code:
              row.code ||
              row.Code ||
              row["Mã nhân viên"] ||
              row["ID"] ||
              "",
            name:
              row.name ||
              row.Name ||
              row["Họ tên"] ||
              "",
          }))
          .filter((x) => x.code && x.name);

        setFullData(formatted);
        setSpinPool(formatted);

        const shuffled = [...formatted].sort(() => Math.random() - 0.5);
        setDisplayData(shuffled.slice(0, 150));
      });

    // Reset toàn bộ state
    setWinnersByPrize({});
    setCurrentPrizeIndex(0);
    setHasStarted(false);
    setIsFinished(false);
    setWinner(null);
    setShowPopup(false);
    setMustSpin(false);

    alert("🔄 Reset thành công!");
  };

  const wheelData = displayData.map((i) => ({ option: i.code }));

  return (
    <>
      <div className="blur-overlay"></div>

      <div className="main-container">
        <div className="lucky-draw-layout">
          {/* ================= WHEEL ================= */}
          <div
            className={`wheel-container ${mustSpin ? "spinning" : ""}`}
            onClick={handleSpinClick}
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
                  spinDuration={1.3}
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
                        <svg viewBox="0 0 100 100" width="30" height="30">
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

                    // 🎯 LẤY NGƯỜI TRÚNG CHUẨN XÁC (từ pool quay)
                    const winnerItem = spinPool[prizeNumber];
                    if (!winnerItem) return;

                    setWinner(winnerItem);
                    setShowPopup(true);

                    // 🎉 LƯU NGƯỜI TRÚNG THEO GIẢI
                    setWinnersByPrize((prev) => ({
                      ...prev,
                      [prize.key]: [...(prev[prize.key] || []), winnerItem],
                    }));

                    // ❌ LOẠI NGƯỜI TRÚNG KHỎI POOL QUAY
                    setSpinPool((prev) => prev.filter((p) => p.code !== winnerItem.code));

                    // ❌ LOẠI NGƯỜI TRÚNG KHỎI DANH SÁCH DISPLAY
                    setDisplayData((prev) => prev.filter((p) => p.code !== winnerItem.code));

                    // ❌ LOẠI NGƯỜI TRÚNG KHỎI DANH SÁCH GỐC
                    setFullData((prev) => prev.filter((p) => p.code !== winnerItem.code));

                    // 🎯 KIỂM TRA ĐÃ ĐỦ SỐ NGƯỜI CỦA GIẢI HIỆN TẠI CHƯA?
                    const awarded = (winnersByPrize[prize.key]?.length || 0) + 1;

                    // 👉 Nếu giải cuối (special) → kết thúc
                    if (prize.key === "special" && awarded >= prize.quantity) {
                      setIsFinished(true);
                      return;
                    }

                    // 👉 Nếu đủ số lượng giải → chuyển sang giải tiếp theo
                    if (awarded >= prize.quantity) {
                      setCurrentPrizeIndex((i) => i + 1);
                    }

                    spinAudio.current.pause();
                    spinAudio.current.currentTime = 0;
                  }}
                />
              ) : (
                <p className="loading-text">⏳ Loading...</p>
              )}

              {/* ===== CENTER 3D ===== */}
              <div className="wheel-center-circle level-3d">
                <div className="wheel-center-ring">
                  <div
                    className={`wheel-center-core ${PRIZE_COLOR_CLASS[currentPrize?.key] || ""
                      }`}
                  >
                    <div className="wheel-center-text-wrap">
                      {!hasStarted ? (
                        <div className="wheel-center-logo-wrap">
                          <img
                            src="/logo3.png"
                            alt="Logo"
                            className="wheel-center-logo"
                          />
                        </div>
                      ) : currentPrize ? (
                        <div className="wheel-center-prize">
                          <div className="prize-en">
                            {currentPrize.label.split("(")[0].trim()}
                          </div>
                          <div className="prize-vi">
                            ({currentPrize.label.split("(")[1]}
                          </div>
                        </div>
                      ) : (
                        <div className="prize-en">Completed</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* ===== END CENTER ===== */}
            </div>
          </div>

          {/* ================= RESULT ================= */}
          <div className="result-panel">
        
            <h3>📋 Lucky Draw Results</h3>
  <button className="reset-btn" onClick={handleReset}>
            🔄 
          </button>
            {PRIZE_DISPLAY_ORDER.map((key) => {
              const p = PRIZES.find(prize => prize.key === key);
              if (!p) return null;

              return (
                <div key={p.key} style={{ marginBottom: 20 }}>
                  <h4 style={{ color: "#1f3c88", marginBottom: 6 }}>
                    🏆 {p.label} ({p.quantity})
                  </h4>

                  {(!winnersByPrize[p.key] ||
                    winnersByPrize[p.key].length === 0) && (
                      <p className="empty-text">None</p>
                    )}

                  {winnersByPrize[p.key]?.map((w, i) => (
                    <div
                      key={i}
                      style={{ fontSize: 15, padding: "6px 0" }}
                    >
                      {i + 1}. {w.code} – {w.name}
                    </div>
                  ))}
                </div>
              );
            })}

          </div>
        </div>
      </div>

      {/* ================= POPUP ================= */}
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
