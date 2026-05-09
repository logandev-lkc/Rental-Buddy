# Rental Buddy - InBody 風格報告生成與實作規格

## 1) 文件目的
本文件用於規劃 Rental Buddy 的「看房決策報告（InBody 風格）」。
用途包含：

- 讓 ChatGPT 依固定格式生成報告內容。
- 讓前端依固定版型實作 PDF 報告。
- 讓後續開發有一致的切片步驟與驗收標準。

核心原則：PDF 報告不是把網頁畫面直接列印，而是一份獨立的決策報告。

---

## 2) 輸入資料格式（建議 JSON）

請把單筆看房紀錄整理成以下 JSON 再提供給 ChatGPT：

```json
{
  "recordName": "中山站套房",
  "address": "台北市中山區xxx路xx號",
  "monthlyRent": "26000",
  "updatedAt": "2026-05-08 16:30",
  "layout": {
    "layoutType": "套房",
    "rooms": "1",
    "livingRooms": "0",
    "bathrooms": "1",
    "kitchenType": "開放式",
    "areaPing": "12.5",
    "notes": "採光佳，浴室偏小"
  },
  "score": {
    "overall": 78,
    "grade": "B",
    "riskLevel": "中風險",
    "decisionTitle": "可考慮承租",
    "decisionDescription": "整體條件平衡，需留意隔音與通風。"
  },
  "summary": {
    "confirmedCount": 18,
    "totalCount": 26,
    "pendingCount": 8,
    "keyRiskSummary": "隔音、潮濕風險、夜間噪音"
  },
  "categoryScores": [
    { "name": "環境", "score": 72, "confirmed": 4, "total": 6 },
    { "name": "租約", "score": 80, "confirmed": 3, "total": 4 },
    { "name": "安全", "score": 84, "confirmed": 5, "total": 6 },
    { "name": "機能", "score": 75, "confirmed": 3, "total": 5 },
    { "name": "財務", "score": 76, "confirmed": 3, "total": 5 }
  ],
  "checklistTable": [
    {
      "category": "環境",
      "item": "是否有明顯噪音來源",
      "status": "flagged",
      "note": "尖峰時段車流聲明顯"
    },
    {
      "category": "安全",
      "item": "門鎖與門框是否穩固",
      "status": "checked",
      "note": ""
    }
  ]
}
```

### 狀態定義
- `checked`：已確認通過
- `flagged`：已確認但有風險（也算 confirmed）
- `pending`：尚未確認

---

## 3) 輸出報告格式（固定章節）

ChatGPT 輸出時，必須依照下列順序：

1. `報告抬頭`
2. `Overview（總覽）`
3. `風險等級摘要條`
4. `決策建議區`
5. `戶型配置`
6. `分類分數摘要（可對應雷達圖）`
7. `Checklist 明細表`
8. `結論與下一步`

---

## 4) 參考報告分析

參考目標是一頁式 A4 直式報告，風格接近 InBody：資訊密度高、區塊清楚、用數據先建立判斷，再補充明細。

### 4.1 核心版型

1. `Header 基本資訊`
   - 左側：Rental Buddy 品牌與報告名稱。
   - 中間：房源名稱、地址、月租金、格局、坪數、更新時間。
   - 右側：大分數卡，包含總分、等級、風險等級。

2. `Overview 總覽`
   - 以卡片顯示核心數值。
   - 建議包含：Rental Score、等級、已確認項目、待確認項目、同區域平均分數。

3. `AI 分析總結`
   - 左側：整體結論。
   - 中間：主要優勢。
   - 右側：主要風險。
   - 此區是報告的決策核心，必須讓使用者不用看完明細也能理解「能不能租」。

4. `五分類分析`
   - 左側：雷達圖。
   - 右側：分類分數表。
   - 用來呈現哪個面向強、哪個面向弱。

5. `Checklist 明細表`
   - 只放重要項目，不一定放全部 checklist。
   - 優先顯示 flagged、pending、以及會影響決策的 checked 項目。

6. `下一步建議`
   - 提供 3 個具體行動。
   - 例如：二次看房、詢問租約細節、現場測試設備。

### 4.2 建議版面比例

