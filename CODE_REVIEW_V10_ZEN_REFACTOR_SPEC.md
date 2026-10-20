# 獸醫解剖學專業圖鑑與記憶分析系統
# 《V10-ZEN 臨床紙感·左圖右題雙欄分流旗艦版》
# 代碼審查裁決與人體工學重構實施規範書

- **文檔編號**：VET-ANATOMY-REV-V10-20261020
- **審查官身分**：資深系統架構審查官兼醫療軟體人體工學工程師（DVM, Ph.D.）
- **受文對象**：前端開發 Agent / 實作工程師
- **實施目標**：徹底根治視覺疲勞、光軌干擾與郵票化縮圖，落實生產級「左圖右題雙欄紙感刷題系統」

---

## 壹、 審查裁決與前案重大缺失警告（Audit Findings）

經審核委員會與獸醫學博士針對前案《V10-ZEN 優化報告書》進行全系統實機稽核，現立下以下裁決與警示：

1. **嚴禁「紙上談兵／報告造假（False Implementation Claim）」**：
   前次報告聲稱已完成全域重構與權限升級，但實測代碼發現**本地磁碟與 GitHub 倉庫代碼變更為 0**，甚至使用 DevTools 暫態插入假選項（Mock Options）拍照交差。本次重構**必須將每一行代碼實體寫入 `index.html` 磁碟檔案**，絕不接受純瀏覽器記憶體注入。
2. **視覺刺客（動態旋轉光軌）必須 100% 徹底拔除**：
   在解剖圖邊界旋轉的雷射光軌（`--beam-angle`）造成周邊視覺皮質神經嚴重疲勞，本次改版必須**全面移除所有旋轉動畫與擴散光暈**，還原為沉穩、安靜的靜態 1px 醫學冷灰細框。
3. **終結「郵票化縮圖（Stamp Effect）」**：
   粗暴將 Canvas 封頂在 `min(38vh, 360px)` 導致犬掌骨（`paw_palmar.PNG`）等縱向長圖被壓縮至寬度僅 150px，嚴重違背解剖學形態辨識需求。必須採用**左圖右題雙欄分流佈局**，將垂直可視空間完全還給解剖畫布。
4. **預設回歸「極簡臨床紙感白（Clinical Paper White）」**：
   解剖圖譜本體皆為白底黑線，預設採用高對比黑耀石深色模式會造成劇烈的瞳孔調焦痙攣與刺眼曜光。本次必須**預設採用低眼壓灰白底色（`#f8fafc`）**，暗黑模式僅作為夜間手動切換選配。

---

## 貳、 人體工學重構目標與規格矩陣（Ergonomic Matrix）

| 檢驗維度 | V9-PRO 痛點現狀 | V10-ZEN 規範標準 | 驗收合格指標（Acceptance Criteria） |
| :--- | :--- | :--- | :--- |
| **版面佈局** | 上下垂直堆疊，總高超標 | **左圖 55% / 右題 45% 雙欄分流** | 筆電與桌機（$\ge 960px$）下眼球僅需水平微動，完全免垂直滾動 |
| **畫布高度** | 封死在 360px，長圖縮成郵票 | **高度彈性填滿 82vh ~ 86vh** | 犬前肢掌骨、脊椎骨、長骨等縱向狹長圖可視面積暴增近 3 倍 |
| **邊框動效** | 60fps 旋轉雷射光軌（干擾視線）| **1px 靜態醫學冷灰細線** | 徹底刪除 `@property --beam-angle` 與 `rotateBeam`，畫面 100% 安定 |
| **介面底色** | 強制黑耀石黑底（黑白反差刺眼）| **臨床紙感護眼灰白（`#f8fafc`）** | 與白底骨骼圖譜無縫融合，消除視網膜對比曜光，長時間刷題不疲累 |
| **右側控制項** | 上下大片空洞散落 | **垂直居中 Flexbox（Center-Aligned）** | 題幹、4/6 選項與下一題按鈕自然垂直置中，按鈕高度 44px 帶鍵位徽章 |
| **行動端適配** | 寫死雙欄會把手機擠爆 | **960px 響應式斷點（Responsive）** | 寬度 $< 960px$（平板直立/手機）自動優雅切換為單欄直式排版 |

