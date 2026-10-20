# 獸醫解剖學專業圖鑑與記憶分析系統（V9 AI-OCR 與極速刷題旗艦版）
# 第三輪代碼審查與獸醫解剖教育架構稽核報告書 (V9 Audit Report)

---

## 評審委員會結論與總體裁決 (Executive Verdict - V9 Audit)

* **審核委員**：首席代碼架構審查員（Lead Code Reviewer）兼 獸醫學博士（Ph.D. in Veterinary Medicine）
* **審核對象**：`C:\Users\88697\Downloads\index (3).html`（共 2,942 行，139,144 Bytes）及 V9 升級報告
* **審核原則**：**嚴格證據主義（Strict Burden of Proof）**——凡代碼中無對應實作、或實作邏輯與宣稱效果相悖者，一律視為未完成或缺陷（Zero-Credit / Defective）。
* **總體裁決**：<span style="color:#e74c3c; font-weight:bold; font-size:1.2rem;">【REVISION REQUIRED / 退回修正：抓出 5 大邏輯破綻與解剖學盲點】</span>
* **核心總評**：
  該 Agent 在 V9 版本中確實保留了 V8-PRO 的優良基底（IndexedDB 快取、Firestore 分批寫入、同義詞正規化 `\s+` 修正、10 項 NAV 視角），並新開發了 AI-OCR、圖片改名、11 項拼字健檢 Modal、地毯模式空間巡覽與填空提示功能。
  **然而，經逐行解構 `index (3).html` 並以 Node.js 實測後，抓出 5 個極為嚴重的「假完善 / 邏輯自爆」缺陷**：
  1. **「🎯 微調」功能假覆寫、真增生 Bug**：宣稱點擊微調可直接改字覆寫、不必先刪題，但 `saveMaskRegion` 完全無視 `editorHighlightQuestionId`，只要修改拼字（或微調舊版隨機 ID 題目），就會**直接分裂出重複題目**，且舊題與歷史進度完全脫鉤！
  2. **「🛡️ 差一字重試」直接把標準答案印在螢幕上洩題，且「🔍 字元比對」無序列對齊（Index Shift 災難）**：重試時竟直接把 `correctStr` 完整顯示在畫面上讓學生照抄；且比對演算法僅用 `u[i] === c[i]`，只要漏打 1 個字母（如 `promotory`），後面整串正確字母全部變紅字！
  3. **使用 `Tab` 提示與重試後，SM-2 依然給予最高分 `Grade = 5`**：徹底污染艾賓豪斯記憶週期，讓偷看提示才答對的弱點單字複習間隔暴增！
  4. **「👁️ 看圖」與「🎯 微調」畫布渲染衝突與空遮罩報錯**：Modal 點「看圖」後若直接按儲存會報錯「請至少框選一個區域」；點「微調」則會在半透明青色框上疊加一層 50% 紅色框，混成暗褐色反而不清楚。
  5. **AI-OCR 正規表達式誤殺羅馬數字 `I`，以及 #11 薦骨解剖學概念混淆**：`Proximal phalanx I` 字尾的 `I` 被當成雜訊砍掉；且將正中薦嵴（*Median sacral crest*）誤認為可與內側（*Medial*）混用。

---

## 壹、 細部檢查點矩陣與證據稽核表 (Granular Checkpoints Matrix)

