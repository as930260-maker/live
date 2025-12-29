/* =========================================================
   人生模擬器（V4 可玩版）
   - 狀態（玩家數值）都集中在 p 物件
   - UI 更新集中在 render()
   - 行動按鈕走 handleAction()
   - 每月結算走 nextMonth()
   - 存檔用 localStorage
   ========================================================= */
import { childhoodEvents } from "./events/childhood.js";
import { studentEvents } from "./events/student.js";
import { adultEvents } from "./events/adult.js";

const $ = (id) => document.getElementById(id);

/** localStorage key（存檔用） */
const SAVE_KEY = "life_sim_v4_save";

/** 玩家狀態（核心） */
let p = null;

/** 畫面初始化：綁定所有按鈕事件 */
function bindUI() {
  $("newGameBtn").addEventListener("click", newGame);
  $("continueBtn").addEventListener("click", continueGame);

  $("saveBtn").addEventListener("click", saveGame);
  $("resetBtn").addEventListener("click", hardReset);

  $("backBtn").addEventListener("click", () => showScreen("start"));
  $("nextMonthBtn").addEventListener("click", nextMonth);

  $("clearLogBtn").addEventListener("click", () => {
    $("log").innerHTML = "";
    log("🧹 已清空紀錄。");
  });

  // 行動按鈕（用 data-action 集中處理）
  document.querySelectorAll(".action").forEach((btn) => {
    btn.addEventListener("click", () => handleAction(btn.dataset.action));
  });

  // GM 彈窗
  $("gmHelpBtn").addEventListener("click", () => {
    $("gmDialog").showModal();
    $("gmInput").value = "";
    $("gmInput").focus();
  });

  $("gmRunBtn").addEventListener("click", (e) => {
    e.preventDefault();
    runGMCommand($("gmInput").value.trim());
  });
}

/** 建立新玩家（V4 欄位） */
function createNewPlayer(name, gender) {
  return {
    name: name || "無名氏",
    gender,
    age: 0,              // 年紀（歲）
    month: 1,            // 月份（1~12）
    city: "台北",
    job: "學生",
    status: "起步中",

    // V4 核心數值
    wealth: 0,
    health: 80,
    stamina: 80,
    intelligence: 10,
    charm: 10,
    sensibility: 10,
    kindness: 10,
    luck: 10,

    // V4 進度 / 關係
    schoolProgress: 0,   // 0/5
    examProgress: 0,     // 0/10
    familyFavor: 50,     // 0~100

    // 用來做「每月事件」與「年齡分段事件」記錄
    flags: {
      didMonthlyEvent: false,
    },
  };
}

/** 顯示畫面 */
function showScreen(which) {
  const start = $("startScreen");
  const game = $("gameScreen");
  if (which === "start") {
    start.classList.remove("hidden");
    game.classList.add("hidden");
  } else {
    start.classList.add("hidden");
    game.classList.remove("hidden");
  }
}

/** UI 渲染：把 p 的值填進畫面 */
function render() {
  if (!p) return;

  // Topbar
  $("titleName").textContent = p.name;
  $("titleAge").textContent = `${p.age} 歲（${p.month} 月）`;

  // 玩家資訊
  $("uiName").textContent = p.name;
  $("uiAge").textContent = `${p.age} 歲（${p.month} 月）`;
  $("uiGender").textContent = p.gender;
  $("uiCity").textContent = p.city;
  $("uiJob").textContent = p.job;
  $("uiStatus").textContent = p.status;

  // 關係與進度
  $("uiFamily").textContent = p.familyFavor;
  $("uiSchool").textContent = p.schoolProgress;
  $("uiExam").textContent = p.examProgress;

  // 核心數值
  $("uiWealth").textContent = p.wealth;
  $("uiHealth").textContent = p.health;
  $("uiStamina").textContent = p.stamina;
  $("uiInt").textContent = p.intelligence;
  $("uiCharm").textContent = p.charm;
  $("uiSens").textContent = p.sensibility;
  $("uiKind").textContent = p.kindness;
  $("uiLuck").textContent = p.luck;
}

/** 日誌輸出 */
function log(text) {
  const time = new Date().toLocaleString("zh-TW", { hour12: false });
  const item = document.createElement("div");
  item.className = "item";
  item.innerHTML = `<div class="meta">${time}</div><div>${escapeHTML(text)}</div>`;
  $("log").prepend(item);
}