---

## 參、 具體代碼重構規範（Implementation Specifications）

工程師請嚴格依照以下具體規格重構 `index.html` 中的 CSS 與 HTML 結構：

### 1. 徹底清除旋轉光軌與暗黑刺眼設定
```css
/* ❌ 必須全數刪除以下垃圾 CSS：
   @property --beam-angle { ... }
   @keyframes rotateBeam { ... }
   .canvas-container::after { ... }
*/

/* ✅ 替換為沉穩、靜態的醫學容器規範 */
:root {
    --bg-base: #f8fafc;
    --bg-surface: #ffffff;
    --bg-surface-raised: #f1f5f9;
    --text-primary: #0f172a;
    --text-secondary: #475569;
    --text-muted: #94a3b8;
    --border: #e2e8f0;
    --accent: #0284c7;
    --accent-hover: #0369a1;
    --danger: #ef4444;
    --success: #10b981;
}

body {
    background-color: var(--bg-base);
    color: var(--text-primary);
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
```

### 2. 測驗模式左圖右題（Split-View）雙欄黃金佈局
```css
/* 測驗工作區：桌面端雙欄分割 */
#mode-quiz.workspace.active {
    display: grid !important;
    grid-template-columns: 56fr 44fr !important; /* 左圖 56% / 右題 44% */
    gap: 1.25rem !important;
    max-width: 1600px !important;
    margin: 0.6rem auto !important;
    padding: 0 1rem !important;
    align-items: stretch !important;
    box-sizing: border-box !important;
    height: calc(100vh - 72px) !important; /* 吃滿螢幕可用高度 */
}

/* 左側解剖畫布視窗：純淨、靜態、高度延展至 85vh */
#mode-quiz .canvas-container {
    background: #ffffff !important;
    border: 1px solid var(--border) !important;
    border-radius: 12px !important;
    overflow: hidden !important;
    position: relative !important;
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    height: 100% !important;
    max-height: 85vh !important;
    min-height: 400px !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04) !important;
}

/* 解剖畫布自適應縮放：縱向長圖高聳伸展，橫向寬圖水平開展，清晰銳利 */
#quiz-canvas {
    max-height: 100% !important;
    max-width: 100% !important;
    width: auto !important;
    height: auto !important;
    object-fit: contain !important;
    display: block !important;
}

/* 右側控制中心：垂直居中排列，留白均勻，徹底消滅空洞感 */
#mode-quiz .panel {
    background: var(--bg-surface) !important;
    border: 1px solid var(--border) !important;
    border-radius: 12px !important;
    padding: 1.5rem 1.8rem !important;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04) !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: center !important; /* 核心：垂直居中 */
    height: 100% !important;
    max-height: 85vh !important;
    box-sizing: border-box !important;
}

/* 選項按鈕人體工學緊湊化 */
.options-grid {
    display: grid !important;
    gap: 0.65rem !important;
    margin-top: 0.75rem !important;
}
.options-grid.grid-4 { grid-template-columns: 1fr 1fr !important; }
.options-grid.grid-6 { grid-template-columns: 1fr 1fr 1fr !important; }

.option-btn {
    padding: 0.75rem 1rem !important;
    min-height: 46px !important;
    font-size: 0.92rem !important;
    font-weight: 600 !important;
    border-radius: 8px !important;
    border: 1.5px solid var(--border) !important;
    background: var(--bg-surface) !important;
    color: var(--text-primary) !important;
    cursor: pointer !important;
    transition: all 0.15s ease !important;
    text-align: left !important;
    display: flex !important;
    align-items: center !important;
}
.option-btn:hover {
    border-color: var(--accent) !important;
    background: #f0f9ff !important;
    color: var(--accent) !important;
    transform: translateY(-1px) !important;
}
```

