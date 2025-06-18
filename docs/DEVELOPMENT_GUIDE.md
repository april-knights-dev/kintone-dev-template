# カスタマイズ開発ガイド

kintoneアプリのJavaScriptカスタマイズ開発における手順とベストプラクティスを説明します。

## 🎯 開発フロー

### 1. 環境セットアップ

```bash
# プロジェクトのクローン
git clone <repository-url>
cd kintone-dev-template

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.sample .env
# .envファイルを編集
```

### 2. 開発サイクル

1. **機能設計** - 要件に基づいた機能設計
2. **コーディング** - JavaScriptカスタマイズの実装
3. **ローカルテスト** - 監視モードでの動作確認
4. **ビルド** - 本番用ファイルの生成
5. **アップロード** - 開発環境へのデプロイ
6. **テスト** - 開発環境での動作確認
7. **本番デプロイ** - 本番環境への反映

## 📁 プロジェクト構造

```
src/
├── apps/                   # アプリ固有のカスタマイズ
│   └── {アプリ名}/
│       ├── index.js        # メインエントリーポイント
│       ├── components/     # コンポーネント
│       ├── utils/          # ユーティリティ
│       └── styles/         # スタイル
└── common/                 # 共通機能
    ├── utils.js            # 共通ユーティリティ
    ├── api.js              # API関連
    ├── components/         # 共通コンポーネント
    └── styles/             # 共通スタイル
```

## 🛠️ 開発コマンド

### ビルド関連

```bash
# 監視モード（開発時）
npm run watch

# 本番用ビルド
npm run build

# コード品質チェック
npm run lint

# コード自動修正
npm run fix
```

### アップロード関連

```bash
# 開発環境にアップロード
npm run upload:dev

# 本番環境にアップロード
npm run upload:prod
```

## 💻 コーディング規約

### 1. ファイル構造

#### アプリ固有ファイル（src/apps/{アプリ名}/index.js）

```javascript
/**
 * {アプリ名}のカスタマイズ
 * 
 * @description アプリの詳細説明
 * @author 開発者名
 * @created 2024-01-01
 */

// 必要なライブラリのインポート
import { KintoneRestAPIClient } from '@kintone/rest-api-client';
import { showNotification } from '../../common/utils.js';

// メイン処理
(() => {
  'use strict';
  
  // 初期化処理
  
  // イベントハンドラー定義
  
  // ヘルパー関数定義
})();
```

### 2. 命名規則

- **変数・関数**: camelCase（例: `getUserInfo`, `recordData`）
- **定数**: UPPER_SNAKE_CASE（例: `API_ENDPOINT`, `DEFAULT_VALUES`）
- **クラス**: PascalCase（例: `DataManager`, `ValidationError`）

### 3. コメント規則

```javascript
/**
 * 関数の説明
 * @param {type} paramName - パラメータの説明
 * @returns {type} 戻り値の説明
 */
function functionName(paramName) {
  // 実装
}
```

## 🎣 kintone Events活用

### 基本的なイベント

```javascript
// レコード表示
kintone.events.on('app.record.detail.show', (event) => {
  // 処理
  return event;
});

// レコード作成・編集画面表示
kintone.events.on(['app.record.create.show', 'app.record.edit.show'], (event) => {
  // 処理
  return event;
});

// フィールド値変更
kintone.events.on(['app.record.create.change.field_code', 'app.record.edit.change.field_code'], (event) => {
  // 処理
  return event;
});

// レコード保存前
kintone.events.on(['app.record.create.submit', 'app.record.edit.submit'], (event) => {
  // バリデーション等
  return event;
});

// レコード保存後
kintone.events.on(['app.record.create.success', 'app.record.edit.success'], (event) => {
  // 後処理
  return event;
});
```

### 一覧画面イベント

```javascript
// 一覧画面表示
kintone.events.on('app.record.index.show', (event) => {
  // カスタムボタン追加等
  return event;
});

// レコード削除前
kintone.events.on('app.record.index.delete.submit', (event) => {
  // 削除可否の判定
  return event;
});
```

## 🔧 カスタマイズパターン

### 1. フィールド値の自動設定

```javascript
kintone.events.on(['app.record.create.change.trigger_field'], (event) => {
  const record = event.record;
  const triggerValue = record.trigger_field.value;
  
  // 条件に応じて他のフィールドを設定
  if (triggerValue === '自動') {
    record.target_field.value = '自動設定値';
  }
  
  return event;
});
```

