(() => {
'use strict';

// ================= Tauri ブリッジ =================
// Tauri 上では Rust コマンド、ブラウザ検証時は localStorage にフォールバック
const TAURI = window.__TAURI__ || null;
// Web 体験版(web-demo/demo.js)が本体の読み込み前に立てるフラグ。無いとき(アプリ版)は何も変えない
const DEMO = window.BW_DEMO || null;
const persist = TAURI ? {
  load: () => TAURI.core.invoke('load_state'),
  save: (data) => TAURI.core.invoke('save_state', { data }),
} : {
  load: async () => localStorage.getItem('birdwriter-data'),
  save: async (data) => { localStorage.setItem('birdwriter-data', data); },
};

// バックアップ世代の一覧/読み出し(ブラウザ検証時は localStorage の1世代のみ)
const backupApi = TAURI ? {
  list: () => TAURI.core.invoke('list_backups'),
  read: (name) => TAURI.core.invoke('read_backup', { name }),
} : {
  list: async () => {
    const s = localStorage.getItem('birdwriter-data-backup');
    return s ? [{ name: 'birdwriter-data-backup', ts: 0, size: s.length }] : [];
  },
  read: async (name) => {
    const v = localStorage.getItem(name);
    if (v == null) throw new Error('backup not found');
    return v;
  },
};

// ⌘ / Ctrl の表記分け(ショートカット一覧の表示用)
const IS_MAC = /Mac/i.test(navigator.platform || navigator.userAgent);
const MODK = IS_MAC ? '⌘' : 'Ctrl+';

// ================= 言語 =================
const STR = {
  ja: {
    fit: '全体', fitT: 'すべてのボックスを表示',
    setT: '設定', addBoardT: 'ボードを追加',
    zoomInT: '拡大', zoomOutT: '縮小',
    total: n => `このボード <b>${n}</b> 字`, chars: ' 字',
    vert: '縦', vtT: '縦書き / 横書き',
    btitle: '題', btitleT: 'タイトルを付ける / 編集（俯瞰でも読める見出し）',
    connect: '接続', connectT: '別のボックスと接続',
    link: 'リンク', linkT: '他のボードへリンク',
    focus: '集中', focusT: '全画面で集中執筆',
    del: '削除', delT: '削除（2回押しで確定）',
    selCount: n => `${n}個選択`,
    merge: '結合', mergeT: '選択したテキストボックスを1つに結合（読み順・空行区切り）',
    merged: n => `${n}個のボックスを結合しました`,
    arrange: '整列', arrangeT: '読み順に整列（横書き=縦一列 / 縦書き=横一行）',
    arranged: n => `${n}個のボックスを整列しました`,
    copied: n => `${n}個のボックスをコピーしました`,
    cutDone: n => `${n}個のボックスを切り取りました`,
    kbCopy: 'ボックスのコピー / 切り取り / 貼り付け（選択中）',
    split: '分割', splitT: '空行の位置で複数のボックスに分割',
    splitNone: '空行がないため分割できません（分割したい位置に空の行を入れてください）',
    splitDone: n => `${n}個のボックスに分割しました`,
    splitCaretNone: 'カーソル位置の前後にテキストがないため分割できません',
    kbSplitCaret: 'カーソル位置で分割（テキスト編集中）',
    toVert: '縦書きへ', toHorz: '横書きへ',
    close: '✕ 閉じる', closeT: 'キャンバスに戻る（Esc）',
    insertImage: '画像を挿入…',
    imgErr: '画像を読み込めませんでした',
    imgAdded: n => `画像を${n}枚追加しました`,
    gridShow: '格子を表示',
    themeLabel: 'テーマ', themeLight: 'ライト', themeDark: 'ダーク', themeSystem: 'システム連動',
    labelStyleLabel: 'ラベルの表示', labelPattern: '模様（縞・べた・水玉・斜線）', labelColor: '色',
    langLabel: '言語 / Language',
    noTarget: 'リンク先がありません（＋でボード追加）',
    unlink: 'リンクを解除',
    linkedTo: n => `「${n}」へのリンクを設定しました`,
    connected: '接続しました（線をダブルクリックでジャンプ / 右クリックで削除）',
    connCancel: '接続をキャンセルしました', connDel: '接続を削除しました',
    pickTarget: '接続先のボックスをクリック（Esc でキャンセル）',
    delAgain: 'もう一度押すと削除します',
    boardN: n => `ボード ${n}`,
    notFound: 'リンク先のボードが見つかりません',
    notFoundBox: 'リンク先のボックスが見つかりません（ボードへ移動します）',
    welcome: 'ダブルクリックで新規ボックス / ピンチ or ⌘+スクロールでズーム',
    saveErr: '保存に失敗しました — データの場所を確認してください',
    saveWarn: '保存できていません',
    saveWarnT: '保存に失敗し続けています。空き容量・書き込み権限を確認してください（クリックで再試行）',
    closeFailTitle: '変更を保存できていません',
    closeFailBody: '最後の変更の保存に失敗しました。このまま終了すると未保存の変更は失われます。空き容量や書き込み権限を確認してからキャンセルし、右上の「保存できていません」から再試行してください。',
    closeFailBtn: '保存せずに終了',
    nothingUndo: 'これ以上戻れません', nothingRedo: 'これ以上やり直せません',
    backT: '前のボードへ戻る（⌘[）',
    searchMenu: '検索…', searchPh: '全ボードを検索（⌘F）',
    searchNone: '見つかりません', searchHits: n => `${n} 件`,
    exportMenu: '書き出し…', exportTitle: 'テキスト書き出し',
    scopeLabel: '対象', scopeBoard: 'このボード全体', scopeBox: '選択中のボックスのみ',
    orderLabel: '結合順', orderH: '位置順（上から下）', orderV: '位置順（右から左・縦書き）',
    orderManual: '手動（下のリストで並べ替え）',
    sepBlank: 'ボックス間に空行を入れる',
    exportRun: '書き出す', cancel: 'キャンセル',
    exportDone: n => `書き出しました: ${n}`, exportErr: '書き出しに失敗しました',
    exportEmpty: '書き出せるテキストがありません（空のボックスは対象外）',
    emptyBox: '（空）', moveUp: '上へ', moveDown: '下へ',
    tabRename: '名前を変更', tabDup: '複製',
    tabMoveL: '左へ移動', tabMoveR: '右へ移動', tabDel: '削除',
    copySuffix: ' のコピー',
    boardDelTitle: 'ボードを削除',
    boardDelBody: (n, c) => `「${n}」を削除します。ボックス ${c} 個も削除され、他のボードからこのボードへのリンクは解除されます。この操作はアンドゥできません（直前の状態は自動バックアップへ保存されます）。`,
    boardDelBtn: '削除する',
    projSave: 'プロジェクトを保存', projSaveAs: '別名で保存…', projOpen: 'プロジェクトを開く…',
    recentLabel: '最近使ったプロジェクト',
    projDefaultName: n => `プロジェクト ${n}`,
    projSaved: n => `保存しました: ${n}`,
    projOpenConfirmTitle: 'プロジェクトを開く',
    projOpenConfirmBody: n => `「${n}」を開きます。現在のボードはすべてこのファイルの内容に置き換わります。直前の状態は自動バックアップへ保存されます。`,
    projOpenBtn: '置き換えて開く',
    projOpened: n => `開きました: ${n}`,
    projOpenErr: 'ファイルを読み込めませんでした（形式が違うか破損しています）',
    guardErr: '中止しました — 現在のデータの保存またはバックアップに失敗したため',
    loadErr: '保存データを読み込めませんでした — 元の内容を退避し、新規で開始します',
    loadErrKeep: '保存データを読み込めませんでした — 退避にも失敗したため、編集するまで上書きしません',
    linkToBox: 'ボックスへリンク…',
    pickBoxTarget: 'リンク先のボックスをクリック（上のタブでボード切替 / Esc でキャンセル）',
    pickCancel: 'リンク設定をキャンセルしました',
    boxLinkSet: n => `「${n}」のボックスへリンクしました`,
    replacePh: '置換後のテキスト',
    replaceAll: 'すべて置換',
    replaceTitle: '一括置換',
    replaceBody: (q, r, n, bx) => `「${q}」を${r ? `「${r}」` : '空文字（削除）'}に置き換えます：${n} 件（${bx} ボックス）。取り消し（アンドゥ）1回で元に戻せます。`,
    replaceBtn: '置換する',
    replaceDone: n => `${n} 件を置換しました`,
    restoreMenu: 'バックアップから復元…',
    restoreTitle: 'バックアップから復元',
    restoreBody: '戻したい時点を選んでください。現在の内容は、復元の直前に自動バックアップへ保存されます。',
    restoreEmpty: 'バックアップはまだありません',
    restoreBtn: '復元する',
    restoreDone: '復元しました（直前の状態もバックアップに保存済み）',
    restoreErr: '復元できませんでした（バックアップを読み込めません）',
    relNow: 'たった今', relMin: n => `${n}分前`, relHour: n => `${n}時間前`, relDay: n => `${n}日前`,
    fontLabel: '文字サイズ', fontS: '小', fontM: '標準', fontL: '大', fontXL: '特大',
    aiGuideMenu: 'AI用の説明をコピー',
    aiGuideDone: 'コピーしました — AIアシスタントに貼り付けてください',
    aiGuideTitle: 'AI用の説明',
    aiGuideBody: '下のテキストをすべてコピーして、AIアシスタント（Claude や ChatGPT など）に貼り付けてください。そのあとに .bwt ファイルを渡すと、原稿の構造を理解した上で手伝ってもらえます。',
    aiGuideCopyBtn: 'コピー',
    kbMenu: 'キーボードショートカット…',
    kbTitle: 'キーボードショートカット',
    kbCloseBtn: '閉じる',
    kbNew: '新しいボックス（選択中はその続きに / 集中モード中は次のボックスへ）',
    kbEdit: '選択中のボックスを編集（Esc で終了）',
    kbTab: '次・前のボックスへ（読み順）',
    kbArrows: '隣のボックスを選択',
    kbFocus: '集中モードを開始 / 終了',
    kbSearch: '検索と置換',
    kbSave: 'プロジェクトを保存',
    kbSaveAs: '別名で保存',
    kbOpen: 'プロジェクトを開く',
    demoNoOpen: '体験版では開けません。アプリ版でどうぞ',
    kbExport: 'テキスト書き出し',
    kbUndo: '取り消し / やり直し',
    kbBack: '前のボードへ戻る',
    kbBoards: 'ボードを切り替え',
    kbDelete: '選択中のボックスを削除',
    kbMultiKey: 'Shift+クリック / ドラッグ',
    kbMulti: '複数選択',
    kbDblKey: 'ダブルクリック',
    kbDbl: '新しいボックス（何もない場所で）',
    kbZoomKey: m => `${m}スクロール / ピンチ`,
    kbZoom: 'ズーム',
    kbImgKey: m => `${m}V / ドラッグ&ドロップ`,
    kbImg: '画像を貼り付け / 落とした位置に挿入（自動で縮小）',
    kbHelp: 'このショートカット一覧を開く / 閉じる',
    searchDragT: 'ドラッグで移動（ダブルクリックで元の位置へ）',
  },
  en: {
    fit: 'Fit', fitT: 'Show all boxes',
    setT: 'Settings', addBoardT: 'Add board',
    zoomInT: 'Zoom in', zoomOutT: 'Zoom out',
    total: n => `This board: <b>${n}</b> words`, chars: ' words',
    vert: '縦', vtT: 'Vertical / horizontal writing',
    btitle: 'Title', btitleT: 'Add or edit a title (stays readable when zoomed out)',
    connect: 'Connect', connectT: 'Connect to another box',
    link: 'Link', linkT: 'Link to another board',
    focus: 'Focus', focusT: 'Focus mode (fullscreen)',
    del: 'Delete', delT: 'Delete (press twice)',
    selCount: n => `${n} selected`,
    merge: 'Merge', mergeT: 'Merge selected text boxes into one (reading order, blank-line separated)',
    merged: n => `Merged ${n} boxes`,
    arrange: 'Tidy', arrangeT: 'Arrange in reading order (column for horizontal, row for vertical)',
    arranged: n => `Tidied ${n} boxes`,
    copied: n => `Copied ${n} box(es)`,
    cutDone: n => `Cut ${n} box(es)`,
    kbCopy: 'Copy / cut / paste boxes (while selected)',
    split: 'Split', splitT: 'Split into boxes at blank lines',
    splitNone: 'No blank line to split at (add an empty line where you want to split)',
    splitDone: n => `Split into ${n} boxes`,
    splitCaretNone: 'Nothing on one side of the cursor to split',
    kbSplitCaret: 'Split at cursor (while editing)',
    toVert: 'Vertical', toHorz: 'Horizontal',
    close: '✕ Close', closeT: 'Back to canvas (Esc)',
    insertImage: 'Insert image…',
    imgErr: 'Could not read the image',
    imgAdded: n => `Added ${n} images`,
    gridShow: 'Show grid',
    themeLabel: 'Theme', themeLight: 'Light', themeDark: 'Dark', themeSystem: 'System',
    labelStyleLabel: 'Label style', labelPattern: 'Patterns (stripes, solid, dots, hatch)', labelColor: 'Colors',
    langLabel: '言語 / Language',
    noTarget: 'No other boards yet (add one with +)',
    unlink: 'Remove link',
    linkedTo: n => `Linked to “${n}”`,
    connected: 'Connected (double-click line to jump / right-click to remove)',
    connCancel: 'Connection cancelled', connDel: 'Connection removed',
    pickTarget: 'Click a box to connect (Esc to cancel)',
    delAgain: 'Press again to delete',
    boardN: n => `Board ${n}`,
    notFound: 'Linked board not found',
    notFoundBox: 'Linked box not found (jumping to its board)',
    welcome: 'Double-click to add a box / pinch or ⌘+scroll to zoom',
    saveErr: 'Saving failed — check the data location',
    saveWarn: 'Not saved',
    saveWarnT: 'Saving keeps failing. Check free disk space and write permissions (click to retry)',
    closeFailTitle: 'Changes not saved',
    closeFailBody: 'The latest changes could not be saved. Quitting now will lose them. Check free disk space and write permissions, then cancel and retry via “Not saved” in the top bar.',
    closeFailBtn: 'Quit without saving',
    nothingUndo: 'Nothing to undo', nothingRedo: 'Nothing to redo',
    backT: 'Back to previous board (⌘[)',
    searchMenu: 'Search…', searchPh: 'Search all boards (⌘F)',
    searchNone: 'No results', searchHits: n => `${n} hit${n === 1 ? '' : 's'}`,
    exportMenu: 'Export…', exportTitle: 'Export text',
    scopeLabel: 'Scope', scopeBoard: 'Whole board', scopeBox: 'Selected box only',
    orderLabel: 'Merge order', orderH: 'By position (top to bottom)', orderV: 'By position (right to left, vertical)',
    orderManual: 'Manual (reorder below)',
    sepBlank: 'Blank line between boxes',
    exportRun: 'Export', cancel: 'Cancel',
    exportDone: n => `Exported: ${n}`, exportErr: 'Export failed',
    exportEmpty: 'Nothing to export (empty boxes are skipped)',
    emptyBox: '(empty)', moveUp: 'Move up', moveDown: 'Move down',
    tabRename: 'Rename', tabDup: 'Duplicate',
    tabMoveL: 'Move left', tabMoveR: 'Move right', tabDel: 'Delete',
    copySuffix: ' copy',
    boardDelTitle: 'Delete board',
    boardDelBody: (n, c) => `Delete “${n}”? Its ${c} box(es) will be removed, and links to this board will be cleared. This cannot be undone (the current state is saved to backups first).`,
    boardDelBtn: 'Delete',
    projSave: 'Save Project', projSaveAs: 'Save As…', projOpen: 'Open project…',
    recentLabel: 'Recent Projects',
    projDefaultName: n => `Project ${n}`,
    projSaved: n => `Saved: ${n}`,
    projOpenConfirmTitle: 'Open project',
    projOpenConfirmBody: n => `Opening “${n}” will replace all current boards with the file's contents. The current state is saved to automatic backups first.`,
    projOpenBtn: 'Replace & open',
    projOpened: n => `Opened: ${n}`,
    projOpenErr: 'Could not read the file (wrong format or corrupted)',
    guardErr: 'Cancelled — could not save or back up the current data first',
    loadErr: 'Could not read saved data — the original was set aside; starting fresh',
    loadErrKeep: 'Could not read saved data — preserving it also failed; nothing will be overwritten until you edit',
    linkToBox: 'Link to a box…',
    pickBoxTarget: 'Click the target box (switch boards with the tabs / Esc to cancel)',
    pickCancel: 'Link cancelled',
    boxLinkSet: n => `Linked to box “${n}”`,
    replacePh: 'Replace with',
    replaceAll: 'Replace all',
    replaceTitle: 'Replace all',
    replaceBody: (q, r, n, bx) => `Replace ${n} occurrence(s) of “${q}” across ${bx} box(es) with ${r ? `“${r}”` : 'nothing (delete)'}. A single undo restores everything.`,
    replaceBtn: 'Replace',
    replaceDone: n => `Replaced ${n} occurrence(s)`,
    restoreMenu: 'Restore from backup…',
    restoreTitle: 'Restore from backup',
    restoreBody: 'Choose a point to go back to. The current state is saved to automatic backups right before restoring.',
    restoreEmpty: 'No backups yet',
    restoreBtn: 'Restore',
    restoreDone: 'Restored (the previous state was backed up first)',
    restoreErr: 'Could not restore (the backup is unreadable)',
    relNow: 'just now', relMin: n => `${n} min ago`, relHour: n => `${n} h ago`, relDay: n => `${n} d ago`,
    fontLabel: 'Text size', fontS: 'Small', fontM: 'Standard', fontL: 'Large', fontXL: 'X-Large',
    aiGuideMenu: 'Copy Guide for AI',
    aiGuideDone: 'Copied — paste it into your AI assistant',
    aiGuideTitle: 'Guide for AI',
    aiGuideBody: 'Copy all of the text below and paste it into your AI assistant (Claude, ChatGPT, …). Then hand over your .bwt file, and it can help with your manuscript knowing how it is structured.',
    aiGuideCopyBtn: 'Copy',
    kbMenu: 'Keyboard Shortcuts…',
    kbTitle: 'Keyboard Shortcuts',
    kbCloseBtn: 'Close',
    kbNew: 'New box (after the selected box / next box in focus mode)',
    kbEdit: 'Edit the selected box (Esc to finish)',
    kbTab: 'Next / previous box (reading order)',
    kbArrows: 'Select a neighboring box',
    kbFocus: 'Enter / leave focus mode',
    kbSearch: 'Search & replace',
    kbSave: 'Save project',
    kbSaveAs: 'Save as…',
    kbOpen: 'Open project',
    demoNoOpen: 'Not available in the trial. Please use the app.',
    kbExport: 'Export text',
    kbUndo: 'Undo / redo',
    kbBack: 'Back to previous board',
    kbBoards: 'Switch boards',
    kbDelete: 'Delete selected box(es)',
    kbMultiKey: 'Shift+click / drag',
    kbMulti: 'Multi-select',
    kbDblKey: 'Double-click',
    kbDbl: 'New box (on empty canvas)',
    kbZoomKey: m => `${m}scroll / pinch`,
    kbZoom: 'Zoom',
    kbImgKey: m => `${m}V / drag & drop`,
    kbImg: 'Paste / drop images (auto-resized)',
    kbHelp: 'Open / close this shortcut list',
    searchDragT: 'Drag to move (double-click to reset position)',
  }
};
let lang = 'ja';
const t = (k, ...a) => {
  const v = STR[lang][k];
  return typeof v === 'function' ? v(...a) : v;
};

// ================= データ =================
const COLORS = ['none', 'sky', 'coral', 'mint', 'lemon'];
const COLOR_MIGRATE = { ai: 'sky', shu: 'coral', matsuba: 'mint', yamabuki: 'lemon' };

let uid = 1, bid = 1;
const newBoard = (name) => ({ id: bid++, name, boxes: [], conns: [], view: { x: 60, y: 80, s: 1 } });
let boards = [];
let cur = 0;
const FONT_SIZES = [13, 15, 17, 19]; // 小 / 標準 / 大 / 特大
let settings = { lang: 'ja', theme: 'system', grid: true, fontSize: 15, labelStyle: 'pattern' };
// 現在のプロジェクト(.bwt)のパス。⌘S(上書き保存)の書き込み先。
// data.json には保存して再起動後も引き継ぐが、.bwt 自体には埋め込まない
let projPath = null;
// 最近使ったプロジェクト(.bwt のパス、新しい順・最大8件)。
// data.json のみに保存し、.bwt には書かない(原稿ファイルにローカルパスを漏らさない)
let recentProjects = [];
const RECENT_MAX = 8;
function noteRecent(p) {
  if (!p) return;
  recentProjects = [p, ...recentProjects.filter(x => x !== p)].slice(0, RECENT_MAX);
}
// projPath の .bwt に最後に書いた/読んだ内容。タイトルの「● 未保存」判定に使う。
// undefined = まだ不明(起動直後など。● は出さない) / null = 乖離が確定している
let bwtSynced;
const baseName = p => p.split(/[\\/]/).pop(); // Windows のパス区切り(\)にも対応
const board = () => boards[cur];
const boardById = (id) => boards.find(b => b.id === id);
const boxById = (bd, id) => bd.boxes.find(b => b.id === id);

const clampScale = s => Math.min(3, Math.max(0.05, s));

// forProject=true は .bwt 書き出し用: パス情報(projPath/recent)をファイルに埋め込まない
const serialize = (forProject = false) => {
  if (forProject) return JSON.stringify({ version: 1, settings, cur, boards });
  const d = { version: 1, settings, cur, boards };
  if (projPath != null) d.projPath = projPath;
  if (recentProjects.length) d.recent = recentProjects;
  return JSON.stringify(d);
};

function hydrate(json) {
  const d = JSON.parse(json);
  if (!d || !Array.isArray(d.boards) || !d.boards.length) throw new Error('empty state');
  boards = d.boards.map(bd => ({
    id: bd.id,
    name: String(bd.name ?? ''),
    boxes: (bd.boxes || []).map(b => ({
      id: b.id,
      type: b.type === 'image' ? 'image' : 'text',
      x: +b.x || 0, y: +b.y || 0,
      w: Math.max(80, +b.w || 260), h: Math.max(60, +b.h || 180),
      text: String(b.text ?? ''),
      title: String(b.title ?? ''),
      src: typeof b.src === 'string' ? b.src : undefined,
      vert: !!b.vert,
      color: COLOR_MIGRATE[b.color] || (COLORS.includes(b.color) ? b.color : 'none'),
      // link: ボードID(number) または {board, box}(ボックス単位リンク)
      link: (() => {
        const l = b.link;
        if (l == null) return null;
        if (typeof l === 'object') return (l.board != null && l.box != null) ? { board: l.board, box: l.box } : null;
        return l;
      })(),
    })),
    conns: (bd.conns || []).filter(c => c && c.a != null && c.b != null).map(c => ({ a: c.a, b: c.b })),
    view: {
      x: Number.isFinite(+bd.view?.x) ? +bd.view.x : 60,
      y: Number.isFinite(+bd.view?.y) ? +bd.view.y : 80,
      s: clampScale(Number.isFinite(+bd.view?.s) ? +bd.view.s : 1),
    },
  }));
  cur = Math.min(Math.max(0, d.cur | 0), boards.length - 1);
  projPath = typeof d.projPath === 'string' && d.projPath ? d.projPath : null;
  recentProjects = Array.isArray(d.recent)
    ? d.recent.filter(x => typeof x === 'string' && x).slice(0, RECENT_MAX)
    : [];
  const s = d.settings || {};
  settings = {
    lang: s.lang === 'en' ? 'en' : 'ja',
    theme: ['light', 'dark', 'system'].includes(s.theme) ? s.theme : 'system',
    grid: s.grid !== false,
    fontSize: FONT_SIZES.includes(+s.fontSize) ? +s.fontSize : 15,
    labelStyle: s.labelStyle === 'color' ? 'color' : 'pattern', // ラベルの描き方（既定=模様。データの色名はそのまま）
  };
  uid = boards.flatMap(b => b.boxes).reduce((m, b) => Math.max(m, b.id | 0), 0) + 1;
  bid = boards.reduce((m, b) => Math.max(m, b.id | 0), 0) + 1;
}

// ================= 自動保存 (P0-1) =================
let dirty = false, saveTimer = null, dirtySince = 0, saveFailed = false, saveInFlight = null, saveRetryTimer = null;
function markDirty() {
  dirty = true;
  const now = Date.now();
  if (!dirtySince) dirtySince = now;
  clearTimeout(saveTimer);
  if (now - dirtySince >= 4000) { flushSave(); return; } // 連続編集中も最長4秒ごとに保存
  saveTimer = setTimeout(flushSave, 1200);
}
// 保存失敗が続く間はトップバーに常設インジケータを表示する (#1)
function updateSaveWarn() {
  $('saveWarn').hidden = !saveFailed;
}
// 保存は常に単一実行(並走すると古いスナップショットが後勝ちで上書きしうるため)。
// 戻り値: すべて永続化できたら true(破壊的操作の事前保証に使う)
async function flushSave() {
  while (saveInFlight) await saveInFlight.catch(() => {});
  if (!dirty) return true;
  clearTimeout(saveTimer);
  clearTimeout(saveRetryTimer);
  dirty = false; dirtySince = 0;
  saveInFlight = persist.save(serialize());
  try {
    await saveInFlight;
    if (saveFailed) { saveFailed = false; updateSaveWarn(); }
  } catch (e) {
    dirty = true;
    if (!saveFailed) { saveFailed = true; hint(t('saveErr'), 4000); updateSaveWarn(); }
    console.error('save failed', e);
    // 編集が止まっていても自動で回復を試みる(障害解消後、成功すればインジケータが消える)
    clearTimeout(saveRetryTimer);
    saveRetryTimer = setTimeout(flushSave, 20000);
  } finally {
    saveInFlight = null;
  }
  if (dirty) return saveFailed ? false : flushSave(); // 保存中に入った編集を追いフラッシュ
  updateTitle(); // .bwt 未保存ドット(●)を自動保存のタイミングで再判定
  return true;
}

// 破壊的操作(全置換・ボード削除)の前に「保存+強制バックアップ」を保証する。
// 保証できなければ false を返し、呼び出し側は操作自体を中止する。
async function guardDestructive() {
  if (!(await flushSave())) return false;
  if (TAURI) {
    try { await TAURI.core.invoke('backup_now'); }
    catch (e) { console.error('backup_now failed', e); return false; }
  } else {
    try { localStorage.setItem('birdwriter-data-backup', serialize()); }
    catch (e) { console.error('fallback backup failed', e); return false; }
  }
  return true;
}

// ================= 参照 =================
const $ = id => document.getElementById(id);
const viewport = $('viewport'), world = $('world'), wires = $('wires');
const tabsEl = $('tabs'), zoomLabel = $('zoomLabel'), totalEl = $('totalCount'), hintEl = $('hint');
const tb = $('toolbar');

let selected = null, editing = null, connectFrom = null, hintTimer = null, zTop = 10;
let dragging = false;
let linkPick = null; // ボックス単位リンクの対象選択中: { board, box } = リンク元

// mouseup 取りこぼし対策 (#6): ドラッグ/リサイズ/パン/矩形選択は window の mouseup 頼みのため、
// ネイティブメニューや OS のフォーカス奪取で mouseup を失うと張り付いたままになる。
// アクティブなジェスチャの終了処理(mouseup 相当)を1つだけ保持し、
// 新しいジェスチャの開始時と window の blur 時に必ず呼んで自己回復させる。
let activeGestureUp = null;
function endActiveGesture() {
  if (!activeGestureUp) return;
  const f = activeGestureUp;
  activeGestureUp = null;
  f();
}
function startGesture(up) {
  endActiveGesture();
  activeGestureUp = up;
}
function clearGesture() { activeGestureUp = null; }
const multiSel = new Set(); // 選択中の全ボックス id。selected は単独選択時のみ非 null(ツールバー対象)

const hint = (msg, ms = 2600) => {
  hintEl.textContent = msg;
  hintEl.classList.add('show');
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => hintEl.classList.remove('show'), ms);
};

// ================= アンドゥ / リドゥ (P0-2) =================
// テキスト編集は OS 標準のアンドゥに委ね、キャンバス操作のみ記録する
const undoStack = [], redoStack = [];
const clone = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

function pushOp(op) {
  undoStack.push(op);
  if (undoStack.length > 200) undoStack.shift();
  redoStack.length = 0;
}

function connsOf(bd, id) {
  return bd.conns.filter(c => c.a === id || c.b === id).map(c => ({ ...c }));
}
function removeBoxData(bd, id) {
  bd.boxes = bd.boxes.filter(x => x.id !== id);
  bd.conns = bd.conns.filter(c => c.a !== id && c.b !== id);
}
function restoreBoxData(bd, box, conns) {
  if (!boxById(bd, box.id)) bd.boxes.push(clone(box));
  (conns || []).forEach(c => {
    if (!bd.conns.some(x => (x.a === c.a && x.b === c.b) || (x.a === c.b && x.b === c.a)))
      bd.conns.push({ ...c });
  });
}

function applyOp(op, dir) { // dir: 1 = 順方向(redo), -1 = 逆方向(undo)
  // 一括置換: 複数ボード横断のテキスト変更。ボード切替はせず現在の表示だけ更新する
  if (op.t === 'textmulti') {
    op.items.forEach(it => {
      const b0 = boardById(it.board);
      const b = b0 && boxById(b0, it.id);
      if (b) b.text = dir > 0 ? it.to : it.from;
    });
    renderBoard();
    markDirty();
    return;
  }
  const bd = boardById(op.board);
  if (!bd) return;
  const i = boards.indexOf(bd);
  if (i !== cur) switchBoard(i, { silent: true });

  const T = op.t;
  if (T === 'move' || T === 'resize') {
    const b = boxById(bd, op.id);
    if (b) {
      const v = dir > 0 ? op.to : op.from;
      if (T === 'move') {
        b.x = v.x; b.y = v.y;
      } else {
        b.w = v.w; b.h = v.h;
        if (v.x != null) { b.x = v.x; b.y = v.y; } // 縦書きの自動幅は x も動くため(旧opは w/h のみ)
      }
    }
  } else if (T === 'movemulti') {
    op.items.forEach(it => {
      const b = boxById(bd, it.id);
      if (b) {
        const v = dir > 0 ? it.to : it.from;
        b.x = v.x; b.y = v.y;
      }
    });
  } else if (T === 'color' || T === 'vert' || T === 'link' || T === 'title') {
    const b = boxById(bd, op.id);
    if (b) {
      const v = dir > 0 ? op.to : op.from;
      if (T === 'color') b.color = v;
      else if (T === 'vert') b.vert = v;
      else if (T === 'title') b.title = v;
      else b.link = v;
    }
  } else if (T === 'add') {
    if (dir > 0) restoreBoxData(bd, op.box, op.conns);
    else {
      const b = boxById(bd, op.box.id);
      if (b) { op.box = clone(b); op.conns = connsOf(bd, b.id); } // 最新状態を捕捉してリドゥで戻せるように
      removeBoxData(bd, op.box.id);
    }
  } else if (T === 'del') {
    if (dir > 0) {
      const b = boxById(bd, op.box.id);
      if (b) { op.box = clone(b); op.conns = connsOf(bd, b.id); }
      removeBoxData(bd, op.box.id);
    } else restoreBoxData(bd, op.box, op.conns);
  } else if (T === 'delmulti') {
    if (dir > 0) {
      op.items.forEach(it => {
        const b = boxById(bd, it.box.id);
        if (b) { it.box = clone(b); it.conns = connsOf(bd, b.id); } // 最新状態を捕捉してアンドゥで戻せるように
        removeBoxData(bd, it.box.id);
      });
    } else {
      op.items.forEach(it => restoreBoxData(bd, it.box, it.conns));
    }
  } else if (T === 'addmulti') { // 貼り付けの逆再生(delmulti の鏡像)
    if (dir > 0) {
      op.items.forEach(it => restoreBoxData(bd, it.box, it.conns));
    } else {
      op.items.forEach(it => {
        const b = boxById(bd, it.box.id);
        if (b) { it.box = clone(b); it.conns = connsOf(bd, b.id); } // リドゥ用に最新状態を捕捉
        removeBoxData(bd, it.box.id);
      });
    }
  } else if (T === 'merge') {
    const tb = boxById(bd, op.targetId);
    if (dir > 0) {
      op.absorbed.forEach(it => {
        const b = boxById(bd, it.box.id);
        if (b) { it.box = clone(b); it.conns = connsOf(bd, b.id); }
        removeBoxData(bd, it.box.id);
      });
      if (tb) tb.text = op.resultText;
      op.addedConns.forEach(c => {
        if (!bd.conns.some(x => (x.a === c.a && x.b === c.b) || (x.a === c.b && x.b === c.a)))
          bd.conns.push({ ...c });
      });
    } else {
      op.addedConns.forEach(c => {
        bd.conns = bd.conns.filter(x => !((x.a === c.a && x.b === c.b) || (x.a === c.b && x.b === c.a)));
      });
      if (tb) tb.text = op.fromText;
      op.absorbed.forEach(it => restoreBoxData(bd, it.box, it.conns));
    }
  } else if (T === 'split') {
    const b = boxById(bd, op.id);
    if (dir > 0) {
      if (b) b.text = op.firstText;
      op.created.forEach(cb => {
        if (!boxById(bd, cb.id)) bd.boxes.push(clone(cb));
      });
    } else {
      op.created = op.created.map(cb => {
        const live = boxById(bd, cb.id);
        return live ? clone(live) : cb; // 最新状態を捕捉してリドゥで戻せるように
      });
      op.created.forEach(cb => removeBoxData(bd, cb.id));
      if (b) b.text = op.fromText;
    }
  } else if (T === 'connadd' || T === 'conndel') {
    const add = (T === 'connadd') === (dir > 0);
    if (add) {
      if (!bd.conns.some(c => (c.a === op.a && c.b === op.b) || (c.a === op.b && c.b === op.a)))
        bd.conns.push({ a: op.a, b: op.b });
    } else {
      bd.conns = bd.conns.filter(c => !((c.a === op.a && c.b === op.b) || (c.a === op.b && c.b === op.a)));
    }
  }

  multiSel.clear();
  if (T === 'movemulti') {
    op.items.forEach(it => { if (boxById(bd, it.id)) multiSel.add(it.id); });
  } else if (T === 'delmulti' || T === 'addmulti') {
    op.items.forEach(it => { if (boxById(bd, it.box.id)) multiSel.add(it.box.id); });
  } else if (T === 'merge') {
    if (boxById(bd, op.targetId)) multiSel.add(op.targetId);
    if (dir < 0) op.absorbed.forEach(it => { if (boxById(bd, it.box.id)) multiSel.add(it.box.id); });
  } else if (T === 'split') {
    if (boxById(bd, op.id)) multiSel.add(op.id);
    if (dir > 0) op.created.forEach(cb => { if (boxById(bd, cb.id)) multiSel.add(cb.id); });
  } else {
    const affected = op.id ?? op.box?.id ?? null;
    if (affected != null && boxById(bd, affected)) multiSel.add(affected);
  }
  syncPrimary();
  renderBoard();
  markDirty();
}

function undo() {
  if (dragging || editing != null) return;
  const op = undoStack.pop();
  if (!op) { hint(t('nothingUndo'), 1400); return; }
  applyOp(op, -1);
  redoStack.push(op);
}
function redo() {
  if (dragging || editing != null) return;
  const op = redoStack.pop();
  if (!op) { hint(t('nothingRedo'), 1400); return; }
  applyOp(op, 1);
  undoStack.push(op);
}

// ================= 座標変換 =================
const TOP = 46;
const applyView = () => {
  const v = board().view;
  world.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.s})`;
  // タイトルは「構造レイヤー」: ズームに関係なく画面上でほぼ一定の大きさを保つ(逆スケール)
  world.style.setProperty('--inv', String(Math.min(8, 1 / v.s)));
  zoomLabel.textContent = Math.round(v.s * 100) + '%';
  viewport.classList.toggle('overview', v.s < 0.30); // 俯瞰ワッシュ閾値
  positionToolbar();
  markDirty();
};
const toWorld = (sx, sy) => {
  const v = board().view;
  return { x: (sx - v.x) / v.s, y: (sy - v.y - TOP) / v.s };
};
const zoomAt = (sx, sy, factor) => {
  const v = board().view;
  const p = toWorld(sx, sy);
  v.s = clampScale(v.s * factor);
  v.x = sx - p.x * v.s;
  v.y = (sy - TOP) - p.y * v.s;
  applyView();
};
const animateTo = (x, y, s) => {
  const v = board().view;
  v.x = x; v.y = y; v.s = s;
  world.classList.add('animated');
  applyView();
  setTimeout(() => world.classList.remove('animated'), 480);
};
const fitAll = () => {
  const bs = board().boxes;
  if (!bs.length) return;
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  bs.forEach(b => {
    minX = Math.min(minX, b.x); minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w); maxY = Math.max(maxY, b.y + b.h);
  });
  const vw = viewport.clientWidth, vh = viewport.clientHeight, pad = 60;
  const s = clampScale(Math.min((vw - pad * 2) / (maxX - minX), (vh - pad * 2) / (maxY - minY), 1.5));
  animateTo(vw / 2 - (minX + maxX) / 2 * s, vh / 2 - (minY + maxY) / 2 * s, s);
};
const focusBoxView = (b) => {
  const vw = viewport.clientWidth, vh = viewport.clientHeight;
  const s = Math.max(board().view.s, 0.9);
  animateTo(vw / 2 - (b.x + b.w / 2) * s, vh / 2 - (b.y + b.h / 2) * s, s);
};

// ================= 文字数 / 語数 =================
// UTF-16 コード単位ではなくコードポイントで数える(絵文字・非BMP漢字も1字)
const countChars = txt => {
  const s = txt.replace(/\s/g, '');
  return s.length - (s.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g)?.length ?? 0);
};
// 英語UIでは語数(words)で数える。Intl.Segmenter の語分割(未対応環境は空白区切り)
const wordSeg = (typeof Intl !== 'undefined' && Intl.Segmenter)
  ? new Intl.Segmenter('en', { granularity: 'word' })
  : null;
function countWords(txt) {
  if (!txt) return 0;
  if (!wordSeg) return txt.trim().split(/\s+/).filter(Boolean).length;
  let n = 0;
  for (const s of wordSeg.segment(txt)) {
    if (s.isWordLike) n++;
  }
  return n;
}
// 表示用カウント: 日本語UI = 字数 / 英語UI = 語数
const countMetric = txt => (lang === 'en' ? countWords(txt) : countChars(txt));
// ボックス単位のキャッシュ(語分割は字数より重いので、テキストが変わらない限り再計算しない。
// box オブジェクトの同一性がキーなので保存データには何も混ざらない)
const countCache = new WeakMap();
function countMetricBox(b) {
  const c = countCache.get(b);
  if (c && c.text === b.text && c.lang === lang) return c.n;
  const n = countMetric(b.text);
  countCache.set(b, { text: b.text, lang, n });
  return n;
}
const snippet = (s, n = 14) => {
  s = (s || '').replace(/\s+/g, ' ').trim();
  if (!s) return t('emptyBox');
  const cps = [...s]; // コードポイント単位で切り詰め(サロゲートペア分断の「�」を防ぐ)
  return cps.length > n ? cps.slice(0, n).join('') + '…' : s;
};
const updateCounts = () => {
  let total = 0;
  board().boxes.forEach(b => {
    if (b.type === 'image') return;
    const n = countMetricBox(b);
    total += n;
    const el = $('box' + b.id);
    if (el) el.querySelector('.count').textContent = n + t('chars');
  });
  totalEl.innerHTML = t('total', total.toLocaleString());
};
// 入力中の再カウントは少し遅らせる(語数分割は大きなボックスだと字数より重いため)
let countsTimer = null;
const scheduleCounts = () => {
  clearTimeout(countsTimer);
  countsTimer = setTimeout(updateCounts, 200);
};

// ================= 接続線 =================
// 中心同士を結ぶ線分がボックス境界を出る点をアンカーにする（モック準拠の端点ドット表示のため）
function anchorPoint(box, target) {
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  const dx = target.x - cx, dy = target.y - cy;
  if (!dx && !dy) return { x: cx, y: cy };
  const tx = dx > 0 ? (box.x + box.w - cx) / dx : dx < 0 ? (box.x - cx) / dx : Infinity;
  const ty = dy > 0 ? (box.y + box.h - cy) / dy : dy < 0 ? (box.y - cy) / dy : Infinity;
  const tt = Math.min(tx, ty);
  if (!isFinite(tt) || tt < 0 || tt > 1) return { x: cx, y: cy };
  return { x: cx + dx * tt, y: cy + dy * tt };
}

const SVGNS = 'http://www.w3.org/2000/svg';
function drawWires() {
  wires.innerHTML = '';
  const bd = board();
  bd.conns.forEach(c => {
    const a = boxById(bd, c.a), b = boxById(bd, c.b);
    if (!a || !b) return;
    const ca = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
    const cb = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    const pa = anchorPoint(a, cb), pb = anchorPoint(b, ca);
    const g = document.createElementNS(SVGNS, 'g');
    const mkLine = (cls) => {
      const l = document.createElementNS(SVGNS, 'line');
      l.setAttribute('x1', pa.x); l.setAttribute('y1', pa.y);
      l.setAttribute('x2', pb.x); l.setAttribute('y2', pb.y);
      l.setAttribute('class', cls);
      return l;
    };
    g.appendChild(mkLine('vis'));
    if ((pa.x - pb.x) ** 2 + (pa.y - pb.y) ** 2 > 100) {
      [pa, pb].forEach(p => {
        const dot = document.createElementNS(SVGNS, 'circle');
        dot.setAttribute('cx', p.x); dot.setAttribute('cy', p.y);
        dot.setAttribute('r', 3); dot.setAttribute('class', 'end');
        g.appendChild(dot);
      });
    }
    const hit = mkLine('hit');
    hit.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      const v = bd.view;
      const cx = (viewport.clientWidth / 2 - v.x) / v.s;
      const cy = (viewport.clientHeight / 2 - v.y) / v.s;
      const dA = (a.x + a.w / 2 - cx) ** 2 + (a.y + a.h / 2 - cy) ** 2;
      const dB = (b.x + b.w / 2 - cx) ** 2 + (b.y + b.h / 2 - cy) ** 2;
      focusBoxView(dA > dB ? a : b);
    });
    hit.addEventListener('contextmenu', (e) => {
      e.preventDefault(); e.stopPropagation();
      pushOp({ t: 'conndel', board: bd.id, a: c.a, b: c.b });
      bd.conns = bd.conns.filter(x => x !== c);
      drawWires();
      markDirty();
      hint(t('connDel'));
    });
    g.appendChild(hit);
    wires.appendChild(g);
  });
}

// ================= メニュー（汎用） =================
const menuEl = $('menu');
const closeMenu = () => { menuEl.style.display = 'none'; };
function showMenu(x, y, items, opts = {}) {
  menuEl.innerHTML = '';
  items.forEach(it => {
    const d = document.createElement('div');
    if (it.header !== undefined) {
      d.className = 'mlabel';
      d.textContent = it.header;
    } else {
      d.className = 'mi' + (it.cls ? ' ' + it.cls : '');
      const label = document.createElement('span');
      label.textContent = it.label;
      d.appendChild(label);
      if (it.check) {
        const c = document.createElement('span');
        c.className = 'check'; c.textContent = '✓';
        d.appendChild(c);
      }
      if (it.action) d.addEventListener('click', () => { closeMenu(); it.action(); });
    }
    menuEl.appendChild(d);
  });
  menuEl.style.display = 'block';
  let left = opts.alignRight ? x - menuEl.offsetWidth : x;
  left = Math.max(8, Math.min(left, innerWidth - menuEl.offsetWidth - 8));
  const top = Math.max(8, Math.min(y, innerHeight - menuEl.offsetHeight - 8));
  menuEl.style.left = left + 'px';
  menuEl.style.top = top + 'px';
}
addEventListener('mousedown', (e) => { if (!menuEl.contains(e.target)) closeMenu(); });

// ================= ボックス =================
// contenteditable への貼り付けは常にプレーンテキスト化する
// (リッチテキストの HTML 構造が innerText 平坦化で余計な改行/タブとして保存を汚すため)
function plainPaste(e) {
  e.preventDefault();
  const txt = e.clipboardData?.getData('text/plain') ?? '';
  if (txt) document.execCommand('insertText', false, txt);
}

function applyBoxAppearance(el, b) {
  el.dataset.color = b.color;
  el.classList.toggle('labeled', b.color !== 'none');
  el.classList.toggle('vertical', !!b.vert);
}

// ================= 自動サイズ(全文表示) =================
// テキストボックスは書字方向の軸が常に内容にフィットする:
// 横書き = 幅だけ手動・高さ自動 / 縦書き = 高さだけ手動・幅自動(右端=読み始め固定)。
// 画像ボックスは従来どおり両軸手動。
const FLOW_GAP = 24;       // 押し出し時に確保する間隔(分割・⌘N と同じ)
const MIN_AUTO_H = 96;     // 空ボックスでもクリックしやすい最低サイズ
const MIN_AUTO_W = 120;

// 1ボックスを内容に合わせる。戻り値 = 自動軸の伸縮量(px、0なら変化なし。正=伸びた)
function fitBox(b, el = $('box' + b.id)) {
  if (!el || b.type === 'image') return 0;
  if (b.vert) {
    el.style.width = 'auto'; // absolute 配置なので shrink-to-fit = 列数ぶんの幅
    const w = Math.max(MIN_AUTO_W, Math.ceil(el.offsetWidth));
    el.style.width = w + 'px';
    if (Math.abs(w - b.w) < 1) return 0;
    const d = w - b.w;
    b.x -= d; // 右端(読み始め)固定で左へ伸縮
    b.w = w;
    el.style.left = b.x + 'px';
    return d;
  }
  el.style.height = 'auto';
  const h = Math.max(MIN_AUTO_H, Math.ceil(el.offsetHeight));
  el.style.height = h + 'px';
  if (Math.abs(h - b.h) < 1) return 0;
  const d = h - b.h;
  b.h = h;
  return d;
}

// 伸びたボックスと重なった箱を書字方向(横=下 / 縦=左)へ最小限押し出す。
// 押された箱も連鎖して押す。移動は単調(下 or 左のみ)なので必ず停止する。
// 「どちらが下流か」は押し出し前の位置で固定する(連鎖の途中で順序が壊れないように)。
// 逆方向にある箱(意図的な重なり等)には触れない。アンドゥ対象にはしない(リフロー扱い)
function pushNeighbors(bd, mover) {
  const down = !mover.vert;
  // 下流判定の基準は「伸びても動かない辺」= 横書きは上端 / 縦書きは右端
  const orig = new Map(bd.boxes.map(b => [b.id, down ? b.y : b.x + b.w]));
  const ahead = (a, b) => {
    const pa = orig.get(a.id), pb = orig.get(b.id);
    if (pa === pb) return false; // 同位置は上下関係が決められないので触れない
    return down ? pb > pa : pb < pa;
  };
  const queue = [mover];
  let guard = 0;
  while (queue.length && guard++ < 500) {
    const a = queue.shift();
    for (const b of bd.boxes) {
      if (b === a || b === mover) continue;
      if (!(a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y)) continue;
      if (!ahead(a, b)) continue;
      if (down) b.y = a.y + a.h + FLOW_GAP;
      else b.x = a.x - b.w - FLOW_GAP;
      const el = $('box' + b.id);
      if (el) { el.style.left = b.x + 'px'; el.style.top = b.y + 'px'; }
      queue.push(b);
    }
  }
}

// 編集中のボックスの成長を反映する(入力ハンドラ・集中モード終了時などから呼ぶ)。
// 押し出しは伸びたときだけ(縮みでは隣に触れない)
function refitAfterEdit(b, el) {
  const d = fitBox(b, el);
  if (!d) return;
  if (d > 0) pushNeighbors(board(), b);
  drawWires();
  positionToolbar();
}

// ボード上の全テキストボックスを内容にフィットさせる(描画直後・フォント読込後・設定変更後)。
// スタイルの auto 化→一括読み取り→確定の2パスでリフローを2回に抑える
function fitAllBoxes() {
  const bd = board();
  const items = bd.boxes
    .filter(b => b.type !== 'image')
    .map(b => ({ b, el: $('box' + b.id) }))
    .filter(x => x.el);
  if (!items.length) return;
  items.forEach(({ b, el }) => {
    if (b.vert) el.style.width = 'auto'; else el.style.height = 'auto';
  });
  const sizes = items.map(({ b, el }) => (b.vert ? el.offsetWidth : el.offsetHeight));
  const changed = [];
  const grown = [];
  items.forEach(({ b, el }, i) => {
    if (b.vert) {
      const w = Math.max(MIN_AUTO_W, Math.ceil(sizes[i]));
      el.style.width = w + 'px';
      if (Math.abs(w - b.w) >= 1) {
        if (w > b.w) grown.push(b);
        b.x += b.w - w;
        b.w = w;
        el.style.left = b.x + 'px';
        changed.push(b);
      }
    } else {
      const h = Math.max(MIN_AUTO_H, Math.ceil(sizes[i]));
      el.style.height = h + 'px';
      if (Math.abs(h - b.h) >= 1) {
        if (h > b.h) grown.push(b);
        b.h = h;
        changed.push(b);
      }
    }
  });
  if (changed.length) {
    // 押し出しは伸びた箱だけが起こす。読み順の上流から処理すると連鎖が一方向に落ち着く
    grown.sort((a, b2) => {
      if (a.vert !== b2.vert) return a.vert ? 1 : -1;
      return a.vert ? (b2.x + b2.w) - (a.x + a.w) : a.y - b2.y;
    });
    grown.forEach(b => pushNeighbors(bd, b));
    drawWires();
    positionToolbar();
    markDirty();
  }
}

// link 値(ボードID or {board, box})を解決する。boxLink=true ならボックス単位リンク
function linkTarget(b) {
  if (b.link == null) return null;
  if (typeof b.link === 'object') {
    const bd = boardById(b.link.board);
    if (!bd) return null;
    return { bd, bx: boxById(bd, b.link.box) || null, boxLink: true };
  }
  const bd = boardById(b.link);
  return bd ? { bd, bx: null, boxLink: false } : null;
}

function updateBadge(el, b) {
  const badge = el.querySelector('.badge');
  const tg = linkTarget(b);
  if (tg) { badge.textContent = '⧉ ' + tg.bd.name + (tg.boxLink ? ' ›' : ''); badge.hidden = false; }
  else badge.hidden = true;
}

function createBoxEl(b) {
  const isImg = b.type === 'image';
  const el = document.createElement('div');
  el.className = 'box' + (isImg ? ' image' : '');
  el.id = 'box' + b.id;
  applyBoxAppearance(el, b);
  el.style.left = b.x + 'px'; el.style.top = b.y + 'px';
  el.style.width = b.w + 'px'; el.style.height = b.h + 'px';

  el.innerHTML = `
    <div class="stripe"></div>
    <div class="btitle" hidden></div>
    ${isImg
      ? `<img class="imgc" draggable="false" alt="">`
      : `<div class="content" contenteditable="false" spellcheck="false"></div><span class="count"></span>`}
    <div class="grip"></div>
    <button class="badge" hidden></button>`;
  if (isImg) el.querySelector('.imgc').src = b.src;
  else el.querySelector('.content').innerText = b.text;
  updateBadge(el, b);
  updateTitleBar(el, b);

  // --- タイトル(ダブルクリックで編集。編集中以外はドラッグの取っ手として機能) ---
  const btl = el.querySelector('.btitle');
  btl.addEventListener('mousedown', (e) => { if (btl.contentEditable === 'true') e.stopPropagation(); });
  btl.addEventListener('dblclick', (e) => { e.stopPropagation(); startTitleEdit(b, el); });
  btl.addEventListener('paste', plainPaste);
  btl.addEventListener('keydown', (ev) => {
    if (btl.contentEditable !== 'true' || ev.isComposing) return;
    if (ev.key === 'Enter') { ev.preventDefault(); btl.blur(); }
    else if (ev.key === 'Escape') { ev.stopPropagation(); btl.textContent = b.title || ''; btl.blur(); }
  });

  // --- 選択 / リンク先選択 / 接続確定 / ドラッグ移動 ---
  el.addEventListener('mousedown', (e) => {
    endActiveGesture(); // 取りこぼしで残ったジェスチャがあれば確定してから (#6)
    if (linkPick) {
      e.stopPropagation();
      if (!(linkPick.board === board().id && linkPick.box === b.id)) completeLinkPick(b);
      return;
    }
    if (connectFrom !== null && connectFrom !== b.id) {
      e.stopPropagation();
      const bd = board();
      if (!bd.conns.some(c => (c.a === connectFrom && c.b === b.id) || (c.a === b.id && c.b === connectFrom))) {
        bd.conns.push({ a: connectFrom, b: b.id });
        pushOp({ t: 'connadd', board: bd.id, a: connectFrom, b: b.id });
        markDirty();
      }
      endConnect();
      drawWires();
      hint(t('connected'), 3500);
      return;
    }
    // 別ボックス編集中にこのボックスを掴んだ場合、preventDefault で blur が発火しないため明示的に終了
    if (editing != null && editing !== b.id) document.activeElement?.blur();

    // Shift+クリック = 選択トグル(複数選択)。ドラッグは開始しない
    if (e.shiftKey && editing !== b.id) {
      e.preventDefault();
      toggleSel(b.id);
      return;
    }

    const wasMultiMember = multiSel.size > 1 && multiSel.has(b.id);
    if (!multiSel.has(b.id)) select(b.id); // 未選択なら単独選択に置き換え(選択済みメンバーなら維持して一括ドラッグ)

    if (e.target.closest('button')) return; // badge など
    if (e.target.classList.contains('grip')) return;
    const content = el.querySelector('.content');
    if (content && content.contentEditable === 'true') return; // 編集中はテキスト操作を優先
    e.preventDefault();
    const v = board().view;
    const sx = e.clientX, sy = e.clientY;
    // 選択メンバー全員を一括移動
    const targets = [...multiSel]
      .map(id => boxById(board(), id))
      .filter(Boolean)
      .map(t => ({ t, ox: t.x, oy: t.y, el: $('box' + t.id) }));
    let movedAny = false;
    const move = (ev) => {
      const dx = (ev.clientX - sx) / v.s, dy = (ev.clientY - sy) / v.s;
      movedAny = true;
      targets.forEach(s => {
        s.t.x = s.ox + dx; s.t.y = s.oy + dy;
        if (s.el) { s.el.style.left = s.t.x + 'px'; s.el.style.top = s.t.y + 'px'; }
      });
      drawWires();
      positionToolbar();
    };
    const up = () => {
      dragging = false;
      removeEventListener('mousemove', move); removeEventListener('mouseup', up);
      const changed = targets.filter(s => s.t.x !== s.ox || s.t.y !== s.oy);
      if (changed.length) {
        pushOp({
          t: 'movemulti', board: board().id,
          items: changed.map(s => ({ id: s.t.id, from: { x: s.ox, y: s.oy }, to: { x: s.t.x, y: s.t.y } })),
        });
        markDirty();
      } else if (!movedAny && wasMultiMember) {
        select(b.id); // 動かさず離した → 単独選択に収束
      }
      clearGesture();
    };
    startGesture(up);
    dragging = true;
    addEventListener('mousemove', move); addEventListener('mouseup', up);
  });

  // --- リサイズ ---
  // 自動サイズ導入後: テキストは手動軸のみ(横書き=幅 / 縦書き=高さ)、もう一方は内容に追従。
  // 画像は従来どおり両軸
  el.querySelector('.grip').addEventListener('mousedown', (e) => {
    e.preventDefault(); e.stopPropagation();
    endActiveGesture(); // (#6)
    select(b.id);
    const v = board().view;
    const ow = b.w, oh = b.h, ox = b.x, oy = b.y, sx = e.clientX, sy = e.clientY;
    const move = (ev) => {
      const dx = (ev.clientX - sx) / v.s, dy = (ev.clientY - sy) / v.s;
      if (b.type === 'image') {
        b.w = Math.max(80, ow + dx);
        b.h = Math.max(60, oh + dy);
        el.style.width = b.w + 'px'; el.style.height = b.h + 'px';
      } else if (b.vert) {
        b.h = Math.max(60, oh + dy);
        el.style.height = b.h + 'px';
        fitBox(b, el); // 幅は自動追従(右端固定)
      } else {
        b.w = Math.max(80, ow + dx);
        el.style.width = b.w + 'px';
        fitBox(b, el); // 高さは自動追従
      }
      drawWires();
      positionToolbar();
    };
    const up = () => {
      dragging = false;
      removeEventListener('mousemove', move); removeEventListener('mouseup', up);
      if (b.w !== ow || b.h !== oh || b.x !== ox || b.y !== oy) {
        pushNeighbors(board(), b);
        drawWires();
        pushOp({
          t: 'resize', board: board().id, id: b.id,
          from: { x: ox, y: oy, w: ow, h: oh },
          to: { x: b.x, y: b.y, w: b.w, h: b.h },
        });
        markDirty();
      }
      clearGesture();
    };
    startGesture(up);
    dragging = true;
    addEventListener('mousemove', move); addEventListener('mouseup', up);
  });

  // --- 編集（テキストのみ） ---
  if (!isImg) {
    const content = el.querySelector('.content');
    content.addEventListener('paste', plainPaste);
    content.addEventListener('dblclick', () => startEdit(b, el));
    content.addEventListener('blur', () => {
      content.contentEditable = 'false';
      b.text = content.innerText;
      if (editing === b.id) editing = null;
      updateToolbar();
      markDirty();
    });
    content.addEventListener('input', () => {
      b.text = content.innerText;
      scheduleCounts();
      refitAfterEdit(b, el); // 書きながら箱が育つ(重なった隣は書字方向へ押し出し)
      markDirty();
    });
  }

  // --- ボードリンクバッジ ---
  const badge = el.querySelector('.badge');
  badge.addEventListener('mousedown', (e) => e.stopPropagation());
  badge.addEventListener('click', (e) => {
    e.stopPropagation();
    if (linkPick || connectFrom !== null) return;
    const tg = linkTarget(b);
    if (!tg) { b.link = null; updateBadge(el, b); markDirty(); hint(t('notFound')); return; }
    if (tg.boxLink && !tg.bx) {
      // リンク先ボックスが消えている → ボードリンクに降格して移動
      b.link = tg.bd.id;
      updateBadge(el, b);
      markDirty();
      hint(t('notFoundBox'));
    }
    pushNav();
    const i = boards.findIndex(x => x.id === tg.bd.id);
    if (i !== cur) switchBoard(i);
    if (tg.bx) { focusBoxView(tg.bx); select(tg.bx.id); }
  });

  return el;
}

function updateTitleBar(el, b) {
  const tl = el.querySelector('.btitle');
  if (!tl) return;
  tl.textContent = b.title || '';
  const has = !!(b.title && b.title.trim());
  tl.hidden = !has;
  el.classList.toggle('titled', has);
}

// タイトルの編集を開始(未設定なら空の見出し行を出して入力させる)。
// 確定=Enter/フォーカス外し、取り消し=Esc、空にすれば見出しごと消える
function startTitleEdit(b, el) {
  const tl = el.querySelector('.btitle');
  if (!tl) return;
  tl.hidden = false;
  el.classList.add('titled');
  tl.contentEditable = 'true';
  tl.textContent = b.title || '';
  tl.focus();
  const r = document.createRange(); r.selectNodeContents(tl);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  tl.addEventListener('blur', () => {
    tl.contentEditable = 'false';
    const nv = tl.textContent.replace(/\s+/g, ' ').trim();
    if (nv !== (b.title || '')) {
      pushOp({ t: 'title', board: board().id, id: b.id, from: b.title || '', to: nv });
      b.title = nv;
      markDirty();
    }
    updateTitleBar(el, b);
    refitAfterEdit(b, el); // titled の切替で本文の上余白が変わるため
  }, { once: true });
}

function startEdit(b, el, { atStart = false, caret = null } = {}) {
  const content = el.querySelector('.content');
  if (!content) return;
  editing = b.id;
  content.contentEditable = 'true';
  content.focus();
  if (caret != null) {
    placeCaretAt(content, caret);
  } else {
    const r = document.createRange(); r.selectNodeContents(content); r.collapse(atStart);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  }
  updateToolbar();
}

function syncSelClasses() {
  document.querySelectorAll('.box.selected').forEach(x => {
    if (!multiSel.has(+x.id.slice(3))) x.classList.remove('selected');
  });
  multiSel.forEach(id => $('box' + id)?.classList.add('selected'));
}
function syncPrimary() {
  selected = multiSel.size === 1 ? [...multiSel][0] : null;
}
function select(id) {
  multiSel.clear();
  multiSel.add(id);
  selected = id;
  syncSelClasses();
  const el = $('box' + id);
  if (el) el.style.zIndex = ++zTop;
  updateToolbar();
}
function toggleSel(id) {
  if (multiSel.has(id)) multiSel.delete(id);
  else multiSel.add(id);
  syncPrimary();
  syncSelClasses();
  updateToolbar();
}
function deselect() {
  multiSel.clear();
  selected = null;
  syncSelClasses();
  updateToolbar();
}

function startConnect(id) {
  endLinkPick(true);
  connectFrom = id;
  viewport.classList.add('connecting');
  $('box' + id)?.classList.add('connect-from');
  updateToolbar();
  hint(t('pickTarget'), 6000);
}
function endConnect() {
  document.querySelectorAll('.connect-from').forEach(x => x.classList.remove('connect-from'));
  connectFrom = null;
  if (!linkPick) viewport.classList.remove('connecting'); // ボード切替時もリンク先選択の十字カーソルは維持
  updateToolbar();
}

// --- ボックス単位リンク: 対象選択モード ---
function startLinkPick(b) {
  endConnect();
  linkPick = { board: board().id, box: b.id };
  viewport.classList.add('connecting');
  updateToolbar();
  hint(t('pickBoxTarget'), 8000);
}
function endLinkPick(silent = false) {
  if (!linkPick) return;
  linkPick = null;
  if (connectFrom === null) viewport.classList.remove('connecting');
  updateToolbar();
  if (!silent) hint(t('pickCancel'));
}
function completeLinkPick(target) {
  const src = linkPick;
  linkPick = null;
  viewport.classList.remove('connecting');
  const srcBoard = boardById(src.board);
  const srcBox = srcBoard ? boxById(srcBoard, src.box) : null;
  if (!srcBox) { updateToolbar(); return; }
  const to = { board: board().id, box: target.id };
  const from = (srcBox.link && typeof srcBox.link === 'object') ? { ...srcBox.link } : srcBox.link;
  pushOp({ t: 'link', board: src.board, id: srcBox.id, from, to: { ...to } });
  srcBox.link = to;
  markDirty();
  // リンク元のボードへ戻ってバッジを見せる
  const i = boards.findIndex(x => x.id === src.board);
  if (i >= 0 && i !== cur) switchBoard(i);
  else {
    const el = $('box' + srcBox.id);
    if (el) updateBadge(el, srcBox);
  }
  select(srcBox.id);
  hint(t('boxLinkSet', snippet(target.text, 10)));
}

function addBox(wx, wy, { edit = true, w = 260, h = 180, vert = false } = {}) {
  const b = { id: uid++, type: 'text', x: wx, y: wy, w, h, text: '', title: '', vert, color: 'none', link: null };
  board().boxes.push(b);
  const el = createBoxEl(b);
  world.appendChild(el);
  fitBox(b, el); // 空ボックスも最初から自動サイズ(書き始めで飛ばないように)
  pushOp({ t: 'add', board: board().id, box: clone(b), conns: [] });
  select(b.id);
  updateCounts();
  markDirty();
  if (edit) startEdit(b, el);
  return b;
}

function deleteBox(b) {
  const bd = board();
  pushOp({ t: 'del', board: bd.id, box: clone(b), conns: connsOf(bd, b.id) });
  removeBoxData(bd, b.id);
  $('box' + b.id)?.remove();
  multiSel.delete(b.id);
  syncPrimary();
  drawWires();
  updateCounts();
  updateToolbar();
  markDirty();
}

// 選択中の全ボックスを削除する。複数選択は1つのアンドゥ単位(delmulti)で戻せる (#2)
function deleteSelection() {
  const bd = board();
  const targets = [...multiSel].map(id => boxById(bd, id)).filter(Boolean);
  if (!targets.length) return;
  if (targets.length === 1) { deleteBox(targets[0]); return; }
  pushOp({
    t: 'delmulti', board: bd.id,
    items: targets.map(b => ({ box: clone(b), conns: connsOf(bd, b.id) })),
  });
  targets.forEach(b => {
    removeBoxData(bd, b.id);
    $('box' + b.id)?.remove();
  });
  multiSel.clear();
  syncPrimary();
  drawWires();
  updateCounts();
  updateToolbar();
  markDirty();
}

// 選択中のボックスを読み順に整列する(1アンドゥ単位=movemulti)。
// 横書き: 左端を揃えて上→下の縦一列 / 全部縦書き: 上端を揃えて右→左の横一行。間隔は FLOW_GAP。
// 整列後の列が選択外の箱に重なった場合は、通常の成長時と同じ押し出しで逃がす
function arrangeSelection() {
  const bd = board();
  const targets = [...multiSel].map(id => boxById(bd, id)).filter(Boolean);
  if (targets.length < 2) return;
  const texts = targets.filter(b => b.type === 'text');
  const allVert = texts.length > 0 && texts.every(b => b.vert);
  const items = [];
  if (allVert) {
    const sorted = [...targets].sort((a, b) => ((b.x + b.w) - (a.x + a.w)) || (a.y - b.y));
    const top = Math.min(...targets.map(b => b.y));
    let right = Math.max(...targets.map(b => b.x + b.w));
    sorted.forEach(b => {
      const nx = right - b.w;
      if (nx !== b.x || top !== b.y) items.push({ id: b.id, from: { x: b.x, y: b.y }, to: { x: nx, y: top } });
      b.x = nx; b.y = top;
      right = nx - FLOW_GAP;
    });
  } else {
    const sorted = [...targets].sort((a, b) => (a.y - b.y) || (a.x - b.x));
    const left = Math.min(...targets.map(b => b.x));
    let top = Math.min(...targets.map(b => b.y));
    sorted.forEach(b => {
      if (left !== b.x || top !== b.y) items.push({ id: b.id, from: { x: b.x, y: b.y }, to: { x: left, y: top } });
      b.x = left; b.y = top;
      top = b.y + b.h + FLOW_GAP;
    });
  }
  if (!items.length) return;
  pushOp({ t: 'movemulti', board: bd.id, items });
  targets.forEach(b => {
    const el = $('box' + b.id);
    if (el) { el.style.left = b.x + 'px'; el.style.top = b.y + 'px'; }
  });
  targets.forEach(b => pushNeighbors(bd, b)); // 選択内は整列済みで重ならないため、押されるのは選択外のみ
  drawWires();
  positionToolbar();
  markDirty();
  hint(t('arranged', targets.length));
}

// ================= ボックスのコピー / 切り取り / 貼り付け =================
// アプリ内クリップボード(選択ボックス+選択内で完結する接続線)。
// 本文テキストは OS のクリップボードにも書くので、他アプリへ文章として貼れる
let boxClipboard = null; // { boxes, conns, srcBoard, pasteCount }
function copySelection(cut = false) {
  const bd = board();
  const targets = [...multiSel].map(id => boxById(bd, id)).filter(Boolean);
  if (!targets.length) return;
  const ids = new Set(targets.map(b => b.id));
  const order = readingOrder(targets);
  boxClipboard = {
    boxes: order.map(b => clone(b)),
    conns: bd.conns.filter(c => ids.has(c.a) && ids.has(c.b)).map(c => ({ ...c })),
    srcBoard: bd.id,
    pasteCount: 0,
  };
  const text = order
    .filter(b => b.type === 'text' && b.text.trim())
    .map(b => b.text.replace(/\s+$/u, ''))
    .join('\n\n');
  if (text) {
    try { navigator.clipboard?.writeText?.(text)?.catch?.(() => {}); } catch (e) { /* 権限なしでも本体機能は動く */ }
  }
  if (cut) {
    deleteSelection();
    hint(t('cutDone', targets.length));
  } else {
    hint(t('copied', targets.length));
  }
}

function pasteClipboard() {
  if (!boxClipboard || !boxClipboard.boxes.length) return;
  const bd = board();
  const cb = boxClipboard;
  cb.pasteCount++;
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  cb.boxes.forEach(b => {
    minX = Math.min(minX, b.x); minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w); maxY = Math.max(maxY, b.y + b.h);
  });
  // 同じボード = 元の位置から右下へ(連打で少しずつずれる) / 別ボード = 画面中央へ
  let dx, dy;
  if (bd.id === cb.srcBoard) {
    dx = FLOW_GAP * cb.pasteCount;
    dy = FLOW_GAP * cb.pasteCount;
  } else {
    const c = toWorld(viewport.clientWidth / 2, viewport.clientHeight / 2 + TOP);
    dx = c.x - (minX + maxX) / 2 + FLOW_GAP * (cb.pasteCount - 1);
    dy = c.y - (minY + maxY) / 2 + FLOW_GAP * (cb.pasteCount - 1);
  }
  const idMap = new Map();
  const newBoxes = cb.boxes.map(src => {
    const nb = clone(src);
    idMap.set(src.id, uid);
    nb.id = uid++;
    nb.x += dx;
    nb.y += dy;
    return nb;
  });
  // 選択内で完結するボックスリンクは複製先へ付け替え(外への参照は元の対象のまま)
  newBoxes.forEach(nb => {
    if (nb.link && typeof nb.link === 'object' && nb.link.board === cb.srcBoard && idMap.has(nb.link.box)) {
      nb.link = { board: bd.id, box: idMap.get(nb.link.box) };
    }
  });
  const newConns = cb.conns.map(c => ({ a: idMap.get(c.a), b: idMap.get(c.b) }));
  newBoxes.forEach(b => bd.boxes.push(b));
  newConns.forEach(c => bd.conns.push(c));
  pushOp({
    t: 'addmulti', board: bd.id,
    items: newBoxes.map(b => ({
      box: clone(b),
      conns: newConns.filter(c => c.a === b.id || c.b === b.id).map(c => ({ ...c })),
    })),
  });
  multiSel.clear();
  newBoxes.forEach(b => multiSel.add(b.id));
  syncPrimary();
  renderBoard();
  markDirty();
  if (newBoxes.length === 1) ensureVisible(newBoxes[0]);
}

// 選択中のテキストボックスを読み順で1つに結合する(空行区切り・1アンドゥ単位)。
// 読み順: 全て縦書きなら右→左、それ以外は上→下。先頭のボックスに集約し id を保つ。
// 吸収されるボックスの外部への接続線は結合先へ付け替える(重複・自己接続は除く)
function mergeSelection() {
  const bd = board();
  const targets = [...multiSel].map(id => boxById(bd, id)).filter(b => b && b.type === 'text');
  if (targets.length < 2) return;
  const allVert = targets.every(b => b.vert);
  targets.sort(allVert
    ? (a, b) => ((b.x + b.w) - (a.x + a.w)) || (a.y - b.y)
    : (a, b) => (a.y - b.y) || (a.x - b.x));
  const target = targets[0];
  const absorbed = targets.slice(1);
  const absorbedIds = new Set(absorbed.map(b => b.id));
  const addedConns = [];
  bd.conns.forEach(c => {
    if (!absorbedIds.has(c.a) && !absorbedIds.has(c.b)) return;
    const other = absorbedIds.has(c.a) ? c.b : c.a;
    if (other === target.id || absorbedIds.has(other)) return; // 結合内部の線は消す
    if (bd.conns.some(x => (x.a === target.id && x.b === other) || (x.a === other && x.b === target.id))) return;
    if (addedConns.some(x => x.b === other)) return;
    addedConns.push({ a: target.id, b: other });
  });
  const op = {
    t: 'merge', board: bd.id, targetId: target.id,
    fromText: target.text,
    resultText: targets.map(b => b.text.replace(/\s+$/u, '')).filter(s => s.trim()).join('\n\n'),
    absorbed: absorbed.map(b => ({ box: clone(b), conns: connsOf(bd, b.id) })),
    addedConns,
  };
  pushOp(op);
  applyOp(op, 1);
  hint(t('merged', targets.length));
}

// テキストボックスを空行の位置で分割する(1アンドゥ単位)。
// 先頭の断片は元のボックスに残し(id・接続・リンクを保持)、以降は下(縦書きは左)に同サイズで並べる
function splitBox(b) {
  if (!b || b.type !== 'text') return;
  const chunks = b.text
    .split(/\n[ \t　]*\n+/)
    .map(s => s.replace(/^\s+|\s+$/gu, ''))
    .filter(s => s);
  if (chunks.length < 2) { hint(t('splitNone'), 3600); return; }
  const bd = board();
  const gap = 24;
  const created = chunks.slice(1).map((txt, i) => ({
    id: uid++, type: 'text',
    x: b.vert ? b.x - (b.w + gap) * (i + 1) : b.x,
    y: b.vert ? b.y : b.y + (b.h + gap) * (i + 1),
    w: b.w, h: b.h,
    text: txt, title: '', vert: b.vert, color: b.color, link: null,
  }));
  const op = {
    t: 'split', board: bd.id, id: b.id,
    fromText: b.text, firstText: chunks[0],
    created,
  };
  pushOp(op);
  applyOp(op, 1);
  hint(t('splitDone', chunks.length));
}

// ⌘K: 編集中のボックスをカーソル位置で2つに分割する(Scrivener の Split at Selection と同じ作法)。
// カーソル前は元の箱に残し(タイトル・接続・リンク保持)、後ろは新しい箱へ。
// 分割後はそのまま新しい箱の先頭で編集を続行する。1アンドゥ(既存の split op)で元に戻る
// contenteditable 内のキャレット位置を innerText 上のオフセットとして返す(取れなければ null)。
// <br> や <div> の改行を数えるより、マーカーを挿して実際に innerText へ写る位置を測る方が確実
const CARET_MARK = '\uE000';
function caretOffsetIn(content) {
  if (!content || document.activeElement !== content) return null;
  const sel = getSelection();
  if (!sel.rangeCount) return null;
  const r = sel.getRangeAt(0).cloneRange();
  r.collapse(true);
  const markerNode = document.createTextNode(CARET_MARK);
  r.insertNode(markerNode);
  const idx = content.innerText.indexOf(CARET_MARK);
  markerNode.remove();
  return idx < 0 ? null : idx;
}
// innerText 上のオフセットへキャレットを置く(null や末尾超えは末尾)。
// innerText を代入した直後の DOM(テキストノードと <br> だけ)を前提にする
function placeCaretAt(content, offset) {
  const r = document.createRange();
  let rest = offset, placed = false;
  const walk = (node) => {
    for (const ch of node.childNodes) {
      if (ch.nodeType === Node.TEXT_NODE) {
        if (rest <= ch.length) { r.setStart(ch, rest); placed = true; return; }
        rest -= ch.length;
      } else if (ch.nodeName === 'BR') {
        if (rest <= 0) { r.setStartBefore(ch); placed = true; return; }
        rest -= 1;
      } else {
        walk(ch);
        if (placed) return;
      }
    }
  };
  if (offset != null) walk(content);
  if (placed) r.collapse(true); else { r.selectNodeContents(content); r.collapse(false); }
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
}

function splitBoxAtCaret() {
  if (editing == null) return;
  const b = boxById(board(), editing);
  const el = $('box' + editing);
  const content = el?.querySelector('.content');
  if (!b || !content || document.activeElement !== content) return;
  const idx = caretOffsetIn(content); // カーソル位置(innerText 上のオフセット)
  if (idx == null) return;
  const full = content.innerText;
  const before = full.slice(0, idx).replace(/\s+$/u, '');
  const after = full.slice(idx).replace(/^\s+/u, '');
  if (!before || !after) { hint(t('splitCaretNone'), 3200); return; }
  b.text = full; // 最新のDOM内容をデータへ確定してから割る
  document.activeElement.blur();
  const gap = 24;
  const created = [{
    id: uid++, type: 'text',
    x: b.vert ? b.x - b.w - gap : b.x,
    y: b.vert ? b.y : b.y + b.h + gap,
    w: b.w, h: b.h,
    text: after, title: '', vert: b.vert, color: b.color, link: null,
  }];
  const op = {
    t: 'split', board: board().id, id: b.id,
    fromText: full, firstText: before,
    created,
  };
  pushOp(op);
  applyOp(op, 1);
  // 新しい箱の先頭で編集を続ける(切った直後の場面をそのまま書き続けられる)
  const nb = boxById(board(), created[0].id);
  const nel = $('box' + created[0].id);
  if (nb && nel) {
    select(nb.id);
    ensureVisible(nb);
    startEdit(nb, nel, { atStart: true });
  }
}

// ================= キーボード操作(移動・新規・集中) =================
// 読み順(結合と同じ規則): 全テキストボックスが縦書きなら右→左、それ以外は上→下
function readingOrder(boxes) {
  const texts = boxes.filter(b => b.type === 'text');
  const allVert = texts.length > 0 && texts.every(b => b.vert);
  return [...boxes].sort(allVert
    ? (a, b) => ((b.x + b.w) - (a.x + a.w)) || (a.y - b.y)
    : (a, b) => (a.y - b.y) || (a.x - b.x));
}

// ボックスが画面内に収まるよう、ズームは変えず最小限だけパンする
function ensureVisible(b) {
  const v = board().view, m = 46;
  const x1 = b.x * v.s + v.x, y1 = b.y * v.s + v.y;
  const x2 = (b.x + b.w) * v.s + v.x, y2 = (b.y + b.h) * v.s + v.y;
  const vw = viewport.clientWidth, vh = viewport.clientHeight;
  let dx = 0, dy = 0;
  if (x2 - x1 > vw - m * 2) dx = b.vert ? vw - m - x2 : m - x1; // 幅が収まらない場合は読み始め側
  else if (x1 < m) dx = m - x1;
  else if (x2 > vw - m) dx = vw - m - x2;
  if (y2 - y1 > vh - m * 2) dy = m - y1;
  else if (y1 < m) dy = m - y1;
  else if (y2 > vh - m) dy = vh - m - y2;
  if (dx || dy) animateTo(v.x + dx, v.y + dy, v.s);
}

// Tab / Shift+Tab: 読み順で次・前のボックスへ
function navReadingOrder(dir) {
  const list = readingOrder(board().boxes);
  if (!list.length) return;
  let next;
  if (multiSel.size === 1) {
    const i = list.findIndex(b => b.id === selected);
    next = list[(i + dir + list.length) % list.length];
  } else {
    next = dir > 0 ? list[0] : list[list.length - 1];
  }
  select(next.id);
  ensureVisible(next);
}

// 矢印キー: 方向で隣のボックスへ。未選択なら画面中央にいちばん近いボックスから
const NAV_VEC = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
function navSpatial(key) {
  const bs = board().boxes;
  if (!bs.length) return;
  const cx = b => b.x + b.w / 2, cy = b => b.y + b.h / 2;
  const from = multiSel.size === 1 ? boxById(board(), selected) : null;
  if (!from) {
    const c = toWorld(viewport.clientWidth / 2, viewport.clientHeight / 2 + TOP);
    let best = null, bestD = Infinity;
    bs.forEach(b => {
      const d = (cx(b) - c.x) ** 2 + (cy(b) - c.y) ** 2;
      if (d < bestD) { bestD = d; best = b; }
    });
    if (best) { select(best.id); ensureVisible(best); }
    return;
  }
  const [vx, vy] = NAV_VEC[key];
  let best = null, bestScore = Infinity;
  bs.forEach(b => {
    if (b.id === from.id) return;
    const dx = cx(b) - cx(from), dy = cy(b) - cy(from);
    const fwd = dx * vx + dy * vy;                       // 進行方向の距離
    if (fwd <= 1) return;                                // その方向に無い
    const side = Math.abs(dx * vy) + Math.abs(dy * vx);  // 直交方向のずれ
    const score = fwd + side * 2;
    if (score < bestScore) { bestScore = score; best = b; }
  });
  if (best) { select(best.id); ensureVisible(best); }
}

// ⌘N: 新しいボックスを作って書き始める。
// 選択中はその続き(横書き=下 / 縦書き=左)に同じ寸法・同じ書字方向で、未選択なら画面中央に。
// 集中モード中は現在の内容を確定し、次のボックスで集中モードを続ける
let lastNewBox = 0;
function newBoxShortcut() {
  const now = Date.now();
  if (now - lastNewBox < 250) return; // メニューとキー入力の二重発火対策
  lastNewBox = now;
  if (!overlayEl.hidden || linkPick || connectFrom !== null) return;
  if (!searchEl.hidden) closeSearch();
  const after = (prev, edit) => {
    const gap = 24;
    const isText = prev.type === 'text';
    const w = isText ? prev.w : 260, h = isText ? prev.h : 180;
    const vert = isText && prev.vert;
    return addBox(
      vert ? prev.x - w - gap : prev.x,
      vert ? prev.y : prev.y + prev.h + gap,
      { edit, w, h, vert });
  };
  if (focusTarget) {
    const prev = focusTarget.b;
    closeFocus({ resume: false });
    const nb = after(prev, false);
    openFocus(nb, $('box' + nb.id));
    return;
  }
  if (editing != null) document.activeElement?.blur();
  const sel = selected != null ? boxById(board(), selected) : null;
  let nb;
  if (sel) {
    nb = after(sel, true);
  } else {
    const p = toWorld(viewport.clientWidth / 2, viewport.clientHeight / 2 + TOP);
    nb = addBox(p.x - 130, p.y - 90);
  }
  ensureVisible(nb);
}

// ⌘Enter: 集中モードの開始/終了(編集中または選択中のテキストボックスが対象)
function toggleFocusShortcut() {
  if (focusTarget) { closeFocus(); return; }
  if (!overlayEl.hidden || linkPick || connectFrom !== null) return;
  const id = editing != null ? editing : selected;
  if (id == null) return;
  const b = boxById(board(), id);
  if (!b || b.type === 'image') return;
  // 編集の途中なら、そのカーソル位置を集中モードへ持ち込む(戻るときも同じ位置で編集を再開する)
  let caret = null, resume = false;
  if (editing != null) {
    caret = caretOffsetIn($('box' + b.id)?.querySelector('.content'));
    resume = true;
    document.activeElement?.blur();
  }
  if (!searchEl.hidden) closeSearch();
  openFocus(b, $('box' + b.id), { caret, resume });
}

// ================= フローティングツールバー =================
const tbVert = $('tbVert'), tbDel = $('tbDel');
let delArmed = 0, delArmedKey = null; // アームは選択集合に紐づける(選択が変わったら無効)

const selKey = () => [...multiSel].sort((a, b) => a - b).join(',');

function disarmDelete() {
  delArmed = 0;
  delArmedKey = null;
  tbDel.classList.remove('armed');
}

function updateToolbar() {
  const multi = multiSel.size > 1; // 複数選択時は「N個選択 + 削除」のみ表示 (#2)
  const b = !multi && selected != null ? boxById(board(), selected) : null;
  if ((!b && !multi) || editing != null || connectFrom != null || linkPick || focusTarget) {
    tb.hidden = true;
    disarmDelete();
    return;
  }
  if (delArmedKey !== null && delArmedKey !== selKey()) disarmDelete();
  tb.classList.toggle('multi', multi);
  if (multi) {
    $('tbCount').textContent = t('selCount', multiSel.size);
    // 結合はテキストボックスが2つ以上選ばれているときだけ
    const textCount = [...multiSel].filter(id => boxById(board(), id)?.type === 'text').length;
    $('tbMerge').hidden = textCount < 2;
  } else {
    const isImg = b.type === 'image';
    tbVert.hidden = isImg;
    $('sepVert').hidden = isImg;
    $('tbFocus').hidden = isImg;
    $('tbSplit').hidden = isImg;
    tbVert.classList.toggle('active', !!b.vert);
    tb.querySelectorAll('.sw').forEach(s => s.classList.toggle('on', s.dataset.c === b.color));
  }
  tb.hidden = false;
  positionToolbar();
}

// 選択集合全体のバウンディングボックス基準で配置(単独選択も同じ式に含まれる)
function positionToolbar() {
  if (tb.hidden || !multiSel.size) return;
  const bd = board();
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, found = false;
  multiSel.forEach(id => {
    const b = boxById(bd, id);
    if (!b) return;
    found = true;
    minX = Math.min(minX, b.x); minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w); maxY = Math.max(maxY, b.y + b.h);
  });
  if (!found) return;
  const v = bd.view;
  const w = tb.offsetWidth, h = tb.offsetHeight;
  let left = (minX + maxX) / 2 * v.s + v.x;
  let top = maxY * v.s + v.y + TOP + 12;
  if (top + h > innerHeight - 10) top = minY * v.s + v.y + TOP - 12 - h; // 画面下端では上に反転
  left = Math.max(10 + w / 2, Math.min(innerWidth - 10 - w / 2, left));
  tb.style.left = left + 'px';
  tb.style.top = top + 'px';
}

tb.addEventListener('mousedown', (e) => e.preventDefault()); // 選択解除やフォーカス移動を防ぐ

tbVert.addEventListener('click', () => {
  const b = boxById(board(), selected); if (!b) return;
  pushOp({ t: 'vert', board: board().id, id: b.id, from: b.vert, to: !b.vert });
  b.vert = !b.vert;
  applyBoxAppearance($('box' + b.id), b);
  updateToolbar();
  markDirty();
});

tb.querySelectorAll('.sw').forEach(sw => sw.addEventListener('click', () => {
  const b = boxById(board(), selected); if (!b) return;
  const c = sw.dataset.c;
  if (b.color === c) return;
  pushOp({ t: 'color', board: board().id, id: b.id, from: b.color, to: c });
  b.color = c;
  applyBoxAppearance($('box' + b.id), b);
  updateToolbar();
  markDirty();
}));

$('tbConn').addEventListener('click', () => { if (selected != null) startConnect(selected); });

$('tbLink').addEventListener('click', (e) => {
  const b = boxById(board(), selected); if (!b) return;
  const el = $('box' + b.id);
  const items = boards.filter((_, i) => i !== cur).map(bd => ({
    label: '⧉ ' + bd.name,
    check: b.link === bd.id,
    action: () => {
      if (b.link === bd.id) return;
      pushOp({ t: 'link', board: board().id, id: b.id, from: b.link, to: bd.id });
      b.link = bd.id;
      updateBadge(el, b);
      markDirty();
      hint(t('linkedTo', bd.name));
    }
  }));
  if (!items.length) items.push({ label: t('noTarget'), cls: 'muted' });
  items.push({ label: t('linkToBox'), action: () => startLinkPick(b) });
  if (b.link !== null) items.push({
    label: t('unlink'), cls: 'off',
    action: () => {
      pushOp({ t: 'link', board: board().id, id: b.id, from: b.link, to: null });
      b.link = null;
      updateBadge(el, b);
      markDirty();
    }
  });
  const r = e.currentTarget.getBoundingClientRect();
  showMenu(r.left, r.bottom + 8, items);
});

$('tbTitle').addEventListener('click', () => {
  const b = boxById(board(), selected); if (!b) return;
  startTitleEdit(b, $('box' + b.id));
});

$('tbFocus').addEventListener('click', () => {
  const b = boxById(board(), selected); if (!b || b.type === 'image') return;
  openFocus(b, $('box' + b.id));
});

$('tbSplit').addEventListener('click', () => {
  const b = boxById(board(), selected);
  if (b) splitBox(b);
});

$('tbMerge').addEventListener('click', () => mergeSelection());

$('tbArrange').addEventListener('click', () => arrangeSelection());

tbDel.addEventListener('click', () => {
  const bd = board();
  const targets = [...multiSel].map(id => boxById(bd, id)).filter(Boolean);
  if (!targets.length) return;
  const hasContent = targets.some(x => x.type === 'image' || x.text.trim());
  const key = selKey();
  if (hasContent && (delArmedKey !== key || Date.now() - delArmed > 2500)) {
    delArmed = Date.now();
    delArmedKey = key;
    tbDel.classList.add('armed');
    hint(t('delAgain'));
    setTimeout(() => { if (Date.now() - delArmed >= 2400) disarmDelete(); }, 2600);
    return;
  }
  disarmDelete();
  deleteSelection();
});

// ================= 画像挿入 =================
// 画像は data URI として原稿(data.json / .bwt)に埋め込まれる。原寸のまま入れると
// 「保存のたびに全体を書き直す」「5分ごとに30世代コピーする」設計と噛み合わず肥大化するため、
// 取り込み時に長辺 1600px・JPEG 85% 相当まで整える(写真1枚 ≒ 1.5MB → 約220KB)。
// 執筆の資料写真としては十分な解像度で、20枚程度なら体感の劣化はない。
const MAX_IMG_SIDE = 1600;
const IMG_QUALITY = 0.85;
const KEEP_AS_IS_BYTES = 300 * 1024; // 元から小さい画像は再エンコードしない(スクショの劣化を防ぐ)

const readAsDataURL = (file) => new Promise((resolve, reject) => {
  const rd = new FileReader();
  rd.onerror = () => reject(new Error('read failed'));
  rd.onload = () => resolve(rd.result);
  rd.readAsDataURL(file);
});

// デコードした画像を得る。createImageBitmap は base64 を経由しないぶん速いが、
// 対応形式が狭い環境もあるので <img> 経由にフォールバックする
async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file); }
    catch (e) { /* フォールバックへ */ }
  }
  const src = await readAsDataURL(file);
  return await new Promise((resolve, reject) => {
    const im = new Image();
    im.onerror = () => reject(new Error('decode failed'));
    im.onload = () => resolve(im);
    im.src = src;
  });
}

// 画像ファイルを表示用に整えて { src, w, h } を返す
async function normalizeImage(file) {
  // 元から小さい画像は一切加工しない(スクリーンショットの劣化を防ぐ)
  if (file.size <= KEEP_AS_IS_BYTES) {
    const src = await readAsDataURL(file);
    const dim = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onerror = () => reject(new Error('decode failed'));
      im.onload = () => resolve({ w: im.width, h: im.height });
      im.src = src;
    });
    if (Math.max(dim.w, dim.h) <= MAX_IMG_SIDE) return { src, ...dim };
  }
  const im = await decodeImage(file);
  const side = Math.max(im.width, im.height);
  const sc = Math.min(1, MAX_IMG_SIDE / side);
  const cw = Math.max(1, Math.round(im.width * sc));
  const ch = Math.max(1, Math.round(im.height * sc));
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const g = c.getContext('2d');
  g.drawImage(im, 0, 0, cw, ch);
  im.close?.(); // ImageBitmap は明示的に解放する
  // 元が JPEG なら写真確定 = 透過なし・PNG が小さくなる余地もないので、判定と PNG 化を省く
  // (大きな写真では PNG エンコードだけで数百 ms かかるため)
  const isPhoto = file.type === 'image/jpeg';
  let hasAlpha = false;
  if (!isPhoto) {
    try {
      const px = g.getImageData(0, 0, cw, ch).data;
      for (let i = 3; i < px.length; i += 4) { if (px[i] < 255) { hasAlpha = true; break; } }
    } catch (e) { hasAlpha = true; } // 判定できないときは安全側(可逆)に倒す
  }
  let out;
  if (hasAlpha) {
    out = c.toDataURL('image/png');
  } else if (isPhoto) {
    out = c.toDataURL('image/jpeg', IMG_QUALITY);
  } else {
    // JPEG 以外(スクリーンショットや図)は文字がにじまない PNG を優先する。
    // ただし PNG で極端に膨らむ場合(実質は写真)は JPEG に落とす
    const jpg = c.toDataURL('image/jpeg', IMG_QUALITY);
    const png = c.toDataURL('image/png');
    out = png.length <= jpg.length * 2 ? png : jpg;
  }
  return { src: out, w: cw, h: ch };
}

// 画像ファイル群を指定のワールド座標に挿入する(複数可・1アンドゥ単位)
async function insertImageFiles(files, at) {
  const list = [...files].filter(f => f.type.startsWith('image/'));
  if (!list.length) return;
  const results = [];
  let failed = 0;
  for (const f of list) {
    try { results.push(await normalizeImage(f)); }
    catch (e) { console.error('image insert failed', f.name, e); failed++; }
  }
  if (failed) hint(t('imgErr'), 3500);
  if (!results.length) return;
  const bd = board(); // 変換を待つ間にボードが変わりうるので、確定後の現在ボードへ入れる
  // 表示サイズを先に決めて、複数枚は重ならないよう左から順に並べる
  const sized = results.map(r => {
    const sc = Math.min(1, 380 / r.w, 380 / r.h);
    return { src: r.src, w: Math.max(80, Math.round(r.w * sc)), h: Math.max(60, Math.round(r.h * sc)) };
  });
  const totalW = sized.reduce((s, r) => s + r.w, 0) + FLOW_GAP * (sized.length - 1);
  let x = at.x - totalW / 2; // 全体が挿入位置の中心にくるように
  const added = [];
  sized.forEach(r => {
    const b = {
      id: uid++, type: 'image', src: r.src,
      x, y: at.y - r.h / 2, w: r.w, h: r.h,
      text: '', title: '', vert: false, color: 'none', link: null,
    };
    x += r.w + FLOW_GAP;
    bd.boxes.push(b);
    if (board() === bd) world.appendChild(createBoxEl(b));
    added.push(b);
  });
  if (added.length === 1) {
    pushOp({ t: 'add', board: bd.id, box: clone(added[0]), conns: [] });
  } else {
    pushOp({ t: 'addmulti', board: bd.id, items: added.map(b => ({ box: clone(b), conns: [] })) });
    hint(t('imgAdded', added.length));
  }
  if (board() === bd) {
    multiSel.clear();
    added.forEach(b => multiSel.add(b.id));
    syncPrimary();
    syncSelClasses();
    updateToolbar();
  }
  markDirty();
}

const imgInput = $('imgInput');
imgInput.addEventListener('change', () => {
  const files = [...imgInput.files];
  imgInput.value = '';
  if (files.length) insertImageFiles(files, toWorld(viewport.clientWidth / 2, viewport.clientHeight / 2 + TOP));
});

// クリップボードからの貼り付け(キャンバス操作中のみ。テキスト編集中は文字の貼り付けを優先)
addEventListener('paste', (e) => {
  if (isEditingContext() || editing != null || focusTarget) return;
  if (!overlayEl.hidden || linkPick || connectFrom !== null) return;
  const files = [...(e.clipboardData?.files ?? [])].filter(f => f.type.startsWith('image/'));
  if (!files.length) return;
  e.preventDefault();
  insertImageFiles(files, toWorld(viewport.clientWidth / 2, viewport.clientHeight / 2 + TOP));
});

// ドラッグ&ドロップ(落とした位置に挿入)
viewport.addEventListener('dragover', (e) => {
  if (!e.dataTransfer?.types?.includes('Files')) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  viewport.classList.add('dropping');
});
viewport.addEventListener('dragleave', (e) => {
  if (e.target === viewport) viewport.classList.remove('dropping');
});
viewport.addEventListener('drop', (e) => {
  viewport.classList.remove('dropping');
  const files = [...(e.dataTransfer?.files ?? [])].filter(f => f.type.startsWith('image/'));
  if (!files.length) return;
  e.preventDefault();
  insertImageFiles(files, toWorld(e.clientX, e.clientY));
});

// ================= ボード =================
function renderTabs() {
  tabsEl.innerHTML = '';
  boards.forEach((bd, i) => {
    const tab = document.createElement('div');
    tab.className = 'tab' + (i === cur ? ' active' : '');
    tab.textContent = bd.name;
    tab.addEventListener('paste', plainPaste); // リネーム中の貼り付けもプレーンテキスト化
    tab.addEventListener('click', () => { if (i !== cur && tab.contentEditable !== 'true') switchBoard(i); });
    const rename = (e) => {
      e.preventDefault();
      if (tab.contentEditable === 'true') return;
      tab.contentEditable = 'true';
      tab.focus();
      const r = document.createRange(); r.selectNodeContents(tab);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      const finish = () => {
        tab.contentEditable = 'false';
        const n = tab.textContent.trim();
        if (n && n !== bd.name) { bd.name = n; markDirty(); }
        renderTabs(); renderBoard();
      };
      tab.addEventListener('blur', finish, { once: true });
      tab.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' && !ev.isComposing) { ev.preventDefault(); tab.blur(); }
      });
    };
    tab.addEventListener('dblclick', rename);
    tab.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (tab.contentEditable === 'true') return;
      const items = [
        { label: t('tabRename'), action: () => rename(e) },
        { label: t('tabDup'), action: () => duplicateBoard(i) },
        i > 0
          ? { label: t('tabMoveL'), action: () => moveBoard(i, -1) }
          : { label: t('tabMoveL'), cls: 'muted' },
        i < boards.length - 1
          ? { label: t('tabMoveR'), action: () => moveBoard(i, 1) }
          : { label: t('tabMoveR'), cls: 'muted' },
        boards.length > 1
          ? { label: t('tabDel'), cls: 'off', action: () => deleteBoardFlow(i) }
          : { label: t('tabDel'), cls: 'muted' },
      ];
      showMenu(e.clientX, e.clientY + 6, items);
    });
    tabsEl.appendChild(tab);
  });
}

// ================= ボード操作 (P2-8) =================
function moveBoard(i, d) {
  const j = i + d;
  if (j < 0 || j >= boards.length) return;
  [boards[i], boards[j]] = [boards[j], boards[i]];
  if (cur === i) cur = j;
  else if (cur === j) cur = i;
  renderTabs();
  markDirty();
}

function duplicateBoard(i) {
  const src = boards[i];
  const newId = bid++;
  const idMap = new Map();
  const boxes = src.boxes.map(b => {
    const nb = clone(b);
    idMap.set(b.id, uid);
    nb.id = uid++;
    return nb;
  });
  // 同一ボード内ボックスへのリンクは複製側のボックスへ付け替える
  boxes.forEach(nb => {
    if (nb.link && typeof nb.link === 'object' && nb.link.board === src.id && idMap.has(nb.link.box)) {
      nb.link = { board: newId, box: idMap.get(nb.link.box) };
    }
  });
  const conns = src.conns
    .map(c => ({ a: idMap.get(c.a), b: idMap.get(c.b) }))
    .filter(c => c.a != null && c.b != null);
  boards.splice(i + 1, 0, { id: newId, name: src.name + t('copySuffix'), boxes, conns, view: { ...src.view } });
  switchBoard(i + 1);
  markDirty();
}

// 削除ボードを参照するアンドゥ/戻る履歴を除去する
function filterStacksForBoard(boardId) {
  for (const stack of [undoStack, redoStack]) {
    const kept = stack.filter(op => op.board !== boardId);
    stack.length = 0;
    stack.push(...kept);
  }
  const keptNav = navStack.filter(n => n.board !== boardId);
  navStack.length = 0;
  navStack.push(...keptNav);
  updateBackBtn();
}

async function deleteBoardFlow(i) {
  if (boards.length <= 1) return;
  const bd = boards[i];
  if (bd.boxes.length) {
    const go = await showConfirm(t('boardDelTitle'), t('boardDelBody', bd.name, bd.boxes.length), t('boardDelBtn'));
    if (!go) return;
  }
  // 削除前に現在の状態を保存+強制バックアップ(ボード削除はアンドゥ対象外のため)。
  // 確認文で「バックアップへ保存されます」と約束している以上、保証できなければ削除しない
  if (!(await guardDestructive())) { hint(t('guardErr'), 5000); return; }
  const deletedId = bd.id;
  const oldCur = cur;
  boards.splice(i, 1);
  // リンク切れの扱い: 削除ボードへのボードリンク/ボックスリンクはすべて解除
  boards.forEach(x => x.boxes.forEach(b => {
    if (b.link === deletedId || (b.link && typeof b.link === 'object' && b.link.board === deletedId)) {
      b.link = null;
    }
  }));
  filterStacksForBoard(deletedId);
  let target = oldCur;
  if (i < oldCur) target = oldCur - 1;
  else if (i === oldCur) target = Math.min(i, boards.length - 1);
  switchBoard(target);
  markDirty();
}

function renderBoard() {
  world.querySelectorAll('.box').forEach(x => x.remove());
  board().boxes.forEach(b => world.appendChild(createBoxEl(b)));
  [...multiSel].forEach(id => { if (!boxById(board(), id)) multiSel.delete(id); });
  syncPrimary();
  syncSelClasses();
  if (selected != null) {
    const el = $('box' + selected);
    if (el) el.style.zIndex = ++zTop;
  }
  drawWires();
  applyView();
  fitAllBoxes(); // 全文表示: 描画のたびに内容へフィット(アンドゥ/リドゥ/置換後も一貫)
  updateCounts();
  updateToolbar();
  updateSearchHighlights(); // ボード切替や再描画でも検索中の着色を維持
}

function switchBoard(i, { silent = false } = {}) {
  endConnect();
  closeMenu();
  if (editing != null) { document.activeElement?.blur(); editing = null; }
  multiSel.clear();
  selected = null;
  cur = i;
  renderTabs();
  renderBoard();
  if (!silent) markDirty();
}

$('addBoard').addEventListener('click', () => {
  boards.push(newBoard(t('boardN', boards.length + 1)));
  switchBoard(boards.length - 1);
  markDirty();
});

// ================= ナビゲーション履歴 (P1-5) =================
// リンク/検索でジャンプする直前の「ボード+表示位置」を積み、⌘[ か ← で戻る
const navStack = [];
function updateBackBtn() { $('backBtn').hidden = !navStack.length; }
function pushNav() {
  const v = board().view;
  navStack.push({ board: board().id, view: { x: v.x, y: v.y, s: v.s } });
  if (navStack.length > 50) navStack.shift();
  updateBackBtn();
}
function goBack() {
  while (navStack.length) {
    const n = navStack.pop();
    const i = boards.findIndex(x => x.id === n.board);
    if (i < 0) continue; // ボードが消えていたらさらに前へ
    updateBackBtn();
    if (i !== cur) switchBoard(i);
    animateTo(n.view.x, n.view.y, n.view.s);
    return;
  }
  updateBackBtn();
}
$('backBtn').addEventListener('click', goBack);

// ================= 集中モード =================
const focusEl = $('focus'), focusContent = $('focusContent');
const focusCountEl = $('focusCount'), focusVt = $('focusVt');
let focusTarget = null;

function focusRefresh() {
  focusCountEl.textContent = countMetric(focusTarget.b.text) + t('chars');
  focusVt.textContent = focusTarget.b.vert ? t('toHorz') : t('toVert');
  focusEl.classList.toggle('vertical', focusTarget.b.vert);
}
// caret: 集中モード側で最初に置くキャレット位置(innerText オフセット。null なら末尾)
// resume: 閉じたときに元のボックスで編集を再開するか(編集の途中から入った場合に true)
function openFocus(b, boxEl, { caret = null, resume = false } = {}) {
  focusTarget = { b, boxEl, resume };
  focusContent.innerText = b.text;
  focusEl.classList.add('open');
  focusRefresh();
  updateToolbar();
  focusContent.focus();
  placeCaretAt(focusContent, caret);
}
// resume=false は「別の箱へ移る」「プロジェクトを置き換える」など、編集再開が不適切な閉じ方
function closeFocus({ resume = true } = {}) {
  if (!focusTarget) return;
  const { b, boxEl, resume: fromEdit } = focusTarget;
  const back = fromEdit && resume;
  const caret = back ? caretOffsetIn(focusContent) : null; // 内容を確定する前に位置を測る
  b.text = focusContent.innerText;
  const content = boxEl.querySelector('.content');
  if (content) content.innerText = b.text;
  focusEl.classList.remove('open');
  focusTarget = null;
  refitAfterEdit(b, boxEl); // 集中モードで増減した分を反映
  updateCounts();
  updateToolbar();
  markDirty();
  // 編集の途中から入った集中モードなら、同じ位置で編集を再開する(⌘Enter で行って戻ってこられる)
  if (back && boxEl.isConnected) startEdit(b, boxEl, { caret });
}
focusContent.addEventListener('paste', plainPaste);
let focusCountTimer = null;
focusContent.addEventListener('input', () => {
  if (!focusTarget) return;
  focusTarget.b.text = focusContent.innerText;
  clearTimeout(focusCountTimer);
  focusCountTimer = setTimeout(() => {
    if (focusTarget) focusCountEl.textContent = countMetric(focusTarget.b.text) + t('chars');
  }, 200);
  markDirty();
});
focusVt.addEventListener('click', () => {
  if (!focusTarget) return;
  const { b, boxEl } = focusTarget;
  pushOp({ t: 'vert', board: board().id, id: b.id, from: b.vert, to: !b.vert });
  b.vert = !b.vert;
  applyBoxAppearance(boxEl, b);
  focusRefresh();
  markDirty();
  focusContent.focus();
});
$('focusClose').addEventListener('click', closeFocus);

// ================= 設定 =================
const themeMq = matchMedia('(prefers-color-scheme: dark)');
themeMq.addEventListener('change', () => { if (settings.theme === 'system') applyTheme(); });

function applyTheme() {
  const resolved = settings.theme === 'system' ? (themeMq.matches ? 'dark' : 'light') : settings.theme;
  document.documentElement.dataset.theme = resolved;
}
function applyGrid() {
  viewport.classList.toggle('nogrid', !settings.grid);
}
function applyFontSize() {
  document.documentElement.style.setProperty('--bw-font', settings.fontSize + 'px');
}
// ラベルの描き方: 'pattern'（縞・べた・水玉・斜線を文字色で描く）| 'color'（4色の帯）。CSS 側で :root[data-labels] を見る
function applyLabelStyle() {
  document.documentElement.dataset.labels = settings.labelStyle;
}
function applyLang() {
  lang = settings.lang;
  document.documentElement.lang = lang;
  $('fitBtn').textContent = t('fit'); $('fitBtn').title = t('fitT');
  $('saveWarn').textContent = t('saveWarn'); $('saveWarn').title = t('saveWarnT');
  $('setBtn').title = t('setT');
  $('addBoard').title = t('addBoardT');
  $('backBtn').title = t('backT');
  searchInput.placeholder = t('searchPh');
  $('replaceInput').placeholder = t('replacePh');
  $('replaceAllBtn').textContent = t('replaceAll');
  $('searchDrag').title = t('searchDragT');
  $('zoomIn').title = t('zoomInT');
  $('zoomOut').title = t('zoomOutT');
  tbVert.textContent = t('vert'); tbVert.title = t('vtT');
  $('tbTitle').textContent = t('btitle'); $('tbTitle').title = t('btitleT');
  $('tbConn').textContent = t('connect'); $('tbConn').title = t('connectT');
  $('tbLink').textContent = t('link'); $('tbLink').title = t('linkT');
  $('tbFocus').textContent = t('focus'); $('tbFocus').title = t('focusT');
  $('tbSplit').textContent = t('split'); $('tbSplit').title = t('splitT');
  $('tbMerge').textContent = t('merge'); $('tbMerge').title = t('mergeT');
  $('tbArrange').textContent = t('arrange'); $('tbArrange').title = t('arrangeT');
  tbDel.textContent = t('del'); tbDel.title = t('delT');
  $('focusClose').textContent = t('close'); $('focusClose').title = t('closeT');
  if (focusTarget) focusRefresh();
  else focusVt.textContent = t('toVert');
  updateCounts();
  if (TAURI) TAURI.core.invoke('set_menu_language', { lang }).catch(console.error);
}

$('setBtn').addEventListener('click', (e) => {
  const check = (cond) => !!cond;
  const items = [
    { label: t('searchMenu'), action: () => openSearch() },
    { label: t('exportMenu'), action: () => openExportDialog() },
    { label: t('projSave'), action: () => saveProject() },
    { label: t('projSaveAs'), action: () => saveProjectAs() },
    ...(DEMO?.noOpen ? [] : [{ label: t('projOpen'), action: () => openProjectDialog() }]), // 体験版では出さない
    ...(recentProjects.length && !DEMO?.noOpen ? [
      { header: t('recentLabel') },
      ...recentProjects.slice(0, 5).map(p => {
        const name = baseName(p).replace(/\.bwt$/i, '');
        const cps = [...name];
        return {
          label: cps.length > 24 ? cps.slice(0, 24).join('') + '…' : name,
          action: () => openRecent(p),
        };
      }),
    ] : []),
    { label: t('restoreMenu'), action: () => openRestoreDialog() },
    { label: t('insertImage'), action: () => imgInput.click() },
    { label: t('aiGuideMenu'), action: () => copyAiGuide() },
    { label: t('kbMenu'), action: () => openShortcutsDialog() },
    { label: t('gridShow'), check: settings.grid, action: () => { settings.grid = !settings.grid; applyGrid(); markDirty(); } },
    { header: t('labelStyleLabel') },
    { label: t('labelPattern'), check: check(settings.labelStyle === 'pattern'), action: () => setLabelStyle('pattern') },
    { label: t('labelColor'), check: check(settings.labelStyle === 'color'), action: () => setLabelStyle('color') },
    { header: t('fontLabel') },
    { label: t('fontS'), check: check(settings.fontSize === 13), action: () => setFontSize(13) },
    { label: t('fontM'), check: check(settings.fontSize === 15), action: () => setFontSize(15) },
    { label: t('fontL'), check: check(settings.fontSize === 17), action: () => setFontSize(17) },
    { label: t('fontXL'), check: check(settings.fontSize === 19), action: () => setFontSize(19) },
    { header: t('themeLabel') },
    { label: t('themeLight'), check: check(settings.theme === 'light'), action: () => setTheme('light') },
    { label: t('themeDark'), check: check(settings.theme === 'dark'), action: () => setTheme('dark') },
    { label: t('themeSystem'), check: check(settings.theme === 'system'), action: () => setTheme('system') },
    { header: t('langLabel') },
    { label: '日本語', check: check(settings.lang === 'ja'), action: () => setLang('ja') },
    { label: 'English', check: check(settings.lang === 'en'), action: () => setLang('en') },
  ];
  const r = e.currentTarget.getBoundingClientRect();
  showMenu(r.right, r.bottom + 8, items, { alignRight: true });
});
function setTheme(v) { settings.theme = v; applyTheme(); markDirty(); }
function setLabelStyle(v) { settings.labelStyle = v; applyLabelStyle(); markDirty(); }
function setLang(l) { settings.lang = l; applyLang(); markDirty(); }
function setFontSize(n) {
  settings.fontSize = n;
  applyFontSize();
  fitAllBoxes(); // 文字サイズが変わると必要な高さ/幅も変わる
  markDirty();
}

// ================= 検索 (P1-4) =================
const searchEl = $('search'), searchInput = $('searchInput'),
      searchResults = $('searchResults'), searchMeta = $('searchMeta'),
      replaceInput = $('replaceInput'), replaceAllBtn = $('replaceAllBtn');
let searchHits = [], searchActive = 0, searchTotal = 0;

function toggleSearch() { searchEl.hidden ? openSearch() : closeSearch(); }

// パネルのドラッグ移動: 位置はアプリ起動中のみ記憶(null = 既定の上部中央)
let searchPos = null;
function applySearchPos() {
  if (searchPos) {
    const w = searchEl.offsetWidth;
    searchPos.x = Math.max(8, Math.min(searchPos.x, innerWidth - w - 8));
    searchPos.y = Math.max(50, Math.min(searchPos.y, innerHeight - 60));
    searchEl.classList.add('moved');
    searchEl.style.left = searchPos.x + 'px';
    searchEl.style.top = searchPos.y + 'px';
  } else {
    searchEl.classList.remove('moved');
    searchEl.style.left = '';
    searchEl.style.top = '';
  }
}
$('searchDrag').addEventListener('mousedown', (e) => {
  e.preventDefault(); // 入力欄のフォーカスを奪わない
  endActiveGesture();
  const r = searchEl.getBoundingClientRect();
  const ox = e.clientX - r.left, oy = e.clientY - r.top;
  searchEl.classList.add('dragging');
  const move = (ev) => {
    searchPos = { x: ev.clientX - ox, y: ev.clientY - oy };
    applySearchPos();
  };
  const up = () => {
    searchEl.classList.remove('dragging');
    removeEventListener('mousemove', move);
    removeEventListener('mouseup', up);
    clearGesture();
  };
  startGesture(up);
  addEventListener('mousemove', move);
  addEventListener('mouseup', up);
});
$('searchDrag').addEventListener('dblclick', () => { searchPos = null; applySearchPos(); });

function openSearch() {
  if (!overlayEl.hidden) return;
  closeMenu();
  document.activeElement?.blur();
  searchEl.hidden = false;
  applySearchPos(); // 移動済みなら前回の位置で開く(画面内に収まるよう調整)
  searchInput.focus();
  searchInput.select();
  runSearchUI();
}
function closeSearch() {
  searchEl.hidden = true;
  searchInput.blur();
  updateSearchHighlights(); // hidden なので全消灯
}
// 大文字小文字を無視した照合用に、長さを変えない範囲でだけ小文字化する。
// 置換で元テキストの位置をそのまま使うため、長さが変わりうる正規化(NFKC等)はしない
const fold = (s) => {
  let out = '';
  for (const ch of s) {
    const lc = ch.toLowerCase();
    out += lc.length === ch.length ? lc : ch;
  }
  return out;
};
// 非重複の全出現位置
function findIndices(hay, q) {
  const out = [];
  let i = hay.indexOf(q);
  while (i >= 0) { out.push(i); i = hay.indexOf(q, i + q.length); }
  return out;
}
function findAll(qRaw) {
  const q = fold(qRaw.trim());
  searchTotal = 0;
  if (!q) return [];
  const out = [];
  for (const bd of boards) {
    for (const b of bd.boxes) {
      if (b.type === 'image' || !b.text) continue;
      const idx = findIndices(fold(b.text), q);
      if (!idx.length) continue;
      searchTotal += idx.length;
      if (out.length < 50) {
        out.push({ bid: bd.id, boxId: b.id, name: bd.name, text: b.text, i: idx[0], len: q.length, n: idx.length });
      }
    }
  }
  return out;
}
// ---- 本文中の一致ハイライト ----
// CSS Custom Highlight API で、現在のボード上の全一致箇所を DOM を変えずに着色する。
// 未対応環境(古い macOS の WKWebView 等)ではハイライトなしで従来どおり動く
const HL_OK = typeof Highlight !== 'undefined' && typeof CSS !== 'undefined' && CSS.highlights;
function updateSearchHighlights() {
  if (!HL_OK) return;
  CSS.highlights.delete('bw-search');
  if (searchEl.hidden) return;
  const q = fold(searchInput.value.trim());
  if (!q) return;
  const ranges = [];
  for (const b of board().boxes) {
    if (b.type === 'image' || !b.text) continue;
    const content = $('box' + b.id)?.querySelector('.content');
    if (!content) continue;
    // 行ごとのテキストノードを個別に走査する(検索語は改行を含めないため行またぎは無い)
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const hay = fold(node.data);
      let i = hay.indexOf(q);
      while (i >= 0) {
        const r = new Range();
        r.setStart(node, i);
        r.setEnd(node, i + q.length);
        ranges.push(r);
        i = hay.indexOf(q, i + q.length);
      }
    }
  }
  if (ranges.length) CSS.highlights.set('bw-search', new Highlight(...ranges));
}

function runSearchUI() {
  searchHits = findAll(searchInput.value);
  searchActive = 0;
  renderSearchResults();
  updateSearchHighlights();
}
function renderSearchResults() {
  searchResults.innerHTML = '';
  const has = searchInput.value.trim().length > 0;
  searchMeta.hidden = !has;
  if (has) searchMeta.textContent = searchTotal ? t('searchHits', searchTotal) : t('searchNone');
  // 置換欄が空のときは無効(空欄=削除の誤爆を防ぐ)
  replaceAllBtn.disabled = !searchTotal || !replaceInput.value;
  searchHits.forEach((h, idx) => {
    const row = document.createElement('div');
    row.className = 'sr' + (idx === searchActive ? ' active' : '');
    const bn = document.createElement('span');
    bn.className = 'srBoard';
    bn.textContent = h.name;
    const sn = document.createElement('span');
    sn.className = 'srSnip';
    let start = Math.max(0, h.i - 10);
    if (start > 0 && /[\uDC00-\uDFFF]/.test(h.text[start])) start--; // サロゲートペアの途中から始めない
    if (start > 0) sn.appendChild(document.createTextNode('…'));
    sn.appendChild(document.createTextNode(h.text.slice(start, h.i)));
    const mk = document.createElement('mark');
    mk.textContent = h.text.slice(h.i, h.i + h.len);
    sn.appendChild(mk);
    let tail = h.text.slice(h.i + h.len, h.i + h.len + 40);
    if (/[\uD800-\uDBFF]$/.test(tail)) tail = h.text.slice(h.i + h.len, h.i + h.len + 41); // ペアの末尾分断を防ぐ
    sn.appendChild(document.createTextNode(tail));
    row.appendChild(bn);
    row.appendChild(sn);
    if (h.n > 1) {
      const cnt = document.createElement('span');
      cnt.className = 'srN';
      cnt.textContent = '×' + h.n;
      row.appendChild(cnt);
    }
    row.addEventListener('mousedown', (e) => e.preventDefault()); // 入力欄のフォーカスを保つ(↓↑を継続して使えるように)
    row.addEventListener('click', () => {
      searchActive = idx;
      renderSearchResults(); // アクティブ行の表示をクリック先に移す
      jumpToHit(idx);
    });
    searchResults.appendChild(row);
  });
}
function jumpToHit(idx) {
  const h = searchHits[idx];
  if (!h) return;
  const bd = boardById(h.bid);
  const b = bd && boxById(bd, h.boxId);
  if (!bd || !b) return;
  pushNav();
  const i = boards.indexOf(bd);
  if (i !== cur) switchBoard(i);
  focusBoxView(b);
  select(b.id);
}
searchInput.addEventListener('input', runSearchUI);
searchInput.addEventListener('keydown', (e) => {
  if (e.isComposing) return; // IME 変換中の Enter/矢印は IME に任せる
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (!searchHits.length) return;
    searchActive = (searchActive + (e.key === 'ArrowDown' ? 1 : -1) + searchHits.length) % searchHits.length;
    renderSearchResults();
    searchResults.querySelector('.sr.active')?.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') {
    e.preventDefault();
    jumpToHit(searchActive);
  }
});

// ---- 一括置換 ----
// 全ボードを対象に、確認ダイアログを挟んで置換する。1回のアンドゥ(textmulti)で全て戻せる
async function replaceAll() {
  const qDisp = searchInput.value.trim();
  const q = fold(qDisp);
  if (!q) return;
  const r = replaceInput.value;
  if (!r) return; // 空欄での置換(=削除)は行わない
  // この時点の実データで数え直して確認を出す(結果表示後に編集されている可能性があるため)
  let total = 0, boxCount = 0;
  for (const bd of boards) {
    for (const b of bd.boxes) {
      if (b.type === 'image' || !b.text) continue;
      const n = findIndices(fold(b.text), q).length;
      if (n) { total += n; boxCount++; }
    }
  }
  if (!total) { runSearchUI(); return; }
  const go = await showConfirm(t('replaceTitle'), t('replaceBody', qDisp, r, total, boxCount), t('replaceBtn'));
  if (!go) return;
  if (editing != null) document.activeElement?.blur(); // 編集中の内容を確定してから置換
  const items = [];
  let done = 0;
  for (const bd of boards) {
    for (const b of bd.boxes) {
      if (b.type === 'image' || !b.text) continue;
      const idx = findIndices(fold(b.text), q);
      if (!idx.length) continue;
      let out = '', last = 0;
      idx.forEach(i => { out += b.text.slice(last, i) + r; last = i + q.length; });
      out += b.text.slice(last);
      items.push({ board: bd.id, id: b.id, from: b.text, to: out });
      done += idx.length;
    }
  }
  if (!items.length) return;
  const op = { t: 'textmulti', items };
  pushOp(op);
  applyOp(op, 1);
  runSearchUI();
  hint(t('replaceDone', done), 3500);
}
replaceAllBtn.addEventListener('click', replaceAll);
replaceInput.addEventListener('input', () => {
  replaceAllBtn.disabled = !searchTotal || !replaceInput.value;
});
replaceInput.addEventListener('keydown', (e) => {
  if (e.isComposing) return;
  if (e.key === 'Enter') { e.preventDefault(); if (!replaceAllBtn.disabled) replaceAll(); }
});

// ================= テキスト書き出し (P1-3) =================
const overlayEl = $('overlay'), dialogEl = $('dialog');
let dlg = null;

function openExportDialog() {
  closeDialog(); // 保留中の確認ダイアログがあれば解決してから
  closeMenu();
  closeSearch();
  const selBox = selected != null ? boxById(board(), selected) : null;
  dlg = {
    scope: 'board',
    order: 'h',
    sep: true,
    selBox: (selBox && selBox.type === 'text') ? selBox : null,
    list: board().boxes.filter(b => b.type === 'text' && b.text.trim()),
  };
  sortDlgList();
  renderDialog();
  overlayEl.hidden = false;
}
let confirmResolve = null;
function closeDialog() {
  overlayEl.hidden = true;
  dlg = null;
  if (confirmResolve) { const r = confirmResolve; confirmResolve = null; r(false); }
}

// 汎用確認ダイアログ(書き出しダイアログの overlay を流用)
function showConfirm(title, body, okLabel) {
  return new Promise((resolve) => {
    closeDialog(); // 先行するダイアログ/確認を解決してから表示
    dlg = null;
    confirmResolve = resolve;
    dialogEl.innerHTML = '';
    const h = document.createElement('div');
    h.className = 'dlgTitle';
    h.textContent = title;
    const b = document.createElement('div');
    b.className = 'dlgBody';
    b.textContent = body;
    const btns = document.createElement('div');
    btns.className = 'dlgBtns';
    const cancel = document.createElement('button');
    cancel.textContent = t('cancel');
    cancel.addEventListener('click', closeDialog); // resolve(false)
    const ok = document.createElement('button');
    ok.className = 'primary';
    ok.textContent = okLabel;
    ok.addEventListener('click', () => {
      const r = confirmResolve; confirmResolve = null;
      overlayEl.hidden = true;
      r?.(true);
    });
    btns.appendChild(cancel); btns.appendChild(ok);
    dialogEl.appendChild(h); dialogEl.appendChild(b); dialogEl.appendChild(btns);
    overlayEl.hidden = false;
  });
}
function sortDlgList() {
  if (dlg.order === 'h') dlg.list.sort((a, b) => (a.y - b.y) || (a.x - b.x));
  else if (dlg.order === 'v') dlg.list.sort((a, b) => ((b.x + b.w) - (a.x + a.w)) || (a.y - b.y));
}
function moveDlgItem(i, d) {
  const j = i + d;
  if (j < 0 || j >= dlg.list.length) return;
  [dlg.list[i], dlg.list[j]] = [dlg.list[j], dlg.list[i]];
  dlg.order = 'm';
  renderDialog();
}
function renderDialog() {
  dialogEl.innerHTML = '';
  const title = document.createElement('div');
  title.className = 'dlgTitle';
  title.textContent = t('exportTitle');
  dialogEl.appendChild(title);

  const addLabel = (txt) => {
    const l = document.createElement('div');
    l.className = 'dlgLabel';
    l.textContent = txt;
    dialogEl.appendChild(l);
  };
  const addRadio = (group, value, label, checked, disabled, onpick) => {
    const row = document.createElement('label');
    row.className = 'dlgRow' + (disabled ? ' disabled' : '');
    const r = document.createElement('input');
    r.type = 'radio'; r.name = group; r.checked = checked; r.disabled = !!disabled;
    r.addEventListener('change', () => onpick(value));
    const s = document.createElement('span');
    s.textContent = label;
    row.appendChild(r); row.appendChild(s);
    dialogEl.appendChild(row);
  };

  addLabel(t('scopeLabel'));
  addRadio('scope', 'board', t('scopeBoard'), dlg.scope === 'board', false,
    v => { dlg.scope = v; renderDialog(); });
  addRadio('scope', 'box', t('scopeBox') + (dlg.selBox ? '：' + snippet(dlg.selBox.text, 10) : ''),
    dlg.scope === 'box', !dlg.selBox, v => { dlg.scope = v; renderDialog(); });

  if (dlg.scope === 'board') {
    addLabel(t('orderLabel'));
    addRadio('order', 'h', t('orderH'), dlg.order === 'h', false,
      v => { dlg.order = v; sortDlgList(); renderDialog(); });
    addRadio('order', 'v', t('orderV'), dlg.order === 'v', false,
      v => { dlg.order = v; sortDlgList(); renderDialog(); });
    addRadio('order', 'm', t('orderManual'), dlg.order === 'm', false,
      v => { dlg.order = v; renderDialog(); });

    const list = document.createElement('div');
    list.className = 'dlgList';
    dlg.list.forEach((b, i) => {
      const item = document.createElement('div');
      item.className = 'dlgItem';
      const sn = document.createElement('span');
      sn.className = 'snip';
      // タイトルがあればそれを見出しとして使う(無ければ本文の冒頭)
      sn.textContent = (i + 1) + '. ' + snippet(b.title && b.title.trim() ? b.title : b.text, 22);
      const up = document.createElement('button');
      up.textContent = '↑'; up.title = t('moveUp');
      up.addEventListener('click', () => moveDlgItem(i, -1));
      const dn = document.createElement('button');
      dn.textContent = '↓'; dn.title = t('moveDown');
      dn.addEventListener('click', () => moveDlgItem(i, 1));
      item.appendChild(sn); item.appendChild(up); item.appendChild(dn);
      list.appendChild(item);
    });
    dialogEl.appendChild(list);
  }

  const sepRow = document.createElement('label');
  sepRow.className = 'dlgRow';
  const cb = document.createElement('input');
  cb.type = 'checkbox'; cb.checked = dlg.sep;
  cb.addEventListener('change', () => { dlg.sep = cb.checked; });
  const cs = document.createElement('span');
  cs.textContent = t('sepBlank');
  sepRow.appendChild(cb); sepRow.appendChild(cs);
  dialogEl.appendChild(sepRow);

  const btns = document.createElement('div');
  btns.className = 'dlgBtns';
  const cancel = document.createElement('button');
  cancel.textContent = t('cancel');
  cancel.addEventListener('click', closeDialog);
  const ok = document.createElement('button');
  ok.className = 'primary';
  ok.textContent = t('exportRun');
  ok.disabled = dlg.scope === 'box' ? !dlg.selBox : !dlg.list.length;
  ok.addEventListener('click', runExport);
  btns.appendChild(cancel); btns.appendChild(ok);
  dialogEl.appendChild(btns);
}
async function runExport() {
  if (!dlg) return;
  const boxes = dlg.scope === 'box' ? [dlg.selBox] : dlg.list;
  if (!boxes.length || !boxes[0]) { hint(t('exportEmpty'), 3200); return; } // ダイアログは開いたまま理由を示す
  const content = boxes.map(b => b.text.replace(/\s+$/u, '')).join(dlg.sep ? '\n\n' : '\n') + '\n';
  const base = dlg.scope === 'box' ? snippet(boxes[0].text, 12).replace(/…$/u, '') : board().name;
  const name = (base || 'export').replace(/[\/\\:*?"<>|]/g, '_') + '.txt';
  closeDialog();
  try {
    const saved = await saveTextFile(name, content);
    if (saved) hint(t('exportDone', saved), 3500);
  } catch (e) {
    console.error('export failed', e);
    // 原因究明できるよう実際のエラー内容も表示する
    hint(t('exportErr') + '：' + String(e?.message ?? e).slice(0, 120), 6000);
  }
}
async function saveTextFile(defaultName, content) {
  if (TAURI) {
    const options = { defaultPath: defaultName, filters: [{ name: 'Text', extensions: ['txt'] }] };
    const path = TAURI.dialog?.save
      ? await TAURI.dialog.save(options)
      : await TAURI.core.invoke('plugin:dialog|save', { options });
    if (!path) return null; // キャンセル
    await TAURI.core.invoke('write_text_file', { path, content });
    return path;
  }
  const a = document.createElement('a');
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  a.href = url; a.download = defaultName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return defaultName;
}
overlayEl.addEventListener('mousedown', (e) => { if (e.target === overlayEl) closeDialog(); });

// ================= プロジェクトファイル (.bwt) =================
// 全ボード・接続・リンク・表示位置を丸ごと1ファイルに保存/復元する
const BWT_FILTER = [{ name: 'Bird Writer Project', extensions: ['bwt'] }];

// プロジェクトの関連付けを更新し、ウィンドウタイトルに反映する
function setProjPath(p) {
  projPath = p || null;
  noteRecent(projPath);
  markDirty(); // 関連付けを data.json に永続化(再起動後も ⌘S で同じファイルへ)
  updateTitle();
}
// .bwt に書き出していない変更があるか(⌘S 関連付けがあるときだけ意味を持つ)
function bwtDirty() {
  return projPath != null && bwtSynced !== undefined && bwtSynced !== serialize(true);
}
let lastTitle = null;
function updateTitle() {
  const name = projPath ? baseName(projPath).replace(/\.bwt$/i, '') : null;
  const title = name ? `${bwtDirty() ? '● ' : ''}${name} — Bird Writer` : 'Bird Writer';
  if (title === lastTitle) return; // setTitle の IPC を変化時だけに抑える
  lastTitle = title;
  if (TAURI) {
    try { TAURI.webviewWindow?.getCurrentWebviewWindow?.()?.setTitle(title)?.catch?.(() => {}); }
    catch (e) { console.error('setTitle failed', e); }
  } else {
    document.title = title;
  }
}

// ⌘⇧S: 保存先を選んで書き出し、以後そのファイルを ⌘S の上書き先にする
async function saveProjectAs() {
  closeMenu();
  await flushSave();
  const content = serialize(true);
  const name = t('projDefaultName', new Date().toISOString().slice(0, 10)) + '.bwt';
  try {
    if (TAURI) {
      const options = { defaultPath: projPath ?? name, filters: BWT_FILTER };
      const path = TAURI.dialog?.save
        ? await TAURI.dialog.save(options)
        : await TAURI.core.invoke('plugin:dialog|save', { options });
      if (!path) return;
      await TAURI.core.invoke('write_text_file', { path, content });
      bwtSynced = content;
      setProjPath(path);
      hint(t('projSaved', path), 3500);
    } else {
      const a = document.createElement('a');
      const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
      a.href = url; a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      hint(t('projSaved', name), 3000);
    }
  } catch (e) {
    console.error('project save failed', e);
    hint(t('saveErr') + '：' + String(e?.message ?? e).slice(0, 120), 6000);
  }
}

// ⌘S: 現在のプロジェクトファイルへ黙って上書き保存。
// 関連付けが無い(または書けない=サンドボックスの権限切れ等)場合は「別名で保存」へフォールバック
async function saveProject() {
  closeMenu();
  if (!TAURI || projPath == null) return saveProjectAs();
  await flushSave();
  try {
    const content = serialize(true);
    await TAURI.core.invoke('write_text_file', { path: projPath, content });
    bwtSynced = content;
    updateTitle(); // ● を消す
    hint(t('projSaved', baseName(projPath)), 2200);
  } catch (e) {
    console.error('project overwrite failed, falling back to save-as', e);
    return saveProjectAs();
  }
}

async function openProjectDialog() {
  closeMenu();
  try {
    if (TAURI) {
      const options = { multiple: false, directory: false, filters: BWT_FILTER };
      const sel = TAURI.dialog?.open
        ? await TAURI.dialog.open(options)
        : await TAURI.core.invoke('plugin:dialog|open', { options });
      if (!sel) return;
      const path = Array.isArray(sel) ? sel[0] : sel;
      await importProjectFromPath(path);
    } else {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = '.bwt,application/json';
      inp.onchange = async () => {
        const f = inp.files[0];
        if (f) await importProject(await f.text(), f.name);
      };
      inp.click();
    }
  } catch (e) {
    console.error('project open failed', e);
    hint(t('projOpenErr'), 4000);
  }
}

// 戻り値: ファイルを読めたら true(形式不備やキャンセルでも true。false = 読めない/消えている)
async function importProjectFromPath(path) {
  let s;
  try {
    s = await TAURI.core.invoke('read_text_file', { path });
  } catch (e) {
    console.error('project read failed', e);
    hint(t('projOpenErr'), 4000);
    return false;
  }
  await importProject(s, baseName(path), path);
  return true;
}

// 最近使ったプロジェクトから開く。ファイルが消えていたらリストから外す
async function openRecent(p) {
  closeMenu();
  if (!TAURI) { hint(t('projOpenErr'), 3000); return; } // ブラウザ検証ではパスを開けない
  const ok = await importProjectFromPath(p);
  if (!ok) {
    recentProjects = recentProjects.filter(x => x !== p);
    markDirty();
  }
}

async function importProject(json, displayName, path = null) {
  // 置き換え前に形式を検証
  try {
    const d = JSON.parse(json);
    if (!d || !Array.isArray(d.boards) || !d.boards.length) throw new Error('no boards');
  } catch (e) {
    hint(t('projOpenErr'), 4000);
    return;
  }
  const go = await showConfirm(t('projOpenConfirmTitle'), t('projOpenConfirmBody', displayName), t('projOpenBtn'));
  if (!go) return;

  // 編集状態を確定し、現在の状態を保存+強制バックアップしてから置き換える
  closeFocus({ resume: false });
  closeSearch();
  endConnect();
  endLinkPick(true);
  if (editing != null) { document.activeElement?.blur(); editing = null; }
  // 全置換の前に「保存+強制バックアップ」を保証。できなければ置き換えない
  if (!(await guardDestructive())) { hint(t('guardErr'), 5000); return; }

  const keepSettings = { ...settings };
  const keepRecent = recentProjects; // 履歴はアプリ側の状態(.bwt には無い)なので引き継ぐ
  try {
    hydrate(json);
  } catch (e) {
    console.error('project import failed', e);
    hint(t('projOpenErr'), 4000);
    return;
  }
  settings = keepSettings; // アプリ設定(テーマ・言語・格子)は引き継ぐ
  lang = settings.lang;
  recentProjects = keepRecent;

  undoStack.length = 0;
  redoStack.length = 0;
  navStack.length = 0;
  updateBackBtn();
  selected = null;
  projPath = (TAURI && path) ? path : null; // 開いたファイルを以後の ⌘S の上書き先に
  noteRecent(projPath);
  // 開いた直後は同期済み扱い(自前の正規化シリアライズと比較するため、外部整形の差は無視される)
  bwtSynced = projPath != null ? serialize(true) : undefined;
  updateTitle();
  applyTheme(); applyGrid(); applyLang(); applyFontSize(); applyLabelStyle();
  renderTabs();
  renderBoard();
  markDirty();
  hint(t('projOpened', displayName), 3000);
}

// ================= バックアップからの復元 =================
function fmtSize(n) {
  if (n >= 1048576) return (n / 1048576).toFixed(1) + ' MB';
  if (n >= 1024) return Math.round(n / 1024) + ' KB';
  return n + ' B';
}
function relTime(ts) {
  const d = Date.now() - ts;
  if (d < 60000) return t('relNow');
  if (d < 3600000) return t('relMin', Math.floor(d / 60000));
  if (d < 86400000) return t('relHour', Math.floor(d / 3600000));
  return t('relDay', Math.floor(d / 86400000));
}
const fmtDate = (ts) => new Intl.DateTimeFormat(lang === 'ja' ? 'ja-JP' : 'en-US',
  { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(ts));

async function openRestoreDialog() {
  closeMenu();
  let list = [];
  try { list = await backupApi.list(); }
  catch (e) { console.error('list_backups failed', e); }
  closeDialog(); // 保留中の確認があれば解決してから
  closeSearch();
  dlg = null;
  dialogEl.innerHTML = '';
  const h = document.createElement('div');
  h.className = 'dlgTitle';
  h.textContent = t('restoreTitle');
  dialogEl.appendChild(h);
  const body = document.createElement('div');
  body.className = 'dlgBody';
  body.textContent = list.length ? t('restoreBody') : t('restoreEmpty');
  dialogEl.appendChild(body);

  let chosen = null;
  const btns = document.createElement('div');
  btns.className = 'dlgBtns';
  const cancel = document.createElement('button');
  cancel.textContent = t('cancel');
  cancel.addEventListener('click', closeDialog);
  const ok = document.createElement('button');
  ok.className = 'primary';
  ok.textContent = t('restoreBtn');
  ok.disabled = true;
  ok.addEventListener('click', () => { if (chosen) runRestore(chosen); });

  if (list.length) {
    const listEl = document.createElement('div');
    listEl.className = 'dlgList';
    list.forEach(item => {
      const row = document.createElement('div');
      row.className = 'dlgItem pick';
      const sn = document.createElement('span');
      sn.className = 'snip';
      sn.textContent = item.ts ? `${fmtDate(item.ts)}（${relTime(item.ts)}）` : item.name;
      const size = document.createElement('span');
      size.className = 'dim';
      size.textContent = fmtSize(item.size);
      row.appendChild(sn); row.appendChild(size);
      row.addEventListener('click', () => {
        chosen = item.name;
        listEl.querySelectorAll('.dlgItem').forEach(x => x.classList.toggle('on', x === row));
        ok.disabled = false;
      });
      listEl.appendChild(row);
    });
    dialogEl.appendChild(listEl);
  }

  btns.appendChild(cancel);
  btns.appendChild(ok);
  dialogEl.appendChild(btns);
  overlayEl.hidden = false;
}

async function runRestore(name) {
  let content = null;
  try {
    content = await backupApi.read(name);
    const d = JSON.parse(content);
    if (!d || !Array.isArray(d.boards) || !d.boards.length) throw new Error('bad backup');
  } catch (e) {
    console.error('restore read failed', e);
    hint(t('restoreErr'), 4000);
    return;
  }
  closeDialog();
  // 編集状態を確定し、現在の状態を保存+強制バックアップしてから置き換える(プロジェクト読込と同じ手順)
  closeFocus({ resume: false });
  closeSearch();
  endConnect();
  endLinkPick(true);
  if (editing != null) { document.activeElement?.blur(); editing = null; }
  if (!(await guardDestructive())) { hint(t('guardErr'), 5000); return; }
  const keepSettings = { ...settings };
  try {
    hydrate(content);
  } catch (e) {
    console.error('restore hydrate failed', e);
    hint(t('restoreErr'), 4000);
    return;
  }
  settings = keepSettings; // アプリ設定(テーマ・言語・格子・文字サイズ)は引き継ぐ
  lang = settings.lang;
  undoStack.length = 0;
  redoStack.length = 0;
  navStack.length = 0;
  updateBackBtn();
  multiSel.clear();
  selected = null;
  bwtSynced = projPath != null ? null : undefined; // 復元直後は .bwt と乖離している前提で ● を出す
  updateTitle();
  applyTheme(); applyGrid(); applyLang(); applyFontSize(); applyLabelStyle();
  renderTabs();
  renderBoard();
  markDirty();
  hint(t('restoreDone'), 4500);
}

// ================= AI アシスタント用の説明 =================
// 「原稿を AI に手伝ってもらう」ためのプロンプト一式をクリップボードへ。
// アプリに内蔵することで、そのバージョンの正確な仕様が常に手に入る(サイト掲載だとズレうる)
function aiGuideText() {
  const M = IS_MAC ? '⌘' : 'Ctrl+';
  const SH = IS_MAC ? '⌘⇧' : 'Ctrl+Shift+';
  const SCHEMA = `{
  "version": 1,
  "settings": { "lang": "ja", "theme": "system", "grid": true, "fontSize": 15 },
  "cur": 0,
  "boards": [
    {
      "id": 1,
      "name": "第一章",
      "boxes": [
        {
          "id": 1,
          "type": "text",
          "x": 100, "y": 80,
          "w": 260, "h": 180,
          "text": "本文。改行は \\\\n。",
          "title": "一 夜明け",
          "vert": false,
          "color": "sky",
          "link": null
        },
        {
          "id": 2,
          "type": "text",
          "x": 400, "y": 80,
          "w": 260, "h": 180,
          "text": "次の場面。",
          "title": "",
          "vert": false,
          "color": "none",
          "link": null
        }
      ],
      "conns": [ { "a": 1, "b": 2 } ],
      "view": { "x": 60, "y": 80, "s": 1 }
    }
  ]
}`;
  if (lang === 'en') {
    return `# Editing a Bird Writer project file (.bwt)