以 A4 單頁直式為目標：

- Header：15%
- Overview：13%
- AI 分析總結：18%
- 五分類分析：24%
- Checklist 明細表：18%
- 下一步建議：10%

若內容過多，優先壓縮 Checklist 明細表，而不是壓縮 Header、Overview 或 AI 分析總結。

### 4.3 視覺設計原則

- 主色：深紅 / 酒紅，用於品牌、分數、風險、章節編號。
- 輔色：黑、灰、淺灰線框，用於資料表與分隔線。
- 字級層級要明確：品牌最大、總分次大、章節標題小而醒目。
- 大分數卡要固定在右上角，形成報告的第一視覺焦點。
- Checklist 不要變成主角，它是佐證資料，不是報告重點。

---

## 5) ChatGPT 生成 Prompt（可直接貼）

```text
你是一位「租屋決策顧問」。請依我提供的 JSON，產出一份 InBody 風格的看房報告。

【輸出要求】
1) 使用繁體中文。
2) 版型要結構化、短句、可直接轉 PDF。
3) 嚴格使用以下章節順序：
   - 報告抬頭
   - Overview（總覽）
   - 風險等級摘要條
   - 決策建議區
   - 戶型配置
   - 分類分數摘要（可對應雷達圖）
   - Checklist 明細表
   - 結論與下一步
4) 「confirmed」= checked + flagged。
5) 對 flagged 項目要有風險提示語。
6) 不要輸出多餘前言，不要解釋你怎麼思考。

【輸出格式細節】
- 報告抬頭：顯示紀錄名稱、地址、月租金、更新時間。
- Overview：顯示 overall score、grade、confirmed/total、pending。
- 風險等級摘要條：用一句話描述風險等級與重點風險。
- 決策建議區：顯示 decisionTitle + 2~3 句 decisionDescription。
- 戶型配置：列出 layoutType、房/廳/衛、kitchenType、areaPing、layout notes。
- 分類分數摘要：以條列列出各分類 score 與 confirmed/total，並補一句高低分解讀。
- Checklist 明細表：欄位為「分類｜項目｜狀態｜備註」，狀態顯示「通過/風險/待確認」。
- 結論與下一步：提供 3 點可執行建議（例如二次看房、談判條件、補件清單）。

以下是資料 JSON：
{{DATA_JSON}}
```

---

## 6) 前端實作對應（你現在的專案）

此規格可直接對應目前報告頁的區塊：
- `Overview` -> 分數/等級/confirmed/pending 卡片
- `風險等級摘要條` -> 風險提示 strip
- `決策建議區` -> decision box
- `戶型配置` -> 你剛新增的 layout 欄位
- `分類分數摘要` -> 雷達圖與分類摘要
- `Checklist 明細表` -> 逐項表格

後續前端實作不應再以網站畫面直接列印為主，而是建立獨立的 `print-sheet` 報告版型。

---

## 7) 切片實作步驟

### Slice 1：建立獨立 PDF 報告骨架

目標：先讓 PDF 有固定的一頁式報告結構。

實作內容：
- 建立或重構 `print-sheet` 容器。
- 固定 A4 直式輸出比例。
- 將報告拆成 6 個主要區塊：
  - `report-header`
  - `overview-score-grid`
  - `ai-summary-panel`
  - `category-analysis`
  - `important-checklist-table`
  - `next-actions`
- print 模式隱藏所有互動 UI，例如頁籤、按鈕、底部操作列、下拉選單。

驗收標準：
- 匯出 PDF 時不出現網站操作按鈕。
- 報告可穩定維持在一頁 A4 內。
- Header、Overview、AI 分析、分類分析、Checklist、下一步建議都有固定位置。

### Slice 2：Header 與大分數卡

目標：建立第一眼可讀的報告抬頭。

實作內容：
- 左側顯示 `Rental Buddy` 與「看房分析報告（InBody Style）」。
- 中間顯示基本資料：
  - 房源名稱
  - 地址
  - 月租金
  - 格局
  - 坪數
  - 更新時間
- 右側顯示大分數卡：
  - overall score
  - grade
  - riskLevel

