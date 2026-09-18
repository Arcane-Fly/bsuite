export { PageGridLayout, PAGE_GRID_SAVE_EVENT } from './PageGridLayout.js';
export { CardPaddingBoundary, useCardPadding } from './cardPadding.js';
export type { PageGridSaveEventDetail } from './PageGridLayout.js';
export { PageEditorLauncher } from './PageEditorLauncher.js';
export { CanvasCard } from './CanvasCard.js';
/*
 * CustomPageView is DELIBERATELY NOT EXPORTED YET.
 *
 * check-exported-not-mounted refused it, and it was right: "1 component is
 * EXPORTED by an adopted package and rendered NOWHERE ... Mount it, or stop
 * exporting it. There is no third state." A sibling (CanvasCard) is already
 * mounted from this package, so it is not the "not adopted yet" case.
 *
 * It cannot be mounted today. business-suite-unified and braden consume
 * @bsuite/page-builder from npm at ^2.5.0; the component is in 2.6.0, which is
 * UNPUBLISHED because publish-page-builder.yml fires on push to `main` and that
 * promotion is held. The submodules cannot take a workspace link — they deploy
 * standalone and Vercel clones only their own repo.
 *
 * So the export line goes into the SAME pull request that adds the mounts and
 * deletes the two JSON-dump renderers, which is the atomic shape ADR-0011 asks
 * for anyway. Until then the component is internal, fully tested groundwork and
 * not a public API nobody uses.
 *
 * To re-export, restore:
 *   export { CustomPageView, renderStructuredLayout, layoutIsEmpty, flattenSections } from './CustomPageView.js';
 *   export type { CustomPageLike, CustomPageViewProps, StoredLayout, StoredLayoutSection } from './CustomPageView.js';
 */
export type { CanvasCardProps } from './CanvasCard.js';
export { DraggableCardPage } from './DraggableCardPage.js';
export type { DraggableCardPageProps } from './DraggableCardPage.js';
export {
  buildCanvasCardLayout,
  DEFAULT_CANVAS_CARD_WIDTH,
  flattenCanvasCards,
  isCanvasCardElement,
  describeNode,
  clampColumns,
  CANVAS_GRID_COLUMNS,
} from './canvasCardLayout.js';
export type { CanvasCardLayoutResult } from './canvasCardLayout.js';
export type { WidgetConfig, PageEditorLauncherProps } from './PageEditorLauncher.js';
export {
  usePageGridLayout,
  migrateSavedLayout,
  DEFAULT_EDITOR_EVENT_NAMES,
  PACKAGE_LAYOUT_EPOCH,
  PAGE_GRID_EDITING_EVENT,
} from './usePageGridLayout.js';
export type { PageGridEditingEventDetail } from './usePageGridLayout.js';
export { adoptUnchangedDefaults } from './layoutMigrations.js';
export type { PreviousItemDefault } from './layoutMigrations.js';
export { rescaleLayout } from './rescaleLayout.js';
export { computeAutoHeightRows } from './autoHeight.js';
export type { ComputeAutoHeightRowsOptions } from './autoHeight.js';
export {
  WYSIWYG_REQUIRED_PRIMITIVES,
  WYSIWYG_SURFACE_CONTRACTS,
  assertWysiwygPrimitiveCoverage,
  getWysiwygSurfaceContract,
} from './wysiwygContract.js';
export type {
  WysiwygPrimitive,
  WysiwygSurfaceContract,
  WysiwygSurfaceId,
} from './wysiwygContract.js';
export {
  buildResponsiveLayouts,
  RESPONSIVE_BREAKPOINTS,
} from './buildResponsiveLayouts.js';
export type {
  BuildResponsiveLayoutsOptions,
  ResponsiveBreakpoint,
} from './buildResponsiveLayouts.js';
export { useLocalPreference, defaultPreferenceAdapter } from './preferences.js';
export { RelationshipField } from './RelationshipField.js';
export type { RelationshipFieldProps } from './RelationshipField.js';
export { isRelationshipWritable } from './relationshipCatalog.js';
export type {
  EntityWidgetDetail,
  EntityWidgetFactoryOptions,
  GridLayoutItem,
  GridLayouts,
  PageGridLayoutProps,
  PageGridPreferenceAdapter,
  PageGridPreferenceFactory,
  RelationshipCatalog,
  RelationshipCatalogEntry,
  RelationshipFieldOption,
  RelationshipWidgetDetail,
  RelationshipWidgetFactoryOptions,
  LayoutMigration,
  UsePageGridLayoutOptions,
  UsePageGridLayoutResult,
  WidgetMeta,
} from './types.js';
export {
  BORDER_TONES,
  BORDER_STYLES,
  DEFAULT_CARD_STYLE,
  RADIUS_RANGE,
  BORDER_WIDTH_RANGE,
  PADDING_RANGE,
  normaliseCardStyle,
  isDefaultCardStyle,
  toCssVars as cardStyleToCssVars,
  describeCardStyle,
} from './cardStyle.js';
export type { CardStyle, BorderTone, BorderStyle, Elevation } from './cardStyle.js';

/*
 * ELEMENT IDENTITY. Exported so a consumer can address one control inside a
 * card — the prerequisite for storing any per-element property, and the reason
 * none has ever been storable: a card has a key, the button inside it had
 * nothing. No styling here, only the name.
 */
export {
  ElementScopeProvider,
  useElementScope,
  elementRef,
  describeElement,
  parseElementRef,
} from './elementScope.js';
export type { ElementScope } from './elementScope.js';
