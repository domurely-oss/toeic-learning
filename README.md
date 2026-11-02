# TOEIC 多益 Google Drive 聽力學習網站

這是一個純前端靜態網站，使用 Google Identity Services OAuth 2.0 登入，並透過 Google Drive API 列出指定資料夾第一層的音檔。

## GitHub Pages 部署

1. 在 GitHub 建立 repository，例如 `toeic-learning`。
2. 把 `index.html` 上傳到 repository 根目錄，提交變更。
3. 到 Settings → Pages → Build and deployment，Source 選 `Deploy from a branch`，Branch 選 `main` 和 `/(root)`，按 Save。
4. 網址通常是 `https://YOUR_USERNAME.github.io/toeic-learning/`。
5. 到 Google Cloud Console → Google Auth Platform → Clients → 選擇既有的 Web application OAuth client。
6. 在 Authorized JavaScript origins 新增 `https://YOUR_USERNAME.github.io`。**注意不包括 `/toeic-learning/` 路徑，也不要加結尾斜線。**
7. 若要保留本機使用，可以同時保留 `http://localhost:8765`。
8. 等待 GitHub Pages 部署完成，再開啟網站填入同一個 OAuth Client ID 和資料夾網址或 ID，授權後同步。

## Google Cloud 設定

- 啟用 Google Drive API。
- OAuth 用戶端類型必須為 `Web application`。
- 授權請求 scope：`https://www.googleapis.com/auth/drive.readonly`。
- Google OAuth 應用程式在 Testing 狀態時，需要加入測試使用者，且相關授權可能定期過期。
- 若目標是提供多人公開使用，Google 可能要求 OAuth 應用程式驗證，尤其涉及敏感 Drive scope。

## 安全與限制

- 不要把 OAuth Client Secret、access token 或任何 Google 帳號密碼提交到 GitHub。
- 前端使用的 Client ID 並不是密碼，可以在公開網頁中使用；但 GitHub Pages 原始碼及資源是公開可讀的。
- 使用 `drive.readonly` 授權時，網站取得的存取範圍並非只限於輸入的資料夾；用戶需信任網站程式碼。
- 雲端 MP3 在播放前會透過 API 完整下載至瀏覽器記憶體，較大檔案或手機可能載入較慢。
- 學習紀錄存在瀏覽器 localStorage；不同手機和電腦不會自動同步。
- 不會把 MP3 上傳到 GitHub；音檔保留於 Google Drive。
- 檔案清單只讀取指定資料夾的第一層，不會遞迴查詢子資料夾。

## 本機預覽

在資料夾中執行 `python -m http.server 8765`，開啟 `http://localhost:8765/`。若要使用 Google 登入，OAuth client 也必須包含此本機來源。