驗收標準：
- 使用者一眼能看到分數、等級、風險。
- 戶型配置資料有被整合進 Header。

### Slice 3：Overview 數值卡

目標：建立像 InBody 一樣的核心數值摘要。

實作內容：
- 顯示 5 張小卡：
  - Rental Score
  - 等級
  - 已確認項目
  - 待確認項目
  - 同區域平均分數（可先用假資料或保留欄位）
- `confirmed` 計算必須等於 `checked + flagged`。
- Rental Score 可加入簡短刻度條，強化視覺記憶點。

驗收標準：
- 已確認項目與待確認項目數字正確。
- 分數、等級、風險和既有 report getter 一致。

### Slice 4：AI 分析總結

目標：把報告從資料表升級為決策報告。

實作內容：
- 建立三欄區塊：
  - 整體結論
  - 主要優勢
  - 主要風險
- 整體結論可先由現有 getter 產生，例如 `reportDecisionTitle`、`reportDecisionDesc`。
- 主要風險優先取 flagged 項目。
- 主要優勢可先取高分分類或 checked 比例高的分類。

驗收標準：
- 即使不看 Checklist，也能理解這間房子的租屋判斷。
- flagged 項目會被明確提示。

### Slice 5：五分類分析

目標：呈現各租屋面向的強弱。

實作內容：
- 左側放雷達圖。
- 右側放分類分數表。
- 表格欄位：
  - 分類
  - 分數
  - 已確認 / 總數
  - 分析重點
- 分析重點可先用規則產生：
  - 高分：條件良好
  - 中分：可接受但需確認
  - 低分：需優先複查

驗收標準：
- 雷達圖與表格資料一致。
- 使用者能看出哪個分類是優勢、哪個分類是風險。

### Slice 6：重要 Checklist 明細表

目標：避免 PDF 被完整 checklist 撐爆，只顯示決策相關項目。

實作內容：
- 優先排序：
  1. flagged
  2. pending
  3. 有 note 的 checked
  4. 其他重要 checked
- 欄位：
  - 分類
  - 檢查項目
  - 狀態
  - 備註
- 狀態文字：
  - `checked` -> 通過
  - `flagged` -> 風險
  - `pending` -> 待確認

驗收標準：
- PDF 表格不超出一頁。
- 風險項目優先出現。
- 沒有備註時可顯示簡短預設語，例如「未填寫」或留白。

### Slice 7：下一步建議

目標：讓報告最後落到具體行動。

實作內容：
- 固定顯示 3 個建議。
- 建議來源：
  - flagged 風險項目
  - pending 待確認項目
  - 低分分類
- 建議格式：
  - 標題：短句
  - 說明：1~2 句具體行動

驗收標準：
- 建議不是泛泛而談，必須能回到該房源的實際檢查結果。
- 使用者知道下一次看房或談租約要做什麼。

### Slice 8：ChatGPT 生成內容整合（已完成第一版）

目標：讓 AI 文字可以接進固定版型。

實作內容：
- 前端可產生完整 `reportData JSON`。
- 前端可複製一般 ChatGPT 報告 prompt。
- 前端可複製「可匯入 Prompt」，要求 ChatGPT 只回傳固定 JSON。
- 前端提供「貼上 AI 回傳」面板，將 JSON 套用到固定報告區塊。
- AI 內容只覆蓋 `AI 分析總結` 與 `下一步建議`；分數、分類統計與 checklist 明細仍由前端規則產生。

驗收標準：
- 同一份資料可複製固定格式 prompt。
- ChatGPT 回傳 JSON 後可貼回前端並套用到報告。
- AI 文字不破壞 PDF 版面，操作面板不會出現在列印輸出。
- 即使 AI 內容缺漏或被清除，前端仍可用規則產生 fallback。

---

## 8) 實作細節與資料規則

### 8.1 分數與狀態

- `confirmedCount = checkedCount + flaggedCount`
- `pendingCount = totalCount - confirmedCount`
- `flagged` 不代表未完成，而是「已確認有風險」。
- PDF 中應避免使用「完成」這個字，優先使用「已確認」。

### 8.1.1 Rental Score 與 Confidence

報告需拆成兩個核心指標：

