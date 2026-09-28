// Bird Writer Web 体験版 — アプリ本体(main.js)には触らず、その手前で
// ①スマホ/狭い画面の案内 ②初回のサンプル原稿の仕込み ③体験版チップと初回案内 を足す。
// 本体はブラウザ単体でも動く(保存は localStorage、.txt/.bwt はダウンロード/ファイル選択)。
(async () => {
  const V = window.BW_DEMO_VERSION || '';
  const lang = /^ja/i.test(navigator.language || '') ? 'ja' : 'en';
  const STORE_MAC = lang === 'ja' ? 'https://apps.apple.com/jp/app/id6791197348' : 'https://apps.apple.com/us/app/id6791197348';
  const SITE = '../';
  const S = {
    ja: {
      chip: '体験版', chipNote: '保存はこのブラウザ内のみ', get: 'アプリ版を入手', about: 'この体験版について',
      title: 'Bird Writer をブラウザで試す',
      p1: 'これは体験版です。書いたものは<b>このブラウザの中にだけ</b>保存され、ファイルには残りません。',
      p2: 'サンプル原稿「海辺の章」を入れてあります。<b>縮小して全体を眺め、拡大して書く</b>——それが Bird Writer の使い方です。⌘＋スクロール（ピンチ）でズーム、ドラッグで移動、ダブルクリックで新しいボックス。',
      p3: '気に入ったらアプリ版へ。書いたものは ⚙ →「別名で保存…」で .bwt に書き出し、アプリで開けます。',
      p4: 'ブラウザの都合で ⌘N と ⌘⇧S は効きません（アプリ版では使えます）。',
      start: 'はじめる', mac: 'Mac App Store で入手', win: 'Windows 版は近日公開', reset: '体験データを消して最初から', resetConfirm: 'このブラウザに保存した体験データをすべて消して、サンプル原稿に戻します。よろしいですか？',
      gateTitle: 'Bird Writer 体験版', gate: 'この体験版はパソコンのブラウザ向けです（キーボードとマウス／トラックパッドで操作します）。Mac か Windows のブラウザで開いてください。', gateLink: 'アプリについて',
    },
    en: {
      chip: 'Trial', chipNote: 'Saved in this browser only', get: 'Get the app', about: 'About this trial',
      title: 'Try Bird Writer in your browser',
      p1: 'This is a trial. What you write is saved <b>only in this browser</b>, not to a file.',
      p2: 'A sample manuscript, “Seaside”, is loaded. <b>Zoom out to see the whole, zoom in to write</b> — that is how Bird Writer works. ⌘/Ctrl + scroll (or pinch) to zoom, drag to pan, double-click for a new box.',
      p3: 'If you like it, get the app. Export your work with ⚙ → “Save As…” (.bwt) and open it in the app.',
      p4: 'Because of the browser, ⌘N and ⌘⇧S are not available here (they work in the app).',
      start: 'Start', mac: 'Get it on the Mac App Store', win: 'Windows version coming soon', reset: 'Clear trial data and start over', resetConfirm: 'This will erase all trial data saved in this browser and reload the sample. Continue?',
      gateTitle: 'Bird Writer trial', gate: 'This trial is made for desktop browsers (keyboard and mouse/trackpad). Please open it on a Mac or Windows computer.', gateLink: 'About the app',
    },
  }[lang];
  document.documentElement.lang = lang;

  // ① スマホ / 狭い画面: 本体を読まずに案内だけ
  const coarse = matchMedia('(pointer: coarse)').matches;
  if (Math.min(screen.width, screen.height) < 600 || (coarse && innerWidth < 900)) {
    document.body.innerHTML = `<div id="bwDemoGate"><div class="card"><h2>${S.gateTitle}</h2><p>${S.gate}</p><p><a href="${STORE_MAC}">${S.mac}</a> · <a href="${SITE}">${S.gateLink}</a></p></div></div>`;
    return;
  }

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

  // ④ 体験版チップ
  const chip = document.createElement('div');
  chip.id = 'bwDemoChip';
  chip.innerHTML = `<b>${S.chip}</b><span>${S.chipNote}</span><a href="${STORE_MAC}" target="_blank" rel="noopener">${S.get}</a><button type="button" title="${S.about}" aria-label="${S.about}">?</button>`;
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
})();
