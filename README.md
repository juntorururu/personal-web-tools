# personal-web-tools

個人利用向けの小さなWebアプリを、1つのリポジトリで保守するためのモノレポです。最初のアプリとして、朝と帰宅後の繰り返し行動を確認するPWA「Daily Routine（毎日のルーティン）」を収録しています。

## Daily Routine

### 主な機能

- 朝・帰宅後のルーティンを、項目全体のタップで完了／未完了に切り替え
- 完了数とプログレスバー
- 日本時間の日付変更時に当日のチェックだけを自動リセット
- 項目の追加、名前変更、削除、上下移動、グループ変更、有効／無効
- 通知許可、朝・帰宅後の通知時刻、テスト通知
- JSONバックアップのエクスポートと、検証後の安全な復元
- ライト／ダーク／端末テーマ
- PWAインストール、オフライン利用、更新案内
- スマートフォン・iPhoneセーフエリア・キーボード操作・動きを減らす設定への対応

## 使用技術

- React 19
- TypeScript
- Vite
- vite-plugin-pwa / Workbox（Service Worker、オフライン、更新検知）
- CSS（アプリ単位で管理。外部UIライブラリなし）
- ESLint / Prettier
- Vitest
- pnpm workspace
- GitHub Actions / GitHub Pages

## ディレクトリ構成

```text
personal-web-tools/
├─ .github/workflows/
│  └─ deploy-pages.yml
├─ apps/
│  └─ routine-checklist/
│     ├─ public/
│     ├─ src/
│     │  ├─ lib/
│     │  ├─ test/
│     │  ├─ App.tsx
│     │  ├─ styles.css
│     │  └─ sw.ts
│     ├─ package.json
│     └─ vite.config.ts
├─ docs/
│  └─ notifications.md
├─ shared/
├─ .env.example
├─ package.json
└─ pnpm-workspace.yaml
```

`shared` は共通化する対象が実際に生まれた時点で使います。最初から抽象化を増やさず、各アプリは `apps/<app-name>` 内で完結させます。

## セットアップ

必要環境:

- Node.js 22
- pnpm 10

```bash
git clone https://github.com/<YOUR_GITHUB_NAME>/personal-web-tools.git
cd personal-web-tools
pnpm install
pnpm dev
```

開発サーバーの表示URLをブラウザで開きます。

### コマンド

```bash
pnpm dev          # 開発サーバー
pnpm lint         # ESLint
pnpm test         # Vitest + カバレッジ
pnpm build        # 本番ビルド
pnpm format       # Prettierで整形
pnpm format:check # 整形確認
```

## データ保存

データは `localStorage` にJSONとして保存します。

保存対象:

- ルーティン項目、順番、グループ、有効状態
- 当日の日付とチェック状態
- 通知の有効状態と時刻
- アプリテーマ

今回のデータは小さく、一覧を一括で読み書きでき、トランザクションや大量検索を必要としません。そのためIndexedDBより実装と復旧が単純な `localStorage` を選びました。将来、大量の履歴・画像・検索可能な記録を追加する場合は、アプリごとにIndexedDBへ移行します。

データはブラウザ・端末ごとに独立しています。別端末との自動同期はありません。ブラウザデータを消去すると失われるため、必要に応じて設定画面からJSONを保存してください。

## 毎日のリセット

日付は `Asia/Tokyo` を明示して計算します。アプリ起動時、画面への復帰時、起動中の定期確認時に保存日と現在日を比較し、日付が変わっていれば完了IDだけを空にします。項目や設定は維持します。

## バックアップと復元

設定画面の「JSONをエクスポート」で、全項目・通知・設定・当日のチェックを保存できます。

復元時は以下を確認してから既存データを置き換えます。

- Daily Routineのバックアップ識別子とバージョン
- 必須フィールドの型
- グループ・テーマ・時刻の許容値
- 項目IDの重複
- 完了IDが存在する項目を参照していること
- 1MB以下のファイル

JSONの解析または検証に失敗した場合、既存の保存データは変更しません。

## 通知

### 許可とテスト

1. PWAをHTTPS環境（GitHub Pagesを含む）で開きます。
2. 設定 → 通知設定 → 「通知の許可を設定」を押します。
3. ブラウザ／OSの確認で許可します。
4. 「テスト通知を送る」で動作を確認します。

初回アクセス時に通知許可を突然要求することはありません。拒否してもアプリ本体は利用できます。

### 技術的制約

このバージョンの時刻通知は、アプリが開いていてブラウザが処理できる範囲で動作します。Webアプリを完全に閉じた状態では、JavaScriptタイマーやService Workerを任意時刻に確実に起動できません。