I'm writing with Bird Writer, an infinite-canvas writing app. I'll give you my project file (.bwt). Please read it and help me with my manuscript following the rules below.

## About the app

Instead of one long document, the manuscript lives as **text boxes scattered across an infinite canvas**. Zoom out to see the structure of the whole story; zoom in to write a single passage. A "board" (tab) is a large unit such as a work or a chapter.

- **A box's x/y position is the author's thinking made visible.** Boxes placed near each other are related; distance is deliberate. It is not necessarily chronological order.
- **conns** are lines showing relationships between boxes. **link** jumps to another board or box.
- **color** is a label whose meaning the author defines (progress, POV character, plot line...). The values are color names (sky/coral/mint/lemon), but by default the app draws them as monochrome patterns (stripes / solid / dots / hatch); users can switch to colors in settings.
- **vert: true** means vertical writing (for Japanese).

## The file is JSON with this shape

\`\`\`json
${SCHEMA}
\`\`\`

- \`type\` is "text" or "image". An image box has a \`src\` field holding a huge base64 data URI — **never modify, reformat, or drop it**.
- \`title\` is an optional heading (empty string = none).
- \`color\` is one of "none" | "sky" | "coral" | "mint" | "lemon".
- \`link\` is null, a board id (number), or {"board": id, "box": id}.

## Editing rules

- **Revising text**: just rewrite \`boxes[].text\`. Plain text only (\\n for newlines) — no HTML or Markdown decoration; it would be shown literally.
- **Adding a box**: append a text box. Its \`id\` must be **unused across the whole file** (safest: max existing id + 1). Place \`x\`/\`y\` where it does not overlap existing boxes.
- **Deleting a box**: remove it from \`boxes\`, and also remove any \`conns\` entry containing its id and any \`link\` pointing at it.
- **Do not move or resize existing boxes.** The layout is the author's map of their own thinking.
- Respect the granularity: **one box ≈ one scene or fragment.** Don't merge or split without being asked (suggesting is fine).
- Don't reassign \`color\` meanings by guessing. Use "none" for new boxes.
- Do not edit \`settings\`, \`view\`, or \`cur\`.
- **Output must be valid JSON** (no comments, no trailing commas). A file with an empty \`boards\` array will be rejected by the app.

## Safe workflow

1. In Bird Writer: **Save As… (${SH}S)** to a place you can reach, e.g. ~/Documents/mynovel.bwt
2. You edit that file and save it as valid JSON.
3. In Bird Writer: **Open project… (${M}O)** and choose the file.

⚠️ **While you are editing the file, I must not press ${M}S in Bird Writer** — it would overwrite your changes. Opening the edited file automatically backs up the previous state first, so mistakes can be recovered.

If I only want you to read the manuscript, exporting to .txt from the app (${M}E) is simpler — but layout information is lost.`;
  }
  return `# Bird Writer のプロジェクトファイル（.bwt）を編集するための手引き

私は Bird Writer という「無限キャンバス執筆アプリ」で原稿を書いています。これから .bwt ファイルを渡すので、下記のルールに従って原稿の作業を手伝ってください。

## アプリについて

原稿は1本の長い文書ではなく、**広いキャンバスに散らばるテキストボックス（断章・シーン・メモ）**として存在します。ズームアウトすると全体の構造が見え、ズームインすると1つの文章に没入して書く、という道具です。「ボード」（上部のタブ）は作品や章などの大きな単位です。

- **ボックスの x / y は作者の思考の配置そのものです。** 近くに置かれたものは関係が近く、離れているのは意図的です。時系列順とは限りません。
- **conns** はボックス間の関係を示す線、**link** は別ボード/別ボックスへのジャンプです。
- **color** は作者が意味を決めるラベルです（進捗、視点人物、プロットラインなど）。値は色名（sky/coral/mint/lemon）ですが、アプリの既定では模様（縞・べた・水玉・斜線）で表示されます（設定で色にも切替可）。
- **vert: true** は縦書きです。

## ファイルは次の形の JSON です

\`\`\`json
${SCHEMA}
\`\`\`

- \`type\` は "text" か "image"。画像ボックスには巨大な base64 の \`src\` があります — **絶対に変更・整形・削除しないでください**。
- \`title\` は任意の見出し（空文字 = 無し）。
- \`color\` は "none" | "sky" | "coral" | "mint" | "lemon" のいずれか。
- \`link\` は null / ボードid（数値）/ {"board": id, "box": id}。

## 編集ルール

- **本文の加筆・推敲**は \`boxes[].text\` を書き換えるだけです。プレーンテキスト（改行は \\n）で、HTML やマークダウンの装飾は入れないでください（そのまま文字として表示されます）。
- **ボックスの追加**は \`boxes\` に text ボックスを足します。\`id\` は**ファイル全体で未使用の数値**にしてください（既存の最大 id + 1 が安全）。\`x\`/\`y\` は既存のボックスと重ならない位置に。
- **ボックスの削除**時は、その id を含む \`conns\` と、その id を指す \`link\` も一緒に消してください。
- **既存ボックスの位置やサイズは動かさないでください。** 配置は作者の思考地図です。
- 粒度を尊重してください: **1ボックス ≈ 1シーン / 1断章**。指示なく結合・分割しないでください（提案は歓迎です）。
- 色ラベルの意味を推測で変えないでください。新規ボックスは "none" のままで。
- \`settings\` / \`view\` / \`cur\` は編集しないでください。
- **出力は必ず妥当な JSON**（コメント・末尾カンマ不可）。\`boards\` が空だとアプリが読み込みを拒否します。

## 安全な進め方

1. Bird Writer で **「別名で保存…」（${SH}S）** して、あなたがアクセスできる場所に置く（例: ~/Documents/作品名.bwt）
2. あなたがそのファイルを編集し、妥当な JSON として保存する
3. Bird Writer で **「プロジェクトを開く…」（${M}O）** から読み込む

⚠️ **あなたが編集している間、私は Bird Writer で ${M}S（上書き保存）を押しません** — 押すとあなたの編集が消えてしまうためです。読み込み時は直前の状態が自動でバックアップされるので、失敗しても復元できます。

原稿を読んでもらうだけなら、アプリの「書き出し…（${M}E）」で .txt にする方が手軽です（ただしレイアウト情報は失われます）。`;
}