| 編號 | 檢查點項目 (Checkpoints) | 判定結果 | 程式碼行數與鐵證事實 |
| :--- | :--- | :---: | :--- |
| **一** | **V8-PRO 既有核心與歷史數據保全回歸檢查** | | |
| CP 1.1 | `normalizeAnatomyTerm` 空白轉義 `\s+` 與同義詞命中 | <span style="color:#27ae60; font-weight:bold;">✅ 通過</span> | 第 909～917 行：已維持正確 `\s+` 轉義，未發生回歸錯誤。 |
| CP 1.2 | IndexedDB 本機快取讀取、新增與刪除 (`deleteCachedImage`) | <span style="color:#27ae60; font-weight:bold;">✅ 通過</span> | 第 807～866 行：具備完整 `put`、`delete` 與 `getAll` 持久化。 |
| **二** | **V9 新功能 1：畫框自動 AI-OCR 預填管線** | | |
| CP 2.1 | 畫框放開 (`mouseup`) 自動預填至 `#term-input` 且不自動寫入雲端 | <span style="color:#27ae60; font-weight:bold;">✅ 通過</span> | 第 2273～2277 行：僅填入 `termInput.value`，須按 Enter 才呼叫 `saveMaskRegion`。 |
| CP 2.2 | 無字空遮罩保護與多遮罩防覆蓋鎖定 (`forceOverwrite`) | <span style="color:#27ae60; font-weight:bold;">✅ 通過</span> | 第 1106～1124 行：多框第 2 框起保留原文字，無字時顯示黃色警告不洗掉輸入框。 |
| CP 2.3 | 解剖專有名詞 OCR 清理管線 (`cleanOcrAnatomyText`) 正確性 | <span style="color:#e74c3c; font-weight:bold;">❌ 嚴重瑕疵</span> | **第 1081、1091 行**：`/\s+(?:...|\b[1Il|]\b)$/g` **把所有結尾的羅馬數字 `I`（如 `Proximal phalanx I`、`Metacarpal bone I`）當成雜訊直接刪除！** |
| **三** | **V9 新功能 2：修改個別圖片檔名 (6 層同步)** | | |
| CP 3.1 | 雙入口改名 UI、副檔名自動保留與同名碰撞提示 | <span style="color:#27ae60; font-weight:bold;">✅ 通過</span> | 第 512、1502～1532、1784、1817 行：入口齊全且自動補回原副檔名。 |
| CP 3.2 | IndexedDB、記憶體、`quiz_data` 與三層 `categories/images/terms` 批次更新 | <span style="color:#e67e22; font-weight:bold;">⚠️ 潛在漏洞</span> | **第 1561～1607 行**：雖更新了 `q.image`，但 `q.id` 仍保留舊圖名（如 `cat_旧圖名_term`）。日後若對該題按儲存，第 2293 行會用新圖名算出新 `docId`，**導致同圖分裂出雙重題目！** |
| **四** | **V9 新功能 3：11 項題庫拼字健檢與「🎯 既有遮罩微調」** | | |
| CP 4.1 | 11 項候選互動挑選 Modal 與勾選批次寫入雲端 | <span style="color:#e67e22; font-weight:bold;">⚠️ 部分瑕疵</span> | **第 1701～1741 行**：`applySelectedTypoFixes` 僅修改 `q.term`，未同步處理 `q.id` 與日後編輯之 ID 一致性；且未將常見拼錯詞納入同義詞表防護。 |
| CP 4.2 | 點擊「👁️ 看圖」(`previewTypoCandidate`) 透視預覽與直接修改儲存 | <span style="color:#e74c3c; font-weight:bold;">❌ 嚴重 Bug</span> | **第 1683～1699 行**：`loadEditorImage` 清空了 `editorPendingMasks = []`，卻未載入該題遮罩；使用者看圖後若直接改字按儲存，**第 2291 行直接報錯「請在畫布上框選至少一個遮蓋區域！」** |
| CP 4.3 | 點擊「🎯 微調」(`focusExistingQuestionInEditor`) 半透明青色透視效果 | <span style="color:#e74c3c; font-weight:bold;">❌ 視覺重疊 Bug</span> | **第 1856～1868、2212～2226 行**：`drawExistingMasks` 畫完青色框後，`editorPendingMasks` **立刻在同座標疊加畫上 50% 紅色框**，青紅混合變成約 64% 濃度的暗紅褐色，根本不是清爽青色透視框！ |
| CP 4.4 | 「🎯 微調」修改單字後直接覆寫原題（免先刪題再重畫） | <span style="color:#e74c3c; font-weight:bold;">❌ 虛假承諾 (致命)</span> | **第 2284～2343 行**：`saveMaskRegion` **完全沒有讀取 `editorHighlightQuestionId`**！只要微調時改了單字（或該題為舊版亂數 ID），儲存時就會產生新 `docId` 新增一題，**舊題完全沒刪，直接變成兩題疊在一起！** |
| **五** | **V9 新功能 4：全圖地毯模式「空間順序巡覽」** | | |
| CP 5.1 | 由上而下 (`topdown` 35px 視覺帶)、順時針 (`clockwise`)、隨機 (`random`) 排序 | <span style="color:#27ae60; font-weight:bold;">✅ 通過</span> | 第 2039～2088 行：幾何中心計算與 `atan2` 順時針排序、水平分帶排序邏輯正確，中途切換亦能保持進度。 |
| **六** | **V9 新功能 5 & 6：Tab 記憶支架、差一字重試與紅綠字元比對** | | |
| CP 6.1 | `Tab` 鍵兩階段首字母/字尾提示 (`Lv.1` / `Lv.2`) | <span style="color:#27ae60; font-weight:bold;">✅ 通過</span> | 第 2143～2148、2579～2598 行：攔截 `Tab` 預設焦點跳轉並顯示底線支架。 |
| CP 6.2 | 使用 `Tab` 提示或重試後之 SM-2 記憶週期評分折減 | <span style="color:#e74c3c; font-weight:bold;">❌ 完全未實作</span> | **第 2756～2760 行**：完全無視 `currentHintLevel` 與重試狀態！看光 `Lv.2` 提示甚至看答案重試後答對，**照樣給滿分 `Grade = 5`**，嚴重破壞 SM-2 記憶模型！ |
| CP 6.3 | `🛡️ 差一字重試保連勝 (Near-Miss Retry)` 防止洩題機制 | <span style="color:#e74c3c; font-weight:bold;">❌ 嚴重教育破綻</span> | **第 2688～2701 行**：重試時直接輸出 `buildCharDiffHtml(selected, correct)`，而該函數**直接印出完整正解 `correctStr`**！學生根本是在「照抄螢幕上的答案」保連勝！ |
| CP 6.4 | `🔍 紅綠字元級比對 (buildCharDiffHtml)` 演算法精準度 | <span style="color:#e74c3c; font-weight:bold;">❌ 演算法潰敗</span> | **第 2600～2616 行**：僅用 `u[i] === c[i]` 逐字元硬對齊。只要開頭漏打或多打 1 個字元，**後面所有正確字母因索引位移全數被標為紅字錯誤！** |