- `Rental Score`：評估這間房目前的租屋品質與風險。
- `Confidence`：評估目前資料是否足以支撐這個分數。

第一版公式：

```text
Rental Score = 100 - flagged 扣分 - 高權重 pending 扣分
Confidence = 已確認權重 / 全部權重
已確認 = checked + flagged
```

設計原因：
- `Rental Score` 不應只是完成率，而要反映高風險問題。
- `Confidence` 用來避免資料不足時產生誤導性高分。
- `flagged` 算已確認，但會拉低 `Rental Score`。
- `pending` 不一定代表房子不好，但高權重項目 pending 會降低判斷可信度，並可少量扣分。

報告呈現建議：

```text
Rental Score: 78 / 100
Grade: B+
Risk: 中風險
Confidence: 82% 資料完整
提醒：仍有 3 個高權重項目待確認
```

信心度文字規則：
- `80%` 以上：資料完整
- `50%` 到 `79%`：資料尚可，建議補查
- `50%` 以下：資料不足，暫不建議下結論

### 8.2 重要項目挑選規則

Checklist 明細表建議最多顯示 8~10 筆。

排序優先級：

1. 有風險且有備註的 flagged
2. 有風險但沒有備註的 flagged
3. 有備註的 pending
4. 其他 pending
5. 有備註的 checked

若仍不足，可補上各分類中最關鍵的 checked 項目。

### 8.3 AI 內容匯入規則

第一版不直接串接 API，而是採「複製 prompt → 貼到 ChatGPT → 貼回 JSON」流程。

前端提供三種 AI 輔助操作：
- `複製 AI JSON`：只複製目前房源資料，方便除錯或自行調整 prompt。
- `複製 ChatGPT Prompt`：複製一般 InBody 風格報告生成 prompt。
- `複製可匯入 Prompt`：要求 ChatGPT 只回傳固定 JSON，方便貼回前端。

可匯入 JSON schema：

```json
{
  "conclusion": {
    "title": "整體結論標題",
    "description": "2 到 3 句決策說明"
  },
  "strengths": [
    { "title": "主要優勢", "description": "具體原因" }
  ],
  "risks": [
    { "title": "主要風險", "description": "具體風險提示" }
  ],
  "nextActions": [
    { "title": "下一步標題", "description": "具體可執行建議" }
  ]
}
```

匯入後套用範圍：
- `AI 分析總結` 的整體結論、主要優勢、主要風險。
- `下一步建議` 的 3 個行動項。

不交給 AI 覆蓋的內容：
- `Rental Score`
- `Confidence`
- `Grade`
- `分類分數`
- `Checklist 明細表`

原因：
- 分數與狀態必須由前端規則穩定產生，避免 AI 幻覺或改動數字。
- AI 只負責文字解讀與建議，降低版面與資料一致性風險。
- 若 AI JSON 缺漏、格式錯誤或使用者清除內容，前端會回到規則版 fallback。

### 8.4 戶型配置規則

戶型配置在 PDF 中出現兩次：

- Header：精簡顯示，例如 `套房（1房 / 0廳 / 1衛）`
- AI 分析或基本資料：完整顯示廚房型態、室內坪數、備註

若欄位未填，顯示 `未填寫`，但不要讓空欄位撐出版面。

### 8.5 PDF 版面限制

- 目標：單頁 A4。
- Checklist 明細不是全量資料，完整資料可留在網頁報告頁。
- 若內容過多，優先縮短文字，不要讓報告變成兩頁。
- `@media print` 必須獨立控制，不依賴一般畫面樣式。

---

## 9) 審核表資料補強切片路線

目標：讓現有審核表不只是「打勾紀錄」，而是能穩定支撐 InBody 風格報告的分數、風險、優勢、下一步建議。

目前狀態：
- 現有題目已涵蓋 `合約條件`、`設備狀態`、`安全採光`、`生活機能`、`環境鄰居`。
- 每題目前主要資料為 `checked`、`flagged`、`note`。
- 這足以產生基礎報告，但不足以支撐精準評分、AI 分析總結與下一步建議。

