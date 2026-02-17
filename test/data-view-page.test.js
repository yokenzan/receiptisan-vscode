const assert = require('node:assert/strict');
const test = require('node:test');

const {
  renderDataViewDocument,
  renderDataViewErrorHtml,
} = require('../out/features/data-view/view/page.js');

test('renderDataViewDocument embeds nonce and layout class', () => {
  const html = renderDataViewDocument({
    nonce: 'n-1',
    cssContent: 'body{color:red;}',
    layoutMode: 'horizontal',
    navItems: [
      {
        id: 'r1',
        label: {
          idPart: '0001',
          shinryouYm: 'R6.1',
          nyuugaiLabel: '外来',
          patientId: 'P-1',
          patientName: 'n',
        },
      },
    ],
    receiptSectionsHtml: ['<div class="receipt-section" id="r1"></div>'],
  });

  assert.ok(html.includes("script-src 'nonce-n-1'"));
  assert.ok(html.includes('<body class="layout-horizontal">'));
});

test('renderDataViewErrorHtml escapes stderr payload', () => {
  const html = renderDataViewErrorHtml({
    message: '失敗',
    stderr: '<img src=x onerror=alert(1)>',
  });

  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.equal(html.includes('<img src=x onerror=alert(1)>'), false);
});