---

## 貳、 五大工程與教學邏輯破綻深度剖析 (Forensic Code Critique)

### 破綻一：「🎯 微調」與「👁️ 看圖」的假覆寫與狀態分裂災難

該 Agent 在報告中宣稱：
> 「每一題旁都新增了『🎯 微調』按鈕，點擊即可在畫布上透視高亮該題座標，並將單字與方位載回輸入框直接修改覆寫，不必再『先刪題再重畫』。」

請看 `index (3).html` **第 1856～1868 行** 與 **第 2284～2343 行** 的真實代碼：
```javascript
// 點擊微調時：記錄了 editorHighlightQuestionId
window.focusExistingQuestionInEditor = (qId) => {
    const q = quizDatabase.find(item => item.id === qId);
    if (!q) return;
    editorHighlightQuestionId = q.id;
    editorPendingMasks = getItemMasks(q).map(m => ({ ...m }));
    ...
};

// 點擊儲存時：完全無視 editorHighlightQuestionId！
window.saveMaskRegion = async () => {
    const term = document.getElementById('term-input').value.trim();
    const category = editorActiveCategory || "head_skull";
    ...
    // 🚨 永遠用新的 term 重新計算 docId！
    const docId = `${sanitizeId(category)}_${sanitizeId(currentImage)}_${sanitizeId(term)}`;
```

**發生了什麼災難？**
1. **改字即分裂出雙胞胎錯題**：當使用者點擊某題（例如 `accesory`）的 `🎯 微調`，將輸入框改為正確的 `Accessory` 並按下儲存時，`saveMaskRegion` 會算出一個全新的 `docId`（`..._Accessory`）寫入雲端與 `quizDatabase`，而**原本的舊題（`..._accesory`）完全沒有被刪除**！結果同一張圖上同時存在 `accesory` 與 `Accessory` 兩道題目，且舊題累積的 `user_progress` 作答紀錄被留在舊 ID 成為孤兒！
2. **舊版亂數 ID 題目連調座標都會分裂**：在雲端題庫中，有許多早期建立的題目其 `id` 是 Firestore 自動生成的 20 碼亂數（例如候選清單 #1 的 `AvP2IKn5VXNVThtw5ihz` 與 #7 的 `liTjL8lqOFm2j9q88lDe`）。對這些題目點 `🎯 微調`，就算**一個字都沒改**、只微調紅框大小按儲存，`saveMaskRegion` 算出的 `docId` 也會變成 `head_skull_IMG_1956_PNG_zygomaic__cut_`，直接再複製出一道新題！
3. **青色框 + 紅色框雙重疊加污染**：`focusExistingQuestionInEditor` 既設定了 `editorHighlightQuestionId`（讓 `drawExistingMasks` 畫一層青色框），又把同一個遮罩放進 `editorPendingMasks`（讓 `renderEditorCanvas` 第 2214 行再畫一層 `rgba(231, 76, 60, 0.5)` 半透明紅框）。兩層顏色疊在一起變成混濁的暗褐色，根本看不清底下的解剖構造與文字！
4. **Modal 點「👁️ 看圖」無法直接儲存**：`previewTypoCandidate`（第 1683 行）只設了 `editorHighlightQuestionId` 和 `#term-input`，卻沒把遮罩放進 `editorPendingMasks`。使用者看圖確認後若直接改字按「💾 儲存」，會立刻被第 2291 行攔截報錯：`alert("請在畫布上框選至少一個遮蓋區域！")`。