// クリップボードへの書き込み(Clipboard API が使えない環境では execCommand にフォールバック)
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) { console.error('clipboard API failed', e); }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch (e) {
    console.error('execCommand copy failed', e);
    return false;
  }
}

async function copyAiGuide() {
  closeMenu();
  const text = aiGuideText();
  if (await copyToClipboard(text)) { hint(t('aiGuideDone'), 4000); return; }
  openAiGuideDialog(text); // クリップボードが使えない環境でも必ず取り出せるように
}

// フォールバック: 説明文を選択可能な形で表示する(全選択済みなので ⌘C でそのまま取れる)
function openAiGuideDialog(text) {
  closeDialog();
  closeSearch();
  dlg = null;
  dialogEl.innerHTML = '';
  const h = document.createElement('div');
  h.className = 'dlgTitle';
  h.textContent = t('aiGuideTitle');
  const body = document.createElement('div');
  body.className = 'dlgBody';
  body.textContent = t('aiGuideBody');
  const ta = document.createElement('textarea');
  ta.className = 'dlgText';
  ta.readOnly = true;
  ta.value = text;
  const btns = document.createElement('div');
  btns.className = 'dlgBtns';
  const close = document.createElement('button');
  close.textContent = t('kbCloseBtn');
  close.addEventListener('click', closeDialog);
  const copy = document.createElement('button');
  copy.className = 'primary';
  copy.textContent = t('aiGuideCopyBtn');
  copy.addEventListener('click', async () => {
    ta.focus();
    ta.select();
    if (await copyToClipboard(text)) { closeDialog(); hint(t('aiGuideDone'), 4000); }
  });
  btns.appendChild(close);
  btns.appendChild(copy);
  dialogEl.appendChild(h);
  dialogEl.appendChild(body);
  dialogEl.appendChild(ta);
  dialogEl.appendChild(btns);
  overlayEl.hidden = false;
  ta.focus();
  ta.select();
  ta.scrollTop = 0; // 全選択で末尾に飛ぶので先頭を見せる
}

