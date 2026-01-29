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
 */

function doPost(e) {
  var result = { ok: false, error: null };
  try {
    if (!e || !e.postData || !e.postData.contents) {
      result.error = 'Missing POST body';
      return createJsonResponse(result);
    }
    var payload = JSON.parse(e.postData.contents);
  } catch (err) {
    result.error = 'Invalid JSON: ' + (err.message || String(err));
    return createJsonResponse(result);
  }

  var sheet1Name = payload.sheet1Name || 'シート1';
  var sheet2Name = payload.sheet2Name || 'シート2';
  var members = payload.members || [];
  var aggregate = payload.aggregate || {};

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // シート1: メンバー一覧（メンバー名 | 出席/欠席/未入力 | ロール）
    var sh1 = getOrCreateSheet(ss, sheet1Name);
    sh1.clear();
    sh1.getRange(1, 1, 1, 3).setValues([['メンバー名', '出席/欠席/未入力', 'ロール']]);
    sh1.getRange(1, 1, 1, 3).setFontWeight('bold');
    if (members.length > 0) {
      var rows = members.map(function (m) {
        return [m.name || '', m.status || '未入力', m.role || ''];
      });
      sh1.getRange(2, 1, 1 + rows.length, 3).setValues(rows);
    }

    // シート2: 集計結果（項目 | 値）
    var sh2 = getOrCreateSheet(ss, sheet2Name);
    sh2.clear();
    var items = ['イケケモ', '案内', 'サクラ', 'スタッフ', 'ゲスト', 'インスタンス'];
    var aggRows = [['項目', '値']];
    items.forEach(function (k) {
      aggRows.push([k, aggregate[k] != null ? aggregate[k] : '']);
    });
    sh2.getRange(1, 1, aggRows.length, 2).setValues(aggRows);
    sh2.getRange(1, 1, 1, 2).setFontWeight('bold');

    result.ok = true;
    return createJsonResponse(result);
  } catch (err) {
    result.error = err.message || String(err);
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