---

### 破綻二：「🛡️ 差一字重試」直接印出標準答案洩題 + 「🔍 字元比對」索引位移崩潰

請看 `index (3).html` **第 2600～2616 行** 與 **第 2688～2701 行**：
```javascript
function buildCharDiffHtml(userStr, correctStr) {
    const u = (userStr || '').trim();
    const c = (correctStr || '').trim();
    if (!u) return '';
    let out = '';
    for (let i = 0; i < c.length; i++) {
        const ch = c[i]; // 🚨 ch 是標準答案的字元！
        const uCh = u[i] || '';
        if (uCh.toLowerCase() === ch.toLowerCase()) {
            out += `<span class="diff-ok">${ch}</span>`;
        } else {
            out += `<span class="diff-err" title="您輸入: ${uCh || '缺漏'}">${ch}</span>`;
        }
    }
    return `<div class="diff-box">🔍 字元比對：${out}</div>`;
}
```

#### 致命問題 A：重試時直接把完整正解印在畫面上（100% 洩題）
當學生觸發「差一字重試保連勝」（第 2698 行）時，題目尚未結束，系統要學生「再試一次」，但下方卻直接渲染了 `buildCharDiffHtml(selected, correct)`！
因為 `buildCharDiffHtml` 印出的是 `${ch}`（也就是 `correctStr` 的每一個字元），**畫面上直接出現了 100% 完整的正確答案**！學生根本不需要動腦回想哪裡拼錯，只要照著黑框裡的字打一遍就能保住 Combo 並拿到 SM-2 高分！
**正確做法**：在「重試階段（Retry Mode）」，比對框只能顯示**學生自己輸入的字串 (`userStr`)**，標出學生哪個字母打錯或哪裡有缺漏（以 `_` 隱碼標示），**絕對不能在答題尚未結束前把正解字母直接印出來**！只有在正式結算後（答錯揭曉或容錯通過後），才可以顯示正解字元。

#### 致命問題 B：缺乏序列對齊（LCS / Edit Script），漏一字則全盤皆紅
`buildCharDiffHtml` 使用最原始的 `u[i] === c[i]` 索引對齊。
以題庫真實案例測試：
* 正解為 `Promontory`，學生少打第一個 `n` 輸入 `promotory`（僅漏 1 字）：
  * `i = 0..4` (`Promo`)：綠色
  * `i = 5..9` (`ntory` vs `tory`)：因為索引錯位 1 格，後面 5 個字母 **`ntory` 全部被標成紅色波浪底線錯誤**！
* 正解為 `Dorsal sesamoid bones`，學生多打一個 `a` 輸入 `dorsal seasamoid bones`：
  * 從第 9 個字元之後的 **`samoid bones`（整整 12 個字元）全部因位移變成紅字錯誤**！
這與該 Agent 宣稱的「一眼就能看出長單字哪個字母拼錯」完全相反，反而會嚴重誤導學生以為後半段全部拼錯！必須使用 **動態規劃回溯（Levenshtein Backtracking / LCS 對齊演算法）** 才能精準標出單一漏字、多字或替換字！

---

### 破綻三：偷看 `Tab` 提示或觸發重試後，SM-2 記憶演算法竟給予滿分 `Grade = 5`

