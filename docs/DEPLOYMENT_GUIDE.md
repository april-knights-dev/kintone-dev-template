# デプロイメントガイド

kintoneアプリのカスタマイズと設計ファイルを安全にデプロイするための手順とベストプラクティスを説明します。

## 🎯 デプロイメント戦略

### 環境構成

```
開発環境 (dev) → 本番環境 (prod)
     ↓              ↓
  開発・テスト      本番運用
```

### デプロイフロー

1. **開発環境での実装・テスト**
2. **設計ファイルのpull**
3. **コードレビュー**
4. **本番環境への設計push**
5. **カスタマイズのビルド・アップロード**
6. **動作確認**
7. **ロールバック準備**

## 🚀 デプロイ手順

### 1. 事前準備

#### 環境確認

```bash
# 環境変数の確認
npm run design:status

# アプリ一覧の確認
npm run design:list:enabled
```

#### バックアップ取得

```bash
# 本番環境の現在の設計をバックアップ
npm run design:export:prod

# バックアップのコミット
git add design/
git commit -m "Backup prod environment before deployment"
git tag "backup-$(date +%Y%m%d-%H%M%S)"
```

### 2. 設計ファイルのデプロイ

#### 開発環境から設計取得

```bash
# 最新の設計をpull
npm run design:export:dev

# 変更内容の確認
git diff design/
```

#### 本番環境に設計適用

```bash
# 本番環境にpush
npm run design:import:prod

# または一括適用
npm run design:import:all:prod
```

### 3. カスタマイズのデプロイ

#### ビルド実行

```bash
# 本番用ビルド
npm run build

# ビルド結果の確認
ls -la dist/
```

#### アップロード実行

```bash
# 本番環境にアップロード
npm run upload:prod
```

### 4. 動作確認

- アプリの基本機能確認
- カスタマイズ機能の動作確認
- 既存データへの影響確認
- ユーザー権限の確認

## 🔧 デプロイ設定

### upload.js設定

```javascript
// 本番環境の設定例
const prodConfig = {
  username: process.env.KINTONE_PROD_USERNAME,
  password: process.env.KINTONE_PROD_PASSWORD,
  domain: process.env.KINTONE_PROD_DOMAIN,
  apps: [
    {
      app: '本番アプリID',
      uploadUrl: 'https://your-prod-domain.cybozu.com',
      scope: 'ALL'
    }
  ]
};
```

### 環境変数管理

```env
# 本番環境設定
KINTONE_PROD_DOMAIN=your-prod-domain.cybozu.com
KINTONE_PROD_USERNAME=deploy_user
KINTONE_PROD_PASSWORD=secure_password

# Basic認証（必要に応じて）
KINTONE_PROD_BASIC_USERNAME=basic_user
KINTONE_PROD_BASIC_PASSWORD=basic_password
```

## 🛡️ 安全なデプロイのための対策

### 1. 段階的デプロイ

#### フェーズ分けデプロイ

```bash
# Phase 1: 設計のみ
npm run design:import:prod

# 動作確認後...

# Phase 2: カスタマイズ
npm run upload:prod
```

#### カナリアデプロイ

特定のユーザーグループのみに先行リリース

### 2. ロールバック準備

#### 自動ロールバックスクリプト

```bash
#!/bin/bash
# rollback.sh

echo "ロールバックを開始します..."

# バックアップから復元
git checkout backup-tag

# 設計を復元
npm run design:import:prod

# 前バージョンのカスタマイズをデプロイ
npm run upload:prod

echo "ロールバック完了"
```

### 3. デプロイ監視

```javascript
// デプロイ監視スクリプト例
const monitorDeployment = async () => {
  try {
    // ヘルスチェック
    const response = await fetch('https://your-app-endpoint/health');
    
    if (response.ok) {
      console.log('✅ デプロイ成功');
    } else {
      console.error('❌ デプロイ失敗');
      // アラート送信
    }
  } catch (error) {
    console.error('❌ 監視エラー:', error);
  }
};
```

## 📋 デプロイチェックリスト