使用者體驗原則：
- 看房現場應以「快速選擇」為主，而不是要求使用者大量打字。
- 優先使用 chips、單選、多選、是/否/不確定、常用選項。
- 輸入框只用於地址、租金、坪數、備註等必要自由文字。
- 備註欄應是補充資料，不應成為完成報告的主要負擔。
- 每個題目都要思考：能不能用 1~2 次點選完成？

### Phase 1：補強評分基礎資料

目標：讓每個 checklist item 都能參與分數與風險計算。

步驟：
1. 為每題補上 `weight`。
   - 建議範圍：`1` 到 `5`。
   - `5` 代表高度影響租屋決策，例如漏水、合約違約金、門鎖安全、逃生設備。
   - `1` 代表舒適性或加分項，例如飲水機、部分生活便利項。
2. 為每題補上 `riskLevel`。
   - 建議值：`low`、`medium`、`high`。
   - 用於判斷報告中的低風險 / 中風險 / 高風險。
3. 為每題補上 `scoreImpact`。
   - 用於 flagged 時扣分。
   - 可先用規則產生：`weight * 4` 或 `weight * 5`。

驗收標準：
- 每題都有基本評分資料。
- `Rental Score` 不再只看完成比例，而會受高風險項目影響。
- 同樣 flagged，一般小問題與重大問題會產生不同扣分效果。

### Phase 2：補強結構化答案

目標：降低自由輸入比例，讓使用者用選擇完成大多數看房紀錄，並讓報告內容更穩定。

步驟：
1. 為高頻題目加入 `answerType`。
   - 可支援：`singleSelect`、`multiSelect`、`number`、`text`。
   - 預設優先順序：`singleSelect` > `multiSelect` > `number` > `text`。
   - 除非真的需要自由描述，否則不要預設使用 `text`。
2. 為選單題加入 `options`。
   - 例如 `水電費計算方式`：
     - 台水台電
     - 房東自訂
     - 包水電
     - 尚未確認
   - 例如 `隔音狀況`：
     - 安靜
     - 可接受
     - 車流聲明顯
     - 鄰戶聲明顯
     - 晚上需二次確認
3. 針對每題提供「快速狀態」。
   - 建議選項：`良好`、`可接受`、`需注意`、`尚未確認`。
   - 使用者可先選狀態，必要時再補備註。
4. 在 `ItemState` 補上結構化答案欄位。
   - 建議欄位：`answer` 或 `answers`。
   - `note` 保留作為補充說明。
5. 將備註欄改成「可展開」或「補充說明」。
   - 預設不要佔太多畫面。
   - 讓使用者先完成選擇，再決定要不要補文字。

驗收標準：
- 使用者看房時可以用點選完成大多數填寫。
- 每個分類中至少 70% 題目可不用打字完成。
- 報告可以引用固定答案，不必完全依賴備註文字。
- ChatGPT 生成報告時能拿到更乾淨的 JSON。

**實作對齊（Rental Buddy Web，2026-05-09）**：查核項以 `ItemState.selectedOptions`（細節 chips）與 `quickStatus`（良好／可接受／需注意／尚未確認）承載結構化輸入；`itemOptionConfig` 覆蓋率為合約 5/7、設備 7/10、安全 5/7、生活 4/5、鄰里 5/6，各分類皆達 ≥70%。程式未逐題標 `answerType` 字串，而以「該題是否具 options 設定」表達同一意圖。

### Phase 3：補強房源基本資料

目標：讓 Header 與 AI 分析有足夠上下文。

步驟：
1. 補齊基本資料欄位：
   - 樓層
   - 建物類型
   - 屋齡
   - 是否有電梯
   - 是否有管理員
   - 管理費
   - 押金
   - 最短租期
   - 可否開伙
   - 可否養寵物
   - 是否可申請租補
2. 將部分欄位與既有 checklist 題目連動。
   - 例如 `可否養寵物 / 開伙` 可同時出現在基本資料與合約條件。
   - 例如 `管理員` 可同時出現在基本資料與環境鄰居。
3. Header 只顯示精簡摘要，其餘放在 AI 分析或詳細資料區。

驗收標準：
- PDF Header 可完整呈現房源基本輪廓。
- AI 分析不只依賴 checklist，也能考慮房源背景。
- 未填資料不會造成 PDF 版面破裂。

