# **開発環境・デプロイ手順書**

「歌ウマVtuberガチャ」をAntigravityで開発し、本番環境へ公開するためのステップバイステップガイドです。

## **1\. 開発環境の準備**

### **A. 必要なアカウントとツール**

* **GitHub**: ソースコード管理とCloudflare Pagesとの連携。  
* **Google Cloud Console**: YouTube Data API v3 の有効化とAPIキーの取得。  
* **Google AI Studio**: Gemini APIキーの取得。  
* **Supabase**: データベースとEdge Functionsのホスティング。  
* **Node.js / npm**: ローカル開発用（Antigravity上でのプレビューにも使用）。

### **B. プロジェクトの初期化**

Antigravityのターミナルまたはエディタで以下を実行し、ベースを作成します。

\# Next.js (App Router) \+ Tailwind CSS の推奨構成  
npx create-next-app@latest v-singer-gacha \--typescript \--tailwind \--eslint  
cd v-singer-gacha  
\# 必要なライブラリのインストール  
npm install @supabase/supabase-js lucide-react framer-motion

## **2\. Supabase のセットアップ（バックエンド）**

1. **プロジェクト作成**: Supabase Dashboardで新規プロジェクトを作成。  
2. **SQL実行**:  
   * vtubers（マスター）、gacha\_history（排出履歴）、global\_stats（クリック数・タイマー）のテーブルを作成。  
   * リアルタイム機能を有効にする（クリック数の即時反映用）。  
3. **Edge Functions**:  
   * ガチャの選出ロジックとGemini API呼び出しを行う関数を作成します。  
   * supabase functions deploy gacha-engine でデプロイ。

## **3\. 外部APIのシークレット管理**

環境変数はローカルの .env.local および各プラットフォームの設定画面で管理します。

* NEXT\_PUBLIC\_SUPABASE\_URL  
* NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY  
* YOUTUBE\_API\_KEY  
* GEMINI\_API\_KEY

## **4\. デプロイ手順（本番公開）**

### **ステップ1: GitHubへプッシュ**

Antigravityで作成したコードをリポジトリへコミットします。

git remote add origin \[https://github.com/ユーザー名/v-singer-gacha.git\](https://github.com/ユーザー名/v-singer-gacha.git)  
git add .  
git commit \-m "Initial commit: Gacha system with Gemini integration"  
git push \-u origin main

### **ステップ2: Cloudflare Pages へのデプロイ**

1. Cloudflare Dashboardにログインし、**Workers & Pages** \> **Create application** \> **Pages** \> **Connect to Git** を選択。  
2. GitHubリポジトリを選択。  
3. **Build settings**:  
   * Framework preset: Next.js  
   * Build command: npm run build  
   * Build output directory: .next (または out)  
4. **Environment variables**: 上記のAPIキー等を設定。  
5. **Save and Deploy**: これで、GitHubにプッシュするたびに自動デプロイされるようになります。

### **ステップ3: Supabase Edge Functions のデプロイ**

1. Supabase CLIを使用してログイン。  
2. supabase functions deploy \<function-name\> を実行。  
3. 24時間ごとの定期実行が必要な場合は、GitHub Actions または外部のCronジョブ（Cron-job.orgなど）からEdge Functionを叩く設定をします。

## **5\. Antigravityでのプレビューとテスト**

* **ローカルテスト**: Antigravityのプレビュー機能を使用して、UIのアニメーション（ネオンエフェクトやグリッチ）が意図通り動くか確認します。  
* **APIテスト**: YouTube APIのクォータ（制限）に注意しながら、少数のデータでGeminiの紹介文生成をテストします。

## **💡 開発のヒント**

* **GitHub Actionsの活用**: コードがプッシュされたときに、自動でテストが走るように設定しておくと安心です。  
* **Cloudflareのキャッシュ**: YouTube APIの結果をCloudflareのKV（Key-Value）などにキャッシュすると、APIの節約と高速化に繋がります。