請看 **第 2756～2760 行**：
```javascript
let grade = 1;
if (isCorrect) {
    grade = (evaluation.reason === 'exact') ? 5 : 4;
}
calculateSM2(prog, grade);
```
* 當學生想不起單字，按了兩下 `Tab` 鍵開啟 `Lv.2` 提示（顯示每個字的前兩碼與最後一碼，如 `In _ _ _ _ _ _ _ _ _ l   fo _ _ _ _ n`），甚至還觸發了一次「差一字重試」，最後終於拼出完整正確字串時：
* 因為最後一次送出的字串與正解完全一致，`evaluation.reason` 為 `'exact'`，系統竟然判定 **`grade = 5`（最高等級：毫無遲疑完美提取）**！
* 在 SuperMemo SM-2 演算法中，`grade = 5` 會讓 `easeFactor` 增加 `+0.1`，並將複習間隔大幅拉長；而需要提示（Assisted Recall）或重試才答出的題目，提取強度極弱，標準應評為 **`grade = 3`**（使 `easeFactor` 下降 `-0.14` 並縮短下次複習間隔），甚至若同時依賴 `Lv.2` 提示與重試應僅維持短間隔並排入強化！

---

## 參、 獸醫學博士級專業批判（Veterinary Anatomy PhD Scrutiny）

### 1. AI-OCR 管線誤殺獸醫解剖學關鍵「羅馬數字 `I`」

在獸醫大體解剖學中，羅馬數字（Roman Numerals `I` ～ `XII`）具有不可取代的定位意義：
* **前肢與後肢爪部（Manus & Pes）**：第一指/趾（狼爪 Pollex / Hallux）的所有骨頭均以 `I` 結尾，例如您題庫中的 `paw_palmar.PNG`（出自 *Miller's Guide to the Dissection of the Dog* Fig. 2-9）明確標示有：
  * `Proximal phalanx I`（第一指近端指骨）
  * `Distal phalanx I`（第一指遠端指骨）
  * `Sesamoid in abductor digiti I longus`（外展第一指長肌內種子骨）
* **顱神經（Cranial Nerves）與腕/跗骨**：`Cranial nerve I`、`Carpal bone I` 等。

然而，檢視 `index (3).html` **第 1081 行與第 1091 行** 之 `cleanOcrAnatomyText`：
```javascript
// 第 1081 行：將長度 <= 2 的行全數刪除（誤殺多行標註中的 I, II, IV, V, X）
if (alpha.length <= 2 && !/^(of|in|to|or|on|at|by|c\d|t\d|l\d)$/i.test(alpha)) {
    return false;
}
// 第 1091 行：把字串結尾的 I 當成直線殘影直接砍掉！
.replace(/\s+(?:[|_—–•·.,:;!?/\\]+|\b[1Il|]\b)$/g, '')
```
經 Node.js 實測，輸入 `"Proximal phalanx I"` 經過 `cleanOcrAnatomyText` 後，字尾的 `I` 被強制抹除，變成 **`"Proximal phalanx"`**！這在獸醫解剖學上是嚴重的定性錯誤（漏掉指別 `I`）。

---

### 2. 對「11 項雲端題庫拼字差異清單」之獸醫解剖學博士逐項審定

經直接調閱工作區內《Miller's Guide to the Dissection of the Dog (8th Ed.)》原圖（`sacrum_dorsal.PNG`, `paw_palmar.PNG`, `L_hip_medial.PNG` 等），對該 Agent 提出的 11 項清單審定如下：

1. **#11 `medial sacral crest` $\rightarrow$ `Median sacral crest`（`sacrum_dorsal.PNG`）：並非「可選」，而是 100% 必須修正之解剖學錯誤！**
   * 該 Agent 在報告與代碼註解中寫道：「*請確認是否刻意區分*」。
   * **博士嚴正指正**：在獸醫解剖學《Nomina Anatomica Veterinaria (NAV)》中，**絕對沒有 `Medial sacral crest` 這種構造！**
   * 薦骨背側的三條縱走骨嵴（由棘突、關節突/乳突、橫突癒合而成）分別為：
     1. **`Median sacral crest`（正中薦嵴，*Crista sacralis mediana*）**：位於正中矢狀面（Median plane）正中央，為單一非成對構造。
     2. **`Intermediate sacral crest`（中間薦嵴，*Crista sacralis intermedia*）**：成對，位於正中薦嵴與背側薦孔之間。
     3. **`Lateral sacral crest`（外側薦嵴，*Crista sacralis lateralis*）**：成對，位於背側薦孔外側。
   * 將正中線上的 `Median`（正中）寫成 `Medial`（內側，僅用於偏離正中線的成對構造），是獸醫系大一學生在跑檯考最常被扣分的典型錯誤！此外，報告將 `sacrum.PNG` 與 `sacrum_dorsal.PNG` 歸類在 `head_skull`（頭骨），實為早期未分類回退預設值所致，薦骨應歸屬於脊柱（`vertebral_bone`）或骨盆帶！
