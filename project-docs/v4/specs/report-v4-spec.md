# Rental Buddy 第四版 — 報告頁規格

> **v4**：`v4/specs/report-v4-spec.md`。InBody 章節與 AI 規則仍以 [v2/inbody-report-gen-spec.md](../../v2/inbody-report-gen-spec.md) 為準；本檔記錄 **v4 差異與驗收**。

最後更新：2026-05-16

## 1) 文件目的

- 定義報告頁**手機閱讀**資訊架構（**F-021**）。
- 定義**單頁 A4 PDF** 內容預算與列印行為（**F-020**、**D-006**、**D-008**）。
- 對齊 v3 查核填寫資料（**F-022**）。
- 取代「圖文版／表格版」雙模式產品語意（**D-005**、**F-023**）。

---

## 2) 產品架構：閱讀 vs 列印（D-005）

### 2.1 原則（延續 v2）

- **螢幕報告**：可捲動、可摺疊、輔助決策與比較（精簡呈現）。
- **列印報告**（`print-sheet`）：固定 InBody 一頁式文件，非螢幕截圖。

### 2.2 v4 入口（目標狀態）

```text
報告頁
├── 閱讀版（預設，全寬手機優化）
├── 底部固定： [ 預覽列印版 ]  [ 匯出 PDF ]
├── 預覽列印版 → 全螢幕／Bottom Sheet 顯示 print-sheet
└── 工具與 AI（收合，維持現有 prompt／JSON 貼回）
```

**移除**：頂部 `圖文版 | 表格版` 同級切換（`report-toolbar` 內 `report-view-toggle`）。

**保留**：`reportViewMode` 可內部改為 `reading | printPreview`，或僅用布林 `printPreviewOpen`。

---

## 3) 手機閱讀版（F-021）

### 3.1 首屏（不捲動即可見，375px 寬）

| 區塊 | 內容 | 資料來源 |
| --- | --- | --- |
| 決策卡 | Rental Score、等級、風險標籤 | `reportScore100`、`reportGrade`、`reportRiskLevelLabel` |
| 決策句 | 標題 + 1～2 句描述 | `displayReportConclusionTitle`／`Desc`（AI 優先，否則規則版） |
| 房源一行 | 名稱、地址（可截斷） | `activeRecord` |
| 條件一行 | 房源 chips 摘要 | `propertySummaryText` |

### 3.2 第二屏（摘要 KPI）

- 已確認、標記問題、待確認、信心度（維持 chips 或精簡列）。
- 附件：僅顯示張數 + 最多 3 縮圖（維持 F-007 行為）。

### 3.3 優勢／風險／待確認（改為 Top N）

| 現況問題 | v4 行為 |
| --- | --- |
| `reportPros` 列出**全部**已確認題，動輒 30+ 項 | 預設 **3 筆**（依 weight／備註優先），「查看全部」展開 |
| 風險、待確認同理 | 預設各 3 筆，可展開 |

排序可沿用 `reportSummaryStrengths`／`reportSummaryRisks` 邏輯。

### 3.4 多房源比較（D-007、F-024）

- **預設收合**區塊：「與其他候選房源比較」。
- 展開後：pills、簡表、雷達（多曲線）。
- 雷達區**預設僅當前房源**；比較 ≥2 間時才疊加曲線。

### 3.5 詳細分析

- 保留優／缺／待三分類，但預設**收合**或僅在「查看全部」內。
- 每列顯示：
  - 題目標題
  - `quickStatus` 標籤（良好／可接受／需注意／尚未確認）
  - 細節 chips 或備註（同 `formatChecklistNote`）

### 3.6 驗收（F-021）

- [ ] 375×667：首屏可見分數 + 決策標題，無需捲動。
- [ ] 展開前捲動長度 < 現行基線 50%（以同一紀錄人工比對）。
- [ ] 僅填 chips、無備註：詳細列仍可辨識內容。

---

## 4) 單頁 InBody PDF（F-020、D-006、D-008）

### 4.1 技術

