## [1.3.2](https://github.com/yokenzan/receiptisan-vscode/compare/v1.3.1...v1.3.2) (2026-02-20)


### Bug Fixes

* correct data-view style include paths ([ea52f58](https://github.com/yokenzan/receiptisan-vscode/commit/ea52f586645634b8705993fb1243e9f420651de1))

## [1.3.1](https://github.com/yokenzan/receiptisan-vscode/compare/v1.3.0...v1.3.1) (2026-02-20)


### Bug Fixes

* remove bottom border from all last-row cells ([2f1f822](https://github.com/yokenzan/receiptisan-vscode/commit/2f1f822159b1b1ecb75ca77d3c870ee20e8527bc))

# [1.3.0](https://github.com/yokenzan/receiptisan-vscode/compare/v1.2.0...v1.3.0) (2026-02-18)


### Bug Fixes

* **ci:** run Node tests from test directory ([383b245](https://github.com/yokenzan/receiptisan-vscode/commit/383b24506482d91a35b3b513dd121fdbcb3c19b8))
* **ci:** use Node 20 compatible test file pattern ([13f5afa](https://github.com/yokenzan/receiptisan-vscode/commit/13f5afa00cc50b25e6b73fae80913d5252073a48))
* **data-view:** align receipt header and placeholder labels ([dbe72ec](https://github.com/yokenzan/receiptisan-vscode/commit/dbe72ec1fd65c7740119f8abbb43116d189782a3))
* **data-view:** refine sticky behavior and tekiyou table rendering ([3cba426](https://github.com/yokenzan/receiptisan-vscode/commit/3cba426582998f2bc2ef1746c61351b896f2c15e))


### Features

* **data-view:** refine receipt list labels and law code display ([db98c38](https://github.com/yokenzan/receiptisan-vscode/commit/db98c38f2c426aa8d8fb59022734a812de0b0ee0))
* improve Data View layout with column width constraints and calendar control ([782d28d](https://github.com/yokenzan/receiptisan-vscode/commit/782d28dc950c3c2608766180814ce2fb2256ae54))
* improve data-view toggle UI and compact santei-day display ([4e13d17](https://github.com/yokenzan/receiptisan-vscode/commit/4e13d17a0c8de5c62f466a7b8ac114cae48786ca))
* refine data-view date and badge presentation ([de4cbe3](https://github.com/yokenzan/receiptisan-vscode/commit/de4cbe3790522f83e85bc98ce04a30561f807946))
* refine data-view nav toggle and placeholder rendering ([bc90258](https://github.com/yokenzan/receiptisan-vscode/commit/bc9025858381945d3f2f56f62eada2d846518afe))

# [1.2.0](https://github.com/yokenzan/receiptisan-vscode/compare/v1.1.0...v1.2.0) (2026-02-08)


### Bug Fixes

* allow webview fonts and keep CLI stderr ([b0e4b93](https://github.com/yokenzan/receiptisan-vscode/commit/b0e4b931def74230aad71cb2b390196e61a03510))
* handle JSON.parse SyntaxError in data-view updatePanel ([8c7f1f8](https://github.com/yokenzan/receiptisan-vscode/commit/8c7f1f8af6562a87f83d5d745100e38e8c87ec90))


### Features

* add Content Security Policy to webview HTML outputs ([a5946ab](https://github.com/yokenzan/receiptisan-vscode/commit/a5946ab5ae159529ca5183495481b34de4e5ca17))

# [1.1.0](https://github.com/yokenzan/receiptisan-vscode/compare/v1.0.0...v1.1.0) (2026-02-08)


### Bug Fixes

* handle null fields in data view to prevent replace error ([262ce20](https://github.com/yokenzan/receiptisan-vscode/commit/262ce20a8a2695f7aa2602e61a206a4f787eef6a))


### Features

* 2-column receipt header layout and calendar day count fix ([909882d](https://github.com/yokenzan/receiptisan-vscode/commit/909882da8bc47ed6dc92704ab8274d9b2c00c64b))
* add structured data view with receipt navigation ([b1dc8cf](https://github.com/yokenzan/receiptisan-vscode/commit/b1dc8cffec53aa0fb0a2b50fb071943ef75c59d8))
* add vertical/horizontal layout commands and daily kaisuu calendar grid ([43f5cec](https://github.com/yokenzan/receiptisan-vscode/commit/43f5cec954dca422476ebfc74779e3e61a887cbe))
* improve data view with vertical nav, sticky headers, and richer display ([4b8e31d](https://github.com/yokenzan/receiptisan-vscode/commit/4b8e31d1e28575f013fa0cb01a0bff0848a39a5c))
* inline nyuuin info in receipt header and fix comment duplication ([95bb2a1](https://github.com/yokenzan/receiptisan-vscode/commit/95bb2a1bd56ba2605e29f0a8bf3961af01289a0f))
* redesign data view with light theme, richer display, and tighter layout ([16817e6](https://github.com/yokenzan/receiptisan-vscode/commit/16817e63c862b30a5cf3cdf0bb6562fb65796587))
* revamp data view layout and fix display issues ([8d71f04](https://github.com/yokenzan/receiptisan-vscode/commit/8d71f040488f9d180564922e1db75ce6f282d5a2))

# 1.0.0 (2026-02-07)


### Bug Fixes

* add cwd configuration for bundle exec support ([58c90f3](https://github.com/yokenzan/receiptisan-vscode/commit/58c90f3898ccb888613da016070661cafd8bf238))
* **ci:** use Node.js 22 for release job ([88006b7](https://github.com/yokenzan/receiptisan-vscode/commit/88006b71fc81038c7dcd925298fc301512ef4b48))
* correct repository URL in package.json ([1d1cda0](https://github.com/yokenzan/receiptisan-vscode/commit/1d1cda0fa4f5353635e1454f48ab9ce8bd585102))
* escape file paths with special characters for shell execution ([c5841c8](https://github.com/yokenzan/receiptisan-vscode/commit/c5841c8a6132334e61d73be6e26e736a6088f288))


### Features

* add receiptisan.command configuration ([cf3037d](https://github.com/yokenzan/receiptisan-vscode/commit/cf3037d9e37d1dc2d98e8082af2ea7850a16f662))
* add UKE language registration and preview command ([f343f23](https://github.com/yokenzan/receiptisan-vscode/commit/f343f23005da401939491282bf375687c30698d1))
* add zoom controls to preview and default Shift_JIS encoding for UKE files ([aad6edc](https://github.com/yokenzan/receiptisan-vscode/commit/aad6edc31ea2189d9405145f3928adcd68c250ed))
* fit preview width to tab and auto-resize with ResizeObserver ([b9014b2](https://github.com/yokenzan/receiptisan-vscode/commit/b9014b261047807b7c69b8cb9deefaee30f95ccf))
* implement CLI execution with progress and cancellation ([67d175d](https://github.com/yokenzan/receiptisan-vscode/commit/67d175d8795bb56e553f84e3dedd1ad9dae46439))
* implement Webview SVG preview ([beb9947](https://github.com/yokenzan/receiptisan-vscode/commit/beb9947e373215c9e726d8aa37805f78308b3fc1))
* reuse single preview tab instead of opening new tabs ([1b8ed90](https://github.com/yokenzan/receiptisan-vscode/commit/1b8ed9040854e71f5e867446484d7478817654ab))

# Changelog

All notable changes to this project will be documented in this file.

This changelog is automatically generated by [semantic-release](https://github.com/semantic-release/semantic-release).
