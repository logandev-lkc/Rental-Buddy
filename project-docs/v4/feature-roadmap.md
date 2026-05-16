# Rental Buddy 第四版 — 功能路線與 Backlog

最後更新：2026-05-16（**v4 規劃中**；總覽見 [README.md](./README.md)）

## 說明

- 本檔僅追蹤**第四版**（報告頁）範圍。v1～v3 歷史狀態見各版 `feature-roadmap.md`／`progress.md`。
- 新功能 ID **自 F-020 起** 遞增，與 v1 表連續。
- 狀態：`pending`／`ready`／`in_progress`／`done`／`cancelled`（定義同 v1）。
- 報告細節規格：[specs/report-v4-spec.md](./specs/report-v4-spec.md)。決策：[decisions.md](./decisions.md)（**D-005** 起）。

---

## 功能候選清單（Backlog）

| ID | 功能名稱 | 使用者價值 | 狀態 | 優先級 | 備註 |
| --- | --- | --- | --- | --- | --- |
| F-020 | 單頁 InBody PDF | 匯出文件像正式檢驗單，固定一頁 A4 | pending | **P0** | 內容預算、壓縮 Header／Overview、附件策略 **D-008** |
| F-021 | 報告手機閱讀 IA | 首屏 3 秒內看懂能不能租 | pending | **P1** | 決策卡、Top N 優劣勢、長清單摺疊 |
| F-022 | 報告與 v3／查核資料對齊 | 查核怎麼填，報告就怎麼呈現 | pending | **P1** | 房源條件、quickStatus、chips；見 checklist-change-impact |
| F-023 | 閱讀版 + 列印預覽（取代雙模式切換） | 減少「圖文／表格」混淆 | pending | P2 | 決策 **D-005**；底部「預覽列印版」「匯出 PDF」 |
| F-024 | 多房源比較降級 | 報告首屏專注單一房源決策 | pending | P2 | 決策 **D-007**；摺疊或子流程 |
| F-025 | ReportViewModel 抽取（可選） | 改報告不動 4500 行 app.ts | pending | Low | 建議 Slice 1 末或 Slice 2 前完成 |
| F-026 | 查核題變更維護流程 | 新增／刪題後報告仍正確 | pending | Medium | 文件 + 開發自查；非使用者功能 |

---

## 建議切片路線圖

### Slice v4-1：單頁 PDF（**F-020**）— P0

**目標**：iOS Safari、Android Chrome 列印「另存為 PDF」≤ 1 頁。

**實作要點**（詳見 spec §4）：

- Header meta ≤ 6 行；合併戶型／條件。
- Overview 去除與決策卡重複的長段評價。
- Checklist 明細 ≤ 8 行、備註字數上限。
- 附件：預設 **0～1 張小圖** 或僅文字「共 N 張」（**D-008**）。
- 必要時匯出前 `transform: scale()` 保險（仍維持 **D-006** `window.print()`）。

**驗收**：

- [ ] 實機列印無 App 導覽／按鈕。
- [ ] 同紀錄、含 AI 文案、含 3 張附件之極端案例仍 ≤ 1 頁（或決策放寬須更新 **D-008**）。

---

### Slice v4-2：手機閱讀版（**F-021**）— P1

**目標**：報告首屏決策資訊完整；完整查核明細不預設全展開。

**實作要點**（spec §3）：

- 固定首屏：Rental Score、等級、風險、決策標題＋一句描述。
- 優點／風險／待確認：預設各 **3 筆**，其餘「查看全部」。
- `reportPros`／`reportCons` 不再預設列出全部已確認題（避免幾十項捲動）。

**驗收**：

- [ ] 375px 寬度下，首屏可見決策標題與分數（無需捲動）。
- [ ] 點「查看全部」可展開完整清單。

---

### Slice v4-3：資料對齊（**F-022**、**F-026**）— P1

**目標**：v3 摘要區與查核狀態在報告可見；開發改題有檢查清單。

**實作要點**：

- 首屏或摘要區顯示 `propertySummaryText`（與列印 meta 一致）。
- 詳細分析列顯示 quickStatus 標籤與細節 chips（與 `formatChecklistNote` 一致）。
- 建立 [checklist-change-impact.md](./specs/checklist-change-impact.md) 並於改 `items[]` 時自查。

**驗收**：

- [ ] 僅填 chips、未寫備註時，螢幕報告仍可見細節。
- [ ] `reportDataForAi` 與畫面關鍵欄位一致（抽樣 3 筆紀錄人工對照）。

---

### Slice v4-4：模式合併與比較降級（**F-023**、**F-024**）— P2

**目標**：移除頂部「圖文版｜表格版」；比較不佔首屏。

**實作要點**：

- 全螢幕或 Bottom Sheet 顯示 `print-sheet` 預覽。
- 比較區預設收合；雷達預設單房源，比較時才多曲線。

**驗收**：

- [ ] 新使用者無需理解兩種「模式」即可完成匯出。
- [ ] 報告開啟時首屏無比較 pills（除非使用者展開）。

---

### Slice v4-5（可選）：ReportViewModel（**F-025**）

- 新增 `report-view-model.ts`（或同目錄模組），`app.ts` 委派 getter。
- 驗收：行為與重構前一致；單元測試或快照 JSON 擇一。

---

## 決策紀錄（v4）

請見 [decisions.md](./decisions.md)（**D-005**～**D-008**）。

---

## 非本版範圍（Out of scope）

- 登入／雲端同步（**D-001**）。
- 伺服器端 PDF（Puppeteer 等）。
- html2canvas 主路線匯出。
- 查核表第六分類、篩選邏輯大改（屬 v3，已結案）。
- 更換評分演算法（除非為修 bug；分數規則仍以 v2 §8 與現行 `itemScoringWeights` 為準）。
