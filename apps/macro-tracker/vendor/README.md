The browser barcode decoder is bundled from @zxing/browser 0.1.5 and its
@zxing/library dependency during the test/build workflow. The bundle and both
license files are copied here by scripts/prepare_macro_vendor.mjs and published
with the app, so scanning does not load a third-party script at runtime.