**實作對齊（Rental Buddy Web，2026-05-09）**：查核表「戶型與房源條件」區塊已具 `propertyChoiceGroups`（建物、樓層、屋齡、電梯、管理員、管理費、押金、租期、開伙、寵物、租補）；列印抬頭以 `propertySummaryText` 摘要。並新增 **房源 chips ↔ 查核題連動**：`depositMonths`/`managementFeeType`/`subsidyAvailable`/`hasManager` 與 **c3／c4／c1／n4** 細節選項雙向同步；`canCook`/`canPet` 與 **c7** 快速狀態同步（不覆寫 c7 備註）。**n4** 細節選項與「管理員」同一組（有／無／不確定）。切換紀錄與首次載入會 `reconcileLinkedChecklistFromProperty()` 以房源欄位對齊查核狀態。

### Phase 4：補強報告文案資料

目標：讓「主要優勢」、「主要風險」、「下一步建議」可由資料穩定產生。

步驟：
1. 為每題補上 `positiveText`。
   - checked 時可作為主要優勢候選。
2. 為每題補上 `riskText`。
   - flagged 時可作為主要風險候選。
3. 為每題補上 `nextAction`。
   - flagged 或 pending 時可產生下一步建議。
4. 補上 `reportPriority`。
   - 用於決定哪些項目應出現在 PDF 的重要明細表。

驗收標準：
- AI 分析總結即使不接 ChatGPT，也能先用規則產生可讀內容。
- flagged 項目能對應具體風險文字。
- 下一步建議能回到實際檢查結果，而不是泛泛而談。

### Phase 5：新增缺漏檢查項目

目標：補足真實看房痛點，但避免一次把審核表做得過長。

建議新增題目：
- 氣味：菸味、油煙味、霉味、寵物味。
- 蟲害：蟑螂、螞蟻、蚊蟲、排水孔異味。
- 浴室：通風、排水、熱水穩定、乾濕分離。
- 收納：衣櫃、鞋櫃、雜物空間。
- 插座與電力：插座數量、位置、是否老舊。
- 採光與通風：白天採光、空氣流通、窗戶可否開啟。
- 曬衣動線：陽台、室內曬衣、公共曬衣區。

驗收標準：
- 新增題目優先補齊高風險與高頻痛點。
- 題目數量仍維持現場可快速完成。
- 每個新增題目都要同時具備 `weight`、`riskLevel`、`positiveText`、`riskText`、`nextAction`。

### Phase 6：同區比較資料

目標：支撐報告中的「同區域平均分數」或「同區候選平均分數」。

步驟：
1. MVP 先使用「同區候選平均」。
   - 來源：使用者自己建立的同區房源紀錄。
   - 不宣稱是市場平均。
2. 後續若有地址或區域欄位，可依行政區分組。
3. 報告顯示文字建議使用：
   - `同區候選平均`
   - 避免使用 `同區市場平均`，除非有外部資料來源。

驗收標準：
- 報告不會顯示沒有根據的市場數據。
- 有多筆同區紀錄時，可以產生比較基準。
- 沒有足夠資料時，欄位顯示 `資料不足`。

### 建議執行順序

1. Phase 1：評分基礎資料
2. Phase 4：報告文案資料
3. Phase 2：結構化答案
4. Phase 3：房源基本資料
5. Phase 5：新增缺漏檢查項目
6. Phase 6：同區比較資料

原因：
- 先補 `weight`、`riskLevel`、文案資料，可以最快讓報告變可信。
- 選單式答案與房源資料會影響 UI，適合在資料規則穩定後再做。
- 新增題目應該放後面，避免審核表先變長但分析能力沒有提升。

---

## 10) 實務建議

- 若要穩定生成一致格式，建議每次都給完整 JSON，不要只給自然語言描述。
- 可先用本規格產生 Markdown，再交由前端排版成 PDF。
- 若要「更像 InBody」，下一步可加入：
  - 分數區塊固定版面比例（大分數 + 小摘要）
  - 風險色階（低/中/高）
  - 分類排名（Top risk / Top strength）
