@echo off
echo ===================================================
echo 歌ウマVtuberルーレット 開発サーバー起動スクリプト
echo ===================================================

echo [1/2] 必要なモジュールを確認しています...
call npm install --silent

echo [2/2] 開発サーバーを起動します (http://localhost:3000)
echo.
echo ※サーバーの起動が完了したらブラウザを開き、
echo ※別のターミナルからテストスクリプト(test_generate.bat)を実行してエンドポイントをテストできます。
echo.
call npm run dev
pause
