/**
 * 共通ユーティリティ関数
 * 
 * 複数のアプリで使用される共通機能を提供します。
 */

/**
 * 通知メッセージを表示する
 * @param {string} message - 表示メッセージ
 * @param {string} type - メッセージタイプ ('success', 'error', 'info', 'warning')
 * @param {number} duration - 表示時間（ミリ秒）
 */
export function showNotification(message, type = 'info', duration = 3000) {
  // 通知要素の作成
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  // スタイルの設定
  Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 20px',
    borderRadius: '4px',
    color: 'white',
    fontWeight: 'bold',
    zIndex: '10000',
    opacity: '0',
    transition: 'opacity 0.3s ease-in-out',
    maxWidth: '300px',
    wordWrap: 'break-word'
  });
  
  // タイプ別の背景色設定
  const colors = {
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800',
    info: '#2196F3'
  };
  notification.style.backgroundColor = colors[type] || colors.info;
  
  // DOMに追加
  document.body.appendChild(notification);
  
  // フェードイン
  setTimeout(() => {
    notification.style.opacity = '1';
  }, 10);
  
  // 自動削除
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, duration);
}

/**
 * 日付を指定フォーマットで文字列に変換
 * @param {Date} date - 変換する日付
 * @param {string} format - フォーマット ('YYYY-MM-DD', 'YYYY-MM-DD HH:mm:ss', etc.)
 * @returns {string} フォーマットされた日付文字列
 */
export function formatDate(date, format = 'YYYY-MM-DD') {
  if (!date || !(date instanceof Date)) {
    return '';
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 文字列を日付オブジェクトに変換
 * @param {string} dateString - 日付文字列
 * @returns {Date|null} 日付オブジェクトまたはnull
 */
export function parseDate(dateString) {
  if (!dateString) {
    return null;
  }
  
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * バリデーション関数群
 */
export const validation = {
  /**
   * 必須項目チェック
   * @param {any} value - チェック対象の値
   * @returns {boolean} バリデーション結果
   */
  required(value) {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value !== null && value !== undefined && String(value).trim() !== '';
  },

  /**
   * メールアドレス形式チェック
   * @param {string} email - メールアドレス
   * @returns {boolean} バリデーション結果
   */
  email(email) {
    if (!email) return true; // 空の場合は有効とする
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * 数値チェック
   * @param {any} value - チェック対象の値
   * @returns {boolean} バリデーション結果
   */
  number(value) {
    if (!value && value !== 0) return true; // 空の場合は有効とする
    return !isNaN(Number(value));
  },

  /**
   * 最小値チェック
   * @param {number} value - チェック対象の値
   * @param {number} min - 最小値
   * @returns {boolean} バリデーション結果
   */
  min(value, min) {
    if (!value && value !== 0) return true; // 空の場合は有効とする
    return Number(value) >= min;
  },

  /**
   * 最大値チェック
   * @param {number} value - チェック対象の値
   * @param {number} max - 最大値
   * @returns {boolean} バリデーション結果
   */
  max(value, max) {
    if (!value && value !== 0) return true; // 空の場合は有効とする
    return Number(value) <= max;
  },

  /**
   * 文字列長チェック
   * @param {string} value - チェック対象の文字列
   * @param {number} min - 最小文字数
   * @param {number} max - 最大文字数
   * @returns {boolean} バリデーション結果
   */
  length(value, min = 0, max = Infinity) {
    if (!value) return min === 0; // 空の場合は最小文字数が0なら有効
    const length = String(value).length;
    return length >= min && length <= max;
  }
};

/**
 * ユーティリティ関数群
 */
export const utils = {
  /**
   * 配列をチャンクに分割
   * @param {Array} array - 分割する配列
   * @param {number} size - チャンクサイズ
   * @returns {Array} 分割された配列の配列
   */
  chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  },

  /**
   * オブジェクトのディープコピー
   * @param {any} obj - コピー対象のオブジェクト
   * @returns {any} コピーされたオブジェクト
   */
  deepCopy(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepCopy(item));
    }
    
    const copied = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        copied[key] = this.deepCopy(obj[key]);
      }
    }
    
    return copied;
  },

  /**
   * 数値を3桁区切りでフォーマット
   * @param {number} number - フォーマットする数値
   * @returns {string} フォーマットされた文字列
   */
  formatNumber(number) {
    if (number === null || number === undefined || isNaN(Number(number))) {
      return '';
    }
    return Number(number).toLocaleString();
  },

  /**
   * ファイルサイズを人間が読みやすい形式でフォーマット
   * @param {number} bytes - バイト数
   * @returns {string} フォーマットされたファイルサイズ
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * 文字列をエスケープ
   * @param {string} str - エスケープする文字列
   * @returns {string} エスケープされた文字列
   */
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /**
   * ランダムなIDを生成
   * @param {number} length - ID長
   * @returns {string} ランダムID
   */
  generateId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
};

/**
 * ローディング表示を管理するクラス
 */
export class LoadingManager {
  constructor() {
    this.loadingElement = null;
    this.isLoading = false;
  }

  /**
   * ローディング表示を開始
   * @param {string} message - ローディングメッセージ
   */
  show(message = '処理中...') {
    if (this.isLoading) return;
    
    this.isLoading = true;
    
    // ローディングオーバーレイの作成
    this.loadingElement = document.createElement('div');
    this.loadingElement.className = 'loading-overlay';
    
    Object.assign(this.loadingElement.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '9999'
    });
    
    // ローディングコンテンツの作成
    const content = document.createElement('div');
    Object.assign(content.style, {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      textAlign: 'center',
      minWidth: '200px'
    });
    
    content.innerHTML = `
      <div style="margin-bottom: 10px;">
        <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
      </div>
      <div>${message}</div>
    `;
    
    // スピンアニメーションのスタイルを追加
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    
    this.loadingElement.appendChild(content);
    document.body.appendChild(this.loadingElement);
  }

  /**
   * ローディング表示を終了
   */
  hide() {
    if (!this.isLoading || !this.loadingElement) return;
    
    this.isLoading = false;
    
    if (this.loadingElement.parentNode) {
      this.loadingElement.parentNode.removeChild(this.loadingElement);
    }
    
    this.loadingElement = null;
  }
}

/**
 * グローバルローディングマネージャーのインスタンス
 */
export const loading = new LoadingManager();
