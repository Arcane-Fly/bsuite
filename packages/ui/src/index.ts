export { DotPattern, type DotPatternProps } from './dot-pattern.js'
export { HeroGrid, type HeroGridProps } from './hero-grid.js'
export { AppShell, type AppShellProps } from './app-shell.js'
export { cn } from './utils.js'
export {
  Logo,
  resolveLogoUrl,
  type LogoProps,
  type LogoSlot,
  type LogoColorScheme,
  type LogoBranding,
  type ResolvedLogo,
  type AppSlug,
} from './Logo.js'
export { D2CDefaultLogo, type D2CDefaultLogoProps } from './default-logo.js'
export {
  Button,
  type ButtonProps,
  type ButtonSize,
  type ButtonVariant,
} from './button.js'
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  type DialogContentProps,
  type DialogOverlayProps,
} from './dialog.js'
export { EmptyState, type EmptyStateProps } from './empty-state.js'
export {
  DataUnavailable,
  resolveDataState,
  describeError,
  type DataUnavailableProps,
  type DataUnavailableState,
  type QueryLike,
} from './data-unavailable.js'
export { ErrorBoundary, type ErrorBoundaryProps } from './error-boundary.js'
export { LoadingSpinner, type LoadingSpinnerProps } from './loading-spinner.js'
export { StatusBadge, type StatusBadgeProps, type StatusBadgeTone } from './status-badge.js'
export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from './command.js'
export { Popover, PopoverTrigger, PopoverContent } from './popover.js'
export {
  EntitySelector,
  type EntitySelectorProps,
  type EntitySelectorQuery,
  type EntitySelectorLogger,
  type EntitySelectorSupabaseClient,
} from './entity-selector.js'

// Branding components (v0.3.0+)
export {
  BrandingCard,
  ColorEditorSheet,
  OklchColorPicker,
  type BrandingCardProps,
  type ColorEditorSheetProps,
  type OklchColorPickerProps,
} from './branding/index.js'
export { sanitizeCustomCss } from './branding/sanitizeCustomCss.js'
