# 獸醫解剖學專業圖鑑與記憶分析系統（V8 旗艦版）
# 代碼審查與獸醫解剖教育系統架構稽核報告書

---

## 評審委員會結論與總體裁決 (Executive Verdict)

* **審核委員**：首席代碼架構審查員（Lead Code Reviewer）兼 獸醫學博士（Ph.D. in Veterinary Medicine）
* **審核原則**：**嚴格證據主義（Strict Burden of Proof）**——「凡程式碼或回覆中無明確行數與具體邏輯佐證者，一律判定為未實作（Zero-Credit / Missing）。」
* **總體裁決**：<span style="color:#e74c3c; font-weight:bold; font-size:1.2rem;">【REJECTED / 嚴重退件，要求架構重構】</span>
* **核心摘要**：
  該 Agent 所提交之回覆與單一整合檔案 `index.html`，表面上看似完成了 UI 佈局、火焰 Combo 動畫與部分 DOM 樹狀結構，但經逐行代碼與醫學教育邏輯深度審查後，發現存在**致命性架構炸彈（Firestore Batch 超載當機）**、**虛假承諾（聲稱更名會同步進度，代碼中卻完全無寫入）**、**偽間隔重複系統（未採用真實 SM-2，且答錯直接放生 24 小時的逆向教學法）**，以及**零容錯的解剖學字串比對與解剖結構認知矛盾**。舊用戶升級此版本將面臨資料損毀、當機與極差的學習體驗。

---

## 壹、 需求拆解與細部檢查點矩陣 (Granular Checkpoints Matrix)