### 2. バリデーション

```javascript
kintone.events.on(['app.record.create.submit', 'app.record.edit.submit'], (event) => {
  const record = event.record;
  
  // カスタムバリデーション
  if (!record.required_field.value) {
    event.error = '必須項目が入力されていません';
    return event;
  }
  
  // 複合バリデーション
  if (record.start_date.value > record.end_date.value) {
    event.error = '終了日は開始日より後の日付を入力してください';
    return event;
  }
  
  return event;
});
```

### 3. 外部API連携

```javascript
import { KintoneRestAPIClient } from '@kintone/rest-api-client';

const client = new KintoneRestAPIClient();

async function fetchExternalData(keyword) {
  try {
    const response = await fetch(`https://api.example.com/search?q=${keyword}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('外部API呼び出しエラー:', error);
    throw error;
  }
}
```

### 4. カスタムUI作成

```javascript
function createCustomButton() {
  const headerSpace = kintone.app.record.getHeaderMenuSpaceElement();
  
  const button = document.createElement('button');
  button.textContent = 'カスタム機能';
  button.className = 'kintoneplugin-button-normal';
  
  button.addEventListener('click', async () => {
    // カスタム処理
  });
  
  headerSpace.appendChild(button);
}
```

## 🔍 デバッグ・テスト

### 1. ブラウザ開発者ツール

```javascript
// デバッグ用ログ出力
console.log('変数の値:', variable);
console.group('処理グループ');
console.log('詳細情報');
console.groupEnd();

// エラー情報
console.error('エラーメッセージ:', error);
```

### 2. 条件分岐デバッグ

```javascript
// 開発環境でのみ実行
if (location.hostname.includes('dev')) {
  console.log('開発環境での処理');
}

// デバッグフラグの活用
const DEBUG = true;
if (DEBUG) {
  console.log('デバッグ情報');
}
```

### 3. エラーハンドリング

```javascript
try {
  // リスクのある処理
  const result = await riskyOperation();
} catch (error) {
  console.error('操作に失敗しました:', error);
  showNotification('エラーが発生しました', 'error');
}
```

## 📝 ベストプラクティス

### 1. パフォーマンス

- **イベントハンドラーの最適化**: 不要な処理を避ける
- **非同期処理の活用**: 重い処理は非同期で実行
- **メモ化**: 同じ計算結果は再利用

```javascript
// メモ化の例
const cache = new Map();

function expensiveCalculation(input) {
  if (cache.has(input)) {
    return cache.get(input);
  }
  
  const result = /* 重い計算 */;
  cache.set(input, result);
  return result;
}
```

### 2. エラーハンドリング

```javascript
// グローバルエラーハンドラー
window.addEventListener('error', (event) => {
  console.error('予期しないエラー:', event.error);
  // エラー報告処理
});

// Promise のエラーハンドリング
window.addEventListener('unhandledrejection', (event) => {
  console.error('未処理のPromiseエラー:', event.reason);
  event.preventDefault();
});
```

### 3. セキュリティ

- **XSS対策**: ユーザー入力値のエスケープ
- **CSRF対策**: 適切なAPI呼び出し
- **機密情報の管理**: ハードコーディングを避ける

```javascript
// XSS対策の例
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

## 🚀 デプロイ前チェックリスト

### コード品質

- [ ] ESLintエラーなし
- [ ] 適切なコメント記述
- [ ] 不要なconsole.log削除
- [ ] エラーハンドリング実装

### 機能テスト

- [ ] 基本機能の動作確認
- [ ] エラーケースの動作確認
- [ ] 異なるブラウザでの確認
- [ ] モバイル表示の確認

### パフォーマンス

- [ ] 処理速度の確認
- [ ] メモリリークなし
- [ ] API呼び出し回数の最適化

## 📚 参考リンク

- [kintone JavaScript API](https://developer.cybozu.io/hc/ja/articles/201941754)
- [kintone REST API](https://developer.cybozu.io/hc/ja/sections/200166160)
- [JavaScript ベストプラクティス](https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide)
- [kintone カスタマイズ サンプル](https://developer.cybozu.io/hc/ja/sections/200166160)
