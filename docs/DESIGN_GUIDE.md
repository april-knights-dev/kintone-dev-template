# 設計ファイル管理ガイド

ginueを使用したkintoneアプリ設計ファイルの管理方法について説明します。

## 🎯 概要

このテンプレートでは、kintoneアプリの設計情報をJSONファイルとして管理し、ginueツールを使用して開発環境と本番環境間でのpull/push操作を自動化します。

## 📁 ディレクトリ構造

```
design/
└── apps/
    └── {アプリキー}/
        ├── dev/                    # 開発環境の設計ファイル
        │   ├── app.json            # アプリ基本情報
        │   ├── form.json           # フォーム定義
        │   ├── app_form_fields.json # フィールド定義
        │   ├── app_form_layout.json # レイアウト定義
        │   ├── app_views.json      # ビュー定義
        │   ├── app_settings.json   # アプリ設定
        │   ├── app_acl.json        # アプリ権限
        │   ├── field_acl.json      # フィールド権限
        │   ├── record_acl.json     # レコード権限
        │   ├── app_customize.json  # カスタマイズ設定
        │   ├── app_status.json     # ステータス設定
        │   └── revision.json       # リビジョン情報
        └── prod/                   # 本番環境の設計ファイル
            └── (同上)
```

## 🔄 基本的なワークフロー

### 1. 開発環境での作業

1. **kintone管理画面**でアプリを設計・設定
2. **pull操作**で設計を取得
3. **設計ファイルをGit管理**
4. **本番環境にpush**

### 2. コマンド実行例

```bash
# 1. 開発環境から設計をpull
npm run design:export:dev

# 2. 変更をGitコミット
git add design/
git commit -m "Update app design"

# 3. 本番環境にpush
npm run design:import:prod
```

## 📝 設計ファイルの詳細

### app.json - アプリ基本情報

```json
{
  "appId": "123",
  "code": "",
  "name": "サンプルアプリ",
  "description": "アプリの説明",
  "spaceId": null,
  "threadId": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "creator": {
    "code": "user001",
    "name": "開発者"
  },
  "modifiedAt": "2024-01-01T00:00:00.000Z",
  "modifier": {
    "code": "user001", 
    "name": "開発者"
  }
}
```

### app_form_fields.json - フィールド定義

```json
{
  "properties": {
    "fieldCode1": {
      "type": "SINGLE_LINE_TEXT",
      "code": "fieldCode1",
      "label": "テキストフィールド",
      "noLabel": false,
      "required": true,
      "maxLength": "64",
      "minLength": "",
      "defaultValue": "",
      "unique": false
    },
    "fieldCode2": {
      "type": "DROP_DOWN",
      "code": "fieldCode2", 
      "label": "ドロップダウン",
      "noLabel": false,
      "required": false,
      "options": {
        "option1": {
          "label": "選択肢1",
          "index": "0"
        },
        "option2": {
          "label": "選択肢2", 
          "index": "1"
        }
      },
      "defaultValue": "option1"
    }
  }
}
```

### app_views.json - ビュー定義

```json
{
  "views": {
    "view1": {
      "type": "LIST",
      "name": "一覧",
      "fields": ["fieldCode1", "fieldCode2"],
      "filterCond": "",
      "sort": "fieldCode1 asc",
      "index": "0"
    }
  }
}
```

## 🛠️ 操作コマンド

### 単一アプリ操作

#### pull（設計取得）

```bash
# 開発環境から取得
npm run design:export:dev

# 本番環境から取得  
npm run design:export:prod
```

#### push（設計適用）

```bash
# 開発環境に適用
npm run design:import:dev

# 本番環境に適用
npm run design:import:prod
```

### 複数アプリ一括操作

#### 全アプリpull

```bash
# 開発環境から全アプリ取得
npm run design:export:all:dev

# 本番環境から全アプリ取得
npm run design:export:all:prod
```

#### 全アプリpush

```bash
# 本番環境に全アプリ適用
npm run design:import:all:prod
```

### 同期操作

```bash
# 開発→本番同期（単一アプリ）
npm run design:sync

# 開発→本番同期（全アプリ）
npm run design:sync:all
```

## ⚠️ 注意事項

### 1. 関連レコードフィールドの除外

本テンプレートでは、関連レコードフィールド（REFERENCE_TABLE）は自動的に除外されます。

理由：
- 環境間でアプリIDが異なる場合、参照先が存在しない
- 手動での調整が必要

### 2. カスタマイズファイルの管理

JavaScriptカスタマイズファイルは別途`upload.js`でアップロードします。

```bash
# カスタマイズのアップロード
npm run upload:dev   # 開発環境
npm run upload:prod  # 本番環境
```

### 3. バックアップの重要性

重要な変更前は必ずバックアップを取得：

```bash
# 現在の設計をpull
npm run design:export:prod

# Gitにコミット
git add . && git commit -m "Backup before major changes"
```

## 🔍 トラブルシューティング

### よくある問題と解決方法

#### 1. 認証エラー

```bash
Error: Authentication failed
```

**解決方法:**
- `.env`ファイルの認証情報確認
- パスワード・ドメインの確認
- ベーシック認証設定の確認

#### 2. アプリが見つからない

```bash
Error: App not found
```

**解決方法:**
- アプリIDの確認
- アプリが削除されていないか確認
- アクセス権限の確認

#### 3. ファイル権限エラー

```bash
Error: Permission denied
```

**解決方法:**
- ディレクトリの書き込み権限確認
- 実行ユーザーの確認

#### 4. 設計ファイルが空

```bash
Warning: No design files found
```

**解決方法:**
- アプリに設定が存在するか確認
- pull操作が正常に完了しているか確認

### デバッグ情報の確認

詳細なログを確認したい場合：

```bash
# 環境変数でデバッグモード有効化
DEBUG=* npm run design:export:dev
```

## 📋 チェックリスト

### デプロイ前チェック

- [ ] 開発環境での動作確認完了
- [ ] 設計ファイルのGitコミット完了
- [ ] バックアップ取得完了
- [ ] 関係者への事前通知完了
- [ ] メンテナンス時間の確保

### デプロイ後チェック

- [ ] 本番環境での動作確認
- [ ] データの整合性確認
- [ ] ユーザーへの展開通知
- [ ] ログの確認

## 📚 関連ドキュメント

- [アプリレジストリ設定ガイド](./APPS_REGISTRY.md)
- [カスタマイズ開発ガイド](./DEVELOPMENT_GUIDE.md)
- [デプロイメントガイド](./DEPLOYMENT_GUIDE.md)
- [ginue公式ドキュメント](https://github.com/koozaa/ginue)
