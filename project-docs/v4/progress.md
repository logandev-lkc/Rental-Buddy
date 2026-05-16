# Rental Buddy 第四版 — 進度總表

最後更新：2026-05-16（**v4 規劃中**；路線圖見 [feature-roadmap.md](./feature-roadmap.md)、總覽見 [README.md](./README.md)）

## 開案摘要

| 項目 | 說明 |
| --- | --- |
| **狀態** | 規劃中（文件已建立，實作未開始） |
| **開案日** | 2026-05-16 |
| **上線基線（起點）** | `main` @ `2ec8c8e`（v3 結案點） |
| **主題** | 報告頁：手機閱讀、v3 資料對齊、單頁 InBody PDF |

---

## 起點狀態（第四版開案時）

- **查核表**：v3 已結案（F-015～F-019）；摘要、篩選、quickStatus／細節選項已上線。
- **報告頁**：v1 F-005～F-006、F-012 與 v2 InBody 規格多數已實作；現況為單一 `App` 元件內 `print-sheet` + 圖文版長清單 + 頂部雙模式切換。
- **已知痛點**：手機難讀、PDF 常超一頁、螢幕版與 v3 填寫體驗認知不一致（見 [specs/report-v4-spec.md](./specs/report-v4-spec.md)）。
- **v4 文件**：README、Backlog、決策、報告規格、查核變更影響說明已建立。

---

## 已完成項目（v4）

### 文件與規格

1. **v4 目錄與索引**：[README.md](./README.md)、[feature-roadmap.md](./feature-roadmap.md)、[decisions.md](./decisions.md)。
2. **報告主規格**：[specs/report-v4-spec.md](./specs/report-v4-spec.md)。
3. **查核題變更指引**：[specs/checklist-change-impact.md](./specs/checklist-change-impact.md)。
4. **上層索引**：[project-docs/README.md](../README.md) 已補 v4 區塊。

### 功能實作

（無 — 待排程 Slice v4-1。）

---

## 進行中（v4）

（無。）

---

## 規劃中／待辦（v4）

| 順序 | ID | 摘要 |
| --- | --- | --- |
| 1 | **F-020** | 單頁 PDF：內容預算、列印 CSS、附件策略 |
| 2 | **F-021** | 手機決策首屏、Top N、摺疊明細 |
| 3 | **F-022** | v3 欄位與 quickStatus／chips 對齊 |
| 4 | **F-023** | 閱讀 + 列印預覽（**D-005**） |
| 5 | **F-024** | 多房源比較降級（**D-007**） |
| 6 | **F-026** | 查核題變更維護流程落地 |
| — | **F-025** | ReportViewModel（可選，建議早做） |

---

## 開發與部署注意（延續）

- 開發：`rental-buddy-web/` → `npm start`；建置 `npm run build`。
- 報告／列印回歸：查核填寫 → 報告首屏 → 預覽列印版 → 匯出 PDF（iOS Safari + Android Chrome 各至少 1 次）。
- GitHub Pages：前端變更需上線時執行 `npm run deploy:gh` 並提交 `docs/`。
