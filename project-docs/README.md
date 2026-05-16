# Rental Buddy 專案文件索引

本資料夾依**開發階段**分子目錄：`v1/` 為產品主軸與查核，`v2/` 為報告／InBody 規格，`v3/` 為查核表第三版（已結案），`v4/` 為報告頁第四版（規劃中）。檔名一律使用**英文**（kebab-case），方便版本控制與跨平台路徑。

## v1

| 檔案 | 說明 |
| --- | --- |
| [v1/feature-roadmap.md](./v1/feature-roadmap.md) | 功能 ID、Backlog、決策紀錄、切片路線圖 |
| [v1/progress.md](./v1/progress.md) | 已完成項目、規劃中與待辦摘要 |
| [v1/checklist-ia-f013.md](./v1/checklist-ia-f013.md) | F-013 查核表資訊架構（IA）、慣例對應、驗收對齊 |

## v2

| 檔案 | 說明 |
| --- | --- |
| [v2/inbody-report-gen-spec.md](./v2/inbody-report-gen-spec.md) | 報告 JSON、章節結構、Phase 2～6 與 AI 整合 |

## v3

**狀態：已結案（2026-05-16，`main` @ `2ec8c8e`）**

| 檔案／目錄 | 說明 |
| --- | --- |
| [v3/README.md](./v3/README.md) | 第三版入口：定位、與 v1/v2 關係、開發原則與本版文件索引 |
| [v3/feature-roadmap.md](./v3/feature-roadmap.md) | 第三版 Backlog（建議新 ID 自 F-015 起）、切片與 Out of scope |
| [v3/progress.md](./v3/progress.md) | 第三版進度總表 |
| [v3/decisions.md](./v3/decisions.md) | 第三版決策紀錄（D-002 起） |
| [v3/specs/checklist-ux-v3-spec.md](./v3/specs/checklist-ux-v3-spec.md) | 查核表 UX 第三版（摘要／分類／狀態與細節）討論稿 |
| [v3/specs/](./v3/specs/) | 其他長篇專題規格（見目錄內說明） |

單一專題篇幅過長時，於 [v3/specs/](./v3/specs/) 新增 `*-spec.md`，並於 [v3/README.md](./v3/README.md) 文件索引補列連結。

## v4

**狀態：規劃中（2026-05-16 開案；基線 `main` @ `2ec8c8e`）**

| 檔案／目錄 | 說明 |
| --- | --- |
| [v4/README.md](./v4/README.md) | 第四版入口：報告頁範圍、與 v1～v3 關係、開發原則 |
| [v4/feature-roadmap.md](./v4/feature-roadmap.md) | 第四版 Backlog（F-020 起）、切片與 Out of scope |
| [v4/progress.md](./v4/progress.md) | 第四版進度總表 |
| [v4/decisions.md](./v4/decisions.md) | 第四版決策（D-005 起） |
| [v4/specs/report-v4-spec.md](./v4/specs/report-v4-spec.md) | 報告 IA、單頁 PDF、手機閱讀 |
| [v4/specs/checklist-change-impact.md](./v4/specs/checklist-change-impact.md) | 查核題變更對報告的維護清單 |
| [v4/specs/](./v4/specs/) | 其他長篇專題規格 |

## 路徑沿革（對照）

| 早期檔名 | 上一版檔名（根目錄） | 目前路徑 |
| --- | --- | --- |
| `NEXT-FEATURES.md` | `v1-開發文件-功能路線與待辦.md` | `v1/feature-roadmap.md` |
| `PROGRESS.md` | `v1-開發文件-專案進度總表.md` | `v1/progress.md` |
| `F-013-CHECKLIST-IA-DRAFT.md` | `v1-開發文件-查核表資訊架構草案-F013.md` | `v1/checklist-ia-f013.md` |
| `INBODY-REPORT-GEN-SPEC.md` | `v2-開發文件-InBody報告生成規格.md` | `v2/inbody-report-gen-spec.md` |
| `v3/overview.md` | （同一次建立後更名） | `v3/README.md` |