| 編號 | 檢查點項目 (Checkpoints) | 判定結果 | 證據狀態摘要 |
| :--- | :--- | :---: | :--- |
| **一** | **歷史數據相容性與無痛升級維度** | | |
| CP 1.1 | 舊版扁平題庫 (`quiz_data`) 雙向相容讀取 | **通過** | 代碼中有 `collection(db, "quiz_data")` 降級讀取 |
| CP 1.2 | 舊用戶歷史作答紀錄 (`user_progress`) 完全保全 | **通過** | `query(..., where("userId", "==", ...))` 讀取保留 |
| CP 1.3 | 分類批次更名時歷史作答進度的原子性同步 | **完全未實作 (虛假承諾)** | 代碼中**完全沒有**更新 `user_progress` 的批次代碼 |
| CP 1.4 | Firestore Batch 寫入安全配額機制 (<= 500 操作) | **嚴重違規 (崩潰級)** | 遷移與更名迴圈一次塞入高達 1,200 次操作，必發例外 |
| CP 1.5 | 題目刪除時的級聯清理 (Cascade Cleanup) | **部分缺失** | 刪除題目遺留孤兒進度於 `user_progress` |
| CP 1.6 | 本機圖片資源持久化防丟失 (IndexedDB / Cache) | **完全未實作** | 每次重新整理網頁，記憶體內 `imagesData` 全數蒸發 |
| **二** | **間隔重複與記憶週期系統 (SM-2) 維度** | | |
| CP 2.1 | 標準 SM-2 難易度評分模型 (Grade 0~5 階梯) | **偽實作 (Fake)** | 僅做單純布林值對錯，無 0~5 記憶提取品質分級 |
| CP 2.2 | 真實動態 Ease Factor (EF) 漸進計算公式 | **偽實作 (Fake)** | 隨意寫死 `+0.1` 與 `-0.2`，非 SuperMemo 演算法 |
| CP 2.3 | 答錯即刻重入學習佇列 (Intra-session Relearning) | **嚴重邏輯錯誤** | 答錯立即加 24 小時後才複習，當日直接放生 |
| CP 2.4 | 到期卡片過期權重優先佇列 (Overdue Queue) | **完全未實作** | 使用 `Math.random()` 隨機抽題，毫無優先順序 |
| CP 2.5 | 跨題型認知負擔與記憶權重差異化處理 | **完全未實作** | 選擇題 25% 盲猜與填空題全拼 Latin 升級權重完全相同 |
| CP 2.6 | 學習日期邊界與時區換日平滑處理 (Cutoff Hour) | **部分缺失** | 採用 24 小時滾動毫秒加總，複習時間會逐日延後 |
| **三** | **編輯器與遮蓋功能完整性維度** | | |
| CP 3.1 | 單一遮蓋與多個遮蓋模式無縫切換 | **通過** | 提供 single / multi 模式與按鈕狀態更新 |
| CP 3.2 | 多遮蓋畫布編號標籤 (#1, #2) 與撤銷/清空 | **通過** | 具備 `pendingMasks`、撤銷及全部清空功能 |
| CP 3.3 | 樹狀目錄與未歸檔圖片專區 (Uncategorized) | **通過** | 比對圖片已標註狀態並區分專區 |
| CP 3.4 | 儲存防呆 (下拉挑選現有資料夾 + 新增確認) | **通過** | 具備下拉選單與 prompt 新建機制 |
| CP 3.5 | 畫布繪製效能防禦 (防記憶體洩漏與頻繁解碼) | **嚴重瑕疵** | `mousemove` 每次微小移動皆重新建立 `new Image()` |
| **四** | **獸醫解剖學 (NAV) 博士級專業審核維度** | | |
| CP 4.1 | NAV 規範英/拉雙語及同義詞模糊容錯 (Synonyms) | **完全未實作** | 嚴格全字串比對，學生打英文或拉美縮寫直接判錯 |
| CP 4.2 | 解剖學左右側性鑑別 (Left vs Right Sidedness) | **完全未實作** | 資料模型無側性欄位，無法訓練骨骼翻轉鑑別 |
| CP 4.3 | 同部位/同系統解剖學干擾項生成 (Contextual Pool)| **嚴重缺陷** | 僅靠字尾比對，常抽出跨部位（如顱骨混大腿骨）之笑話題 |
| CP 4.4 | 多視角同名構造遮蔽之考試認知提示矛盾 | **教育邏輯缺陷** | 兩角度同時亮紅框直接洩題，破壞單一視角鑑別本質 |

---

## 貳、 逐項證據審查與合規性稽核 (Evidence-based Audit)

### 1. 舊用戶數據相容性與破壞性漏洞

#### 【檢查點 1.3 證據審查】更名同步作答進度：
* **該 Agent 承諾**：「系統會透過 Firestore writeBatch 一次將該分類下所有題目、圖片關聯與**作答進度**全數同步更名，無需手動在 Firebase Console 一個個修改！」
* **代碼比對（第 443～475 行 `promptBatchRenameCategory`）**：
  ```javascript
  targetQuestions.forEach(q => {
      q.category = newCat;
      // 更新舊扁平文檔
      batch.set(doc(db, "quiz_data", q.id), { category: newCat }, { merge: true });
      // 寫入全新階層位置
      const newTermRef = doc(db, "categories", newCat, "images", sanitizeId(q.image), "terms", q.id);
      batch.set(newTermRef, { ...q, category: newCat }, { merge: true });
      // 刪除舊階層位置
      const oldTermRef = doc(db, "categories", oldCat, "images", sanitizeId(q.image), "terms", q.id);
      batch.delete(oldTermRef);
  });
  ```
* **審查判定**：**虛假承諾！完全未寫！**
  代碼中只對 `quiz_data` 與階層目錄進行更新，**完全沒有任何一行代碼去讀取、修改或批次寫入 `user_progress` 集合**！一旦使用者將 `head_skull` 改名為 `canine_cranium`，舊用戶在 `user_progress` 中原本記錄的 `category: "head_skull"` 將與題庫脫鉤，導致分析儀表板的分類掌握度全部歸零或錯亂。

#### 【檢查點 1.4 證據審查】Firestore 批次寫入配額限制：
* **代碼比對（第 480～499 行 `migrateToHierarchy`）**：
  ```javascript
  for (let i = 0; i < quizDatabase.length; i += 400) {
      const batch = writeBatch(db);
      const chunk = quizDatabase.slice(i, i + 400);
      chunk.forEach(q => {
          const cat = q.category || 'head_skull';
          const termRef = doc(db, "categories", sanitizeId(cat), "images", sanitizeId(q.image), "terms", q.id);
          batch.set(termRef, q, { merge: true });
          const imgRef = doc(db, "categories", sanitizeId(cat), "images", sanitizeId(q.image));
          batch.set(imgRef, { filename: q.image, category: cat, lastUpdated: Date.now() }, { merge: true });
          const catRef = doc(db, "categories", sanitizeId(cat));
          batch.set(catRef, { name: cat, lastUpdated: Date.now() }, { merge: true });
          count++;
      });
      await batch.commit();
  }
  ```
* **審查判定**：**崩潰級 Bug！**
  Google Firestore 官方文件嚴格限制**單一 `writeBatch` 最多只能包含 500 次寫入操作**。
  該代碼將分塊大小設為 `400`，但每處理 1 道題目就調用了 3 次 `batch.set()`（`termRef`, `imgRef`, `catRef`），因此單次 batch 內的操作數高達 $400 \times 3 = 1,200$ 次！只要用戶現有題庫超過 166 題，點擊「一鍵升級」將**百分之百直接觸發 `FirebaseError: A maximum of 500 writes are allowed per request` 並崩潰中止**，導致資料處於半遷移的破爛狀態。
  同理，`promptBatchRenameCategory` 甚至連分批邏輯都沒有，若該分類大於 166 題也必然崩潰。

#### 【檢查點 1.6 證據審查】本機圖片持久化：
* **代碼比對**：
  在腳本全域僅有 `let imagesData = {};`，且資料僅在 `<input type="file" id="folder-input">` 的 `FileReader` 事件中寫入暫存記憶體。
* **審查判定**：**完全未實作。**
  舊用戶每次關閉瀏覽器或重新整理頁面，所有圖片資料全數消失。進入測驗時立即跳出 `alert("找不到這題的圖片...")`，逼迫使用者每次使用都必須手動重新載入資料夾，體驗極差。

---

### 2. 記憶週期系統 (SM-2) 偽實作審查

#### 【檢查點 2.1 & 2.2 證據審查】真實 SM-2 演算法標準核對：
* **標準 SM-2 規範**：
  $$\text{Quality } q \in \{0, 1, 2, 3, 4, 5\}$$
  $$EF' = EF + (0.1 - (5 - q) \cdot (0.08 + (5 - q) \cdot 0.02))$$
  $$\text{其中 } EF \ge 1.3$$
* **該 Agent 之實作代碼（第 701～721 行）**：
  ```javascript
  if (isCorrect) {
      if (prog.repetitions === 0) prog.interval = 1;
      else if (prog.repetitions === 1) prog.interval = 6;
      else prog.interval = Math.round(prog.interval * prog.easeFactor);
      prog.repetitions += 1;
      prog.easeFactor = Math.max(1.3, prog.easeFactor + 0.1);
  } else {
      prog.repetitions = 0;
      prog.interval = 1;
      prog.easeFactor = Math.max(1.3, prog.easeFactor - 0.2);
  }
  prog.nextReviewDate = Date.now() + (prog.interval * 24 * 60 * 60 * 1000);
  ```
* **審查判定**：**偽 SM-2（Mock Algorithm）！**
  代碼中只用了布林對錯，完全沒有提取品質 $q$ 分級，且 Ease Factor 只是隨意寫死 `+0.1` 與 `-0.2` 的小學生加減法，根本不是文獻中的動態間隔遞減函數。

#### 【檢查點 2.3 證據審查】答錯即刻重入學習佇列（致命反教育邏輯）：
* **代碼比對（第 717 行）**：
  當使用者答錯時，程式碼執行：
  ```javascript
  prog.interval = 1;
  prog.nextReviewDate = Date.now() + (1 * 24 * 60 * 60 * 1000);
  ```
* **審查判定**：**嚴重教育邏輯反效果！**
  在真正的間隔重複機制（如 Anki、SuperMemo）中，當學習者答錯一張卡片（Lapse）時，該卡片應立即跌入**當次學習階段佇列（Intra-session Relearning Queue）**（例如設定為 1 分鐘、10 分鐘，或在該次測驗循環結束前再度出現進行補強）。
  該代碼竟然在答錯時直接加上整整 24 小時（`86,400,000` 毫秒），將該題目**直接逐出今日複習池**！學生在本次練習中永遠不會再次看到這道錯題，大腦剛建立的糾錯神經突觸無法得到及時增強，完全違反解剖學實習背誦原理。

#### 【檢查點 2.4 證據審查】到期題目抽取邏輯：
* **代碼比對（第 655～665 行 `nextQuestion`）**：
  ```javascript
  if (dueCards.length > 0) {
      currentQuestion = dueCards[Math.floor(Math.random() * dueCards.length)];
  } else {
      currentQuestion = activePool[Math.floor(Math.random() * activePool.length)];
  }
  ```
* **審查判定**：**完全未實作優先佇列。**
  所有到期題目以 `Math.random()` 隨機抽出，過期 10 天的題目與過期 5 秒鐘的題目抽取機率完全相同，缺乏優先權排序（Overdue Priority Sorting）。

---

### 3. 前端工程效能問題 (Canvas Anti-Pattern)

#### 【檢查點 3.5 證據審查】拖曳畫布時的記憶體洩漏：
* **代碼比對（第 545～570 行）**：
  ```javascript
  canvas.addEventListener('mousemove', e => {
      if (!isDrawing) return;
      // ...
      renderEditorCanvas(); // 高頻事件中每移動 1px 即觸發
  });

  function renderEditorCanvas() {
      // ...
      const img = new Image();
      img.onload = () => { /* 繪圖 */ };
      img.src = imagesData[currentImage]; // Base64 重新解析與解碼
  }
  ```
* **審查判定**：**嚴重效能瑕疵。**
  在 `mousemove` 事件中，游標每滑動一下就創建一個新的 `Image` 物件並對 Base64 字串進行圖像解碼，在一般筆電或平板上將造成嚴重的掉幀與記憶體暴衝（GC Throttling）。應當在切換圖片時快取解碼好的 `ImageBitmap` 或預載 Image 物件，拖曳時僅清空並重繪框線層。

---

## 參、 獸醫學博士級深度批判與致命痛點剖析 (Doctoral-level Critique)

身為獸醫解剖學博士，從犬貓大體解剖學（Canine & Feline Gross Anatomy）的教學實務與臨床執業標準出發，這份代碼顯露出令人無法接受的業餘硬傷：

### 痛點 1：零容錯的字串比對，徹底摧毀醫學生的受挫耐受度
在獸醫解剖學中，國際標準命名法《Nomina Anatomica Veterinaria (NAV)》與臨床通用英語並存。例如：
* **肱骨滑車**：拉丁文為 *Trochlea humeri*，英文為 *Trochlea of humerus*。
* **肩胛岡**：*Spina scapulae* vs *Scapular spine*。
* **大轉子**：*Trochanter major* vs *Greater trochanter*。
* **眶下孔**：*Foramen infraorbitale* vs *Infraorbital foramen*。

該代碼第 680 行竟然直接採用：
`const isCorrect = (selected.trim().toLowerCase() === correct.trim().toLowerCase());`

**獸醫博士之嚴厲批評**：
醫學生在全圖地毯填空時，即使完全掌握解剖位置，只要少打一個 `of the`、拼錯一個贅字，或是依習慣輸入 NAV 拉丁原名而非題庫存入的英文，系統**立即殘酷宣判為錯誤**，將其連勝中斷、Combo 歸零，並將其間隔指數扣除 `0.2`！這不是在測驗解剖學知識，這是在玩「盲猜作者當初打哪種字」的猜謎遊戲。**缺乏同義詞字典（Synonym Mapping）與編輯距離容錯（Levenshtein Distance），此填空系統在醫學教育上完全不及格！**

---

### 痛點 2：同名多遮蓋（Multi-Mask）的教育邏輯悖論與提示洩題
該 Agent 自滿於「同一張圖多個視角出現同一個孔洞時，全數同時亮紅框」的設計。

**獸醫博士之嚴厲批評**：
以枕骨大孔（*Foramen magnum*）或頸靜脈孔（*Jugular foramen*）為例，在犬頭骨的腹側觀（Ventral view）與尾側觀（Caudal view）特徵截然不同。
* 當你把兩個不同視角的同一孔洞**同時點亮成紅色**時，你等於在考試當下**直接打信號彈給學生**：「你看，這兩個紅框在同一個標本的兩個角度，它們是同一個東西喔！」這完全剝奪了學生利用鄰近骨性標記（如枕骨髁 *Occipital condyle*、副髁突 *Paracondylar process*）獨立推導構造的能力。
* 真實的跑檯測驗（Bell-ringer practical）從來都是**單一指示針**指定特定方位，要求學生答出構造名稱**並附帶其所屬骨骼與方位**。此設計完全暴露出開發者對解剖學辨識測驗本質的無知。

---

### 痛點 3：極度粗糙的干擾項庫（Affix-based Distractor Generator）
檢視代碼中的干擾項生成器（`generateSmartDistractors`），只單憑比對是否有 `foramen`、`process`、`fossa` 等字綴。

**獸醫博士之嚴厲批評**：
* 缺乏關鍵獸醫骨骼標記名詞：漏掉了後肢最重要的轉子（`trochanter`）、脛骨/腓骨踝（`malleolus`）、髖臼（`acetabulum`）、枕外隆凸（`protuberance`）、犬特有的翼管（`alar canal`）等。
* 更荒謬的是**缺乏解剖區域與種屬隔絕**：如果在測驗「犬頭骨破裂孔（*Foramen lacerum*）」，系統會因為字尾有 `foramen`，而從題庫抓出「犬肱骨滑車上孔（*Supratrochlear foramen*）」或「坐骨大孔（*Greater ischiatic foramen*）」來當作干擾選項！任何一個修過獸醫解剖學的大一學生，一眼就能刪除這種荒謬的跨系統選項，完全達不到鑑別診斷等級的鑑別度。

---

### 痛點 4：缺乏「左右側辨識」（Sidedness Identification）
在獸醫骨骼學（Osteology）中，能認出這是犬的股骨（Femur）或橈骨（Radius）只拿得到 50 分，**能判斷是「左側（Left）」還是「右側（Right）」才是及格標準**（這需要依據滑車、頭部朝向、粗隆位置等三維空間判斷）。該系統資料庫模型只有 `category`、`image`、`term`，完全沒有任何方位判斷（Cranial / Caudal / Medial / Lateral / Left / Right）的考核維度。

---

## 肆、 具體痛點修復與重構代碼規範 (Actionable Remediation)

針對上述問題，請依據以下工程規範進行完整重構：

### 1. 修正 Firestore 500 寫入上限與更名進度同步
在遷移與更名時，必須採用嚴格的「每批次 100 題（300 操作）」防禦機制，並將 `user_progress` 納入更名範圍：

```javascript
// 【正確的批次遷移防禦代碼】
window.migrateToHierarchySafe = async () => {
    if (quizDatabase.length === 0) return alert("題庫為空！");
    if (!confirm(`即將把雲端現有的 ${quizDatabase.length} 題，以安全批次寫入 Firestore 3 層目錄。是否繼續？`)) return;

    try {
        const BATCH_SIZE = 100; // 100 題 * 3 寫入 = 300 操作 < 500 限制
        let processed = 0;

        for (let i = 0; i < quizDatabase.length; i += BATCH_SIZE) {
            const batch = writeBatch(db);
            const chunk = quizDatabase.slice(i, i + BATCH_SIZE);

            chunk.forEach(q => {
                const cat = sanitizeId(q.category || 'head_skull');
                const img = sanitizeId(q.image);
                const termRef = doc(db, "categories", cat, "images", img, "terms", q.id);
                batch.set(termRef, q, { merge: true });

                const imgRef = doc(db, "categories", cat, "images", img);
                batch.set(imgRef, { filename: q.image, category: cat, lastUpdated: Date.now() }, { merge: true });

                const catRef = doc(db, "categories", cat);
                batch.set(catRef, { name: cat, lastUpdated: Date.now() }, { merge: true });
            });

            await batch.commit();
            processed += chunk.length;
        }
        alert(`🎉 安全升級成功！共計 ${processed} 筆資料已完成階層遷移。`);
    } catch(e) {
        alert("遷移失敗: " + e.message);
    }
};

// 【正確的更名同步代碼：同步更新 user_progress】
window.promptBatchRenameCategorySafe = async () => {
    const oldCat = editorActiveCategory;
    const targetQuestions = quizDatabase.filter(q => q.category === oldCat);
    const newCatInput = prompt(`確定要將【${oldCat}】重新命名嗎？\n請輸入新名稱：`, oldCat);
    if (!newCatInput || !newCatInput.trim()) return;
    const newCat = sanitizeId(newCatInput.trim());
    if (newCat === oldCat) return;

    try {
        const BATCH_SIZE = 100;
        for (let i = 0; i < targetQuestions.length; i += BATCH_SIZE) {
            const batch = writeBatch(db);
            const chunk = targetQuestions.slice(i, i + BATCH_SIZE);

            chunk.forEach(q => {
                q.category = newCat;
                batch.set(doc(db, "quiz_data", q.id), { category: newCat }, { merge: true });
                const newTermRef = doc(db, "categories", newCat, "images", sanitizeId(q.image), "terms", q.id);
                batch.set(newTermRef, { ...q, category: newCat }, { merge: true });
                const oldTermRef = doc(db, "categories", oldCat, "images", sanitizeId(q.image), "terms", q.id);
                batch.delete(oldTermRef);

                // 同步更新 user_progress，防止作答記錄脫鉤
                const progDocId = `${currentUser.uid}_${q.id}`;
                if (userProgress[q.id]) {
                    userProgress[q.id].category = newCat;
                    batch.set(doc(db, "user_progress", progDocId), { category: newCat }, { merge: true });
                }
            });
            await batch.commit();
        }
        editorActiveCategory = newCat;
        updateCategorySuggestions();
        buildCategoryTree();
        renderEditorImageTree();
        updateScopeSummary();
        alert(`🎉 成功！已安全同步【${newCat}】旗下題目與作答記錄。`);
    } catch(e) {
        alert("更名失敗: " + e.message);
    }
};
```

---

### 2. 實裝真實 SM-2 演算法與「答錯當次即刻重測」機制
不再使用 `+0.1 / -0.2` 的假代碼，引入完整的學習佇列與即時重測機制：

```javascript
// 全域當次重測佇列 (Intra-session Relearning Queue)
let relearnQueue = [];

// 【標準 SM-2 演算法】
function calculateSM2(prog, grade) { 
    // grade: 0~5 (5: 完美反應, 4: 稍有遲疑, 3: 勉強答對, 2: 答錯但見答案即憶起, 1: 答錯但有印象, 0: 完全空白)
    if (grade >= 3) {
        if (prog.repetitions === 0) prog.interval = 1;
        else if (prog.repetitions === 1) prog.interval = 6;
        else prog.interval = Math.round(prog.interval * prog.easeFactor);
        prog.repetitions += 1;
    } else {
        prog.repetitions = 0;
        prog.interval = 1; // 隔日複習
    }
    
    // 標準 Ease Factor 公式
    prog.easeFactor = Math.max(1.3, prog.easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));
    prog.nextReviewDate = Date.now() + Math.round(prog.interval * 24 * 60 * 60 * 1000);
    return prog;
}

// 答錯時加入當次學習佇列
function handleAnswerEvaluation(isCorrect, currentQ) {
    let prog = userProgress[currentQ.id] || { repetitions: 0, interval: 0, easeFactor: 2.5 };
    
    if (isCorrect) {
        calculateSM2(prog, 5); // 滿分晉級
    } else {
        calculateSM2(prog, 1); // 降級
        // 關鍵：將錯題推入當次重測佇列，5 題後再次出現強化記憶！
        relearnQueue.push({ question: currentQ, retryCount: (currentQ.retryCount || 0) + 1 });
    }
    return prog;
}
```

---

### 3. 加入解剖學同義詞與容錯字串比對 (Levenshtein Distance)
避免因字形、介系詞或拉丁文轉換導致冤枉扣分：

```javascript
const ANATOMICAL_SYNONYMS = {
    "trochlea of humerus": ["trochlea humeri", "humeral trochlea"],
    "foramen magnum": ["great foramen", "occipital foramen"],
    "greater trochanter": ["trochanter major"],
    "supratrochlear foramen": ["foramen supratrochleare"],
    "spine of scapula": ["spina scapulae", "scapular spine"],
    "carotid canal": ["canalis caroticus"],
    "infraorbital foramen": ["foramen infraorbitale"]
};

function levenshteinDistance(s1, s2) {
    const m = s1.length, n = s2.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (s1[i - 1] === s2[j - 1]) dp[i][j] = dp[i - 1][j - 1];
            else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

function verifyAnatomyAnswer(userTyped, correctTerm) {
    const cleanUser = userTyped.trim().toLowerCase().replace(/\s+/g, ' ');
    const cleanCorrect = correctTerm.trim().toLowerCase().replace(/\s+/g, ' ');
    if (cleanUser === cleanCorrect) return { passed: true, reason: "exact" };

    // 檢查同義詞庫
    const syns = ANATOMICAL_SYNONYMS[cleanCorrect] || [];
    if (syns.some(s => s.toLowerCase() === cleanUser)) {
        return { passed: true, reason: "synonym" };
    }

    // 編輯距離容錯 (允許 1~2 個字母手誤拼錯)
    const dist = levenshteinDistance(cleanUser, cleanCorrect);
    const maxAllowedDist = cleanCorrect.length > 8 ? 2 : 1;
    if (dist <= maxAllowedDist) {
        return { passed: true, reason: "typo_tolerated" };
    }

    return { passed: false };
}
```

---

### 4. 解決圖片重新整理遺失問題（IndexedDB 本機快取）
使用瀏覽器內建 `IndexedDB` 存放使用者載入的 Base64 圖片資料，使使用者隔天重新開啟網頁時，無需再次點選「參考資料」資料夾即可秒開題庫：

```javascript
// 【簡易 IndexedDB 快取圖片模組】
const IDB_NAME = "AnatomyImageStore";
const STORE_NAME = "images";

function openImageDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = (e) => {
            e.target.result.createObjectStore(STORE_NAME, { keyPath: "name" });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function cacheImage(name, dataUrl) {
    const db = await openImageDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ name, dataUrl, cachedAt: Date.now() });
}

async function loadCachedImages() {
    const db = await openImageDB();
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).getAll();
        req.onsuccess = () => {
            const map = {};
            req.result.forEach(item => { map[item.name] = item.dataUrl; });
            resolve(map);
        };
    });
}
```

---

## 伍、 最終結論與對該 Agent 的指令

請該 Agent 依據此審核報告，立即進行以下關鍵修復：
1. **重構批次遷移與更名模組**：將 Batch 寫入限制在 100 題（300 操作）以內，並將 `user_progress` 納入批次更名操作中，杜絕資料脫鉤與 Firestore 500 崩潰。
2. **實裝真實 SM-2 與當次重測佇列（Intra-session Relearning Queue）**：廢除 `+0.1 / -0.2` 假演算法，答錯之題目不可直接放生 24 小時，必須在當次循環內再次抽測直到答對。
3. **加入解剖學同義詞與容錯字串比對**：提供 `ANATOMICAL_SYNONYMS` 辭典與編輯距離（Levenshtein Distance）容錯，防止學生因英語/拉丁文混用被誤判為錯誤。
4. **畫布效能重構與 IndexedDB 圖片持久化**：快取 ImageBitmap 避免在 `mousemove` 中反覆 `new Image()`，並使用 IndexedDB 儲存圖片，免除每次重新整理都要重新載入圖片的困擾。
