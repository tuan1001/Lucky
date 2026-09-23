import React, { useState, useEffect, useMemo, useRef } from "react";
import { Wheel } from "react-custom-roulette";
import confetti from "canvas-confetti";
import * as XLSX from "xlsx";
import "./LuckyDrawWheel.css";

/* ===== CƠ CẤU GIẢI MẶC ĐỊNH (thứ tự quay: thấp → cao) =====
   Sửa được ngay trong app: Ctrl + Shift + K → tab "Cơ cấu giải" */
const DEFAULT_PRIZES = [
  { key: "bonus", label: "Consolation Prize (Khuyến Khích)", quantity: 16 },
  { key: "third", label: "Third Prize (Giải Ba)", quantity: 8 },
  { key: "second", label: "Second Prize (Giải Nhì)", quantity: 4 },
  { key: "first", label: "First Prize (Giải Nhất)", quantity: 2 },
  { key: "special", label: "Grand Prize (Giải Đặc Biệt)", quantity: 1 },
];

// Số ô hiển thị trên vòng quay (lấy ngẫu nhiên từ danh sách tham gia)
const DEFAULT_DISPLAY_COUNT = 150;

// Màu nhấn cho từng giải – chỉ dùng họ màu vàng / xanh của bộ nhận diện HTIT
const PRIZE_COLOR = {
  special: "#e6cb7a", // vàng HTIT
  first: "#cf8b2c", // vàng đậm HTIT
  second: "#6f97db", // xanh HTIT (sáng)
  third: "#a9c1ea", // xanh HTIT (nhạt)
  bonus: "#c9d3e3", // bạc
};

// Giải tự thêm sẽ lấy màu theo thứ tự này (từ giải cao xuống thấp)
const PRIZE_PALETTE = ["#e6cb7a", "#cf8b2c", "#6f97db", "#a9c1ea", "#c9d3e3"];

const CONFIG_KEY = "lucky-draw-config";

const loadConfig = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(CONFIG_KEY));
    if (saved?.prizes?.length) {
      return {
        prizes: saved.prizes,
        displayCount: saved.displayCount || DEFAULT_DISPLAY_COUNT,
      };
    }
  } catch {
    /* cấu hình hỏng → dùng mặc định */
  }
  return { prizes: DEFAULT_PRIZES, displayCount: DEFAULT_DISPLAY_COUNT };
};

/* Danh sách chỉ có họ tên (không có cột mã) → tự sinh mã ẩn #1, #2...
   để vẫn phân biệt được hai người trùng tên. Mã ẩn không hiển thị ra màn hình. */
const withAutoCode = (list) =>
  list
    .filter((x) => x.name)
    .map((x, i) => (x.code ? x : { ...x, code: "#" + (i + 1), autoCode: true }));

// So khớp một dòng người dùng gõ với mã HOẶC họ tên
const matchesPerson = (person, token = "") => {
  const t = String(token).trim().toLowerCase();
  return (
    !!t &&
    (String(person.code).trim().toLowerCase() === t ||
      String(person.name).trim().toLowerCase() === t)
  );
};

// Danh sách dán tay: "mã<tab/,/khoảng trắng>họ tên", hoặc chỉ "họ tên" mỗi dòng
const parsePastedList = (text = "") =>
  withAutoCode(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        // Chỉ tách mã khi token đầu có chữ số (2501002, NV-12…), còn lại coi cả dòng là tên
        const [, code, name] = line.match(/^(\S*\d\S*)[\s,;]+(.+)$/) || [];
        return code
          ? { code: code.trim(), name: name.trim() }
          : { code: "", name: line };
      })
  );

// Màu các ô vòng quay theo nhận diện HTIT (xanh navy + vàng)
const WHEEL_COLORS = ["#1f457f", "#e6cb7a", "#406ab3", "#d59d40"];
const WHEEL_TEXT_COLORS = ["#ffffff", "#231f20", "#ffffff", "#231f20"];

// Số bóng đèn trang trí quanh viền
const BULB_COUNT = 32;

// Kim chỉ (thư viện chỉ nhận `src`, không nhận children)
const POINTER_SRC = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 120'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stop-color='#f3e3b3'/>
        <stop offset='0.5' stop-color='#e6cb7a'/>
        <stop offset='1' stop-color='#cf8b2c'/>
      </linearGradient>
    </defs>
    <path d='M50 116 L15 50 A38 38 0 1 1 85 50 Z' fill='url(#g)' stroke='#ffffff' stroke-width='5' stroke-linejoin='round'/>
    <circle cx='50' cy='40' r='14' fill='#1f457f' stroke='#ffffff' stroke-width='4'/>
  </svg>`
)}`;

// Danh sách trúng đặt sẵn: mỗi dòng (hoặc ngăn bởi , ;) là một mã HOẶC một họ tên
const FIXED_KEY = "lucky-draw-fixed";
const parseCodes = (text = "") =>
  text
    .split(/[\n,;]+/)
    .map((c) => c.trim())
    .filter(Boolean)
    // Nhiều mã số trên cùng một dòng vẫn tách được; họ tên (có dấu cách) giữ nguyên
    .flatMap((entry) =>
      /\s/.test(entry) && entry.split(/\s+/).every((t) => /\d/.test(t))
        ? entry.split(/\s+/)
        : [entry]
    );