// ================= ショートカット一覧 =================
function kbShortcuts() {
  const M = MODK;
  const SH = IS_MAC ? '⌘⇧' : 'Ctrl+Shift+';
  return [
    [`${M}N`, t('kbNew')],
    ['Enter', t('kbEdit')],
    [IS_MAC ? 'Tab / ⇧Tab' : 'Tab / Shift+Tab', t('kbTab')],
    ['← ↑ ↓ →', t('kbArrows')],
    [`${M}Enter`, t('kbFocus')],
    [`${M}K`, t('kbSplitCaret')],
    [`${M}F`, t('kbSearch')],
    [`${M}S`, t('kbSave')],
    [`${SH}S`, t('kbSaveAs')],
    [`${M}O`, t('kbOpen')],
    [`${M}E`, t('kbExport')],
    [`${M}Z / ${SH}Z`, t('kbUndo')],
    [`${M}[`, t('kbBack')],
    [`${M}1–9`, t('kbBoards')],
    ['Delete', t('kbDelete')],
    [`${M}C / ${M}X / ${M}V`, t('kbCopy')],
    [t('kbImgKey', M), t('kbImg')],
    [t('kbMultiKey'), t('kbMulti')],
    [t('kbDblKey'), t('kbDbl')],
    [t('kbZoomKey', M), t('kbZoom')],
    [`${M}/`, t('kbHelp')],
  ];
}
function openShortcutsDialog() {
  closeMenu();
  closeDialog();
  closeSearch();
  dlg = null;
  dialogEl.innerHTML = '';
  const h = document.createElement('div');
  h.className = 'dlgTitle';
  h.textContent = t('kbTitle');
  dialogEl.appendChild(h);
  const grid = document.createElement('div');
  grid.className = 'kbGrid';
  kbShortcuts().forEach(([k, d]) => {
    const kk = document.createElement('span');
    kk.className = 'kkey';
    kk.textContent = k;
    const kd = document.createElement('span');
    kd.className = 'kdesc';
    kd.textContent = d;
    grid.appendChild(kk);
    grid.appendChild(kd);
  });
  dialogEl.appendChild(grid);
  const btns = document.createElement('div');
  btns.className = 'dlgBtns';
  const ok = document.createElement('button');
  ok.className = 'primary';
  ok.textContent = t('kbCloseBtn');
  ok.addEventListener('click', closeDialog);
  btns.appendChild(ok);
  dialogEl.appendChild(btns);
  overlayEl.hidden = false;
}

