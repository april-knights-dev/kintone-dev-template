# Kintone Development Template

kintoneカスタマイズ開発のためのテンプレートプロジェクトです。ginueを使用したpull/push機能を含み、モダンなJavaScript開発環境を提供します。

## 🚀 特徴

- **ginue統合**: kintoneアプリの設計をpull/pushで管理
- **Webpack + Babel**: モダンなJavaScript開発環境
- **ESLint + Prettier**: コード品質の維持
- **環境分離**: 開発環境と本番環境の設定を分離
- **アプリレジストリ**: 複数アプリの一元管理

## 📋 前提条件

- Node.js 13.0.0以上
- npm または yarn
- kintoneアカウント（開発環境・本番環境）

## 🛠️ セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/your-org/kintone-dev-template.git
cd kintone-dev-template
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

```bash
cp .env.sample .env
```

`.env`ファイルを編集して、kintone環境の情報を設定してください：

```env
KINTONE_DEV_DOMAIN=your-dev-domain.cybozu.com
KINTONE_DEV_USERNAME=your-username
KINTONE_DEV_PASSWORD=your-password

KINTONE_PROD_DOMAIN=your-prod-domain.cybozu.com
KINTONE_PROD_USERNAME=your-username
KINTONE_PROD_PASSWORD=your-password
```

### 4. アプリレジストリの設定

`apps-registry.json`を編集して、管理するアプリの情報を設定してください：

```json
{
  "apps": {
    "yourApp": {
      "name": "あなたのアプリ",
      "description": "アプリの説明",
      "environments": {
        "dev": {
          "appId": "123",
          "domain": "your-dev-domain.cybozu.com"
        },
        "prod": {
          "appId": "456",
          "domain": "your-prod-domain.cybozu.com"
        }
      }
    }
  }
}
```

## 🎯 使用方法

### アプリ設計の管理

#### 開発環境からアプリ設計をpull
```bash
npm run design:export:dev
```

#### 本番環境にアプリ設計をpush
```bash
npm run design:import:prod
```

#### 開発→本番への同期
```bash
npm run design:sync
```

### JavaScriptカスタマイズの開発

#### ビルド（本番用）
```bash
npm run build
```

#### 監視モード（開発用）
```bash
npm run watch
```

#### カスタマイズのアップロード
```bash
# 開発環境へアップロード
npm run upload:dev

# 本番環境へアップロード
npm run upload:prod
```

### コード品質管理

#### ESLintチェック
```bash
npm run lint
```

#### ESLint自動修正
```bash
npm run fix
```

## 📁 プロジェクト構造

```
kintone-dev-template/
├── apps-registry.json          # アプリ管理設定
├── package.json                # npm設定
├── webpack.config.cjs          # Webpack設定
├── ginue-manager.cjs           # ginue操作管理
├── helper.cjs                  # ヘルパー機能
├── upload.js                   # カスタマイズアップロード
├── .env.sample                 # 環境変数テンプレート
├── design/                     # アプリ設計ファイル
│   └── apps/
│       └── sampleApp/
│           ├── dev/            # 開発環境設計
│           └── prod/           # 本番環境設計
└── src/                        # JavaScriptソースコード
    ├── apps/
    │   └── sampleApp/
    │       └── index.js        # アプリ固有のカスタマイズ
    └── common/                 # 共通機能
        └── apps.js
```

## 🔧 コマンド一覧

### アプリ設計管理
- `npm run design:export:dev` - 開発環境からpull
- `npm run design:export:prod` - 本番環境からpull
- `npm run design:import:dev` - 開発環境にpush
- `npm run design:import:prod` - 本番環境にpush
- `npm run design:sync` - 開発→本番同期
- `npm run design:list` - アプリ一覧表示
- `npm run design:status` - アプリ状態確認

### 開発・ビルド
- `npm run build` - 本番用ビルド
- `npm run watch` - 監視モード
- `npm run lint` - ESLintチェック
- `npm run fix` - ESLint自動修正

### アップロード
- `npm run upload:dev` - 開発環境へアップロード
- `npm run upload:prod` - 本番環境へアップロード

## 📚 ドキュメント

詳細な設定方法や使用方法については、以下のドキュメントを参照してください：

- [アプリレジストリ設定ガイド](./docs/APPS_REGISTRY.md)
- [設計ファイル管理ガイド](./docs/DESIGN_GUIDE.md)
- [カスタマイズ開発ガイド](./docs/DEVELOPMENT_GUIDE.md)
- [デプロイメントガイド](./docs/DEPLOYMENT_GUIDE.md)

## 🤝 貢献

プロジェクトへの貢献は歓迎します。以下の手順でお願いします：

1. フォークしてください
2. フィーチャーブランチを作成してください (`git checkout -b feature/AmazingFeature`)
3. 変更をコミットしてください (`git commit -m 'Add some AmazingFeature'`)
4. ブランチにプッシュしてください (`git push origin feature/AmazingFeature`)
5. プルリクエストを開いてください

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照してください。

## 🆘 サポート

問題が発生した場合は、以下をご確認ください：

1. [FAQ](./docs/FAQ.md)
2. [Issues](https://github.com/your-org/kintone-dev-template/issues)
3. [Wiki](https://github.com/your-org/kintone-dev-template/wiki)

## 🔗 関連リンク

- [kintone Developer Network](https://developer.cybozu.io/hc/ja)
- [ginue](https://github.com/koozaa/ginue)
- [webpack](https://webpack.js.org/)
- [Babel](https://babeljs.io/)
