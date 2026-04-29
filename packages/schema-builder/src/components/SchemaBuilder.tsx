import { forwardRef, useImperativeHandle, useRef } from 'react';
import {
  useSchemaController,
  type UseSchemaControllerOptions,
} from '../hooks/useSchemaController.js';
import type { LooseSupabaseClient } from '../service.js';
import type { AppScope, TenantEntity } from '../types.js';
import {
  CommandPalette,
  type CommandPaletteNavTarget,
} from './CommandPalette.js';
import {
  SchemaCanvas,
  type SchemaCanvasHandle,
} from './SchemaCanvas.js';

export interface SchemaBuilderProps {
  supabase: LooseSupabaseClient;
  tenantId: string | null;
  appScope?: AppScope;
  /** Targets for the `Go to <page-path>` Cmd+K command. */
  navigationTargets?: CommandPaletteNavTarget[];
  /** Called by Cmd+K palette when a nav target is picked. */
  onNavigate?: (path: string) => void;
  /** Called on mutation / validation errors. */
  onError?: UseSchemaControllerOptions['onError'];
  /** Called on successful mutation. */
  onSuccess?: UseSchemaControllerOptions['onSuccess'];
  /** Disable Cmd+K palette. Default: enabled. */
  disableCommandPalette?: boolean;
  /** Disable Supabase Realtime subscription. Default: enabled. */
  disableRealtime?: boolean;
}

/**
 * Imperative handle exposed by `<SchemaBuilder ref={...} />`. Consumer thin
 * wrappers use this to trigger actions from their own app-chrome (e.g. a
 * "+ New Entity" button in the page header that opens the create panel).
 */
export interface SchemaBuilderHandle {
  /** Open the properties panel in create mode. */
  openCreateEntity: () => void;
  /** Pan+zoom the canvas to a specific entity. */
  focusEntity: (entityId: string) => void;
}

/**
 * Canonical Schema Builder surface. Consumer thin wrappers render this
 * component and provide the Supabase client + tenantId + navigation targets.
 */
export const SchemaBuilder = forwardRef<SchemaBuilderHandle, SchemaBuilderProps>(
  function SchemaBuilder(
    {
      supabase,
      tenantId,
      appScope = 'all',
      navigationTargets = [],
      onNavigate,
      onError,
      onSuccess,
      disableCommandPalette = false,
      disableRealtime = false,
    },
    ref,
  ) {
    const canvasRef = useRef<SchemaCanvasHandle | null>(null);

    const controller = useSchemaController({
      supabase,
      tenantId,
      appScope,
      onError,
      onSuccess,
      realtime: !disableRealtime,
    });

    useImperativeHandle(ref, () => ({
      openCreateEntity: () => canvasRef.current?.openCreateEntity(),
      focusEntity: (entityId) => canvasRef.current?.focusEntity(entityId),
    }));

    const handleSelectEntity = (entity: TenantEntity) => {
      canvasRef.current?.focusEntity(entity.id);
    };

    return (
      <div className="relative h-full w-full">
        <SchemaCanvas
          ref={canvasRef}
          controller={controller}
          tenantId={tenantId}
          appScope={appScope}
          onError={onError}
        />
        {disableCommandPalette ? null : (
          <CommandPalette
            entities={controller.entities}
            navigationTargets={navigationTargets}
            onNavigate={onNavigate}
            onSelectEntity={handleSelectEntity}
          />
        )}
      </div>
    );
  },
);
