# 同梱フォントのライセンス表記 / Bundled Font Licenses

Bird Writer は以下のフォントを woff2 サブセット（外部通信を避けるためローカル同梱）として
バンドルしています。いずれも **SIL Open Font License 1.1（OFL）** で提供され、本アプリでの
同梱・再配布・商用販売が許諾されています。OFL の要件に従い、各フォントの著作権表記と
ライセンス本文を本ディレクトリに同梱します。

Bird Writer bundles the following fonts as subsetted woff2 files (embedded locally to avoid any
network access). Both are provided under the **SIL Open Font License, Version 1.1 (OFL)**, which
permits bundling, redistribution and commercial sale within this application. In accordance with
the OFL, the copyright notice and full license text for each font are included in this directory.

---

## Noto Serif JP（本文・明朝 / body serif）

- Copyright 2012 Google Inc. All Rights Reserved.
- License: SIL Open Font License, Version 1.1
- Source: https://fonts.google.com/noto/specimen/Noto+Serif+JP
- ライセンス全文 / Full license: `licenses/NotoSerifJP-OFL.txt`
- 予約フォント名（Reserved Font Name）: なし / none declared

## Zen Kaku Gothic New（UI・ゴシック / UI gothic）

- Copyright 2022 The Zen Kaku Gothic Project Authors (https://github.com/googlefonts/zen-kakugothic)
- License: SIL Open Font License, Version 1.1
- Source: https://fonts.google.com/specimen/Zen+Kaku+Gothic+New
- ライセンス全文 / Full license: `licenses/ZenKakuGothicNew-OFL.txt`
- 予約フォント名（Reserved Font Name）: なし / none declared

---

## 補足 / Notes

- `*.woff2` は Google Fonts の配信サブセットに基づくフォーマット変換・サブセット版です。OFL は
  改変（サブセット化・フォーマット変換）と同梱を許可しています。両フォントとも予約フォント名の
  宣言がないため、元のファミリー名のまま使用しています。
- OFL は「フォント単体での販売」を禁じますが、本アプリはフォントをアプリの一構成要素として
  同梱しており、これに該当しません。
- The woff2 files are format-converted / subsetted versions derived from the Google Fonts
  delivery. The OFL permits modification (subsetting / format conversion) and bundling. Neither
  font declares a Reserved Font Name, so the original family names are retained.