2. **#8 `mamillary process` vs `Mammillary process`（`T6+T12_13.png`）**：
   * 雖然部分舊版英文文獻可見單 `m` 的 `mamillary`，但 *Miller's Guide to the Dissection of the Dog* 課本原圖印刷及現代標準英文皆為雙 `m` 之 **`Mammillary process`**（對應拉丁學名 *Processus mamillaris*）。**關鍵在於：必須將 `"mammillary process": ["mamillary process", "processus mamillaris"]` 加入 `ANATOMICAL_SYNONYMS` 同義詞庫**，讓學生無論打單 `m`、雙 `m` 或拉丁文都能通過，而不是只改題庫卻讓打單 `m` 的學生算錯！
3. **#4 `proximal seasamoid bones`（`paw_palmar.PNG`）**：
   * 原圖中左側（第 II～V 掌骨）印為複數 `Proximal sesamoid bones`，右側（第 I 掌骨）印為單數 `Proximal sesamoid bone`。修正拼字錯誤 `seasamoid` $\rightarrow$ `sesamoid` 完全正確，且建議在同義詞邏輯中容許單複數（`bone` / `bones`）互通。
4. **#1～#3、#5～#7、#9～#10**：
   * 皆為明確的打字筆誤（`manible` $\rightarrow$ `mandible`、`cartal` $\rightarrow$ `carpal`、`seasamoid` $\rightarrow$ `sesamoid`、`accesory` $\rightarrow$ `Accessory`、`promotory` $\rightarrow$ `Promontory`、`zygomaic` $\rightarrow$ `Zygomatic`、`intersterbabral` $\rightarrow$ `Intersternebral`、`carilage` $\rightarrow$ `cartilage`），**11 項全數皆應修正**！

---

## 肆、 具體修復規範與完整補丁代碼 (Actionable Remediation)

請該 Agent 針對 `C:\Users\88697\Downloads\index (3).html` 嚴格執行以下 5 項修正補丁：

### 補丁 1：修復 `saveMaskRegion`、`focusExistingQuestionInEditor` 與 `previewTypoCandidate`（解決微調分裂雙胞胎題目、看圖無法儲存與青紅框重疊問題）

1. **在 `renderEditorCanvas`（第 2206～2228 行）與 `drawExistingMasks`（第 2345～2373 行）**：
   * 當某題正在被 `editorHighlightQuestionId` 微調並載入至 `editorPendingMasks` 時，`drawExistingMasks` **不要再重複繪製該題的舊遮罩**，而是在繪製 `editorPendingMasks` 時，若處於微調/透視狀態（或統一採用半透明透視邊框），直接以清晰的 **半透明青色透視框 (`rgba(6, 182, 212, 0.25)`) + 醒目邊框** 繪製 `editorPendingMasks`，讓使用者無論在拉新框還是微調舊框，都能看清框底下的印刷字！
2. **在 `previewTypoCandidate`（第 1683～1699 行）**：
   * 載入圖片後，必須同步呼叫 `focusExistingQuestionInEditor(matchedQ.id)` 並帶入建議的新單字，讓使用者點「👁️ 看圖」後可以直接按 Enter 儲存！
3. **在 `saveMaskRegion`（第 2284～2343 行）**：
   * 若 `editorHighlightQuestionId` 存在（代表正在微調既有題目 `oldQ`），且新計算出的 `docId !== editorHighlightQuestionId`（或直接沿用原 `oldQ.id` 更新，或遷移舊文檔與 `user_progress` 並刪除舊 ID），**必須確保原題被原地更新或原子替換，絕不殘留舊題**！最穩健且不影響 `user_progress` 的做法是：**當 `editorHighlightQuestionId` 存在時，直接沿用 `const docId = editorHighlightQuestionId;`**（若分類改變則同步清理舊分類路徑並更新 `user_progress` 的 `category`），並在儲存完成後將 `editorHighlightQuestionId = null` 重置！

