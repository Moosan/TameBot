/**
 * TameBot スプシ連携用 App Script
 *
 * 使い方:
 * 1. スプレッドシートを開き、拡張機能 > Apps Script でプロジェクトを作成
 * 2. このファイルの内容を貼り付け、保存
 * 3. デプロイ > 新しいデプロイ > ウェブアプリ
 *    - 実行ユーザー: 自分
 *    - アクセス: 必ず「全員」（「Google アカウントを持つ全員」だと 401）
 * 4. デプロイ後表示される URL を SPREADSHEET_API_URL に設定
 *
 * シート名はリクエストの sheet1Name / sheet2Name で指定可能。
 * 未指定時は「シート1」「シート2」を使用。
 *
 * デバッグ: リクエストに debug: true を付けると、処理の各段階のログを
 * レスポンスの logs 配列で返します。Bot 側で DEBUG_SPREADSHEET=1 にすると
 * 自動で debug: true が付き、デプロイ先ログに GAS のログが出力されます。
 */

function doPost(e) {
  var result = { ok: false, error: null, logs: [] };
  var debug = false;

  function log(msg) {
    Logger.log(msg);
    if (debug) result.logs.push(msg);
  }

  try {
    log('[GAS] doPost 開始');
    if (!e || !e.postData || !e.postData.contents) {
      result.error = 'Missing POST body';
      log('[GAS] エラー: POST body なし');
      return createJsonResponse(result);
    }

    var payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      result.error = 'Invalid JSON: ' + (parseErr.message || String(parseErr));
      log('[GAS] エラー: JSON パース失敗 - ' + result.error);
      return createJsonResponse(result);
    }

    debug = payload.debug === true;
    if (debug) log('[GAS] デバッグモード: 有効');

    log('[GAS] JSON パース成功');

    var sheet1Name = payload.sheet1Name || 'シート1';
    var sheet2Name = payload.sheet2Name || 'シート2';
    var members = payload.members || [];
    var aggregate = payload.aggregate || {};

    log('[GAS] シート1名=' + sheet1Name + ', シート2名=' + sheet2Name + ', メンバー数=' + members.length);

    try {
      log('[GAS] getActiveSpreadsheet() 呼び出し');
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      log('[GAS] getActiveSpreadsheet() OK (スプレッドシートID: ' + ss.getId() + ')');

      // シート1: メンバー一覧
      log('[GAS] シート1 getOrCreateSheet: ' + sheet1Name);
      var sh1 = getOrCreateSheet(ss, sheet1Name);
      log('[GAS] シート1 getOrCreateSheet OK');

      log('[GAS] シート1 clear');
      sh1.clear();
      log('[GAS] シート1 clear OK');

      sh1.getRange(1, 1, 1, 3).setValues([['メンバー名', 'リアクション', 'ロール']]);
      sh1.getRange(1, 1, 1, 3).setFontWeight('bold');
      log('[GAS] シート1 ヘッダー書き込み OK');

      if (members.length > 0) {
        var rows = members.map(function (m) {
          return [m.name || '', m.reactionLabel || '未入力', m.role || ''];
        });
        sh1.getRange(2, 1, rows.length, 3).setValues(rows);
        log('[GAS] シート1 データ行書き込み OK (行数: ' + rows.length + ')');
      } else {
        log('[GAS] シート1 データ行なし（メンバー0件）');
      }

      // シート2: 集計結果
      log('[GAS] シート2 getOrCreateSheet: ' + sheet2Name);
      var sh2 = getOrCreateSheet(ss, sheet2Name);
      log('[GAS] シート2 getOrCreateSheet OK');

      log('[GAS] シート2 clear');
      sh2.clear();
      log('[GAS] シート2 clear OK');

      var items = ['イケケモ', '案内', 'サクラ', 'スタッフ', 'ゲスト', 'インスタンス'];
      var aggRows = [['項目', '値']];
      items.forEach(function (k) {
        aggRows.push([k, aggregate[k] != null ? aggregate[k] : '']);
      });
      sh2.getRange(1, 1, aggRows.length, 2).setValues(aggRows);
      sh2.getRange(1, 1, 1, 2).setFontWeight('bold');
      log('[GAS] シート2 集計書き込み OK (行数: ' + aggRows.length + ')');

      result.ok = true;
      log('[GAS] 処理完了 OK');
      return createJsonResponse(result);
    } catch (err) {
      result.error = err.message || String(err);
      log('[GAS] 例外: ' + result.error);
      return createJsonResponse(result);
    }
  } catch (err) {
    result.error = err.message || String(err);
    result.logs.push('[GAS] 外側の例外: ' + result.error);
    return createJsonResponse(result);
  }
}

function getOrCreateSheet(ss, name) {
  var sh = ss.getSheetByName(name);
  if (sh) return sh;
  return ss.insertSheet(name);
}

function createJsonResponse(obj) {
  var output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