// ================= キャンバス操作 =================
viewport.addEventListener('wheel', (e) => {
  // 編集中ボックスの中身にあふれがあれば、ホイールをネイティブスクロールに任せる
  // (キャンバスのパンに奪われて、あふれたテキストへ到達できない問題の回避)
  if (!e.ctrlKey && !e.metaKey && editing != null) {
    const c = e.target.closest?.('.content');
    if (c && c.closest('.box')?.id === 'box' + editing &&
        (c.scrollHeight > c.clientHeight + 1 || c.scrollWidth > c.clientWidth + 1)) {
      return;
    }
  }
  e.preventDefault();
  if (e.ctrlKey || e.metaKey) {
    zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01));
  } else {
    const v = board().view;
    v.x -= e.deltaX; v.y -= e.deltaY;
    applyView();
  }
}, { passive: false });

// Shift+背景ドラッグ = 矩形選択(既存の選択に追加)。通常ドラッグはパン
const marqueeEl = $('marquee');
function startMarquee(e) {
  e.preventDefault();
  const x0 = e.clientX, y0 = e.clientY;
  const base = new Set(multiSel);
  const move = (ev) => {
    const L = Math.min(x0, ev.clientX), T = Math.max(Math.min(y0, ev.clientY), TOP);
    const R = Math.max(x0, ev.clientX), B = Math.max(y0, ev.clientY);
    marqueeEl.hidden = false;
    marqueeEl.style.left = L + 'px';
    marqueeEl.style.top = T + 'px';
    marqueeEl.style.width = (R - L) + 'px';
    marqueeEl.style.height = Math.max(0, B - T) + 'px';
    const a = toWorld(L, T), b = toWorld(R, B);
    multiSel.clear();
    base.forEach(id => multiSel.add(id));
    board().boxes.forEach(bx => {
      if (bx.x < b.x && bx.x + bx.w > a.x && bx.y < b.y && bx.y + bx.h > a.y) multiSel.add(bx.id);
    });
    syncPrimary();
    syncSelClasses();
  };
  const up = () => {
    marqueeEl.hidden = true;
    removeEventListener('mousemove', move); removeEventListener('mouseup', up);
    updateToolbar();
    clearGesture();
  };
  startGesture(up);
  addEventListener('mousemove', move); addEventListener('mouseup', up);
}