- Android: 対応ブラウザ／インストール済みPWAで通知を利用できますが、閉じた状態の指定時刻通知にはWeb Pushが必要です。
- iPhone: Web PushはiOS 16.4以降で、ホーム画面に追加したWebアプリから許可する必要があります。
- バックエンドなし: テスト通知と起動中の時刻確認は可能ですが、閉じた状態の安定配信は保証できません。
- 確実な通知: Push APIの購読、購読情報を保管するバックエンド、定期実行、VAPID鍵を用いたWeb Push送信が必要です。

第2段階の比較と推奨構成は [docs/notifications.md](docs/notifications.md) を参照してください。

## PWAのインストール

### Android

Chromeなどのメニューから「アプリをインストール」または「ホーム画面に追加」を選びます。インストール候補が利用できるブラウザでは、アプリ設定画面にもインストールボタンが表示されます。

### iPhone

1. Safariで公開URLを開きます。
2. 共有ボタンを押します。
3. 「ホーム画面に追加」を選びます。
4. 追加されたアイコンから起動します。

通知を使う場合も、iPhoneではホーム画面のアイコンから起動して通知設定を行います。

## GitHub Pagesへの公開

`.github/workflows/deploy-pages.yml` が `main` へのpush時にLint、テスト、ビルドを実行し、成功した成果物だけをGitHub Pagesへ公開します。

初回のみ、GitHubで次を設定します。

1. リポジトリの **Settings → Pages** を開く。
2. **Build and deployment → Source** で **GitHub Actions** を選ぶ。
3. `main` にpushする、またはActions画面から `Deploy to GitHub Pages` を手動実行する。

公開URLは通常、次の形式です。

```text
https://<YOUR_GITHUB_NAME>.github.io/personal-web-tools/
```

ワークフローは `VITE_BASE_PATH=/personal-web-tools/` を指定し、Manifest、Service Worker、アイコン、JavaScriptのパスをリポジトリのサブディレクトリに合わせます。ビルド後の `index.html` を `404.html` に複製するため、GitHub Pagesがフォールバックを返せます。アプリ内は履歴API依存のルートを使用していないため、直接リロードでもルート不整合が起きません。

リポジトリ名を変更する場合は、ワークフローの `VITE_BASE_PATH` も `/<NEW_REPOSITORY_NAME>/` に変更してください。

## 環境変数

現バージョンは秘密情報を必要としません。

```bash
cp .env.example .env.local
```

`VITE_BASE_PATH` は公開サブパスの上書き用です。Viteの `VITE_` 変数はブラウザへ公開されるため、API秘密鍵やVAPID秘密鍵を入れないでください。第2段階の通知バックエンドを追加する場合、秘密情報はGitHub Actions Secretsまたはホスティング環境のSecretに保存します。

## 将来のアプリ追加

1. `apps/<new-app>` に独立したViteアプリを追加する。
2. ルート `package.json` に必要な実行スクリプトを追加する。
3. 複数アプリから実際に共有する処理だけを `shared/<package>` に移す。
4. GitHub Pagesで各アプリを別パスへ配信する場合、ビルド成果物を1つの公開ディレクトリに集約する。

個人データの保存方式や権限はアプリごとに明記します。

## プライバシーとセキュリティ

- 保存データはこの端末のブラウザ内に留まり、外部へ送信しません。
- アクセス解析、広告、外部UI、外部フォントは使用しません。
- 通知許可は利用者の操作後にのみ要求します。
- インポートデータは保存前に検証します。
- 秘密情報をコミットしません。
- Service Workerは同一オリジンのビルド成果物だけを事前キャッシュします。

## テスト対象

Vitestで次を確認します。

- 日本時間の日付キーと翌日リセット
- 当日のチェック状態の保存・再読込
- 項目追加、変更、削除、上下移動、グループ変更
- 通知設定を含むバックアップのエクスポート／インポート
- 不正JSON・不正構造の拒否と既存データ保護

GitHub Actionsの本番相当ビルドでは、GitHub Pages用ベースパスとService Workerのプリキャッシュ成果物も検証されます。

## トラブルシューティング

### 通知ボタンが使えない

- HTTPSまたはlocalhostで開いているか確認してください。
- ブラウザ／OSのサイト設定で通知が拒否されている場合、そこで許可へ変更してください。
- iPhoneではSafariからホーム画面へ追加し、追加したアイコンから開いてください。

### 時刻になっても通知が出ない

第1段階の通知は、アプリが開いていて処理可能な場合だけ時刻を確認します。完全に閉じた状態の配信には [通知方式の第2段階](docs/notifications.md) が必要です。

### 古い画面が表示される

画面下部の更新案内で「更新」を押します。案内が出ない場合は、アプリを完全に閉じて再度開きます。

### データが別端末にない

`localStorage` は端末・ブラウザ・サイト単位です。元端末からJSONをエクスポートし、新しい端末で復元してください。

### リポジトリ名変更後に白い画面になる

`.github/workflows/deploy-pages.yml` の `VITE_BASE_PATH` を実際のリポジトリ名に合わせてください。