/** 避免日誌插入 HTML 造成問題 */
function escapeHTML(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** 產生整數亂數（含頭含尾） */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 限制數值範圍 */
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/** 新人生 */
function newGame() {
  const name = $("nameInput").value.trim();
  const gender = document.querySelector('input[name="gender"]:checked')?.value ?? "其他";

  p = createNewPlayer(name, gender);
  showScreen("game");
  render();

  log(`🆕 開始新人生：${p.name}（${p.gender}）`);
  log("📌 你可以先按『上課/打工/休息』，再按『下個月』結算。");
  saveGame(true); // 自動存一次（靜默）
}

/** 繼續進度 */
function continueGame() {
  const saved = loadGame();
  if (!saved) {
    alert("找不到存檔！請先開始新人生。");
    return;
  }
  p = saved;
  showScreen("game");
  render();
  log(`📂 已讀取存檔：${p.name}（${p.age} 歲）`);
}

/** 存檔 */
function saveGame(silent = false) {
  if (!p) return;
  localStorage.setItem(SAVE_KEY, JSON.stringify(p));
  if (!silent) log("💾 已存檔。");
}

/** 讀檔 */
function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    // 基本防呆：確認必要欄位存在
    if (!obj || typeof obj !== "object" || !("name" in obj) || !("wealth" in obj)) return null;
    return obj;
  } catch {
    return null;
  }
}

/** 重置（刪掉存檔 + 回開始畫面） */
function hardReset() {
  const ok = confirm("確定要重置？會刪除本機存檔。");
  if (!ok) return;
  localStorage.removeItem(SAVE_KEY);
  p = null;
  showScreen("start");
}

/** 行動系統（V4：這個月做什麼） */
function handleAction(action) {
  if (!p) return;

  switch (action) {
    case "study": {
      // 上課：智力+、體力-，上課進度+1（最多 5）
      if (p.schoolProgress >= 5) {
        log("📚 上課進度已滿（5/5）。你可以按『下個月』或去做別的事。");
        break;
      }
      p.schoolProgress += 1;
      p.intelligence += randInt(1, 3);
      p.stamina -= randInt(2, 5);
      p.status = "努力學習中";
      log("📚 你去上課了。智力提升，體力下降。");
      break;
    }

    case "work": {
      // 打工：財富+、體力-，魅力小幅+（社會歷練）
      const earn = randInt(50, 200);
      p.wealth += earn;
      p.stamina -= randInt(3, 7);
      if (Math.random() < 0.35) p.charm += 1;
      p.status = "打工賺錢中";
      log(`🧰 你去打工，賺到 ${earn} 財富。`);
      break;
    }

    case "rest": {
      // 休息：健康+、體力+（上限 100）
      p.health += randInt(2, 6);
      p.stamina += randInt(6, 12);
      p.status = "休息恢復中";
      log("🛌 你好好休息了一下，健康與體力回升。");
      break;
    }

    case "family": {
      // 陪家人：爸媽好感+、善良+，財富小-（花錢）
      p.familyFavor += randInt(2, 6);
      p.kindness += randInt(1, 2);
      p.wealth -= randInt(10, 40);
      p.status = "陪伴家人";
      log("🏠 你花時間陪家人，關係變好，也更懂得體貼。");
      break;
    }

    case "social": {
      // 社交：魅力+、感性+，幸運小幅波動
      p.charm += randInt(1, 3);
      p.sensibility += randInt(1, 2);
      if (Math.random() < 0.4) p.luck += 1;
      p.status = "社交中";
      log("🧑‍🤝‍🧑 你去社交了，魅力提升，心也更敏感。");
      break;
    }

    case "random": {
      runMonthlyRandomEvent();
      break;
    }

    default:
      log(`（未知行動：${action}）`);
  }

  normalize();
  render();
}

/** 每月隨機事件（手動觸發） */
function runMonthlyRandomEvent() {
  if (!p) return;

  // 一個非常簡單的事件池（之後你要分年齡段就加在這裡）
  const pool = [
    () => { p.wealth += 80; log("🍀 你撿到一點小財：財富 +80"); },
    () => { p.health -= 5; log("🤧 你小感冒了：健康 -5"); },
    () => { p.luck += 2; log("🎲 今天運氣不錯：幸運 +2"); },
    () => { p.familyFavor += 4; log("👨‍👩‍👧 爸媽稱讚你：爸媽好感 +4"); },
    () => { p.stamina += 8; log("☕ 你喝了杯提神的：體力 +8"); },
  ];

  pool[randInt(0, pool.length - 1)]();
  p.status = "遭遇事件";
  normalize();
  render();
}

/** 下個月（V4 的「下個月」按鈕） */
function nextMonth() {
  if (!p) return;

  // 每月自然消耗 / 成長（你可以再調）
  p.stamina -= randInt(1, 3);
  if (p.stamina < 20 && Math.random() < 0.5) p.health -= 1;

  // 月份推進
  p.month += 1;
  p.flags.didMonthlyEvent = false;

  // 生日：12 月過完 -> 年齡+1
  if (p.month > 12) {
    p.month = 1;
    p.age += 1;
    log(`🎂 生日到了：你變成 ${p.age} 歲！`);
  }

  // 每月結算：示範「抽考系統」
  maybeRunExam();

  // 每月自動觸發一個「年齡分段事件（示範）」
  runAgeSegmentEvent();

  // 月末整理（進度重置的一部分）
  if (p.schoolProgress >= 5) {
    // 上課滿了就讓你下個月重置，當作一個週期
    p.schoolProgress = 0;
    log("📘 上課週期完成：上課進度已重置（0/5）。");
  }

  normalize();
  render();
  saveGame(true); // 靜默自動存檔
  log("📅 新的一個月開始了。");
}