/* ===== CỠ CHỮ TRÊN VÒNG QUAY =====
   Canvas của thư viện là 900x900 → bán kính ngoài 440, chữ vẽ ở cỡ fontSize*2
   và được CĂN GIỮA tại (440 × textDistance/100). Tên dài mà textDistance lớn
   thì nửa sau của chữ văng ra ngoài mép và bị cắt.
   Hàm dưới đẩy chữ sát mép ngoài rồi lấy cỡ chữ lớn nhất còn nằm gọn trong ô,
   xét cả chiều dài (không đụng nút tròn giữa) lẫn bề dày ô (số ô càng nhiều
   thì ô càng mỏng). */
const WHEEL_FONT = "Barlow";
const WHEEL_RADIUS = 440; // outsideRadius = canvas.width / 2 - 10
const WHEEL_HUB = 145; // phần bán kính bị nút tròn ở giữa che
const WHEEL_MARGIN = 10;

const fitWheelText = (labels = []) => {
  const fallback = { fontSize: 7, textDistance: 66 };
  if (!labels.length) return fallback;

  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return fallback;

  const arc = (2 * Math.PI) / labels.length; // bề dày một ô, theo radian
  for (let fontSize = 16; fontSize >= 4; fontSize--) {
    ctx.font = `normal bold ${fontSize * 2}px ${WHEEL_FONT}, Helvetica, Arial`;
    const width = Math.max(...labels.map((l) => ctx.measureText(l).width));
    const inner = WHEEL_RADIUS - WHEEL_MARGIN - width; // đầu chữ phía tâm

    if (inner >= WHEEL_HUB && fontSize * 2 <= inner * arc * 0.85) {
      const center = WHEEL_RADIUS - WHEEL_MARGIN - width / 2;
      return {
        fontSize,
        textDistance: Math.round((center / WHEEL_RADIUS) * 100),
      };
    }
  }
  return fallback;
};

/* "Vân tay" của một danh sách tham gia. Kết quả đã quay chỉ có ý nghĩa với đúng
   danh sách sinh ra nó — đổi file Excel thì vân tay đổi và kết quả cũ bị bỏ. */
const rosterKeyOf = (list = []) =>
  list.length + "|" + list.map((p) => p.code + "\t" + p.name).join("\n");

const splitLabel = (label = "") => {
  const [en, vi = ""] = label.split("(");
  return { en: en.trim(), vi: vi.replace(")", "").trim() };
};

const parseEmployees = (buffer) => {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(sheet);

  return withAutoCode(
    jsonData.map((row) => ({
      code: String(
        row.code || row.Code || row["Mã nhân viên"] || row["ID"] || ""
      ).trim(),
      name: String(row.name || row.Name || row["Họ tên"] || "").trim(),
    }))
  );
};

