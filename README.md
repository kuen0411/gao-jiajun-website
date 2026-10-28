# 高嘉駿個人形象網站

靜態單頁網站，介紹 AI 實務教學、系統整合、工作方法與專案。使用原生 HTML、CSS、JavaScript，無需建置工具。

## 本機預覽

在專案根目錄執行 `python -m http.server 8000`，再開啟 `http://localhost:8000/`。

## GitHub Pages

將儲存庫的 `main` 分支作為來源，在 **Settings → Pages → Build and deployment** 選擇 **Deploy from a branch**、`main`、`/ (root)`。網站網址為 `https://<帳號>.github.io/<儲存庫名稱>/`。

## 維護

- 內容與結構：`index.html`
- 視覺樣式與響應式版型：`assets/style.css`
- 互動邏輯：`assets/main.js`
- 人像與網站圖示：`assets/portrait.png`、`assets/favicon.svg`

聯絡電話與 LINE 號碼會顯示在公開網站；變更聯絡資料時，需同步檢查 HTML 與 JavaScript 中的內容。