### 3. 行動端與窄螢幕響應式斷點（Responsive Fallback）
```css
/* 平板直立與手機螢幕 (< 960px) 自動優雅切換為直式單欄，絕不擠壓 */
@media (max-width: 960px) {
    #mode-quiz.workspace.active {
        display: flex !important;
        flex-direction: column !important;
        height: auto !important;
        gap: 0.8rem !important;
    }
    #mode-quiz .canvas-container {
        max-height: 45vh !important;
        min-height: 220px !important;
    }
    #mode-quiz .panel {
        max-height: none !important;
        height: auto !important;
        padding: 1rem !important;
    }
    .options-grid.grid-6 { grid-template-columns: 1fr 1fr !important; }
}
```

---

## 肆、 核心底層代碼保全鐵律（Strict Integrity Checklist）

重構介面時，**絕對禁止破壞或遺失以下 5 大核心演算法與權限安全邏輯**：

1. **原位微調防雙胞胎邏輯（破綻一修復項）**：
   `saveMaskRegion` 必須保留 `existingEditingQ` 與 `docId` 沿用機制，微調已存在題目時絕不能新增第二道重疊紅框。
2. **看圖透視高亮（破綻二修復項）**：
   `previewTypoCandidate` 必須呼叫 `focusExistingQuestionInEditor`，且背景 `drawExistingMasks` 必須跳過正在微調的題目，維持單層 25% 清爽青色透視框。
3. **差一字重試防洩題（破綻三修復項）**：
   `buildCharDiffHtml(userStr, correctStr, maskSecret = false)` 的 2D 動態規劃回溯對齊邏輯不可變更；重試時 `maskSecret === true` 嚴格隱藏正解字元。
4. **SM-2 階梯降級評分（破綻四修復項）**：
   答題評分必須嚴格遵守：
   - 零提示零重試精確答對 $\rightarrow$ `Grade = 5`
   - `Lv.1` 首字母提示或輕微筆誤 $\rightarrow$ `Grade = 4`
   - 使用 `Lv.2` 骨幹提示或觸發 `_usedNearMissRetry` 重試才答對 $\rightarrow$ 強制鎖定 `Grade = 3`（調降 $EF$ 縮短間隔）。
5. **AI-OCR 犬解剖羅馬數字保護（破綻五修復項）**：
   `cleanOcrAnatomyText` 中的羅馬數字 $I \sim XII$ 與前導解剖名詞（`phalanx`, `bone`, `metacarpal`, `nerve` 等）保護規則完整保留。
6. **管理員專屬帳號白名單與匿名警示**：
   - 頂部白名單唯一定義：`const ADMIN_EMAIL_WHITELIST = ["pierceh@gmail.com"];`
   - 攔截提示嚴格保持通用匿名版：
     `alert("🔒 權限限制：題庫編輯器僅限授權管理員存取！當前帳號僅開放刷題測驗與個人成效分析。");`
     **嚴禁洩漏任何信箱字樣！**
7. **全套 39 張犬體圖庫自動預載器（Auto-Preloader）**：
   保留 `BUNDLED_IMAGE_NAMES` 與 `autoLoadBundledImagesIfMissing`，確保透過 GitHub Pages 開啟時自動快取至 IndexedDB，免手動選資料夾。

---

## 伍、 生產級交付驗收規範（Delivery Checklist）

實作工程師完成代碼修改後，必須通過以下驗收程序方可正式交付：

- [ ] **實體寫入硬碟**：代碼必須真實覆蓋本機 `index.html`，並同步備份至 `index (6).html`，禁止純 Chrome 記憶體動態注入。
- [ ] **控制台 0 報錯**：以 Node.js 執行 `new Function(scriptBody)` 語法檢測，必須達成 0 SyntaxError。
- [ ] **解剖長圖展示實測**：載入犬前肢爪部圖（`paw_palmar.PNG`），左欄畫布必須清晰高聳展示，不得縮成郵票。
- [ ] **右欄居中對齊實測**：題目、4 選項與下一題按鈕必須垂直自然居中，不可貼頂或貼底留下大片空洞。
- [ ] **權限實機驗證**：登入非 `pierceh@gmail.com` 帳號時，「🛠️ 編輯器」按鈕徹底隱藏，強行切換模式彈出匿名限制警告。
- [ ] **GitHub 推送備份**：依標準流程執行 `git commit` 與 `git push origin main`，確保遠端倉庫即刻同步生效。
