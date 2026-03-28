# **YouTube API 検証：歌ウマVtuber探索ロジック**

## **歌ウマVtuberを探すロジック（要件特化型）**

「Vtuberであること」かつ「音楽動画を投稿していること」を判定するための、API活用フローです。

### **A. ステップ1：キーワードによる広域探索 (Search: list)**

以下の条件で検索を行い、候補となる動画とチャンネルを抽出します。

* **検索クエリ例**:  
  * "Vtuber 歌ってみた"  
  * "Vtuber Original MV"  
  * "Vsinger Cover"  
* **パラメータ設定**:  
  * type: video  
  * videoCategoryId: 10 (Music)  
  * relevanceLanguage: ja (日本語話者を優先する場合)  
* **期待される結果**: 音楽カテゴリで投稿されている「Vtuber」という単語を含む動画。

### **B. ステップ2：チャンネル属性の確認 (Channels: list)**

検索で得られたチャンネルIDに対し、詳細情報を取得して要件を満たしているか判定します。

* **Vtuber判定ロジック**:  
  * snippet.description（説明欄）に「Vtuber」「バーチャル」「Vライバー」などのキーワードが含まれているか。  
  * snippet.title に「V」や「Ch.」が含まれている傾向をチェック。  
* **投稿内容の裏付け（音楽性の確認）**:  
  * contentDetails.relatedPlaylists.uploads から最新の投稿動画リストを取得。  
  * 動画タイトルに 【MV】, Cover, 歌ってみた, Official が高頻度で含まれているかを確認。