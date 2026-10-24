# 獸醫解剖學記憶分析系統：SM-2 記憶曲線與出題調度器重構計畫
> **文檔版本**：v1.0  
> **制定日期**：2026-10-24  
> **適用目標**：解決「剛看過答案 2~3 題後又重複出同一題」之無效短記憶問題，徹底回歸認知神經科學與 Anki/SuperMemo 標竿之 SM-2 記憶曲線調度。

---

## 📌 目錄
1. [問題診斷與現狀代碼審查](#1-問題診斷與現狀代碼審查)
2. [核心缺陷分析（Root Causes）](#2-核心缺陷分析root-causes)
3. [重構架構設計（Architecture Specification）](#3-重構架構設計architecture-specification)
4. [逐項修改指南（Step-by-Step Implementation Guide）](#4-逐項修改指南step-by-step-implementation-guide)
5. [邊界情況處理（Edge Cases Handling）](#5-邊界情況處理edge-cases-handling)
6. [驗收測試矩陣（Acceptance Test Matrix）](#6-驗收測試矩陣acceptance-test-matrix)

---

## 1. 問題診斷與現狀代碼審查

在 `index.html` 的現有實現中，存在多處相互矛盾的出題邏輯，直接導致了使用者體驗崩壞：

### 1.1 缺陷代碼位置一：生硬強插的 `+3 題即刻重測`
* **檔案位置**：`index.html` 約第 4362~4365 行
```javascript
// 答錯時的處理
relearnQueue.push({
    question: currentQuestion,
    targetIndex: sessionAnswerCount + 3, // ⚠️ 致命傷：硬編碼 3 題後無條件插隊
    retryCount: ((currentQuestion && currentQuestion._retryCount) || 0) + 1
});
```

### 1.2 缺陷代碼位置二：`nextQuestion()` 暴力攔截與無到期題時的原地彈出
* **檔案位置**：`index.html` 約第 4079~4089 行與第 4123~4128 行
```javascript
// 攔截 1：只要答滿 3 題，無視任何記憶曲線，立刻硬塞錯題
let relearnTargetIdx = relearnQueue.findIndex(item => item.targetIndex <= sessionAnswerCount);
if (relearnTargetIdx >= 0) {
    const item = relearnQueue.splice(relearnTargetIdx, 1)[0];
    currentQuestion = item.question;
    ...
    return;
}

// 攔截 2：若當前沒有到期複習題 (dueCards.length === 0)，直接彈出 relearnQueue！
if (dueCards.length > 0) {
    ...
} else if (relearnQueue.length > 0) {
    const item = relearnQueue.shift(); // ⚠️ 致命傷：若無到期題，第 1 題或第 2 題立刻彈出！
    ...
}
```

### 1.3 缺陷代碼位置三：短記憶假答對污染 SM-2 參數
* **檔案位置**：`index.html` 約第 4390~4410 行
```javascript
// 錯題在 2~3 題後被短記憶強插跳出時：
// 使用者憑藉剛才看到的視覺暫留拼出單字
let grade = 1;
if (isCorrect) {
    ...
    grade = 5; // ⚠️ 致命傷：完全未檢查 _isRelearning，直接給予滿分 Grade 5！
}
calculateSM2(prog, grade); // 導致 repetitions 增加，間隔直接跳躍到 6 天後！
```

### 1.4 缺陷代碼位置四：新題飢餓霸凌到期複習題
* **檔案位置**：`index.html` 約第 4100~4115 行
```javascript
const now = Date.now();
let dueCards = activePool.filter(q => {
    const prog = userProgress[q.id];
    return !prog || prog.nextReviewDate <= now;
});

dueCards.sort((a, b) => {
    // !prog 的新題其 dateA 為 0；到期複習題的 dateB 為龐大時間戳
    const dateA = (userProgress[a.id] && userProgress[a.id].nextReviewDate) || 0;
    const dateB = (userProgress[b.id] && userProgress[b.id].nextReviewDate) || 0;
    return dateA - dateB; // ⚠️ 致命傷：dateA - dateB 永遠讓 0 排在最前面，新題永遠霸凌複習題！
});
```

---

## 2. 核心缺陷分析（Root Causes）

1. **破壞認知提取負荷（Desirable Difficulty）**：  
   間隔僅 2~3 題（約 20~30 秒），視網膜暫留與大腦短期工作記憶（Working Memory）尚未消退。此時「答對」僅是機械式默寫剛才看到的英文字母，無法觸發海馬迴向長期記憶（Long-term Memory）的鞏固機制。
2. **SM-2 間隔虛假膨脹（Interval Inflation）**：  
   依靠短期記憶答對被判定為滿分（Grade 5），使得該單字複習間隔直接被推遲至 6 天甚至數週後，原本不會的單字因此被系統「放生」。
3. **缺乏防重複冷卻窗口（Lack of Sliding Cooldown）**：  
   題庫池未維護最近出題歷史，當可選題目較少或無到期題時，容易原地連續抽到相同題目。
4. **新題與複習題權重失衡**：  
   艾賓浩斯遺忘曲線的第一要務是「搶救即將遺忘的舊記憶」，而非無止境灌入新題。

---

## 3. 重構架構設計（Architecture Specification）

### 3.1 核心機制：動態滑動歷史冷卻窗口（Sliding History Cooldown）
維護一個全局隊列 `recentHistoryQueue`，記錄最近出過的題目 ID：
* **冷卻長度計算**：
  $$\text{CooldownSize} = \max\left(1, \min\left(8, \lfloor \text{ActivePool.length} \times 0.6 \rfloor\right)\right)$$
  * 當題目池充足時，強制至少 **8~12 題**內絕不重複出現同一題。
  * 當題目池極小時（例如單圖只有 3~5 題），自適應縮短冷卻長度，避免無限迴圈。

### 3.2 核心機制：三階層權重排程器（Three-Tier Priority Scheduler）
在過濾掉「冷卻中」的題目後，將候選池分為三層，嚴格依序提取：

```
[可選題目池 Active Pool]
          │
          ▼
   (排除最近冷卻題目 recentHistoryQueue)
          │
    ┌─────┴─────────────────────────┐
    ▼                               ▼
【第一優先：到期複習題】         【第二優先：錯題二次鞏固】      【第三優先：全新探勘題】
(Due Review Cards)             (Lapsed Relearn Cards)         (New Cards)
• 條件: prog && nextReviewDate <= now  • 條件: 本輪曾答錯且冷卻完畢   • 條件: !prog (從未作答)
• 排序: 逾期最嚴重者優先 (now - date)  • 排序: 答錯次數多者優先      • 排序: 隨機均勻提取
```

### 3.3 核心機制：同輪錯題重測「防污染保護（Rating Guard）」
* 凡是打上 `_isRelearning` 標記的題目：
  * **即便答對，最高評分鎖定為 `Grade = 3`（及格邊緣）**。
  * **複習間隔鎖定為 `interval = 1`（1天）**，確保明日必須再次接受真實驗證。
  * `repetitions` 不得直接跳增至 6 天階段。

---

## 4. 逐項修改指南（Step-by-Step Implementation Guide）

請負責修改的 Agent 嚴格依照以下步驟修改 `index.html`：

### 步驟 1：定義歷史冷卻變數與佇列清理
在全局變數宣告區（約第 2320~2330 行）：
```javascript
// 【新增】出題滑動冷卻歷史（記錄最近出過的題目 ID）
let recentQuestionHistory = [];
// 【優化】記錄本輪會話中答錯、待二次驗證的題目 Set
let sessionWrongCardSet = new Set();
```

### 步驟 2：重構 `nextQuestion()` 調度引擎
替換約第 4070~4140 行的題目選取邏輯：
```javascript
// 1. 若為全圖地毯模式，維持原本圖片輪巡
if (quizType === 'sheet') {
    // ...保持既有 sheet 邏輯不變...
    return;
}

// 2. 若為弱點特訓模式
if (weakDrillPool && weakDrillPool.length > 0) {
    activePool = weakDrillPool;
    titleTag.title = "";
    titleTag.innerHTML = `⚡ <span style="color:#e67e22;">${drillModeName || '弱點特訓中'}</span>`;
} else {
    titleTag.title = "";
    titleTag.innerText = "🎯 測驗進行中";
}

if (activePool.length === 0) {
    titleTag.innerText = "⚠️ 範圍為空";
    qCtx.clearRect(0, 0, quizCanvas.width, quizCanvas.height);
    document.getElementById('feedback').innerHTML = '<span style="color:#e67e22;">請展開「出題範圍」並勾選圖片開始出題！</span>';
    document.getElementById('quiz-options').innerHTML = '';
    return;
}

const now = Date.now();

// 3. 計算動態冷卻長度 (池子大時至少冷卻 8 題；池子小時佔池子的 60%)
const cooldownLimit = Math.max(1, Math.min(8, Math.floor(activePool.length * 0.6)));
while (recentQuestionHistory.length > cooldownLimit) {
    recentQuestionHistory.shift();
}

// 4. 候選池：排除冷卻中的題目
let availablePool = activePool.filter(q => !recentQuestionHistory.includes(q.id));
if (availablePool.length === 0) {
    availablePool = activePool; // 若題目極少導致全部在冷卻中，保底降級
}

// 5. 分類題目池 (三階層)
// 層級 A：真正到期的複習題 (Due)
const dueCards = availablePool.filter(q => {
    const prog = userProgress[q.id];
    return prog && prog.nextReviewDate && prog.nextReviewDate <= now;
});

// 層級 B：本輪答錯過、已冷卻完畢之鞏固題 (Lapsed)
const lapsedCards = availablePool.filter(q => sessionWrongCardSet.has(q.id));

// 層級 C：全新從未作答過的題目 (New)
const newCards = availablePool.filter(q => !userProgress[q.id]);

// 6. 依優先級嚴格挑選
let pickedQuestion = null;
let modeNotice = "";

if (dueCards.length > 0) {
    // 依逾期時長排序 (逾期越久越優先抢救)
    dueCards.sort((a, b) => {
        const diffA = now - (userProgress[a.id]?.nextReviewDate || now);
        const diffB = now - (userProgress[b.id]?.nextReviewDate || now);
        return diffB - diffA; // 降序：最逾期的在最前
    });
    // 隨機從最逾期的前 3 題挑一題，保留微隨機感
    const slicePool = dueCards.slice(0, Math.min(3, dueCards.length));
    pickedQuestion = slicePool[Math.floor(Math.random() * slicePool.length)];
    pickedQuestion._isRelearning = false;
    modeNotice = `<span style="color:#38bdf8;">⏰ 到期複習</span>`;
} else if (lapsedCards.length > 0) {
    // 錯題冷卻完畢，進行二次檢驗
    pickedQuestion = lapsedCards[Math.floor(Math.random() * lapsedCards.length)];
    pickedQuestion._isRelearning = true;
    modeNotice = `🔁 <span style="color:var(--relearn); font-weight:bold;">錯題深度強化 (冷卻後重測)</span>`;
} else if (newCards.length > 0) {
    // 抽取新題
    pickedQuestion = newCards[Math.floor(Math.random() * newCards.length)];
    pickedQuestion._isRelearning = false;
    modeNotice = `<span style="color:#10b981;">🌱 新知識學習</span>`;
} else {
    // 全數已學過且尚未到期：自適應均勻抽取
    pickedQuestion = availablePool[Math.floor(Math.random() * availablePool.length)];
    pickedQuestion._isRelearning = false;
    modeNotice = `<span style="color:#94a3b8;">🎯 熟練度鞏固</span>`;
}

currentQuestion = pickedQuestion;
if (titleTag && modeNotice) {
    titleTag.innerHTML = `${modeNotice}`;
}

// 登記進冷卻隊列
recentQuestionHistory.push(currentQuestion.id);

renderQuestion(currentQuestion);
updateDailyHUD();
updateRelearnHUD();
```

### 步驟 3：重構 `submitAnswer()` 評分防污染邏輯
在 `submitAnswer()` 的 SM-2 計算區（約第 4390~4415 行）：
```javascript
// 答錯時：
if (!isCorrect) {
    currentCombo = 0;
    saveUserStats();
    updateComboHUD(true);
    
    // 加入本輪待二次鞏固 Set (由調度引擎在冷卻後出題)
    sessionWrongCardSet.add(currentQuestion.id);
    updateRelearnHUD();
    
    // ...原有錯誤反饋 HTML 生成...
} else {
    // 答對時：
    currentCombo++;
    if (currentCombo > maxCombo) maxCombo = currentCombo;
    saveUserStats();
    updateComboHUD(false);

    // 若此題先前曾答錯，重測答對後從待鞏固 Set 中解除
    if (sessionWrongCardSet.has(currentQuestion.id)) {
        sessionWrongCardSet.delete(currentQuestion.id);
        updateRelearnHUD();
    }
}

// SM-2 評分計算 (防短記憶污染)
let grade = 1;
if (isCorrect) {
    if (currentQuestion && currentQuestion._isRelearning) {
        // ⚠️ 關鍵保護：同輪重測答對，最高只給 Grade 3 (及格邊緣)，絕不膨脹為 5！
        grade = 3;
    } else if ((currentQuestion && currentQuestion._usedNearMissRetry) || currentHintLevel >= 2) {
        grade = 3;
    } else if (currentHintLevel === 1 || evaluation.reason !== 'exact') {
        grade = 4;
    } else {
        grade = 5;
    }
}
calculateSM2(prog, grade);

// ⚠️ 關鍵保護：若為重測題，即便答對，首次間隔維持 1 天，明日必須重新檢定！
if (currentQuestion && currentQuestion._isRelearning && isCorrect) {
    prog.repetitions = 1;
    prog.interval = 1;
    prog.nextReviewDate = Date.now() + 24 * 60 * 60 * 1000;
}
```

### 步驟 4：更新 `updateRelearnHUD()` 計數器
將原本的 `relearnQueue.length` 改為監聽 `sessionWrongCardSet.size`：
```javascript
function updateRelearnHUD() {
    const hud = document.getElementById('relearn-hud');
    const count = document.getElementById('relearn-count');
    if (!hud || !count) return;
    const size = sessionWrongCardSet.size;
    if (size > 0) {
        hud.style.display = 'inline-flex';
        count.innerText = size;
    } else {
        hud.style.display = 'none';
    }
}
```

---

## 5. 邊界情況處理（Edge Cases Handling）

| 邊界情況 | 觸發場景 | 系統防禦與應對方案 |
| :--- | :--- | :--- |
| **超小題庫池（1~3 題）** | 用戶只選了一張結構極少的單圖（如僅 2 個標記） | `cooldownLimit` 自動計算為 $\max(1, \lfloor 2 \times 0.6 \rfloor) = 1$。系統絕不連續出同一題，會在 2 題之間輪替，避免陷入無限遞迴死循環。 |
| **全圖地毯模式（Sheet Mode）** | 使用者切換至 🗺️ 全圖地毯模式 | `quizType === 'sheet'` 在調度器第一行優先攔截並返回，完全維持全圖地毯模式的空間順序解構，互不干擾。 |
| **弱點單字多角度特訓** | 用戶從分析頁點擊特定單字進行特訓 | 特訓池 `weakDrillPool` 享有第二優先權，並同樣享有冷卻滑動窗口，避免在特訓時連續兩次點到同一視角的題目。 |
| **換圖片或重選出題範圍** | 使用者在側邊選單勾選/取消圖片 | 重置 `recentQuestionHistory = []`，讓新的題庫池能立刻順暢出題。 |

---

## 6. 驗收測試矩陣（Acceptance Test Matrix）

修改完成後，請依序執行以下 5 項嚴格驗收測試：

- [ ] **測試 1：錯題絕不在 3 題內重複**  
  故意答錯一題單字（例如 `promontory`），隨後連續作答 5 題。  
  **預期**：在接下來的 5 題內，系統**絕對不得出現剛才答錯的同一題**。
- [ ] **測試 2：冷卻結束後的二次檢驗**  
  在答錯第 1 題後，持續作答不同題目達 8 題以上。  
  **預期**：第 8~12 題之間，系統標記 `🔁 錯題深度強化 (冷卻後重測)`，驗證大腦短期記憶消退後能否依然答對。
- [ ] **測試 3：SM-2 間隔防膨脹驗證**  
  檢查二次重測答對後的 Firestore `user_progress` 記錄。  
  **預期**：`interval` 為 1 天，`nextReviewDate` 為明天的時間戳，絕不可被膨脹為 6 天。
- [ ] **測試 4：到期複習題優先於新題**  
  資料庫中有到期題目且勾選了包含新題的圖片。  
  **預期**：系統頂部標註 `⏰ 到期複習`，優先出到期的舊題，複習完畢後才標註 `🌱 新知識學習`。
- [ ] **測試 5：控制台無錯誤**  
  打開瀏覽器 F12 Console，連續作答 20 題，無任何 undefined、NaN 或死循環報錯。

---
*本計畫文檔由 Antigravity 制定，供工程 Agent 據以實施代碼重構。*