```javascript
// 【補丁 1：替換 saveMaskRegion，支援原地微調覆寫不分裂】
window.saveMaskRegion = async () => {
    const term = document.getElementById('term-input').value.trim();
    const category = editorActiveCategory || "head_skull";
    const sidedness = document.getElementById('sidedness-input').value;
    const viewAngle = document.getElementById('view-angle-input').value;

    if (!term) return alert("請輸入專有名詞！");
    if (editorPendingMasks.length === 0) return alert("請在畫布上框選至少一個遮蓋區域！");

    // 關鍵修復：若正在微調既有題目 (editorHighlightQuestionId)，直接沿用原題 ID 原地覆寫，保留作答歷史！
    const existingEditingQ = editorHighlightQuestionId ? quizDatabase.find(q => q.id === editorHighlightQuestionId) : null;
    const docId = existingEditingQ ? existingEditingQ.id : `${sanitizeId(category)}_${sanitizeId(currentImage)}_${sanitizeId(term)}`;
    const oldCategory = existingEditingQ ? (existingEditingQ.category || "head_skull") : category;

    const newQuiz = {
        category: category,
        image: currentImage,
        term: term,
        sidedness: sidedness,
        viewAngle: viewAngle,
        masks: editorPendingMasks,
        mask: editorPendingMasks[0] || null,
        creatorId: currentUser.uid,
        createdAt: existingEditingQ ? (existingEditingQ.createdAt || Date.now()) : Date.now(),
        updatedAt: Date.now()
    };

    try {
        const batch = writeBatch(db);

        const termRef = doc(db, "categories", sanitizeId(category), "images", sanitizeId(currentImage), "terms", docId);
        batch.set(termRef, newQuiz, { merge: true });

        // 若微調時更改了分類，刪除舊分類階層下的節點並同步 user_progress
        if (existingEditingQ && sanitizeId(oldCategory) !== sanitizeId(category)) {
            const oldTermRef = doc(db, "categories", sanitizeId(oldCategory), "images", sanitizeId(currentImage), "terms", docId);
            batch.delete(oldTermRef);
            if (userProgress[docId]) {
                userProgress[docId].category = category;
                batch.set(doc(db, "user_progress", `${currentUser.uid}_${docId}`), { category: category }, { merge: true });
            }
        }

        const imgRef = doc(db, "categories", sanitizeId(category), "images", sanitizeId(currentImage));
        batch.set(imgRef, { filename: currentImage, category: category, lastUpdated: Date.now() }, { merge: true });

        const catRef = doc(db, "categories", sanitizeId(category));
        batch.set(catRef, { name: category, lastUpdated: Date.now() }, { merge: true });

        const legacyRef = doc(db, "quiz_data", docId);
        batch.set(legacyRef, newQuiz, { merge: true });

        await batch.commit();

        const existingIdx = quizDatabase.findIndex(q => q.id === docId);
        if (existingIdx >= 0) quizDatabase[existingIdx] = { id: docId, ...newQuiz };
        else quizDatabase.push({ id: docId, ...newQuiz });

        document.getElementById('term-input').value = "";
        editorPendingMasks = [];
        editorHighlightQuestionId = null; // 儲存後重置高亮狀態
        selectedImages.add(currentImage);

        renderEditorCanvas();
        renderImageTermsList();
        renderEditorImageTree();
        buildCategoryTree();
        updateCategorySuggestions();
        updateScopeSummary();
        setOcrBadge('idle', '🤖 畫框自動辨識就緒');
        alert(`✅ 成功儲存！【${term}】(${newQuiz.masks.length} 個遮蓋區域)`);
    } catch (e) {
        alert("上傳失敗: " + e.message);
    }
};
```

---

### 補丁 2：重寫 `buildCharDiffHtml`（導入動態規劃序列對齊 LCS/Edit Alignment，並杜絕重試階段洩題！）

將第 2600～2616 行替換為支援 `maskTarget = true/false` 的序列對齊版本：
* 當 `maskTarget = true`（用於「差一字重試」尚未揭曉答案時）：**只顯示學生自己輸入的字元**（對的標綠色、打錯的標紅色、漏字處標為紅色 `_`），**絕不洩漏正解字母**！
* 當 `maskTarget = false`（用於正式結算後）：透過 Levenshtein 回溯對齊，精準標出多字、漏字或錯字，不再發生「漏一字後面全紅」的索引位移慘劇！

