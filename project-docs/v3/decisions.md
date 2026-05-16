# Rental Buddy 第三版 — 決策紀錄

最後更新：2026-05-16（路徑 `v3/decisions.md`；總覽見 [README.md](./README.md)）

## 說明

- 本檔只收錄**第三版期間**新定案或可推翻舊判斷的決策。
- v1 既有決策（例如 **D-001** 不做登入／雲端同步）仍以 [v1/feature-roadmap.md](../v1/feature-roadmap.md) 為權威來源；若 v3 要改變該方向，必須在本檔新增條目並說明理由與日期。
- 編號慣例：**D-002** 起遞增（與 v1 的 D-001 連號）。

---

## 決策列表

| ID | 日期 | 主題 | 結論摘要 |
| --- | --- | --- | --- |
| **D-002** | 2026-05-16 | 分類列第六槽：新分類 vs「篩選」入口 | 採用**篩選**入口（`category-chip-filter` + 條件面板）；前五槽維持五大分類可多選；未選任何分類＝顯示全部。 |
| （候選 D-003） | — | 快速狀態三級定義與細節選項聚合規則 | 實作與 [specs/checklist-ux-v3-spec.md](./specs/checklist-ux-v3-spec.md) §7 對齊；若需再修訂語意另開 v4 決策。 |
| （候選 D-004） | — | 風險向 vs 中性提示的底色／字色語意 | 延續 v1／v2 風險色；第三版以 spec §5 稽核為準，未另改全局 token。 |

與 [specs/checklist-ux-v3-spec.md](./specs/checklist-ux-v3-spec.md) 開放問題對齊。

---

### D-002：分類列第六槽為「篩選」

- **決議日**：2026-05-16
- **背景**：查核工具列僅五個內容分類，需決定第六槽是新增分類或改為篩選／其他入口。
- **選項**：（A）第六分類；（B）篩選面板；（C）其他（例如「全部」獨立鈕）。
- **結果**：採用 **方案 B** — 第六槽為「篩選」，開啟查核條件面板；分類 chips 可多選，**未選＝全部**。
- **影響範圍**：`rental-buddy-web` 查核工具列、`toggleCategory`／`selectedCategoryIds`、教學錨點 `tutorial-anchor-filter`。
- **相關**：**F-017**、[feature-roadmap.md](./feature-roadmap.md)、[progress.md](./progress.md)

---

## 範本（複製後填寫）

```markdown
### D-0XX：<短標題>
- **決議日**：YYYY-MM-DD
- **背景**：（為何現在要決定）
- **選項**：（A / B / …）
- **結果**：採用 **方案 X**。
- **影響範圍**：（功能、文件、是否需同步 `docs/`）
- **相關**：`F-0XX`、`feature-roadmap.md` / `specs/xxx-spec.md`
```
