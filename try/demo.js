// Bird Writer Web 体験版 — アプリ本体(main.js)には触らず、その手前で
// ①スマホ/狭い画面の案内 ②初回のサンプル原稿の仕込み ③体験版チップと初回案内
// ④読み込み無し(本体へのフラグ) ⑤7日間の期限(残日数の表示 / 期限後のロック画面) を足す。
// 本体はブラウザ単体でも動く(保存は localStorage、.txt/.bwt はダウンロード/ファイル選択)。
(async () => {
  // ④ 本体に「体験版」を知らせる(本体の読み込み前に立てる)。本体はこのフラグがあるときだけ
  //    ⚙の「プロジェクトを開く…」「最近使ったプロジェクト」を出さず ⌘O を無効にし、
  //    書き出し関数(saveProjectAs / openExportDialog)をこのオブジェクトに公開する
  window.BW_DEMO = { noOpen: true };

  const V = window.BW_DEMO_VERSION || '';
  const lang = /^ja/i.test(navigator.language || '') ? 'ja' : 'en';
  const STORE_MAC = lang === 'ja' ? 'https://apps.apple.com/jp/app/id6791197348' : 'https://apps.apple.com/us/app/id6791197348';
  const SITE = '../';
  const TRIAL_DAYS = 7;
  const S = {
    ja: {
      chip: '体験版', chipNote: '保存はこのブラウザ内のみ', get: 'アプリ版を入手', about: 'この体験版について',
      days: n => `残り ${n} 日`,
      title: 'Bird Writer をブラウザで試す',
      p1: 'これは <b>7日間</b> の体験版です。書いたものは<b>このブラウザの中にだけ</b>保存され、ファイルには残りません。',
      p2: 'サンプル原稿「海辺の章」を入れてあります。<b>縮小して全体を眺め、拡大して書く</b>——それが Bird Writer の使い方です。⌘＋スクロール（ピンチ）でズーム、ドラッグで移動、ダブルクリックで新しいボックス。',
      p3: '気に入ったらアプリ版へ。書いたものは ⚙ →「別名で保存…」で .bwt に書き出し、アプリで開けます（この体験版では .bwt を開くことはできません）。',
      p4: 'ブラウザの都合で ⌘N と ⌘⇧S は効きません（アプリ版では使えます）。',
      start: 'はじめる', mac: 'Mac App Store で入手', win: 'Windows 版は近日公開', reset: '体験データを消して最初から', resetConfirm: 'このブラウザに保存した体験データをすべて消して、サンプル原稿に戻します。よろしいですか？',
      gateTitle: 'Bird Writer 体験版', gate: 'この体験版はパソコンのブラウザ向けです（キーボードとマウス／トラックパッドで操作します）。Mac か Windows のブラウザで開いてください。', gateLink: 'アプリについて',
      lockTitle: '体験期間（7日）が終わりました', lock: '続きはアプリ版で。書いたものは書き出せます。',
      exportBwt: '.bwt に書き出す', exportTxt: '.txt に書き出す',
    },
    en: {
      chip: 'Trial', chipNote: 'Saved in this browser only', get: 'Get the app', about: 'About this trial',
      days: n => (n === 1 ? '1 day left' : `${n} days left`),
      title: 'Try Bird Writer in your browser',
      p1: 'This is a <b>7-day</b> trial. What you write is saved <b>only in this browser</b>, not to a file.',
      p2: 'A sample manuscript, “Seaside”, is loaded. <b>Zoom out to see the whole, zoom in to write</b> — that is how Bird Writer works. ⌘/Ctrl + scroll (or pinch) to zoom, drag to pan, double-click for a new box.',
      p3: 'If you like it, get the app. Export your work with ⚙ → “Save As…” (.bwt) and open it in the app (the trial itself cannot open .bwt files).',
      p4: 'Because of the browser, ⌘N and ⌘⇧S are not available here (they work in the app).',
      start: 'Start', mac: 'Get it on the Mac App Store', win: 'Windows version coming soon', reset: 'Clear trial data and start over', resetConfirm: 'This will erase all trial data saved in this browser and reload the sample. Continue?',
      gateTitle: 'Bird Writer trial', gate: 'This trial is made for desktop browsers (keyboard and mouse/trackpad). Please open it on a Mac or Windows computer.', gateLink: 'About the app',
      lockTitle: 'The 7-day trial has ended', lock: 'Continue in the app. You can still export what you wrote.',
      exportBwt: 'Export as .bwt', exportTxt: 'Export as .txt',
    },
  }[lang];
  document.documentElement.lang = lang;

  // ① スマホ / 狭い画面: 本体を読まずに案内だけ
  const coarse = matchMedia('(pointer: coarse)').matches;
  if (Math.min(screen.width, screen.height) < 600 || (coarse && innerWidth < 900)) {
    document.body.innerHTML = `<div id="bwDemoGate"><div class="card"><h2>${S.gateTitle}</h2><p>${S.gate}</p><p><a href="${STORE_MAC}">${S.mac}</a> · <a href="${SITE}">${S.gateLink}</a></p></div></div>`;
    return;
  }

  // ⑤ 7日間の期限: 初回訪問の時刻を記録し、残日数を出す。
  //    判定は起動時だけ(使用中に切れても次回起動でロック)。時計が戻っていたら初回扱いで記録し直す
  const START_KEY = 'bw-demo-start', DAY = 86400e3, now = Date.now();
  let start = now;
  try {
    const v = Number(localStorage.getItem(START_KEY));
    if (v > 0 && v <= now) start = v; else localStorage.setItem(START_KEY, String(now));
  } catch (e) { console.warn('trial start not stored', e); }
  const daysLeft = Math.max(0, Math.ceil((start + TRIAL_DAYS * DAY - now) / DAY));
  const expired = daysLeft <= 0;

  // ② 初回: サンプル原稿を仕込む(2回目以降はそのブラウザの続きから)
  const KEY = 'birdwriter-data';
  let first = false;
  try {
    if (!localStorage.getItem(KEY)) {
      const r = await fetch(`sample-${lang}.bwt?v=${V}`, { cache: 'no-store' });
      const d = await r.json();
      d.settings = { ...(d.settings || {}), lang, theme: 'system' };
      localStorage.setItem(KEY, JSON.stringify(d));
      first = true;
    }
  } catch (e) { console.warn('sample seed failed', e); }

  // ③ 本体を読み込む(seed の後で)
  await new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = `main.js?v=${V}`; s.onload = res; s.onerror = rej; document.body.appendChild(s);
  });

  // ⑤ 期限切れ: キャンバス全体をロック(書き出しだけできる)。チップや初回案内は出さない
  if (expired) { showLock(); return; }

  // ④ 体験版チップ(残日数つき)
  const chip = document.createElement('div');
  chip.id = 'bwDemoChip';
  chip.innerHTML = `<b>${S.chip}</b><span class="days">${S.days(daysLeft)}</span><span>${S.chipNote}</span><a href="${STORE_MAC}" target="_blank" rel="noopener">${S.get}</a><button type="button" title="${S.about}" aria-label="${S.about}">?</button>`;
  chip.querySelector('button').addEventListener('click', showIntro);
  document.body.appendChild(chip);

  function showIntro() {
    if (document.getElementById('bwDemoIntro')) return;
    const o = document.createElement('div');
    o.id = 'bwDemoIntro';
    o.innerHTML = `<div class="card" role="dialog" aria-labelledby="bwDemoTitle">
      <h2 id="bwDemoTitle">${S.title}</h2>
      <p>${S.p1}</p><p>${S.p2}</p><p>${S.p3}</p><p class="small">${S.p4}</p>
      <div class="btns"><a class="link" href="${STORE_MAC}" target="_blank" rel="noopener">${S.mac}</a><span class="muted">${S.win}</span><span class="grow"></span><button type="button" class="primary">${S.start}</button></div>
      <p class="reset"><button type="button" class="linkbtn">${S.reset}</button></p>
    </div>`;
    const close = () => o.remove();
    o.querySelector('.primary').addEventListener('click', close);
    o.addEventListener('mousedown', (e) => { if (e.target === o) close(); });
    o.querySelector('.linkbtn').addEventListener('click', () => {
      if (!confirm(S.resetConfirm)) return;
      try { for (const k of Object.keys(localStorage)) if (k.startsWith('birdwriter-')) localStorage.removeItem(k); } catch (e) {}
      location.reload();
    });
    document.body.appendChild(o);
    o.querySelector('.primary').focus();
  }
  if (first) {
    // 初回はサンプル全体が見えるように「全体」を押してから案内を出す（本体の描画完了を待つ）
    const t0 = Date.now();
    while (!document.querySelector('.box') && Date.now() - t0 < 3000) await new Promise(r => setTimeout(r, 50));
    document.getElementById('fitBtn')?.click();
    showIntro();
  }

  // 期限後のロック画面。閉じられない。書き出しは本体がフラグに公開した関数を呼ぶ
  function showLock() {
    const o = document.createElement('div');
    o.id = 'bwDemoLock';
    o.innerHTML = `<div class="card" role="dialog" aria-modal="true" aria-labelledby="bwDemoLockTitle">
      <h2 id="bwDemoLockTitle">${S.lockTitle}</h2>
      <p>${S.lock}</p>
      <div class="btns"><a class="primary" href="${STORE_MAC}" target="_blank" rel="noopener">${S.mac}</a><button type="button" data-act="bwt">${S.exportBwt}</button><button type="button" data-act="txt">${S.exportTxt}</button></div>
    </div>`;
    const api = window.BW_DEMO;
    const overlay = document.getElementById('overlay');
    o.querySelector('[data-act="bwt"]').addEventListener('click', () => api.saveProjectAs?.());
    o.querySelector('[data-act="txt"]').addEventListener('click', () => {
      api.openExportDialog?.();
      overlay?.querySelector('button, input, [tabindex]')?.focus(); // キーボードでもダイアログを操作できるように
    });
    document.body.appendChild(o);

    // ロック中はキャンバスを操作させない。マウスはロック画面が全面で受け、キー入力・貼り付けは
    // 本体(window のリスナー)に届く前に止める（本体も window で聞くため stopImmediatePropagation。
    // stopPropagation では同じノード上の本体リスナーが動いてしまう）。通すのはこのカードの中と、本体の書き出しダイアログ(#overlay)の中だけ
    const inCard = (el) => el instanceof Node && o.contains(el);
    const inDialog = (el) => el instanceof Node && !!overlay && !overlay.hidden && overlay.contains(el);
    const focusCard = () => o.querySelector('a, button')?.focus();
    for (const type of ['keydown', 'keypress', 'keyup', 'paste', 'cut', 'copy', 'beforeinput']) {
      window.addEventListener(type, (e) => {
        if (e.key === 'Escape' && overlay && !overlay.hidden) return; // ダイアログを閉じる Esc はどこからでも本体へ
        if (inDialog(e.target)) {
          // ダイアログ内: 閉じる/選ぶ/書き出すための操作は通し、⌘付きのショートカット(取り消し等)は止める
          if ((e.metaKey || e.ctrlKey) && !/^[ac]$/i.test(e.key || '')) { e.stopImmediatePropagation(); e.preventDefault(); }
          return;
        }
        if (inCard(e.target)) { e.stopImmediatePropagation(); return; } // カード内: 既定動作(Tab / Enter)だけ
        e.stopImmediatePropagation(); e.preventDefault();
        if (e.type === 'keydown' && e.key === 'Tab') focusCard();
      }, true);
    }
    // フォーカスもカード(または書き出しダイアログ)の外へ出さない
    document.addEventListener('focusin', (e) => { if (!inCard(e.target) && !inDialog(e.target)) focusCard(); });
    focusCard();
  }
})();
