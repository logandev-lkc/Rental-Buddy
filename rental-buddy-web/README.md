# Rental Buddy Web

Rental Buddy 的 Angular 前端。資料存在瀏覽器 `localStorage`，不需要後端。

## Development server

本專案的 `npm start` 已使用 polling 監看，避免 macOS/IDE 環境出現 `EMFILE: too many open files, watch` 後熱更新不穩。

```bash
npm start
```

啟動後開啟 `http://localhost:4200/`。

## App flow

- `查核表`：管理看房紀錄、地址、月租金與檢查項目。
- `報告`：預設為手機友善版，適合現場快速閱讀。
- 報告內可切換 `手機版檢視` / `InBody 精簡版`。
- `匯出文件（PDF）` 只會輸出 InBody 精簡版，不輸出手機版畫面。

## Building

```bash
npm run build
```

產物會輸出到 `dist/rental-buddy-web/`。Angular 的瀏覽器靜態檔在 `dist/rental-buddy-web/browser/`。

## Print / PDF export

1. 進入 `報告`。
2. 可先切到 `InBody 精簡版` 檢查版面。
3. 點 `匯出文件（PDF）`。
4. 在瀏覽器列印視窗選 `另存為 PDF`。

## Scoring

- 100 分制：完成度為主，標記問題會扣分。
- `A`：85 分以上，條件完整，建議優先考慮。
- `B`：65-84 分，條件中上，可列入候選。
- `C`：64 分以下，風險偏高，需謹慎評估。

## Tests

目前主要驗證方式：

- `npm run build`
- 手動回歸：查核表填資料 -> 報告手機版 -> InBody 精簡版 -> 匯出 PDF

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