/** 抽考系統（V4：隨堂抽考 1/10） */
function maybeRunExam() {
  if (!p) return;

  // 只有「有上過課」的月份，比較容易觸發抽考
  const baseChance = 0.15;
  const bonus = p.schoolProgress > 0 ? 0.25 : 0;
  const chance = baseChance + bonus;

  if (p.examProgress >= 10) return;

  if (Math.random() < chance) {
    p.examProgress += 1;

    // 成績與智力相關
    const score = clamp(randInt(40, 85) + Math.floor(p.intelligence / 3), 0, 100);
    if (score >= 80) {
      p.intelligence += 2;
      p.wealth += 30;
      log(`📝 抽考（${p.examProgress}/10）：你考得很好（${score} 分）！智力 +2、財富 +30`);
    } else if (score >= 60) {
      p.intelligence += 1;
      log(`📝 抽考（${p.examProgress}/10）：普通（${score} 分）。智力 +1`);
    } else {
      p.stamina -= 3;
      log(`📝 抽考（${p.examProgress}/10）：有點慘（${score} 分）。體力 -3（心累）`);
    }
  }
}

/** 年齡分段事件（示範版） */
function runAgeSegmentEvent() {
  let pool = [];

  if (p.age <= 6) pool = childhoodEvents;
  else if (p.age <= 18) pool = studentEvents;
  else pool = adultEvents;

  for (const evt of pool) {
    if (Math.random() < evt.chance) {
      evt.run(p, log);
      break; // 一個月只觸發一個
    }
  }
}

function runAgeSegmentEvent() {
  if (!p) return;

  // 你之後要的「每個年齡段事件不同」就是在這裡擴充：
  // - 幼年 0~6
  // - 學生 7~18
  // - 成人 19+
  if (p.age <= 6) {
    // 幼年
    if (Math.random() < 0.35) {
      p.sensibility += 1;
      log("🧸 幼年事件：你對世界充滿好奇，感性 +1");
    }
    p.job = "幼兒";
  } else if (p.age <= 18) {
    // 學生
    if (Math.random() < 0.35) {
      p.intelligence += 1;
      log("🎒 學生事件：你在學校學到新東西，智力 +1");
    }
    p.job = "學生";
  } else {
    // 成人
    if (Math.random() < 0.35) {
      const earn = randInt(80, 220);
      p.wealth += earn;
      log(`💼 成人事件：你有一筆額外收入，財富 +${earn}`);
    }
    p.job = "社會人士";
  }
}

/** 把數值拉回合理範圍（避免越界） */
function normalize() {
  p.health = clamp(p.health, 0, 100);
  p.stamina = clamp(p.stamina, 0, 100);
  p.familyFavor = clamp(p.familyFavor, 0, 100);

  // 其他數值先不設上限，你想要也可以加
  p.wealth = Math.max(0, p.wealth);
  p.intelligence = Math.max(0, p.intelligence);
  p.charm = Math.max(0, p.charm);
  p.sensibility = Math.max(0, p.sensibility);
  p.kindness = Math.max(0, p.kindness);
  p.luck = Math.max(0, p.luck);
}

/** GM 指令：簡單調參/觸發事件 */
function runGMCommand(cmd) {
  if (!cmd) return;

  // 指令：
  // set money 500
  // add luck 3
  // event
  const parts = cmd.split(/\s+/);
  const op = parts[0]?.toLowerCase();

  if (op === "event") {
    log("🧪 GM：強制觸發一個隨機事件");
    runMonthlyRandomEvent();
    $("gmDialog").close();
    return;
  }

  if ((op === "set" || op === "add") && parts.length >= 3) {
    const key = parts[1];
    const val = Number(parts[2]);
    if (Number.isNaN(val)) {
      alert("數值不是數字！");
      return;
    }

    const map = {
      money: "wealth",
      wealth: "wealth",
      hp: "health",
      health: "health",
      stamina: "stamina",
      int: "intelligence",
      charm: "charm",
      sens: "sensibility",
      kind: "kindness",
      luck: "luck",
      family: "familyFavor",
      school: "schoolProgress",
      exam: "examProgress",
      age: "age",
      month: "month",
    };

    const realKey = map[key];
    if (!realKey || !(realKey in p)) {
      alert("未知欄位！可用：money/health/stamina/int/charm/sens/kind/luck/family/school/exam/age/month");
      return;
    }

    if (op === "set") p[realKey] = val;
    else p[realKey] += val;

    normalize();
    render();
    log(`🧪 GM：${op} ${realKey} ${val}（目前 ${realKey}=${p[realKey]}）`);
    $("gmDialog").close();
    return;
  }

  alert("未知指令。例：set money 500 / add luck 3 / event");
}

/** 啟動 */
function boot() {
  bindUI();
  showScreen("start");
}

boot();