const LuckyDrawWheel = () => {
  const [fullData, setFullData] = useState([]);
  const [displayData, setDisplayData] = useState([]);
  const [spinPool, setSpinPool] = useState([]); // toàn bộ người để quay

  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const pendingWinner = useRef(null);

  const [winner, setWinner] = useState(null);
  const [winnerPrizeKey, setWinnerPrizeKey] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [toast, setToast] = useState(null);

  const [winnersByPrize, setWinnersByPrize] = useState({});
  const [currentPrizeIndex, setCurrentPrizeIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Bảng cấu hình ẩn (Ctrl + Shift + K): người tham gia / cơ cấu giải / đặt sẵn
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminTab, setAdminTab] = useState("people");
  const [config, setConfig] = useState(loadConfig);
  const [pasteText, setPasteText] = useState("");
  const [rosterSearch, setRosterSearch] = useState("");
  const [rosterName, setRosterName] = useState("employees.xlsx");
  const [rosterKey, setRosterKey] = useState("");
  // Đo chữ trước khi font Barlow tải xong sẽ lệch → đo lại khi font sẵn sàng
  const [fontsReady, setFontsReady] = useState(false);
  const [fixedText, setFixedText] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(FIXED_KEY)) || {};
    } catch {
      return {};
    }
  });

  const spinAudio = useRef(new Audio("sound2.mp3"));
  const prizeCardRefs = useRef({});
  const resultListRef = useRef(null);

  const prizes = config.prizes;
  // Bảng kết quả & bảng đặt sẵn hiển thị từ giải cao xuống thấp
  const prizesTopDown = [...prizes].reverse();
  const prizeColor = (key) => {
    if (PRIZE_COLOR[key]) return PRIZE_COLOR[key];
    const i = prizesTopDown.findIndex((p) => p.key === key);
    return PRIZE_PALETTE[(i < 0 ? 0 : i) % PRIZE_PALETTE.length];
  };

  // Nạp danh sách tham gia (từ Excel hoặc dán tay) và dựng lại vòng quay
  const applyRoster = (list) => {
    setFullData(list);
    setSpinPool(list);
    setRosterKey(rosterKeyOf(list));

    // 🔹 RANDOM N người để HIỂN THỊ trên vòng quay
    const shuffled = [...list].sort(() => Math.random() - 0.5);
    setDisplayData(shuffled.slice(0, config.displayCount));
  };

  const loadEmployees = () =>
    fetch("/employees.xlsx")
      .then((res) => res.arrayBuffer())
      .then((buffer) => {
        applyRoster(parseEmployees(buffer));
        setRosterName("employees.xlsx");
      });

  useEffect(() => {
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => setFontsReady(true));
    } else {
      setFontsReady(true);
    }
  }, []);

  /* ===== LOAD EXCEL / LOCALSTORAGE ===== */
  useEffect(() => {
    const stored = localStorage.getItem("lucky-draw-state");

    if (!stored) {
      loadEmployees();
      return;
    }

    const s = JSON.parse(stored);
    const restore = () => {
      setFullData(s.fullData || []);
      setDisplayData(s.displayData || []);
      setSpinPool(s.spinPool || []);
      setWinnersByPrize(s.winnersByPrize || {});
      setCurrentPrizeIndex(s.currentPrizeIndex ?? 0);
      setHasStarted(s.hasStarted || false);
      setIsFinished(s.isFinished || false);
      setRosterName(s.rosterName || "employees.xlsx");
      setRosterKey(s.rosterKey || "");
    };

    // Danh sách nạp tay từ bảng thiết lập → không đụng tới, giữ nguyên
    if ((s.rosterName || "employees.xlsx") !== "employees.xlsx") {
      restore();
      return;
    }

    /* Đối chiếu danh sách đã lưu với file employees.xlsx hiện tại:
       - giống nhau  → khôi phục kết quả (lỡ F5 giữa sự kiện không mất gì)
       - đã đổi file → kết quả cũ thuộc danh sách cũ nên bỏ, quay lại từ đầu */
    fetch("/employees.xlsx")
      .then((res) => res.arrayBuffer())
      .then((buffer) => {
        const list = parseEmployees(buffer);
        if (rosterKeyOf(list) === s.rosterKey) {
          restore();
          return;
        }
        clearResults();
        applyRoster(list);
        setRosterName("employees.xlsx");
        showToast(`📋 employees.xlsx đã đổi → nạp lại ${list.length} người`);
      })
      .catch(restore); // đọc file lỗi → dùng lại danh sách đã lưu
  }, []);

  const currentPrize = prizes[currentPrizeIndex];
  const currentLabel = splitLabel(currentPrize?.label);
  const currentAwarded = winnersByPrize[currentPrize?.key]?.length || 0;
  const totalWinners = Object.values(winnersByPrize).reduce(
    (sum, list) => sum + list.length,
    0
  );

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  /* ===== CONFETTI POPUP ===== */
  useEffect(() => {
    if (!showPopup) return;

    const colors = ["#e6cb7a", "#cf8b2c", "#ffffff", "#406ab3"];
    const end = Date.now() + 2200;
    const fire = () => {
      confetti({
        particleCount: 6,
        angle: 60,
        spread: 70,
        startVelocity: 60,
        origin: { x: 0, y: 0.75 },
        colors,
        zIndex: 9999,
      });
      confetti({
        particleCount: 6,
        angle: 120,
        spread: 70,
        startVelocity: 60,
        origin: { x: 1, y: 0.75 },
        colors,
        zIndex: 9999,
      });
      if (Date.now() < end) requestAnimationFrame(fire);
    };
    confetti({
      particleCount: 160,
      spread: 110,
      startVelocity: 48,
      origin: { x: 0.5, y: 0.55 },
      colors,
      zIndex: 9999,
    });
    fire();
  }, [showPopup]);

  /* ===== TỰ CUỘN TỚI GIẢI ĐANG QUAY =====
     Không dùng scrollIntoView: nó cuộn mọi khung cha cuộn được (cả trang), nên
     mỗi lượt quay là bảng kết quả lại giật lung tung. Ở đây chỉ cuộn đúng khung
     danh sách, và chỉ khi thẻ giải hiện tại đang nằm ngoài tầm nhìn. */
  useEffect(() => {
    /* Đợi dòng mới chạy xong animation rồi mới đo: đo ngay lúc này thì thẻ
       chưa giãn hết, phần tử vẫn "nằm trong tầm nhìn" và sẽ không cuộn gì. */
    const timer = setTimeout(() => {
      const wrap = resultListRef.current;
      const card = prizeCardRefs.current[currentPrize?.key];
      if (!wrap || !card) return;

      // Ưu tiên đưa dòng người vừa trúng vào tầm nhìn; chưa có ai thì cả thẻ
      const el = card.querySelector(".winner-list li.is-new") || card;

      const wrapBox = wrap.getBoundingClientRect();
      const elBox = el.getBoundingClientRect();
      if (elBox.top >= wrapBox.top && elBox.bottom <= wrapBox.bottom) return;

      const delta =
        elBox.top < wrapBox.top
          ? elBox.top - wrapBox.top - 12 // nằm phía trên → kéo lên
          : Math.min(
              elBox.top - wrapBox.top - 12, // không kéo quá đầu phần tử
              elBox.bottom - wrapBox.bottom + 12 // nằm phía dưới → kéo vừa đủ
            );

      /* Phần cuộn mượt do CSS `scroll-behavior` lo (tham số behavior:"smooth"
         của scrollTo bị một số môi trường bỏ qua, khiến không cuộn gì cả). */
      wrap.scrollTop += delta;
    }, 550);

    return () => clearTimeout(timer);
  }, [currentPrize?.key, totalWinners]);

  /* ===== NGƯỜI TRÚNG ĐẶT SẴN =====
     Ưu tiên mã đã đặt cho giải hiện tại (nếu người đó còn trong pool),
     hết danh sách đặt sẵn thì quay ngẫu nhiên như bình thường. */
  const pickWinner = (prize) => {
    const tokens = parseCodes(fixedText[prize?.key]);
    const awarded = winnersByPrize[prize?.key] || [];

    for (const token of tokens) {
      if (awarded.some((w) => matchesPerson(w, token))) continue;
      const found = spinPool.find((p) => matchesPerson(p, token));
      if (found) return found;
    }
    return spinPool[Math.floor(Math.random() * spinPool.length)];
  };

  /* ===== CLICK SPIN ===== */
  const handleSpinClick = () => {
    if (mustSpin || spinPool.length === 0) return;
    // 🔒 ĐÃ QUAY XONG TOÀN BỘ
    if (isFinished) {
      showToast("🎉 All prizes have been drawn!");
      return;
    }

    setHasStarted(true);

    // 🎯 Chọn người trúng từ pool, đảm bảo vòng quay dừng đúng ô của người đó
    const picked = pickWinner(prizes[currentPrizeIndex]);
    let index = displayData.findIndex((p) => p.code === picked.code);
    if (index === -1) {
      index = Math.floor(Math.random() * Math.max(displayData.length, 1));
      setDisplayData((prev) => {
        const next = [...prev];
        next[index] = picked;
        return next;
      });
    }

    pendingWinner.current = picked;
    setPrizeNumber(index);
    setMustSpin(true);
    setShowPopup(false);

    spinAudio.current.currentTime = 0;
    spinAudio.current.play();
  };

  const handleStopSpinning = () => {
    setMustSpin(false);
    spinAudio.current.pause();
    spinAudio.current.currentTime = 0;

    const prize = prizes[currentPrizeIndex];
    const winnerItem = pendingWinner.current;
    pendingWinner.current = null;
    if (!winnerItem || !prize) return;

    setWinner(winnerItem);
    setWinnerPrizeKey(prize.key);
    setShowPopup(true);

    // 🎉 LƯU NGƯỜI TRÚNG THEO GIẢI
    setWinnersByPrize((prev) => ({
      ...prev,
      [prize.key]: [...(prev[prize.key] || []), winnerItem],
    }));

    /* ❌ LOẠI NGƯỜI TRÚNG KHỎI POOL QUAY VÀ KHỎI VÒNG QUAY.
       fullData giữ nguyên: đó là danh sách gốc trong file, dùng để liệt kê
       trong bảng thiết lập (người đã trúng hiện mờ kèm tên giải). */
    const notWinner = (p) => p.code !== winnerItem.code;
    setSpinPool((prev) => prev.filter(notWinner));
    setDisplayData((prev) => prev.filter(notWinner));

    // 🎯 KIỂM TRA ĐÃ ĐỦ SỐ NGƯỜI CỦA GIẢI HIỆN TẠI CHƯA?
    const awarded = (winnersByPrize[prize.key]?.length || 0) + 1;
    if (awarded < prize.quantity) return;

    // 👉 Giải cuối trong cơ cấu → kết thúc, ngược lại → giải tiếp theo
    if (currentPrizeIndex >= prizes.length - 1) {
      setIsFinished(true);
    } else {
      setCurrentPrizeIndex((i) => i + 1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // 🔑 Phím tắt ẩn: mở bảng đặt sẵn người trúng
      if (e.ctrlKey && e.shiftKey && (e.key === "K" || e.key === "k")) {
        e.preventDefault();
        setShowAdmin((v) => !v);
        return;
      }
      if (e.key === "Escape") {
        setShowAdmin(false);
        setShowPopup(false);
        return;
      }
      // Đang gõ trong bảng đặt sẵn → không quay
      if (showAdmin || /^(INPUT|TEXTAREA)$/.test(e.target?.tagName)) return;

      // Space hoặc Enter
      if ((e.code === "Space" || e.code === "Enter") && !mustSpin) {
        e.preventDefault(); // chặn scroll / click nút đang focus
        handleSpinClick();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  /* ===== LƯU TRẠNG THÁI ===== */
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
      rosterName,
      rosterKey,
    };

    localStorage.setItem("lucky-draw-state", JSON.stringify(state));
  }, [
    fullData,
    displayData,
    spinPool,
    winnersByPrize,
    currentPrizeIndex,
    hasStarted,
    isFinished,
    rosterName,
    rosterKey,
  ]);

  const handleReset = (e) => {
    e.currentTarget.blur();
    if (!window.confirm("Bạn có chắc muốn RESET toàn bộ kết quả không?")) return;

    localStorage.removeItem("lucky-draw-state");
    loadEmployees();

    // Reset toàn bộ state
    setWinnersByPrize({});
    setCurrentPrizeIndex(0);
    setHasStarted(false);
    setIsFinished(false);
    setWinner(null);
    setShowPopup(false);
    setMustSpin(false);

    showToast("🔄 Reset thành công!");
  };

  /* ===== BẢNG CẤU HÌNH: NGƯỜI THAM GIA ===== */
  const clearResults = () => {
    localStorage.removeItem("lucky-draw-state");
    setWinnersByPrize({});
    setCurrentPrizeIndex(0);
    setHasStarted(false);
    setIsFinished(false);
    setWinner(null);
    setShowPopup(false);
    setMustSpin(false);
  };

  // Đổi danh sách / cơ cấu khi đã quay dở sẽ làm sai lệch kết quả → hỏi trước
  const confirmIfStarted = () =>
    !hasStarted ||
    window.confirm(
      "Đã quay một số giải. Thay đổi này sẽ xoá toàn bộ kết quả đã quay. Tiếp tục?"
    );

  const handleRosterFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !confirmIfStarted()) return;

    file.arrayBuffer().then((buffer) => {
      const list = parseEmployees(buffer);
      if (list.length === 0) {
        showToast("⚠️ Không đọc được cột họ tên trong file này");
        return;
      }
      clearResults();
      applyRoster(list);
      setRosterName(file.name);
      showToast(`✅ Đã nạp ${list.length} người từ ${file.name}`);
    });
  };

  const handlePasteRoster = () => {
    const list = parsePastedList(pasteText);
    if (list.length === 0) {
      showToast("⚠️ Mỗi dòng cần có ít nhất một họ tên");
      return;
    }
    if (!confirmIfStarted()) return;

    clearResults();
    applyRoster(list);
    setRosterName("danh sách dán tay");
    setPasteText("");
    showToast(`✅ Đã nạp ${list.length} người`);
  };

  /* ===== BẢNG CẤU HÌNH: CƠ CẤU GIẢI ===== */
  const saveConfig = (next) => {
    setConfig(next);
    localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
  };

  const updatePrizes = (nextPrizes) => {
    if (!confirmIfStarted()) return;
    if (hasStarted) clearResults();
    saveConfig({ ...config, prizes: nextPrizes });
  };

  const handlePrizeField = (index, field, value) => {
    const next = prizes.map((p, i) =>
      i === index
        ? {
            ...p,
            [field]:
              field === "quantity" ? Math.max(1, Number(value) || 1) : value,
          }
        : p
    );
    updatePrizes(next);
  };

  const movePrize = (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= prizes.length) return;
    const next = [...prizes];
    [next[index], next[target]] = [next[target], next[index]];
    updatePrizes(next);
  };

  const addPrize = () =>
    updatePrizes([
      ...prizes,
      { key: `prize-${Date.now()}`, label: "New Prize (Giải Mới)", quantity: 1 },
    ]);

  const removePrize = (index) => {
    if (prizes.length <= 1) return;
    updatePrizes(prizes.filter((_, i) => i !== index));
  };

  /* ===== BẢNG ĐẶT SẴN ===== */
  const handleFixedChange = (key, value) => {
    const next = { ...fixedText, [key]: value };
    setFixedText(next);
    localStorage.setItem(FIXED_KEY, JSON.stringify(next));
  };

  // Tra cứu mã đã nhập trong bảng đặt sẵn để báo đúng/sai ngay khi gõ
  const lookupCode = (code, prizeKey) => {
    const inPool = spinPool.find((p) => matchesPerson(p, code));
    if (inPool) return { status: "ok", name: inPool.name };

    const drawnEntry = Object.entries(winnersByPrize).find(([, list]) =>
      list.some((w) => matchesPerson(w, code))
    );
    if (drawnEntry) {
      const prize = prizes.find((p) => p.key === drawnEntry[0]);
      const name = drawnEntry[1].find((w) => matchesPerson(w, code))?.name;
      return {
        status: drawnEntry[0] === prizeKey ? "done" : "taken",
        name,
        prize: splitLabel(prize?.label).en,
      };
    }
    return { status: "missing" };
  };

  // Danh sách không có mã → hiển thị luôn họ tên trên ô vòng quay
  const wheelData = displayData.map((i) => ({
    option: i.autoCode ? i.name : i.code,
  }));

  /* Danh sách người tham gia cho bảng thiết lập: giữ nguyên thứ tự gốc trong
     file, kèm tên giải nếu người đó đã trúng. */
  const wonLabelOf = (person) => {
    for (const [key, list] of Object.entries(winnersByPrize)) {
      if (list.some((w) => String(w.code) === String(person.code))) {
        return splitLabel(prizes.find((p) => p.key === key)?.label).en || key;
      }
    }
    return null;
  };

  const visibleRoster = fullData
    .map((person, index) => ({ person, index, wonLabel: wonLabelOf(person) }))
    .filter(({ person }) => {
      const q = rosterSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        person.name.toLowerCase().includes(q) ||
        (!person.autoCode && String(person.code).toLowerCase().includes(q))
      );
    });

  // Cỡ chữ + vị trí chữ tính lại mỗi khi danh sách (hoặc font) đổi
  const wheelText = useMemo(
    () => fitWheelText(displayData.map((p) => (p.autoCode ? p.name : p.code))),
    [displayData, fontsReady] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const hubColor = isFinished
    ? PRIZE_COLOR.special
    : prizeColor(currentPrize?.key);
  const lastWinnerCode = winner?.code;
  const popupLabel = splitLabel(
    prizes.find((p) => p.key === winnerPrizeKey)?.label
  );

  return (
    <>
      <div className="blur-overlay"></div>

      <div className="main-container">
        <div className="lucky-draw-layout">
          {/* ================= WHEEL ================= */}
          <div
            className={`wheel-stage ${mustSpin ? "spinning" : ""} ${
              isFinished ? "finished" : ""
            }`}
            style={{ "--prize": hubColor }}
            onClick={handleSpinClick}
            role="button"
            aria-label="Spin the wheel"
          >
            <div className="wheel-halo" />
            <div className="wheel-rim">
              {Array.from({ length: BULB_COUNT }).map((_, i) => (
                <span
                  key={i}
                  className={`wheel-bulb ${i % 2 ? "odd" : ""}`}
                  style={{ "--angle": `${(360 / BULB_COUNT) * i}deg` }}
                />
              ))}
            </div>

            <div className="wheel-canvas">
              {wheelData.length > 0 ? (
                <Wheel
                  mustStartSpinning={mustSpin}
                  prizeNumber={prizeNumber}
                  data={wheelData}
                  backgroundColors={WHEEL_COLORS}
                  textColors={WHEEL_TEXT_COLORS}
                  fontFamily={WHEEL_FONT}
                  fontWeight="bold"
                  textDistance={wheelText.textDistance}
                  fontSize={wheelText.fontSize}
                  radiusLineWidth={0}
                  outerBorderWidth={1}
                  outerBorderColor="#f5c451"
                  spinDuration={1.3}
                  pointerProps={{
                    src: POINTER_SRC,
                    style: {
                      left: "82.2%",
                      top: "8.2%",
                      right: "auto",
                      width: "11%",
                      zIndex: 20,
                    },
                  }}
                  onStopSpinning={handleStopSpinning}
                />
              ) : (
                <p className="loading-text">
                  <span className="spinner" /> Loading participants…
                </p>
              )}
            </div>

            {/* ===== CENTER HUB ===== */}
            <div className="wheel-hub">
              <div className="wheel-hub-inner">
                {!hasStarted ? (
                  <img src="/brand/logo-htit.png" alt="HTIT" className="wheel-hub-logo" />
                ) : isFinished || !currentPrize ? (
                  <div className="wheel-hub-prize" key="done">
                    <div className="hub-eyebrow">Lucky Draw</div>
                    <div className="hub-en">Completed</div>
                    <div className="hub-vi">Hoàn thành</div>
                  </div>
                ) : (
                  <div className="wheel-hub-prize" key={currentPrize.key}>
                    <div className="hub-eyebrow">Now drawing</div>
                    <div className="hub-en">{currentLabel.en}</div>
                    <div className="hub-vi">{currentLabel.vi}</div>
                    <div className="hub-count">
                      {currentAwarded}/{currentPrize.quantity}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ================= RESULT ================= */}
          <aside className="result-panel">
            <header className="result-header">
              <div>
                <img
                  src="/brand/logo-htit-white.png"
                  alt="Haiphong Port TIL"
                  className="result-logo"
                />
                <div className="result-eyebrow">Year End Voyage 2025</div>
                <h3>Lucky Draw Results</h3>
              </div>
              <button
                className="reset-btn"
                onClick={handleReset}
                title="Reset toàn bộ kết quả"
                aria-label="Reset"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                  <path
                    d="M4 12a8 8 0 1 0 2.34-5.66M4 4v4h4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </header>

            <div className="result-stats">
              <div className="stat">
                <span className="stat-label">Drawn</span>
                <span className="stat-value">{totalWinners}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Remaining</span>
                <span className="stat-value">{spinPool.length}</span>
              </div>
              <div className="stat stat-wide" style={{ "--prize": hubColor }}>
                <span className="stat-label">Now drawing</span>
                <span className="stat-value stat-prize">
                  {isFinished ? "Completed" : currentLabel.en || "—"}
                </span>
              </div>
            </div>

            <div className="result-list" ref={resultListRef}>
              {prizesTopDown.map((p) => {
                const label = splitLabel(p.label);
                const list = winnersByPrize[p.key] || [];
                const isActive = !isFinished && currentPrize?.key === p.key;

                return (
                  <section
                    key={p.key}
                    ref={(el) => (prizeCardRefs.current[p.key] = el)}
                    className={`prize-card ${isActive ? "active" : ""}`}
                    style={{ "--prize": prizeColor(p.key) }}
                  >
                    <div className="prize-card-head">
                      <span className="prize-dot" />
                      <div className="prize-title">
                        <div className="prize-en">{label.en}</div>
                        <div className="prize-vi">{label.vi}</div>
                      </div>
                      <span className="prize-badge">
                        {list.length}/{p.quantity}
                      </span>
                    </div>
                    <div className="prize-progress">
                      <span
                        style={{
                          width: `${(list.length / p.quantity) * 100}%`,
                        }}
                      />
                    </div>

                    {list.length === 0 ? (
                      <p className="empty-text">No winners yet</p>
                    ) : (
                      <ol className="winner-list">
                        {list.map((w, i) => (
                          <li
                            key={w.code}
                            className={
                              w.code === lastWinnerCode ? "is-new" : ""
                            }
                          >
                            <span className="winner-idx">{i + 1}</span>
                            {!w.autoCode && (
                              <span className="winner-code">{w.code}</span>
                            )}
                            <span className="winner-name">{w.name}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>
                );
              })}
            </div>

            <footer className="result-hint">
              Press <kbd>Space</kbd> / <kbd>Enter</kbd> or click the wheel to
              spin
            </footer>
          </aside>
        </div>
      </div>

      {/* ================= POPUP ================= */}
      {showPopup && winner && (
        <div className="popup-overlay" onClick={() => setShowPopup(false)}>
          <div
            className="popup"
            style={{ "--prize": prizeColor(winnerPrizeKey) }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="popup-rays" />
            <div className="popup-eyebrow">🎉 Congratulations · Chúc mừng 🎉</div>
            <div className="popup-prize">
              {popupLabel.en}
              {popupLabel.vi && <span> · {popupLabel.vi}</span>}
            </div>
            <p className="popup-winner">{winner.name}</p>
            {!winner.autoCode && (
              <div className="popup-code">{winner.code}</div>
            )}
            <div className="popup-hint">
              Press <kbd>Space</kbd> to spin again · <kbd>Esc</kbd> to close
            </div>
          </div>
        </div>
      )}

      {/* ========= BẢNG CẤU HÌNH ẨN (Ctrl + Shift + K) ========= */}
      {showAdmin && (
        <div className="admin-overlay" onClick={() => setShowAdmin(false)}>
          <div className="admin-panel" onClick={(e) => e.stopPropagation()}>
            <header className="admin-head">
              <div>
                <h4>Thiết lập quay thưởng</h4>
                <nav className="admin-tabs">
                  {[
                    ["people", `Người tham gia (${spinPool.length})`],
                    ["prizes", `Cơ cấu giải (${prizes.length})`],
                    ["fixed", "Đặt sẵn người trúng"],
                  ].map(([id, text]) => (
                    <button
                      key={id}
                      className={adminTab === id ? "active" : ""}
                      onClick={() => setAdminTab(id)}
                    >
                      {text}
                    </button>
                  ))}
                </nav>
              </div>
              <button
                className="admin-close"
                onClick={() => setShowAdmin(false)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </header>

            {/* ---------- TAB: NGƯỜI THAM GIA ---------- */}
            {adminTab === "people" && (
              <div className="admin-grid">
                <p className="admin-note">
                  Danh sách hiện tại: <b>{spinPool.length}</b> người còn trong
                  vòng quay / <b>{totalWinners}</b> đã trúng · nguồn:{" "}
                  <b>{rosterName}</b>
                </p>

                <div className="admin-item">
                  <label>
                    <span className="admin-item-title">
                      Danh sách người tham gia ({fullData.length})
                    </span>
                    <span className="admin-item-sub">
                      Người đã trúng bị mờ đi kèm tên giải, không quay lại nữa
                    </span>
                  </label>
                  <input
                    className="roster-search"
                    value={rosterSearch}
                    placeholder="Tìm theo tên hoặc mã…"
                    onChange={(e) => setRosterSearch(e.target.value)}
                  />
                  {visibleRoster.length === 0 ? (
                    <p className="empty-text">Không tìm thấy ai</p>
                  ) : (
                    <ol className="roster-list">
                      {visibleRoster.map(({ person, index, wonLabel }) => (
                        <li
                          key={person.code}
                          className={wonLabel ? "is-won" : ""}
                        >
                          <span className="roster-idx">{index + 1}</span>
                          {!person.autoCode && (
                            <span className="roster-code">{person.code}</span>
                          )}
                          <span className="roster-name">{person.name}</span>
                          {wonLabel && (
                            <span className="roster-prize">{wonLabel}</span>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>

                <div className="admin-item">
                  <label>
                    <span className="admin-item-title">Nạp từ file Excel</span>
                    <span className="admin-item-sub">
                      Cột tên: name / Họ tên (bắt buộc) · cột mã: code / Mã
                      nhân viên / ID (có thể bỏ trống)
                    </span>
                  </label>
                  <div className="admin-row">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleRosterFile}
                    />
                    <button className="admin-btn" onClick={loadEmployees}>
                      Dùng lại employees.xlsx
                    </button>
                  </div>
                </div>

                <div className="admin-item">
                  <label>
                    <span className="admin-item-title">Hoặc dán danh sách</span>
                    <span className="admin-item-sub">
                      Mỗi dòng một họ tên, hoặc "mã, họ tên" nếu có mã
                    </span>
                  </label>
                  <textarea
                    rows={5}
                    value={pasteText}
                    placeholder={"Lê Thu Hạnh\nNguyễn Việt Anh\n2501002, Kay Chen"}
                    onChange={(e) => setPasteText(e.target.value)}
                  />
                  <div className="admin-row">
                    <span className="admin-item-sub">
                      Đọc được {parsePastedList(pasteText).length} dòng hợp lệ
                    </span>
                    <button className="admin-btn" onClick={handlePasteRoster}>
                      Áp dụng danh sách dán
                    </button>
                  </div>
                </div>

                <div className="admin-item">
                  <label>
                    <span className="admin-item-title">Số ô trên vòng quay</span>
                    <span className="admin-item-sub">
                      Lấy ngẫu nhiên bấy nhiêu người để vẽ vòng quay cho dễ nhìn
                      (người trúng luôn được đưa vào ô dừng)
                    </span>
                  </label>
                  <div className="admin-row">
                    <input
                      type="number"
                      min={10}
                      max={300}
                      value={config.displayCount}
                      onChange={(e) =>
                        saveConfig({
                          ...config,
                          displayCount: Math.min(
                            300,
                            Math.max(10, Number(e.target.value) || 10)
                          ),
                        })
                      }
                    />
                    <span className="admin-item-sub">
                      Áp dụng khi nạp lại danh sách hoặc bấm reset kết quả
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ---------- TAB: CƠ CẤU GIẢI ---------- */}
            {adminTab === "prizes" && (
              <div className="admin-grid">
                <p className="admin-note">
                  Thứ tự dưới đây là thứ tự quay, từ trên xuống. Tên giải dạng{" "}
                  <b>Tiếng Anh (Tiếng Việt)</b>. Tổng số giải:{" "}
                  <b>{prizes.reduce((s, p) => s + p.quantity, 0)}</b> /{" "}
                  {spinPool.length + totalWinners} người.
                </p>

                {prizes.map((p, i) => (
                  <div
                    key={p.key}
                    className="admin-item"
                    style={{ "--prize": prizeColor(p.key) }}
                  >
                    <div className="admin-row">
                      <span className="admin-item-title">#{i + 1}</span>
                      <input
                        className="admin-grow"
                        value={p.label}
                        onChange={(e) =>
                          handlePrizeField(i, "label", e.target.value)
                        }
                      />
                      <input
                        type="number"
                        min={1}
                        value={p.quantity}
                        onChange={(e) =>
                          handlePrizeField(i, "quantity", e.target.value)
                        }
                      />
                      <button
                        className="admin-btn"
                        onClick={() => movePrize(i, -1)}
                        disabled={i === 0}
                        title="Quay sớm hơn"
                      >
                        ↑
                      </button>
                      <button
                        className="admin-btn"
                        onClick={() => movePrize(i, 1)}
                        disabled={i === prizes.length - 1}
                        title="Quay muộn hơn"
                      >
                        ↓
                      </button>
                      <button
                        className="admin-btn danger"
                        onClick={() => removePrize(i)}
                        disabled={prizes.length <= 1}
                        title="Xoá giải"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}

                <div className="admin-row">
                  <button className="admin-btn" onClick={addPrize}>
                    + Thêm giải
                  </button>
                  <button
                    className="admin-btn"
                    onClick={() => updatePrizes(DEFAULT_PRIZES)}
                  >
                    Khôi phục mặc định
                  </button>
                </div>
              </div>
            )}

            {/* ---------- TAB: ĐẶT SẴN NGƯỜI TRÚNG ---------- */}
            {adminTab === "fixed" && (
            <div className="admin-grid">
              <p className="admin-note">
                Mỗi dòng một <b>họ tên</b> (hoặc mã nhân viên nếu danh sách có
                mã). Quay tới giải nào sẽ lấy lần lượt các dòng của giải đó, hết
                thì quay ngẫu nhiên. Lưu tự động trên máy này.
              </p>
              {prizesTopDown.map((p) => {
                const key = p.key;
                const label = splitLabel(p.label);
                const codes = parseCodes(fixedText[key]);

                return (
                  <div
                    key={key}
                    className="admin-item"
                    style={{ "--prize": prizeColor(key) }}
                  >
                    <label>
                      <span className="admin-item-title">{label.en}</span>
                      <span className="admin-item-sub">{label.vi}</span>
                      <span
                        className={`admin-item-count ${
                          codes.length > p.quantity ? "over" : ""
                        }`}
                      >
                        {codes.length}/{p.quantity}
                      </span>
                    </label>
                    <textarea
                      rows={key === "bonus" ? 4 : 2}
                      value={fixedText[key] || ""}
                      placeholder={"Nguyễn Trí Cường\nKay Chen"}
                      onChange={(e) => handleFixedChange(key, e.target.value)}
                    />
                    <div className="admin-codes">
                      {codes.map((code, i) => {
                        const info = lookupCode(code, key);
                        const extra = i >= p.quantity;
                        return (
                          <span
                            key={`${code}-${i}`}
                            className={`admin-chip ${info.status} ${
                              extra ? "extra" : ""
                            }`}
                            title={
                              info.status === "missing"
                                ? "Không có trong danh sách còn lại"
                                : info.status === "taken"
                                ? `Đã trúng ${info.prize}`
                                : extra
                                ? "Vượt số lượng giải, sẽ bị bỏ qua"
                                : info.name
                            }
                          >
                            {code} ·{" "}
                            {info.status === "missing"
                              ? "không tìm thấy"
                              : info.name}
                            {info.status === "taken" && " (đã trúng giải khác)"}
                            {info.status === "done" && " ✓"}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            )}

            <footer className="admin-foot">
              <span>
                <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>K</kbd> để mở/đóng ·{" "}
                <kbd>Esc</kbd> để đóng
              </span>
              {adminTab === "fixed" && (
                <button
                  className="admin-clear"
                  onClick={() => {
                    if (!window.confirm("Xoá toàn bộ danh sách đặt sẵn?"))
                      return;
                    setFixedText({});
                    localStorage.removeItem(FIXED_KEY);
                  }}
                >
                  Xoá danh sách đặt sẵn
                </button>
              )}
            </footer>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
};

export default LuckyDrawWheel;