viewport.addEventListener('mousedown', (e) => {
  if (e.target !== viewport && e.target !== world && e.target !== wires) return;
  endActiveGesture(); // (#6)
  if (connectFrom !== null) { endConnect(); hint(t('connCancel')); return; }
  if (e.shiftKey) { startMarquee(e); return; }
  deselect();
  const v = board().view;
  const ox = v.x, oy = v.y, sx = e.clientX, sy = e.clientY;
  viewport.classList.add('panning');
  const move = (ev) => { v.x = ox + ev.clientX - sx; v.y = oy + ev.clientY - sy; applyView(); };
  const up = () => {
    viewport.classList.remove('panning');
    removeEventListener('mousemove', move); removeEventListener('mouseup', up);
    clearGesture();
  };
  startGesture(up);
  addEventListener('mousemove', move); addEventListener('mouseup', up);
});

viewport.addEventListener('dblclick', (e) => {
  if (e.target !== viewport && e.target !== world && e.target !== wires) return;
  if (e.shiftKey) return; // 矩形選択の連続操作でボックスを作らない
  const p = toWorld(e.clientX, e.clientY);
  addBox(p.x - 130, p.y - 40);
});

$('zoomIn').addEventListener('click', () =>
  zoomAt(viewport.clientWidth / 2, viewport.clientHeight / 2 + TOP, 1.25));