```javascript
// 【補丁 2：具備動態規劃序列對齊與防洩題機制的 buildCharDiffHtml】
function buildCharDiffHtml(userStr, correctStr, maskSecret = false) {
    const u = (userStr || '').trim();
    const c = (correctStr || '').trim();
    if (!u) return '';

    const m = u.length, n = c.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (u[i - 1].toLowerCase() === c[j - 1].toLowerCase()) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    // 回溯最佳對齊路徑
    let i = m, j = n;
    const ops = [];
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && u[i - 1].toLowerCase() === c[j - 1].toLowerCase()) {
            ops.push({ type: 'match', uCh: u[i - 1], cCh: c[j - 1] });
            i--; j--;
        } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
            ops.push({ type: 'sub', uCh: u[i - 1], cCh: c[j - 1] });
            i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j] === dp[i][j - 1] + 1)) {
            ops.push({ type: 'missing', uCh: '', cCh: c[j - 1] }); // 學生漏打
            j--;
        } else {
            ops.push({ type: 'extra', uCh: u[i - 1], cCh: '' }); // 學生多打
            i--;
        }
    }
    ops.reverse();

    let out = '';
    for (const op of ops) {
        if (op.type === 'match') {
            out += `<span class="diff-ok">${maskSecret ? op.uCh : op.cCh}</span>`;
        } else if (op.type === 'sub') {
            // 重試防洩題：顯示學生打錯的字元而非正解字元
            const showCh = maskSecret ? op.uCh : op.cCh;
            out += `<span class="diff-err" title="${maskSecret ? '此字元有誤' : '您輸入: ' + op.uCh}">${showCh}</span>`;
        } else if (op.type === 'missing') {
            const showCh = maskSecret ? '_' : op.cCh;
            out += `<span class="diff-err" title="此處漏打 1 個字元">${showCh}</span>`;
        } else if (op.type === 'extra') {
            if (maskSecret) {
                out += `<span class="diff-err" style="text-decoration:line-through;" title="多餘字元">${op.uCh}</span>`;
            }
        }
    }
    const label = maskSecret ? '🔍 您的輸入診斷（紅字為錯字、_ 為漏字、刪除線為多字）' : '🔍 標準拼字比對';
    return `<div class="diff-box">${label}：${out}</div>`;
}
```
*(注意：在第 2698 行「差一字重試」呼叫時，必須傳入 `buildCharDiffHtml(selected, correct, true)` 開啟防洩題遮罩！)*

---

### 補丁 3：修正 SM-2 評分與 `Tab` 提示 / 重試之連動（第 2756～2760 行）

```javascript
// 【補丁 3：真實反映記憶提取品質的 SM-2 Grade 評分】
let grade = 1;
if (isCorrect) {
    if (currentQuestion._usedNearMissRetry || currentHintLevel >= 2) {
        grade = 3; // 靠重試或二階提示才答對：僅給及格邊緣 Grade 3 (EF 小幅下修，縮短間隔)
    } else if (currentHintLevel === 1 || evaluation.reason !== 'exact') {
        grade = 4; // 靠一階首字母提示、同義詞或輕微筆誤容錯通過：給 Grade 4
    } else {
        grade = 5; // 零提示、零重試、精確拼出：給予滿分 Grade 5
    }
}
calculateSM2(prog, grade);
```
*(注意：在第 2691 行觸發重試時設定 `currentQuestion._usedNearMissRetry = true;`，並於 `renderQuestion` 初始化題目時重置 `q._usedNearMissRetry = false;`)。*

---

### 補丁 4：修復 `cleanOcrAnatomyText` 誤殺羅馬數字 `I` 與擴充同義詞庫

1. 在 `cleanOcrAnatomyText`（第 1081、1091 行）：
   * 將羅馬數字 `i, ii, iii, iv, v, vi, vii, viii, ix, x, xi, xii` 加入第 1081 行的保留白名單。
   * 將第 1091 行結尾清理改為僅移除直線符號與數字 `1` 或小寫 `l`，**若字尾大寫 `I` 前方緊鄰解剖學名詞（如 `phalanx`, `digiti`, `bone`, `metacarpal`, `metatarsal`, `carpal`, `tarsal`, `nerve`），絕對保留大寫 `I`**！
2. 在 `ANATOMICAL_SYNONYMS`（第 869 行）加入：
   * `"mammillary process": ["mamillary process", "processus mamillaris"]`
   * `"mamillary process": ["mammillary process", "processus mamillaris"]`
   * `"median sacral crest": ["crista sacralis mediana"]`
   * 並在 `normalizeAnatomyTerm` 中支援單複數 `bones` / `bone` 的智慧容錯比對。

---

## 伍、 審查總結

請將本報告書轉交該 Agent，要求其針對上述 **補丁 1 至 補丁 4** 完成精準修正。一旦上述 4 個補丁落實並通過 Node.js 驗證，V9 版本即可正式核准放行！
