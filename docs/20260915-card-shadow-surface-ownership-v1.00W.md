# Card shadow surface ownership

A saved elevation applied an inline box-shadow to every PageGridLayout surface, including layout-only headers and wrappers around a consumer-owned Card. Once the runtime token is present, that paints a second shadow outside the card. The shared grid now paints its override only when it owns chrome. Layout-only wrappers still pass `--card-shadow` to their contained card.

The real mounted-grid regression fails for chrome-off before and passes after. The chrome-on control prevents disabling all shadows. All 317 package tests (26 files), build and typecheck pass. Existing committed-editor-event changes from PR3271 remain the base; they are not independently re-approved here.

Development canary 2.7.1-next.2. Deploy only with a consumer that reads the inherited shadow token and with theme runtime depths available (theme PR3272). BSU Card already reads it; CRM/Conduit and the other consumers need their own verified adoption. Padding behavior is unchanged and its lost-save defect remains open. No package merge, production release or complete D8 approval is claimed.