$('zoomOut').addEventListener('click', () =>
  zoomAt(viewport.clientWidth / 2, viewport.clientHeight / 2 + TOP, 0.8));
$('fitBtn').addEventListener('click', fitAll);

// ================= キーボード =================
function isEditingContext() {
  if (focusTarget) return true;
  const a = document.activeElement;
  return !!(a && (a.isContentEditable || a.tagName === 'INPUT' || a.tagName === 'TEXTAREA'));
}

addEventListener('keydown', (e) => {
  const mod = e.metaKey || e.ctrlKey;
  if (e.key === 'Escape') {
    if (e.isComposing) return; // IME 変換中の Esc は IME に任せる
    if (!overlayEl.hidden) { closeDialog(); return; }
    if (!searchEl.hidden) { closeSearch(); return; }
    if (focusTarget) { closeFocus(); return; }
    if (linkPick) { endLinkPick(); return; }
    if (connectFrom !== null) { endConnect(); hint(t('connCancel')); return; }
    if (menuEl.style.display === 'block') { closeMenu(); return; }
    if (isEditingContext()) { document.activeElement?.blur(); return; }
    if (multiSel.size) deselect();
    return;
  }
  if (mod && (e.key === 'f' || e.key === 'F')) {
    if (focusTarget || !overlayEl.hidden) return; // 集中モード・ダイアログ中は無効
    e.preventDefault();
    toggleSearch();
    return;
  }
  if (mod && e.key === '[') {
    if (isEditingContext()) return;
    e.preventDefault();
    goBack();
    return;
  }
  if (mod && (e.key === 'z' || e.key === 'Z')) {
    if (isEditingContext()) return; // テキスト編集中は OS 標準アンドゥ
    e.preventDefault();
    if (e.shiftKey) redo(); else undo();
    return;
  }
  if (mod && (e.key === 's' || e.key === 'S')) {
    // Tauri ではネイティブメニューのアクセラレータが先に消費するため、これは主にブラウザ検証用。
    // ブラウザ既定の「ページを保存」を抑止してプロジェクト保存に割り当てる
    e.preventDefault();
    if (e.shiftKey) saveProjectAs(); else saveProject();
    return;
  }
  if (mod && (e.key === 'o' || e.key === 'O') && DEMO?.noOpen) {
    // 体験版: 開く(⌘O)は無効。ブラウザ既定の「ファイルを開く」も抑止して案内だけ出す
    e.preventDefault();
    hint(t('demoNoOpen'), 3500);
    return;
  }
  if (mod && e.key === 'Enter') {
    if (e.isComposing) return;
    e.preventDefault();
    toggleFocusShortcut();
    return;
  }
  if (mod && (e.key === '/' || e.key === '?' || e.code === 'Slash') && !e.altKey) {
    // ⌘/ = ショートカット一覧の開閉(編集中でも引けるように)
    if (e.isComposing) return;
    e.preventDefault();
    if (!overlayEl.hidden && dialogEl.querySelector('.kbGrid')) { closeDialog(); return; }
    if (editing != null) document.activeElement?.blur();
    openShortcutsDialog();
    return;
  }
  if (mod && (e.key === 'k' || e.key === 'K') && !e.shiftKey && !e.altKey) {
    // カーソル位置で分割(ボックスのテキスト編集中のみ)
    if (e.isComposing) return;
    if (editing == null || focusTarget) return;
    e.preventDefault();
    splitBoxAtCaret();
    return;
  }
  if (mod && (e.key === 'n' || e.key === 'N')) {
    // ⌘S と同様、ネイティブメニュー(⌘N)が先に消費する環境ではこちらは発火しない。
    // 両方発火する環境向けに newBoxShortcut 側で二重発火を抑止している
    e.preventDefault();
    newBoxShortcut();
    return;
  }
  if (mod && !e.shiftKey && !e.altKey && (e.key === 'c' || e.key === 'C' || e.key === 'x' || e.key === 'X')) {
    // キャンバス上の選択ボックスをコピー/切り取り(テキスト編集中はネイティブに任せる)
    if (isEditingContext() || focusTarget || editing != null || dragging) return;
    if (!overlayEl.hidden || menuEl.style.display === 'block') return;
    if (linkPick || connectFrom !== null) return;
    if (!multiSel.size) return;
    e.preventDefault();
    copySelection(e.key === 'x' || e.key === 'X');
    return;
  }
  if (mod && !e.shiftKey && !e.altKey && (e.key === 'v' || e.key === 'V')) {
    if (isEditingContext() || focusTarget || editing != null || dragging) return;
    if (!overlayEl.hidden || menuEl.style.display === 'block') return;
    if (linkPick || connectFrom !== null) return;
    if (!boxClipboard) return;
    e.preventDefault();
    pasteClipboard();
    return;
  }
  if (mod && !e.shiftKey && !e.altKey && e.key >= '1' && e.key <= '9') {
    // ⌘1〜9 でボード切替
    if (focusTarget || !overlayEl.hidden) return;
    const i = e.key.charCodeAt(0) - 49;
    if (i < boards.length) {
      e.preventDefault();
      if (i !== cur) switchBoard(i);
    }
    return;
  }
  if (e.key === 'Tab' && !mod && !e.altKey) {
    // 読み順で次・前のボックスへ(キャンバス操作時のみ)
    if (isEditingContext() || focusTarget || editing != null || dragging) return;
    if (!overlayEl.hidden || !searchEl.hidden || menuEl.style.display === 'block') return;
    if (linkPick || connectFrom !== null) return;
    if (!board().boxes.length) return;
    e.preventDefault();
    if (multiSel.size > 1) return;
    navReadingOrder(e.shiftKey ? -1 : 1);
    return;
  }
  if (NAV_VEC[e.key] && !mod && !e.altKey && !e.shiftKey) {
    // 矢印キーで隣のボックスへ
    if (isEditingContext() || focusTarget || editing != null || dragging) return;
    if (!overlayEl.hidden || !searchEl.hidden || menuEl.style.display === 'block') return;
    if (linkPick || connectFrom !== null) return;
    if (multiSel.size > 1) return;
    if (!board().boxes.length) return;
    e.preventDefault();
    navSpatial(e.key);
    return;
  }
  if (e.key === 'Enter' && !mod && !e.shiftKey && !e.altKey) {
    // 選択中のテキストボックスを編集(Esc で終了と対になる)
    if (e.isComposing) return;
    if (isEditingContext() || focusTarget || editing != null || dragging) return;
    if (!overlayEl.hidden || !searchEl.hidden || menuEl.style.display === 'block') return;
    if (linkPick || connectFrom !== null) return;
    if (multiSel.size !== 1 || selected == null) return;
    const b = boxById(board(), selected);
    if (!b || b.type === 'image') return;
    e.preventDefault();
    startEdit(b, $('box' + selected));
    return;
  }
  if ((e.key === 'Delete' || e.key === 'Backspace') && !mod) {
    // キャンバス上の選択ボックスを削除(テキスト編集中・パネル/メニュー表示中は対象外) (#2)
    if (isEditingContext() || editing != null || dragging) return;
    if (!overlayEl.hidden || !searchEl.hidden || menuEl.style.display === 'block') return;
    if (linkPick || connectFrom !== null) return;
    if (!multiSel.size) return;
    e.preventDefault();
    disarmDelete();
    deleteSelection();
  }
});

