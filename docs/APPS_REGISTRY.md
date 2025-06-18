# アプリレジストリ設定ガイド

`apps-registry.json`は、kintoneアプリの設定と環境情報を一元管理するための設定ファイルです。

## 📁 ファイル構造

```json
{
  "apps": {
    "アプリキー": {
      "name": "アプリ名",
      "description": "アプリの説明",
      "environments": {
        "dev": {
          "appId": "開発環境のアプリID",
          "domain": "開発環境のドメイン"
        },
        "prod": {
          "appId": "本番環境のアプリID",
          "domain": "本番環境のドメイン"
        }
      },
      "category": "アプリカテゴリ",
      "tags": ["タグ1", "タグ2"],
      "enabled": true,
      "priority": 1,
      "files": {
        "fields": "form.json",
        "layout": "app_form_layout.json",
        "views": "app_views.json",
        "settings": "app_settings.json",
        "permissions": "app_acl.json",
        "customize": "app_customize.json"
      },
      "history": {
        "lastExported": "2024-01-01T00:00:00.000Z",
        "lastImported": null,
        "lastModified": "2024-01-01T00:00:00.000Z"
      }
    }
  },
  "environments": {
    "dev": {
      "name": "開発環境",
      "description": "開発・テスト用のkintone環境"
    },
    "prod": {
      "name": "本番環境",
      "description": "本番運用のkintone環境"
    }
  },
  "categories": {
    "master": {
      "name": "マスタ",
      "description": "マスタデータ管理アプリケーション"
    }
  }
}
```

## 🔧 設定項目

### アプリ設定（apps）

| 項目 | 型 | 必須 | 説明 |
|------|----|----|------|
| name | string | ✅ | アプリの表示名 |
| description | string | ✅ | アプリの説明 |
| environments | object | ✅ | 環境別設定 |
| category | string | ❌ | アプリカテゴリ |
| tags | array | ❌ | アプリタグ |
| enabled | boolean | ❌ | アプリが有効かどうか（デフォルト: true） |
| priority | number | ❌ | 処理優先度（デフォルト: 1） |
| files | object | ❌ | 設計ファイル名の設定 |
| history | object | ❌ | 履歴情報（自動更新） |

### 環境設定（environments）

各環境（dev, prod等）について以下を設定：

| 項目 | 型 | 必須 | 説明 |
|------|----|----|------|
| appId | string | ✅ | kintoneアプリID |
| domain | string | ✅ | kintoneドメイン |

### カテゴリ設定（categories）

| 項目 | 型 | 必須 | 説明 |
|------|----|----|------|
| name | string | ✅ | カテゴリ表示名 |
| description | string | ❌ | カテゴリ説明 |

## 📝 設定例

### 単一アプリの設定例

```json
{
  "apps": {
    "userMaster": {
      "name": "ユーザーマスタ",
      "description": "システムユーザーの基本情報を管理",
      "environments": {
        "dev": {
          "appId": "101",
          "domain": "your-dev.cybozu.com"
        },
        "prod": {
          "appId": "201",
          "domain": "your-prod.cybozu.com"
        }
      },
      "category": "master",
      "tags": ["core", "user"],
      "enabled": true,
      "priority": 1
    }
  }
}
```

### 複数アプリの設定例

```json
{
  "apps": {
    "userMaster": {
      "name": "ユーザーマスタ",
      "description": "ユーザー情報管理",
      "environments": {
        "dev": { "appId": "101", "domain": "dev.cybozu.com" },
        "prod": { "appId": "201", "domain": "prod.cybozu.com" }
      },
      "category": "master",
      "priority": 1
    },
    "taskManagement": {
      "name": "タスク管理",
      "description": "プロジェクトタスクの管理",
      "environments": {
        "dev": { "appId": "102", "domain": "dev.cybozu.com" },
        "prod": { "appId": "202", "domain": "prod.cybozu.com" }
      },
      "category": "workflow",
      "priority": 2
    }
  }
}
```

## 🎯 ベストプラクティス

### 1. アプリキーの命名規則

- **camelCase**を使用
- **意味のある名前**を使用
- **英語**で統一

```json
// ✅ 良い例
"userMaster": {},
"taskManagement": {},
"reportGeneration": {}

// ❌ 悪い例
"app1": {},
"USER_MASTER": {},
"task-management": {}
```

### 2. カテゴリの活用

アプリを論理的にグループ化：

```json
"categories": {
  "master": {
    "name": "マスタ",
    "description": "基本情報・設定管理"
  },
  "workflow": {
    "name": "ワークフロー",
    "description": "業務プロセス管理"
  },
  "report": {
    "name": "レポート",
    "description": "集計・分析機能"
  }
}
```

### 3. タグの活用

横断的な分類に使用：

```json
"tags": [
  "core",        // コア機能
  "optional",    // オプション機能
  "external",    // 外部連携
  "batch",       // バッチ処理
  "realtime"     // リアルタイム処理
]
```

### 4. 優先度の設定

処理順序の制御：

```json
{
  "userMaster": { "priority": 1 },      // 最優先
  "roleSettings": { "priority": 2 },    // 2番目
  "applicationLog": { "priority": 99 }  // 最後
}
```

## 🔍 トラブルシューティング

### よくある問題

#### 1. アプリIDが見つからない

```bash
Error: App 'yourApp' not found in registry
```

**解決方法:**
- `apps-registry.json`にアプリが登録されているか確認
- アプリキーのスペルチェック

#### 2. 環境設定が不正

```bash
Error: Environment 'dev' not found for app 'yourApp'
```

**解決方法:**
- 対象環境が設定されているか確認
- 環境名のスペルチェック

#### 3. JSONフォーマットエラー

```bash
SyntaxError: Unexpected token in JSON
```

**解決方法:**
- JSONの構文チェック
- カンマの過不足確認
- 引用符の確認

## 🛠️ 管理コマンド

### アプリ一覧表示

```bash
npm run design:list
```

### 有効なアプリのみ表示

```bash
npm run design:list:enabled
```

### アプリ状態確認

```bash
npm run design:status
```

### 新しいアプリ設定作成

```bash
npm run design:create
```

## 📚 関連ドキュメント

- [設計ファイル管理ガイド](./DESIGN_GUIDE.md)
- [カスタマイズ開発ガイド](./DEVELOPMENT_GUIDE.md)
- [デプロイメントガイド](./DEPLOYMENT_GUIDE.md)
