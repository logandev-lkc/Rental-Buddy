# Rental Buddy 第四版（v4）

最後更新：2026-05-16（**規劃中**；上線基線起點 `main` @ `2ec8c8e`；上層索引見 [README.md](../README.md)）

## 1) 文件目的

本目錄承載**第四版**開發：在 v3 查核表現場體驗結案後，集中優化**報告頁**（手機閱讀、與查核資料對齊、InBody 單頁 PDF），並記錄範圍、決策、Backlog 與進度。

## 2) 與既有版本的關係

| 版本目錄 | 角色 | 仍為準則的內容 |
| --- | --- | --- |
| [v1/](../v1/) | 產品主軸、功能 ID、查核 IA、**D-001** | `feature-roadmap.md`；F-005～F-007、F-012 等報告相關 **done** 條目 |
| [v2/](../v2/) | 報告 JSON、章節、InBody 版型、AI 整合、列印原則 | [inbody-report-gen-spec.md](../v2/inbody-report-gen-spec.md)（v4 **差異**寫在 v4 specs） |
| [v3/](../v3/) | 查核表 UX（**已結案**） | 摘要區、篩選、quickStatus／細節選項；報告須**對齊** v3 資料欄位 |
| **v4/** | 報告頁專題 | 本目錄；**新功能 ID 自 F-020 起** |

## 3) v4 文件索引

| 檔案 | 說明 |
| --- | --- |
| [README.md](./README.md) | 本檔：範圍、版本關係、開發原則 |
| [feature-roadmap.md](./feature-roadmap.md) | v4 Backlog（F-020 起）、切片、Out of scope |
| [progress.md](./progress.md) | v4 進度總表 |
| [decisions.md](./decisions.md) | v4 決策（**D-005** 起） |
| [specs/report-v4-spec.md](./specs/report-v4-spec.md) | 報告頁 IA、單頁 PDF、資料對齊、查核題變更檢查清單 |
| [specs/checklist-change-impact.md](./specs/checklist-change-impact.md) | 新增／刪除查核題時，報告與設定表維護指引 |
| [specs/](./specs/) | 其他長篇專題規格 |

## 4) 第四版開發原則（延續 v1／v3）

1. 先定義使用情境（事後決策、匯出給他人），再改 UI 與列印版型。
2. 每個功能具可驗收標準（含 iOS Safari／Android Chrome 列印抽樣）。
3. 小步快跑；前端變更若需上線 GitHub Pages，推送前執行 `rental-buddy-web` 的 `npm run deploy:gh` 並提交 `docs/`。
4. **不重新引入 D-001**：不做登入／雲端同步；PDF 維持本機 `window.print()`（見 **D-006**）。
5. **調整為主、局部重構為輔**：不重寫整個 App；優先內容預算與 IA，再抽 `ReportViewModel`（**F-025**）。

## 5) 第四版範圍

### 產品敘述（一句話）

讓使用者在看房後**三分鐘內**從報告頁看懂「能不能租」，並匯出**一頁 A4**、與 v3 查核資料一致的 InBody 風格 PDF。

### 痛點與優先（已確認）

| 優先 | 痛點 | v4 對應 |
| --- | --- | --- |
| P0 | 匯出 PDF 常超過一頁 | **F-020** 單頁 PDF 內容預算與列印版型 |
| P1 | 手機報告不好讀 | **F-021** 決策首屏與摺疊長清單 |
| P1 | v3 查核與報告呈現對不上 | **F-022** 資料對齊與 [checklist-change-impact.md](./specs/checklist-change-impact.md) |
| P2 | 圖文／表格雙模式混淆 | **F-023** 閱讀版 + 列印預覽（**D-005**） |
| P2 | 多房源比較佔首屏 | **F-024** 比較降級（**D-007**） |

### 本版必達成果（主題）

1. **單頁 InBody PDF**：`print-sheet` 在實機列印 ≤ 1 頁 A4（見 [specs/report-v4-spec.md](./specs/report-v4-spec.md) §4）。
2. **手機決策首屏**：分數、等級、風險、一句建議置頂；長清單預設摺疊或僅顯示 Top N。
3. **與 v3／查核題一致**：房源條件、`quickStatus`、細節 chips 在螢幕報告與 AI JSON 可見；改 `items[]` 有維護檢查清單。
4. **報告資訊架構**：合併「圖文版／表格版」為「閱讀 + 列印預覽 + 匯出」（**D-005**）。

### 本版明確不做（目前）

- 登入／雲端同步、後端 PDF 服務（**D-006**）。
- 以 html2canvas 截圖為主的 PDF 主路線。
- 查核表 IA 大改（除非報告缺資料且無法由 v4 規格補足）。
- AI API 直連（維持 prompt + JSON 貼回，延續 v2／F-012）。

---

## 6) 開案狀態

| 項目 | 說明 |
| --- | --- |
| **狀態** | 規劃中（文件已建立，實作待排程） |
| **程式基線** | `main` @ `2ec8c8e`（v3 結案點） |
| **Backlog** | [feature-roadmap.md](./feature-roadmap.md)（F-020～F-026） |
| **主規格** | [specs/report-v4-spec.md](./specs/report-v4-spec.md) |

單一專題若需長篇拆分，於 [specs/](./specs/) 新增 `*-spec.md` 並更新本檔「文件索引」。
