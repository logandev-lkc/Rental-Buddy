# Rental Buddy 第三版（v3）

最後更新：2026-05-10（路徑 `v3/README.md`；上層索引見 [README.md](../README.md)）

## 1) 文件目的

本目錄承載**第三版**開發：在 v1 產品主軸與查核、v2 InBody 報告規格與多數 Phase 已落地的基礎上，集中記錄下一輪**範圍、決策、Backlog 與進度**，避免與已完成的第一、二版文件混寫造成追蹤困難。

## 2) 與既有版本的關係

| 版本目錄 | 角色 | 仍為準則的內容 |
| --- | --- | --- |
| [v1/](../v1/) | 產品主軸、功能 ID（F-xxx）、查核 IA、歷史決策 | `feature-roadmap.md` 中已 **done** 項目與 **D-001**（不做登入／雲端同步） |
| [v2/](../v2/) | 報告 JSON、章節、InBody 版型與 AI 整合規格 | `inbody-report-gen-spec.md`；實作狀態可對照 [v1/progress.md](../v1/progress.md) |
| **v3/** | 第三版專題與新 Backlog | 本目錄各檔；**新功能 ID 建議自 F-015 起**（與 v1 表連續，便於全文搜尋） |

## 3) v3 文件索引

| 檔案 | 說明 |
| --- | --- |
| [README.md](./README.md) | 本檔：範圍、版本關係、開發原則 |
| [feature-roadmap.md](./feature-roadmap.md) | v3 功能候選、切片、驗收與 Out of scope |
| [progress.md](./progress.md) | v3 進度總表（已完成／進行中／待辦） |
| [decisions.md](./decisions.md) | v3 決策紀錄（**D-002** 起；與 v1 決策分檔，便於稽核） |
| [specs/checklist-ux-v3-spec.md](./specs/checklist-ux-v3-spec.md) | 查核表 UX：摘要區／分類／快速狀態與細節（討論稿＋待填矩陣） |
| [specs/checklist-items-overview.md](./specs/checklist-items-overview.md) | 查核卡項目一覽：項目／分類／註解／細節選項（與程式同步） |
| [specs/checklist-full-risk-model-from-source-pdf.md](./specs/checklist-full-risk-model-from-source-pdf.md) | 完整風險模型查核表（依外部 PDF 整理：風險程度＋placeholder＋與 App 差異摘要） |
| [specs/](./specs/) | 其他長篇專題規格 |

## 4) 第三版開發原則（延續 v1）

1. 先定義使用情境，再定義 UI 與資料欄位。
2. 每個功能都要有可驗收標準。
3. 小步快跑；若變更會出現在 GitHub Pages，推送前依工作區規則同步 `docs/`（見 `rental-buddy-web` 之 `deploy:gh`）。
4. **不重新引入** v1 已結案決策：不做帳號登入與雲端同步（D-001／F-008）；跨裝置仍以本機備份（F-014）為準，除非於 [decisions.md](./decisions.md) 另立正式決策推翻。

## 5) 第三版範圍

### 產品敘述（一句話）

以**現場看房**為場景，優化查核表的資訊排版與操作路徑，讓「摘要一眼可讀、分類好切換、每題狀態與細節一致好懂」。

### 本版必達成果（主題）

1. **現場快速摘要**：地址與戶型／條件區塊可讀性與輸入體驗（含重複欄位整理、備註分流、房源條件 chips 是否精簡或下沈）。
2. **分類切換**：處理「全部」與多選分類的邏輯；評估第六槽作為**篩選**或維持**第六分類**（見 [specs/checklist-ux-v3-spec.md](./specs/checklist-ux-v3-spec.md)）。
3. **快速狀態與細節選項**：維持或調整三級狀態語意；釐清點擊／旗幟／展開互動；補齊「細節選項 → quickStatus」規則與視覺語意（風險紅 vs 中性提示）。

詳細問題描述、開放議題與驗收草案見 **[specs/checklist-ux-v3-spec.md](./specs/checklist-ux-v3-spec.md)**。

### 本版明確不做（目前）

- 登入／雲端同步（延續 **D-001**）。
- 除非規格與決策另列：不改動「純本機、備份 JSON」策略。
- 第三版**不以**大幅重做報告 PDF 版型為前提（若摘要欄位結構變更需對齊 v2／報告頁時另開條目）。

---

單一專題若另需長篇拆分，可在 [specs/](./specs/) 新增檔案並於上表「文件索引」補列。