- 維持 `exportReportAsDocument()` → `window.print()` + `body.printing-report`。
- `#reportExportArea > :not(.print-sheet) { display: none }` 維持（只印文件版）。

### 4.2 內容預算（硬上限）

| 區塊 | v4 限制 | 備註 |
| --- | --- | --- |
| Header `print-meta` | ≤ **6** 行 | 合併：戶型+房廳衛+廚房坪數 → 一行；條件一行 |
| Overview KPI | 1 列 4～6 格 | 刪除與決策卡重複的長「房屋評價」段 |
| 風險條 + 決策盒 | 各 ≤ 2 行 | 字數上限見下 |
| AI 三欄 | 每欄 ≤ **3** bullet，每 bullet ≤ 40 字 | 超出 truncate |
| 五分類表 | 5 行 + 表頭 | 固定 |
| Checklist 重要表 | ≤ **8** 行 | 已有 `.slice(0, 8)` |
| 備註欄 | ≤ **28** 字／格 | CSS `line-clamp` 或 JS 截斷 |
| 雷達 + 表 | 同區不增高 | 必要時縮小雷達 SVG |
| 附件 | **0～1** 張小圖 +「共 N 張」 | **D-008** |
| 下一步 | 3 條，每條 1 行描述 | 固定 |

### 4.3 超頁處理順序

1. 刪減重複文案（Overview 內評價段）。
2. 縮短 AI／備註字數。
3. 附件改 0 張（僅文字）。
4. `@media print` 字級微調（現約 `0.6875rem`）。
5. 匯出前量測 `#print-sheet` 高度，若 > 單頁可用高度，對 `.print-sheet` 套用 `transform: scale(0.92～0.98)`（保險，非首選）。

### 4.4 驗收（F-020）

- [ ] iOS Safari：另存 PDF，**1 頁**，無底部導覽／按鈕。
- [ ] Android Chrome：同上。
- [ ] 極端案例：8 行 checklist 全含長備註 + AI 三欄滿文 + 1 附件 → 仍 1 頁（或記錄例外並修 **D-008**）。

### 4.5 與 v2 版面比例（參考）

v2 §4.2 建議比例仍作設計參考；若內容衝突，**優先單頁**，其次才是比例。

---

## 5) 資料與 v3 對齊（F-022）

- 列印 meta「條件」= `propertySummaryText`（已實作）。
- 螢幕首屏須同時顯示條件摘要（v4 新增）。
- `formatChecklistNote` 為備註欄唯一格式化函式（螢幕 + 列印 + JSON 共用）。
- 分數、等級、confidence：**不得**由 AI JSON 覆蓋（v2 §8.3）。

查核題維護見 [checklist-change-impact.md](./checklist-change-impact.md)。

---

## 6) 實作對照（現行程式）

| 概念 | 檔案／符號 |
| --- | --- |
| 題目清單 | `app.ts` → `items` |
| 列印 DOM | `app.html` → `.print-sheet` |
| 閱讀 DOM | `app.html` → `@if (reportViewMode === 'friendly')` 區塊 |
| 匯出 | `exportReportAsDocument()` |
| 列印樣式 | `app.css` → `@media print` |
| 雙模式 | `reportViewMode: 'friendly' \| 'compact'` → v4 改語意 |

---

## 7) 開放問題（實作前可定案）

| # | 問題 | 建議預設 |
| --- | --- | --- |
| Q1 | 列印預覽用全螢幕 Modal 或 Bottom Sheet？ | 全螢幕 Modal（內容高） |
| Q2 | 「匯出 PDF」是否強制先預覽一次？ | 首次強制，之後可記住略過 |
| Q3 | scale 保險最低字級？ | 不低於 9pt 等效 |

定案後請更新 [decisions.md](../decisions.md) 或本節表格。

---

## 8) 相關功能 ID

| ID | 本檔章節 |
| --- | --- |
| F-020 | §4 |
| F-021 | §3 |
| F-022 | §5 |
| F-023 | §2 |
| F-024 | §3.4 |
| F-025 | §6（抽取 ViewModel） |
| F-026 | [checklist-change-impact.md](./checklist-change-impact.md) |