### デプロイ前

#### 設計確認

- [ ] フィールド定義の整合性確認
- [ ] ビュー設定の確認
- [ ] 権限設定の確認
- [ ] ステータス設定の確認

#### コード品質

- [ ] ESLintエラーなし
- [ ] ビルドエラーなし
- [ ] セキュリティチェック完了
- [ ] パフォーマンステスト完了

#### 環境準備

- [ ] 環境変数設定確認
- [ ] アクセス権限確認
- [ ] バックアップ取得完了
- [ ] メンテナンス時間の確保

### デプロイ中

#### 実行確認

- [ ] 設計適用の成功確認
- [ ] カスタマイズアップロードの成功確認
- [ ] エラーログの監視
- [ ] レスポンス時間の監視

### デプロイ後

#### 動作確認

- [ ] 基本機能の動作確認
- [ ] カスタマイズ機能の動作確認
- [ ] 既存データへの影響確認
- [ ] パフォーマンスの確認

#### 運用確認

- [ ] ユーザーアクセス確認
- [ ] 権限動作確認
- [ ] 通知機能確認
- [ ] ログ出力確認

## ⚠️ トラブルシューティング

### よくある問題と対処法

#### 1. 設計push失敗

**症状**: `npm run design:import:prod`でエラー

**対処法**:
```bash
# 設計ファイルの構文確認
npm run design:validate

# 関連レコードフィールドの除外確認
grep -r "REFERENCE_TABLE" design/

# 手動で問題のあるフィールドを除外
```

#### 2. カスタマイズアップロード失敗

**症状**: `npm run upload:prod`でエラー

**対処法**:
```bash
# ビルドファイルの確認
npm run build
ls -la dist/

# 設定ファイルの確認
cat upload.js | grep -A 10 "prod"

# 手動アップロード
node upload.js --env=prod --verbose
```

#### 3. アクセス権限エラー

**症状**: 認証エラーが発生

**対処法**:
```bash
# 環境変数の確認
echo $KINTONE_PROD_USERNAME
echo $KINTONE_PROD_DOMAIN

# 接続テスト
curl -u "$KINTONE_PROD_USERNAME:$KINTONE_PROD_PASSWORD" \
  "https://$KINTONE_PROD_DOMAIN/k/v1/app.json?id=1"
```

### 緊急時対応

#### 即座のロールバック

```bash
# 緊急ロールバック
./rollback.sh

# または手動ロールバック
git checkout HEAD~1
npm run design:import:prod
npm run upload:prod
```

#### 障害報告

1. **影響範囲の確認**
2. **エラーログの収集**
3. **関係者への報告**
4. **復旧作業の実施**
5. **事後分析**

## 📊 デプロイメトリクス

### 監視項目

- デプロイ頻度
- リードタイム
- 変更失敗率
- 復旧時間

### ログ管理

```bash
# デプロイログの保存
npm run deploy:prod 2>&1 | tee deploy-$(date +%Y%m%d-%H%M%S).log

# ログの分析
grep "ERROR" deploy-*.log
grep "SUCCESS" deploy-*.log
```

## 🔄 CI/CD統合

### GitHub Actionsの例

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
          
      - name: Install dependencies
        run: npm install
        
      - name: Build
        run: npm run build
        
      - name: Deploy to Production
        run: |
          npm run design:import:prod
          npm run upload:prod
        env:
          KINTONE_PROD_USERNAME: ${{ secrets.KINTONE_PROD_USERNAME }}
          KINTONE_PROD_PASSWORD: ${{ secrets.KINTONE_PROD_PASSWORD }}
          KINTONE_PROD_DOMAIN: ${{ secrets.KINTONE_PROD_DOMAIN }}
```

## 📚 関連ドキュメント

- [アプリレジストリ設定ガイド](./APPS_REGISTRY.md)
- [設計ファイル管理ガイド](./DESIGN_GUIDE.md)
- [カスタマイズ開発ガイド](./DEVELOPMENT_GUIDE.md)
- [セキュリティガイド](./SECURITY_GUIDE.md)
