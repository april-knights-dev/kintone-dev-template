/**
 * サンプルアプリのカスタマイズ
 * 
 * このファイルはテンプレートのサンプルです。
 * 実際の開発では、このファイルを参考にしてアプリ固有のカスタマイズを実装してください。
 */

// kintone REST API Client の使用例
import { KintoneRestAPIClient } from '@kintone/rest-api-client';

// 共通機能の読み込み例
import { formatDate, showNotification } from '../../common/utils.js';

/**
 * アプリケーション初期化
 */
(() => {
  'use strict';

  // REST APIクライアントの初期化
  const client = new KintoneRestAPIClient();

  /**
   * レコード表示画面のカスタマイズ例
   */
  kintone.events.on('app.record.detail.show', (event) => {
    console.log('レコード詳細画面が表示されました', event);
    
    // カスタムボタンの追加例
    addCustomButton();
    
    return event;
  });

  /**
   * レコード作成画面のカスタマイズ例
   */
  kintone.events.on(['app.record.create.show', 'app.record.edit.show'], (event) => {
    console.log('レコード編集画面が表示されました', event);
    
    // 日付フィールドのデフォルト値設定例
    setDefaultValues(event);
    
    return event;
  });

  /**
   * フィールド値変更時のカスタマイズ例
   */
  kintone.events.on(['app.record.create.change.sample_field', 'app.record.edit.change.sample_field'], (event) => {
    const record = event.record;
    const fieldValue = record.sample_field.value;
    
    console.log('サンプルフィールドが変更されました:', fieldValue);
    
    // 値に応じて他のフィールドを自動設定
    if (fieldValue === '自動設定') {
      record.auto_field.value = '自動で設定された値';
      showNotification('フィールドが自動設定されました', 'success');
    }
    
    return event;
  });

  /**
   * レコード保存前のバリデーション例
   */
  kintone.events.on(['app.record.create.submit', 'app.record.edit.submit'], (event) => {
    const record = event.record;
    
    // カスタムバリデーション
    if (!validateRecord(record)) {
      event.error = 'バリデーションエラー: 必要な項目が入力されていません';
      return event;
    }
    
    // 保存前の自動計算例
    calculateTotalAmount(record);
    
    return event;
  });

  /**
   * レコード保存後の処理例
   */
  kintone.events.on(['app.record.create.success', 'app.record.edit.success'], (event) => {
    console.log('レコードが保存されました', event);
    
    // 保存後の追加処理
    showNotification('レコードが正常に保存されました', 'success');
    
    return event;
  });

  /**
   * 一覧画面のカスタマイズ例
   */
  kintone.events.on('app.record.index.show', (event) => {
    console.log('一覧画面が表示されました', event);
    
    // 一覧画面にカスタムボタンを追加
    addIndexCustomButton();
    
    return event;
  });

  /**
   * カスタムボタンの追加
   */
  function addCustomButton() {
    const headerSpace = kintone.app.record.getHeaderMenuSpaceElement();
    
    if (headerSpace && !headerSpace.querySelector('#custom-button')) {
      const button = document.createElement('button');
      button.id = 'custom-button';
      button.textContent = 'カスタム機能';
      button.className = 'kintoneplugin-button-normal';
      
      button.addEventListener('click', async () => {
        try {
          await executeCustomFunction();
          showNotification('カスタム機能が実行されました', 'success');
        } catch (error) {
          console.error('カスタム機能の実行に失敗しました:', error);
          showNotification('エラーが発生しました', 'error');
        }
      });
      
      headerSpace.appendChild(button);
    }
  }

  /**
   * 一覧画面用カスタムボタンの追加
   */
  function addIndexCustomButton() {
    const headerSpace = kintone.app.getHeaderMenuSpaceElement();
    
    if (headerSpace && !headerSpace.querySelector('#index-custom-button')) {
      const button = document.createElement('button');
      button.id = 'index-custom-button';
      button.textContent = '一括処理';
      button.className = 'kintoneplugin-button-normal';
      
      button.addEventListener('click', async () => {
        try {
          await executeBatchProcess();
          showNotification('一括処理が完了しました', 'success');
        } catch (error) {
          console.error('一括処理に失敗しました:', error);
          showNotification('一括処理でエラーが発生しました', 'error');
        }
      });
      
      headerSpace.appendChild(button);
    }
  }

  /**
   * デフォルト値の設定
   */
  function setDefaultValues(event) {
    const record = event.record;
    
    // 作成日時のデフォルト値設定例
    if (!record.created_date.value) {
      record.created_date.value = formatDate(new Date());
    }
    
    // ユーザー情報のデフォルト値設定例
    if (!record.created_by.value) {
      const userInfo = kintone.getLoginUser();
      record.created_by.value = userInfo.name;
    }
  }

  /**
   * レコードのバリデーション
   */
  function validateRecord(record) {
    // 必須項目のチェック例
    const requiredFields = ['sample_field', 'required_field'];
    
    for (const fieldCode of requiredFields) {
      if (!record[fieldCode] || !record[fieldCode].value) {
        console.error(`必須項目が未入力です: ${fieldCode}`);
        return false;
      }
    }
    
    // カスタムバリデーションロジック
    if (record.amount && record.amount.value < 0) {
      console.error('金額は0以上である必要があります');
      return false;
    }
    
    return true;
  }

  /**
   * 合計金額の計算
   */
  function calculateTotalAmount(record) {
    const unitPrice = parseInt(record.unit_price?.value || 0);
    const quantity = parseInt(record.quantity?.value || 0);
    
    record.total_amount.value = unitPrice * quantity;
  }

  /**
   * カスタム機能の実行
   */
  async function executeCustomFunction() {
    try {
      const recordId = kintone.app.record.getId();
      
      // REST APIを使用した処理例
      const response = await client.record.getRecord({
        app: kintone.app.getId(),
        id: recordId
      });
      
      console.log('取得したレコード:', response);
      
      // カスタム処理をここに実装
      // 例: 外部APIとの連携、データ変換、計算処理など
      
    } catch (error) {
      console.error('カスタム機能の実行エラー:', error);
      throw error;
    }
  }

  /**
   * 一括処理の実行
   */
  async function executeBatchProcess() {
    try {
      // 一覧のレコードを取得
      const appId = kintone.app.getId();
      const response = await client.record.getRecords({
        app: appId,
        query: 'limit 100' // 適切な条件を設定
      });
      
      console.log('取得したレコード数:', response.records.length);
      
      // 一括処理のロジック
      const updateRecords = response.records.map(record => {
        return {
          id: record.$id.value,
          record: {
            // 更新したいフィールドをここに設定
            updated_date: {
              value: formatDate(new Date())
            }
          }
        };
      });
      
      // 一括更新の実行
      if (updateRecords.length > 0) {
        await client.record.updateRecords({
          app: appId,
          records: updateRecords
        });
      }
      
    } catch (error) {
      console.error('一括処理エラー:', error);
      throw error;
    }
  }

})();