// ネイティブ右クリックメニューは編集可能要素以外では抑止
addEventListener('contextmenu', (e) => {
  const a = e.target;
  if (a.isContentEditable || a.tagName === 'INPUT' || a.tagName === 'TEXTAREA') return;
  e.preventDefault();
});

addEventListener('resize', () => {
  positionToolbar();
  if (!searchEl.hidden) applySearchPos(); // 縮小でパネルが画面外に出ないように
});

// ================= 保存フラッシュのトリガー =================
$('saveWarn').addEventListener('click', () => flushSave()); // 保存失敗インジケータ = 手動再試行
addEventListener('blur', () => {
  endActiveGesture(); // フォーカス喪失 = mouseup が来ない典型ケース (#6)
  flushSave();
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSave(); });
addEventListener('beforeunload', () => { flushSave(); });

if (TAURI) {
  // ウィンドウを閉じる / アプリ終了時: Rust 側が閉じるのを保留し、保存完了後に確定。
  // まず ack_close で「JS は応答している」と伝えてタイムアウト強制クローズを解除し、
  // 最終保存に失敗した場合は黙って破棄せずユーザーに選ばせる (#1)
  TAURI.event.listen('close-requested', async () => {
    TAURI.core.invoke('ack_close').catch(() => {});
    let ok = false;
    try { ok = await flushSave(); } catch (e) { console.error(e); }
    if (ok) { TAURI.core.invoke('confirm_close'); return; }
    const quit = await showConfirm(t('closeFailTitle'), t('closeFailBody'), t('closeFailBtn'));
    if (quit) TAURI.core.invoke('confirm_close');
  });
  // 実行中に Finder で .bwt が開かれたとき
  TAURI.event.listen('open-project', (e) => {
    TAURI.core.invoke('take_pending_open').catch(() => {}); // 二重処理防止に消費
    if (typeof e.payload === 'string') importProjectFromPath(e.payload);
  });
  // ネイティブメニュー(ファイル)からの操作
  TAURI.event.listen('menu', (e) => {
    const id = e.payload;
    if (id === 'new-box') { newBoxShortcut(); return; }    // 集中モード中は「次のボックスへ」として動く
    if (id === 'proj-save') { saveProject(); return; }     // 上書き保存は集中モード中も有効(⌘S の筆癖に応える)
    if (id === 'proj-save-as') { saveProjectAs(); return; }
    if (focusTarget) return; // 開く/書き出しのダイアログは集中モード中は開かない
    if (id === 'proj-open') openProjectDialog();
    else if (id === 'export-text') openExportDialog();
  });
}

// ================= 起動 =================
async function boot() {
  let loaded = false, damaged = false, raw = null;
  try {
    raw = await persist.load();
    if (raw) { hydrate(raw); loaded = true; }
  } catch (e) {
    console.error('load failed', e);
    // 「データが無い」のではなく「あるのに読めない」場合のみ破損扱い
    damaged = raw !== null || !!TAURI;
  }
  if (!loaded) {
    boards = [newBoard(STR.ja.boardN(1))];
    cur = 0;
  }
  applyTheme();
  applyGrid();
  applyLabelStyle();
  applyLang();
  applyFontSize();
  updateTitle(); // 前回のプロジェクト関連付けがあればタイトルに反映
  // ⌘S 関連付けがあるなら .bwt を読み比べて ● の初期状態を決める
  // (読み込み中に別プロジェクトへ切り替わった場合は反映しない)
  if (projPath != null) {
    if (TAURI) {
      const p0 = projPath;
      TAURI.core.invoke('read_text_file', { path: p0 })
        .then(s => { if (projPath === p0) { bwtSynced = s; updateTitle(); } })
        .catch(() => { if (projPath === p0) { bwtSynced = null; updateTitle(); } });
    } else {
      bwtSynced = null; // ブラウザ検証では .bwt を読めないため常に「未保存」扱い
      updateTitle();
    }
  }
  renderTabs();
  renderBoard();
  if (damaged) {
    // 読めなかった既存データを退避できるまで、自動保存で上書きしない
    let preserved = false;
    if (TAURI) {
      try { await TAURI.core.invoke('backup_now'); preserved = true; }
      catch (e) { console.error('backup_now failed', e); }
    } else if (raw !== null) {
      try { localStorage.setItem('birdwriter-data-unreadable', raw); preserved = true; }
      catch (e) { console.error('preserve failed', e); }
    }
    hint(t(preserved ? 'loadErr' : 'loadErrKeep'), 8000);
    if (preserved) markDirty();
  } else {
    // 起動直後に現在の状態を保存し直す: 初回起動でファイルを作り、
    // 旧形式データ(色名など)のマイグレーション結果も永続化する
    markDirty();
    if (!loaded) hint(t('welcome'), 5000);
  }
  // .bwt ダブルクリック起動(コールドスタート)の処理
  if (TAURI) {
    try {
      const pending = await TAURI.core.invoke('take_pending_open');
      if (pending) await importProjectFromPath(pending);
    } catch (e) { console.error(e); }
  }
}

// 体験版のロック画面から書き出しを呼べるように、フラグがあるときだけ公開する
if (DEMO) Object.assign(DEMO, { saveProjectAs, openExportDialog });
boot();
// 同梱フォントの読込完了後にフィットし直す(読込前の代替フォントで測った高さのズレを直す)
document.fonts?.ready?.then?.(() => fitAllBoxes());
})();
