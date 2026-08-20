import type {
  Connection,
  Edge,
  EdgeChange,
  EdgeRemoveChange,
  Node,
  NodeChange,
  NodePositionChange,
  NodeRemoveChange,
  ReactFlowInstance,
} from '@xyflow/react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AlertTriangle, Info, Link2, MousePointer2, Workflow, X } from 'lucide-react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useDismissOnOutsideOrEscape } from '../hooks/useDismissOnOutsideOrEscape.js';
import type { SchemaController } from '../hooks/useSchemaController.js';
import type { RenamePhysicalColumnResult } from '../service.js';
import type {
  AppScope,
  RelationType,
  TenantEntity,
} from '../types.js';
import { computeDagreLayout } from '../utils/autoLayout.js';
import {
  computeDefaultGridPositions,
  computeGridLayout,
  isDisconnectedGraph,
} from '../utils/gridLayout.js';
import { exportCanvasToPng } from '../utils/exportPng.js';
import { EntityNode, type EntityNodeData } from './EntityNode.js';
import { EntityPropertiesPanel } from './EntityPropertiesPanel.js';
import { FieldCreateDialog } from './FieldCreateDialog.js';
import { FieldEditDialog } from './FieldEditDialog.js';
import { RelationshipConfigDialog } from './RelationshipConfigDialog.js';
import { SchemaToolbar } from './SchemaToolbar.js';
import { SmartEdge, type SmartEdgeData } from './edges/SmartEdge.js';

const RELATION_LABELS: Record<RelationType, string> = {
  one_to_one: '1:1',
  one_to_many: '1:N',
  many_to_many: 'N:N',
  inherits_from: '\u2B06 inherits',
};

const nodeTypes = { entity: EntityNode };
const edgeTypes = { smart: SmartEdge };

/**
 * Pattern: `${entityId}.${fieldId|'entity'}.${side}-${kind}`.
 * Valid sides: left|right|top|bottom. Valid kinds: source|target.
 * The literal `entity` as the fieldId component indicates an entity-level
 * fallback handle; field-level relations are only created when fieldId is not
 * that literal.
 */
const HANDLE_ID_RE =
  /^(?<entityId>.+)\.(?<fieldId>[^.]+)\.(?<side>left|right|top|bottom)-(?<kind>source|target)$/;

function parseHandleId(handleId: string | null | undefined): {
  entityId?: string;
  fieldId?: string;
} {
  if (!handleId) return {};
  const match = handleId.match(HANDLE_ID_RE);
  if (!match?.groups) return {};
  const { entityId, fieldId } = match.groups;
  return {
    entityId,
    fieldId: fieldId === 'entity' ? undefined : fieldId,
  };
}

function stylesForRelation(type: RelationType) {
  return {
    stroke:
      type === 'inherits_from'
        ? 'var(--role-secondary)'
        : 'var(--role-primary)',
    strokeWidth: 2,
  };
}

export interface SchemaCanvasProps {
  controller: SchemaController;
  tenantId: string | null;
  appScope: AppScope;
  /** Error sink (defaults to console.error). */
  onError?: (message: string, err?: unknown) => void;
}

export interface SchemaCanvasHandle {
  /** Pan+zoom the viewport to the entity with this id. */
  focusEntity: (entityId: string) => void;
  /** Open the entity properties panel in create mode. */
  openCreateEntity: () => void;
  /** Auto-arrange nodes via dagre (§3.6 item 3). */
  tidyUp: () => void;
  /** Export the current canvas as PNG (§3.6 item 8). */
  exportPng: () => Promise<void>;
  /** Prompt and add a new field to the currently-selected entity. */
  addFieldToSelectedEntity: () => void;
}

export const SchemaCanvas = forwardRef<SchemaCanvasHandle, SchemaCanvasProps>(
  function SchemaCanvas(
    { controller, tenantId, appScope, onError },
    ref,
  ) {
    const [isRelationDialogOpen, setIsRelationDialogOpen] = useState(false);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    // Quick-start tip (conduit#… "obscures the page header" report): a
    // transient hint over the canvas, not page chrome, so it must be
    // dismissible by outside click, Escape, AND an explicit close button —
    // see useDismissOnOutsideOrEscape.
    const [quickStartVisible, setQuickStartVisible] = useState(true);
    const quickStartRef = useRef<HTMLDivElement>(null);
    const [selectedEntity, setSelectedEntity] = useState<TenantEntity | null>(
      null,
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [fieldDialogEntityId, setFieldDialogEntityId] = useState<
      string | null
    >(null);
    // Phase 2: double-click a field row to open the edit dialog. The
    // context holds the entity + field ids so we can look up the live
    // TenantFieldDefinition every render — avoids stale closure issues if
    // the field is updated by another tab via Realtime while the dialog
    // is open.
    const [fieldEditContext, setFieldEditContext] = useState<{
      entityId: string;
      fieldId: string;
    } | null>(null);
    // Phase 3A accessibility: announce successful reorders via a polite
    // aria-live region. `announcementKey` forces React to swap the text node
    // so screen readers re-announce even identical repeat moves.
    const [announcement, setAnnouncement] = useState<string>('');
    const [announcementKey, setAnnouncementKey] = useState<number>(0);
    const pendingConnection = useRef<Connection | null>(null);
    const flowRef = useRef<ReactFlowInstance<
      Node<EntityNodeData>,
      Edge
    > | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    useDismissOnOutsideOrEscape(quickStartRef, quickStartVisible, () =>
      setQuickStartVisible(false),
    );

    const focusEntityById = useCallback((entityId: string) => {
      const flow = flowRef.current;
      if (!flow) return;
      const node = flow.getNode(entityId);
      if (!node) return;
      flow.setCenter(
        node.position.x + (node.width ?? 200) / 2,
        node.position.y + (node.height ?? 120) / 2,
        { zoom: 1.2, duration: 400 },
      );
    }, []);

    // Derive nodes+edges deterministically from controller state so Realtime
    // invalidations propagate on each render instead of stale local state.
    const { nodes, edges } = useMemo(() => {
      const entityById = new Map(
        controller.entities.map((e) => [e.id, e] as const),
      );

      // Computed once for the whole set: each row's pitch depends on the tallest
      // card IN THAT ROW, which cannot be derived from a single card in a .map().
      const defaultGrid = computeDefaultGridPositions(
        controller.entities.map((e) => ({
          id: e.id,
          fieldCount: (controller.fields[e.id] ?? []).length,
        })),
      );

      const builtNodes: Node<EntityNodeData>[] = controller.entities.map(
        (entity) => {
          // Position precedence:
          //   1. the tenant_schema_layout overlay (the only writable source)
          //   2. entity.metadata.position — legacy, and readable but no longer
          //      written; kept so a tenant that HAD a saved arrangement before
          //      the overlay existed does not have its diagram reset
          //   3. a computed grid
          //
          // The computed grid comes from computeDefaultGridPositions, which
          // sizes each row from its TALLEST card. The previous inline version
          // derived the pitch from the current card's own field count, which
          // staggered cards within a row and let one wide-schema entity cover
          // the cards beneath it — on a 44-entity canvas that left 5 drag
          // handles physically unclickable.
          const meta = entity.metadata as Record<string, unknown> | null;
          const overlayPos = controller.layout.get(entity.id);
          const position =
            overlayPos ??
            (meta?.position as { x: number; y: number } | undefined) ??
            defaultGrid.get(entity.id) ?? { x: 100, y: 100 };
          const defs = controller.fields[entity.id] ?? [];
          const fields = defs.map((f) => ({
            id: f.id,
            name: f.field_name,
            type: f.field_type,
            isPrimary: f.field_name === 'id',
            isNullable: !f.is_required,
          }));
          return {
            id: entity.id,
            type: 'entity',
            position,
            dragHandle: '.schema-node-drag-handle',
            data: {
              label: entity.label,
              entity,
              fields,
            },
          } as Node<EntityNodeData>;
        },
      );

      const builtEdges: Edge<SmartEdgeData>[] = controller.relations
        .filter(
          (r) =>
            entityById.has(r.source_entity_id) &&
            entityById.has(r.target_entity_id),
        )
        .map((rel) => {
          const styling = stylesForRelation(rel.relation_type);
          const baseSource = rel.source_field_id
            ? `${rel.source_entity_id}.${rel.source_field_id}.right-source`
            : `${rel.source_entity_id}.entity.bottom-source`;
          const baseTarget = rel.target_field_id
            ? `${rel.target_entity_id}.${rel.target_field_id}.left-target`
            : `${rel.target_entity_id}.entity.top-target`;
          return {
            id: rel.id,
            source: rel.source_entity_id,
            target: rel.target_entity_id,
            sourceHandle: baseSource,
            targetHandle: baseTarget,
            label:
              rel.source_label ||
              RELATION_LABELS[rel.relation_type] ||
              rel.relation_type,
            type: 'smart',
            animated: rel.relation_type === 'inherits_from',
            style: styling,
            data: {
              cardinality: rel.relation_type,
              onDelete: rel.on_delete,
              stroke: styling.stroke,
            },
          };
        });

      return { nodes: builtNodes, edges: builtEdges };
      // controller.layout MUST be here: without it the memo keeps the positions
      // from first render and a saved arrangement never appears until something
      // else invalidates — which reads exactly like "the save did not work".
    }, [
      controller.entities,
      controller.relations,
      controller.fields,
      controller.layout,
    ]);

    // Local visual overlay for pending edits — React Flow needs mutable state
    // to animate drag and edit operations smoothly before controller confirms.
    const [localNodes, setLocalNodes] = useState<Node<EntityNodeData>[]>(nodes);
    const [localEdges, setLocalEdges] = useState<Edge[]>(edges);

    useEffect(() => {
      setLocalNodes(nodes);
    }, [nodes]);
    useEffect(() => {
      setLocalEdges(edges);
    }, [edges]);

    // Inline rename from EntityNode (§3.6 item 7). CustomEvent-based to avoid
    // prop drilling; SchemaCanvas is the only listener per mount.
    useEffect(() => {
      const handler = (e: Event) => {
        const ce = e as CustomEvent<{ entityId: string; newLabel: string }>;
        if (!ce.detail?.entityId || !ce.detail.newLabel) return;
        controller
          .updateEntity(ce.detail.entityId, { label: ce.detail.newLabel })
          .catch(() => {});
      };
      window.addEventListener('bsuite-rename-entity', handler);
      return () =>
        window.removeEventListener('bsuite-rename-entity', handler);
    }, [controller]);

    // Search input → focus first matching entity (debounced 200ms). §3.6 item 6.
    useEffect(() => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return;
      const t = setTimeout(() => {
        const match = controller.entities.find(
          (e) =>
            e.label.toLowerCase().includes(q) ||
            e.name.toLowerCase().includes(q),
        );
        if (match) focusEntityById(match.id);
      }, 200);
      return () => clearTimeout(t);
    }, [searchQuery, controller.entities, focusEntityById]);

    const onConnect = useCallback(
      (params: Connection) => {
        if (!params.source || !params.target) return;
        if (params.source === params.target) {
          onError?.('Cannot create a relationship from an entity to itself');
          return;
        }
        pendingConnection.current = params;
        setIsRelationDialogOpen(true);
      },
      [onError],
    );

    const handleRelationConfirm = useCallback(
      async (config: {
        relation_type: RelationType;
        source_label: string | null;
        target_label: string | null;
      }) => {
        const params = pendingConnection.current;
        if (!params || !params.source || !params.target) return;
        setIsRelationDialogOpen(false);

        const { fieldId: sourceFieldId } = parseHandleId(params.sourceHandle);
        const { fieldId: targetFieldId } = parseHandleId(params.targetHandle);

        try {
          const newRelation = await controller.createRelation({
            id: crypto.randomUUID(),
            tenant_id: tenantId,
            source_entity_id: params.source,
            target_entity_id: params.target,
            source_field_id: sourceFieldId ?? null,
            target_field_id: targetFieldId ?? null,
            relation_type: config.relation_type,
            source_label: config.source_label,
            target_label: config.target_label,
            on_delete: 'SET NULL',
            on_update: 'CASCADE',
            is_system: false,
            app_scope: appScope,
            metadata: {},
          });

          const styling = stylesForRelation(newRelation.relation_type);
          setLocalEdges((eds) =>
            addEdge(
              {
                ...params,
                id: newRelation.id,
                type: 'smart',
                label:
                  config.source_label ||
                  RELATION_LABELS[newRelation.relation_type] ||
                  newRelation.relation_type,
                animated: newRelation.relation_type === 'inherits_from',
                style: styling,
                data: {
                  cardinality: newRelation.relation_type,
                  onDelete: newRelation.on_delete,
                  stroke: styling.stroke,
                },
              } as Edge<SmartEdgeData>,
              eds,
            ),
          );
        } finally {
          pendingConnection.current = null;
        }
      },
      [controller, tenantId, appScope],
    );

    const onEdgesChange = useCallback(
      async (changes: EdgeChange<Edge>[]) => {
        setLocalEdges((eds) => applyEdgeChanges(changes, eds));
        const deletions = changes.filter(
          (c): c is EdgeRemoveChange => c.type === 'remove',
        );
        for (const deletion of deletions) {
          await controller.deleteRelation(deletion.id).catch(() => {});
        }
      },
      [controller],
    );

    const onNodesChange = useCallback(
      async (changes: NodeChange<Node<EntityNodeData>>[]) => {
        const removals = changes.filter(
          (c): c is NodeRemoveChange => c.type === 'remove',
        );
        const removedNodes = removals
          .map((r) => localNodes.find((n) => n.id === r.id))
          .filter((n): n is Node<EntityNodeData> => !!n);

        setLocalNodes((nds) => applyNodeChanges(changes, nds));

        for (const node of removedNodes) {
          const entity = node.data.entity;
          if (entity.is_system) {
            onError?.('System entities cannot be deleted');
            continue;
          }
          await controller.deleteEntity(node.id).catch(() => {});
        }

        const positionChanges = changes.filter(
          (c): c is NodePositionChange =>
            c.type === 'position' && !c.dragging,
        );
        for (const pc of positionChanges) {
          if (!pc.position) continue;
          const node = localNodes.find((n) => n.id === pc.id);
          if (!node) continue;
          // NO is_system SKIP.
          //
          // This guard used to `continue` on every is_system entity, and all 44
          // entities in the product are is_system — so the save was never even
          // attempted for the ones the operator was dragging. It was a
          // reasonable guard when positions lived on tenant_entities (those rows
          // are unwritable, so calling would only have produced a denial), but
          // it means the RLS denial was never the proximate cause: the client
          // short-circuited first, which is why nothing appeared in any log.
          //
          // Positions now live in the per-tenant tenant_schema_layout overlay,
          // where a platform entity is exactly the case we DO want to persist.
          // Leaving the skip here would have been a correct fix to code that
          // never runs.
          await controller
            .updateEntityPosition(pc.id, pc.position)
            .catch(() => {});
        }
      },
      [controller, localNodes, onError],
    );

    const onNodeDoubleClick = useCallback(
      (_: React.MouseEvent, node: Node<EntityNodeData>) => {
        const entity = node.data.entity;
        if (!entity) return;
        setSelectedEntity(entity);
        setIsPanelOpen(true);
      },
      [],
    );

    const onNodeClick = useCallback(
      (_: React.MouseEvent, node: Node<EntityNodeData>) => {
        const entity = node.data.entity;
        if (!entity) return;
        setSelectedEntity(entity);
        setIsPanelOpen(true);
      },
      [],
    );

    const handleSaveEntity = useCallback(
      async (updates: Partial<TenantEntity>) => {
        try {
          if (selectedEntity) {
            await controller.updateEntity(selectedEntity.id, updates);
          } else {
            await controller.createEntity({
              tenant_id: tenantId,
              name: updates.name ?? '',
              label: updates.label ?? '',
              description: updates.description ?? null,
              icon: updates.icon ?? null,
              app_scope: updates.app_scope ?? appScope,
              is_system: false,
              metadata: { position: { x: 100, y: 100 } },
            });
          }
          setIsPanelOpen(false);
          setSelectedEntity(null);
        } catch (err) {
          onError?.('Failed to save entity', err);
        }
      },
      [controller, selectedEntity, tenantId, appScope, onError],
    );

    const handleDeleteEntity = useCallback(
      async (id: string) => {
        try {
          await controller.deleteEntity(id);
          setIsPanelOpen(false);
          setSelectedEntity(null);
        } catch (err) {
          onError?.('Failed to delete entity', err);
        }
      },
      [controller, onError],
    );

    // Dagre auto-layout. §3.6 item 3.
    // Disconnected graphs (no relations — fresh tenant) column-stack under
    // dagre's network-simplex, which reads as broken ("tidy just puts cards
    // into a column" — operator 2026-07-27). Fall back to a fixed grid there.
    const handleTidyUp = useCallback(() => {
      if (localNodes.length === 0) return;
      const laidOut = isDisconnectedGraph(localNodes, localEdges)
        ? computeGridLayout(localNodes)
        : computeDagreLayout(localNodes, localEdges);
      setLocalNodes(laidOut);
      // Same removal as the drag path: is_system entities are precisely the
      // ones Tidy needs to move. Failures are counted and reported ONCE —
      // Tidy touches every node, so a per-node toast would mean 44 toasts for
      // a single click, which buries the message it is trying to deliver.
      let failed = 0;
      const persist = laidOut.map((node) => {
        const entity = (node.data as EntityNodeData | undefined)?.entity;
        if (!entity) return Promise.resolve();
        return controller.updateEntityPosition(node.id, node.position).catch(() => {
          failed += 1;
        });
      });
      Promise.all(persist).finally(() => {
        if (failed > 0) {
          onError?.(
            `Tidy could not save ${failed} of ${laidOut.length} card positions`,
          );
        }
        requestAnimationFrame(() => {
          flowRef.current?.fitView({ duration: 400, padding: 0.2, maxZoom: 1.2 });
        });
      });
    }, [localNodes, localEdges, controller]);

    const handleFitView = useCallback(() => {
      // "Fit does nothing" (operator 2026-07-27): the previous padding made the
      // re-frame visually indistinguishable from the initial fit. Wider padding
      // + maxZoom cap guarantees a visible re-frame on every press.
      flowRef.current?.fitView({ duration: 400, padding: 0.2, maxZoom: 1.2 });
    }, []);

    const handleExportPng = useCallback(async () => {
      const el = wrapperRef.current?.querySelector<HTMLElement>('.react-flow');
      if (!el) {
        onError?.('Canvas is not ready to export');
        return;
      }
      try {
        await exportCanvasToPng(el);
      } catch (err) {
        onError?.('Failed to export schema as PNG', err);
      }
    }, [onError]);

    const pickTargetEntityId = useCallback((): string | null => {
      const flow = flowRef.current;
      if (flow) {
        const selected = flow.getNodes().find((n) => n.selected);
        if (selected) return selected.id;
      }
      return controller.entities[0]?.id ?? null;
    }, [controller.entities]);

    const addFieldToSelectedEntity = useCallback(() => {
      const targetEntityId = pickTargetEntityId();
      if (!targetEntityId) {
        onError?.('Select an entity before adding a field');
        return;
      }
      const entity = controller.entities.find((e) => e.id === targetEntityId);
      if (!entity) {
        onError?.('Selected entity not found');
        return;
      }
      // NO is_system BLOCK HERE — this is the D4 behaviour, deliberately.
      //
      // A tenant may add its OWN fields to a platform entity; it may not modify
      // the platform's fields. The created row carries tenant_id = this tenant
      // and entity_id = the platform entity, which is exactly what the
      // tenant_insert_field_defs policy now permits (it validates the TARGET
      // entity as well as the new row's tenant). Blocking it client-side made
      // that capability unreachable.
      setFieldDialogEntityId(targetEntityId);
    }, [controller.entities, pickTargetEntityId, onError]);

    // Cmd+K "Add Field" dispatches this event; the canvas owns the UI flow.
    useEffect(() => {
      const handler = () => addFieldToSelectedEntity();
      window.addEventListener('bsuite-add-field', handler);
      return () => window.removeEventListener('bsuite-add-field', handler);
    }, [addFieldToSelectedEntity]);

    // Phase 3A: FieldRow dispatches `bsuite-reorder-field` when the user
    // presses Alt+ArrowUp / Alt+ArrowDown on a focused edit button. We
    // resolve the new order from controller.fields[entityId] (sorted by
    // sort_order ASC, tiebreak by created_at to match the DB ordering) and
    // call `controller.reorderFields` — which does the optimistic cache
    // update + RPC round-trip. No-op when the field is already at a
    // boundary (topmost + up, bottommost + down).
    useEffect(() => {
      const handler = (e: Event) => {
        const ce = e as CustomEvent<{
          entityId: string;
          fieldId: string;
          direction: 'up' | 'down';
        }>;
        const { entityId, fieldId, direction } = ce.detail ?? {};
        if (!entityId || !fieldId || !direction) return;
        const entity = controller.entities.find((en) => en.id === entityId);
        if (!entity) return;
        if (entity.is_system) {
          // Reordering rewrites sort_order on EVERY active field of the entity,
          // and on a platform entity most of those rows are platform-owned and
          // unwritable by a tenant — the RPC rejects partial arrays, so this
          // cannot be done for "just my fields". Kept as a block, but no longer
          // a silent return: an unexplained no-op is the defect class this whole
          // change exists to remove.
          onError?.(
            'Field order on a platform entity is managed by BSuite and is shared across all tenants',
          );
          return;
        }
        const current = (controller.fields[entityId] ?? [])
          .slice()
          .sort((a, b) => {
            const sa = a.sort_order ?? 0;
            const sb = b.sort_order ?? 0;
            if (sa !== sb) return sa - sb;
            return (a.created_at ?? '').localeCompare(b.created_at ?? '');
          });
        const idx = current.findIndex((f) => f.id === fieldId);
        if (idx === -1) return;
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= current.length) return;
        const moved = current[idx];
        const next = current.slice();
        next.splice(idx, 1);
        next.splice(targetIdx, 0, moved);
        const orderedIds = next.map((f) => f.id);
        controller
          .reorderFields(entityId, orderedIds)
          .then(() => {
            setAnnouncement(
              `Field ${moved.field_name} moved ${direction === 'up' ? 'up' : 'down'}`,
            );
            setAnnouncementKey((k) => k + 1);
          })
          .catch(() => {});
      };
      window.addEventListener('bsuite-reorder-field', handler);
      return () =>
        window.removeEventListener('bsuite-reorder-field', handler);
    }, [controller]);

    // Phase 2: FieldRow dispatches `bsuite-edit-field` on double-click.
    // We gate on entity being user-editable (not system) here too so that
    // any future caller (e.g. a keyboard shortcut) gets the same guard.
    useEffect(() => {
      const handler = (e: Event) => {
        const ce = e as CustomEvent<{ entityId: string; fieldId: string }>;
        if (!ce.detail?.entityId || !ce.detail?.fieldId) return;
        setFieldEditContext({
          entityId: ce.detail.entityId,
          fieldId: ce.detail.fieldId,
        });
      };
      window.addEventListener('bsuite-edit-field', handler);
      return () => window.removeEventListener('bsuite-edit-field', handler);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        focusEntity: focusEntityById,
        openCreateEntity: () => {
          setSelectedEntity(null);
          setIsPanelOpen(true);
        },
        tidyUp: handleTidyUp,
        exportPng: handleExportPng,
        addFieldToSelectedEntity,
      }),
      [
        focusEntityById,
        handleTidyUp,
        handleExportPng,
        addFieldToSelectedEntity,
      ],
    );

    const existingNames = useMemo(
      () =>
        controller.entities
          .map((e) => e.name?.toLowerCase())
          .filter((n): n is string => !!n),
      [controller.entities],
    );

    const sourceLabel =
      pendingConnection.current?.source
        ? (localNodes.find((n) => n.id === pendingConnection.current?.source)
            ?.data.entity.label ?? 'Source')
        : 'Source';
    const targetLabel =
      pendingConnection.current?.target
        ? (localNodes.find((n) => n.id === pendingConnection.current?.target)
            ?.data.entity.label ?? 'Target')
        : 'Target';

    const showToolbar =
      !controller.isLoading && !controller.loadError && localNodes.length > 0;
    const searchResults = useMemo(() => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return controller.entities;
      return controller.entities.filter(
        (entity) =>
          entity.label.toLowerCase().includes(q) ||
          entity.name.toLowerCase().includes(q) ||
          (entity.description ?? '').toLowerCase().includes(q),
      );
    }, [controller.entities, searchQuery]);

    const canvasContent = controller.isLoading ? (
      <div className="flex h-full w-full items-center justify-center bg-card">
        <span className="text-sm text-muted-foreground">Loading schema...</span>
      </div>
    ) : controller.loadError ? (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-3 bg-card"
        role="alert"
      >
        <AlertTriangle className="h-10 w-10 text-error-text" />
        <p className="text-sm font-medium text-error-text">
          Failed to load schema
        </p>
        <p className="max-w-sm px-4 text-center text-xs text-muted-foreground">
          {controller.loadError.message}
        </p>
      </div>
    ) : localNodes.length === 0 ? (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-3 bg-card"
        role="status"
      >
        <Workflow className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium text-text-secondary">No entities yet</p>
        <p className="max-w-sm px-4 text-center text-xs text-muted-foreground">
          Create your first entity to start building the schema.
        </p>
      </div>
    ) : (
      <ReactFlow
        nodes={localNodes}
        edges={localEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onInit={(inst) => {
          flowRef.current = inst;
        }}
        fitView
        nodeDragThreshold={8}
        aria-label="Entity relationship diagram"
      >
        <Background gap={16} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />
      </ReactFlow>
    );

    return (
      <div className="flex h-full w-full">
        {/* Phase 3A: hidden a11y announcer for keyboard reorder moves.
            Rendered outside the canvas wrapper so it's never captured by
            the PNG export. `key` swaps the text node to force re-announce. */}
        <div
          key={announcementKey}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
          data-testid="bsuite-schema-announcer"
        >
          {announcement}
        </div>
        <div
          ref={wrapperRef}
          className="relative h-full min-h-[420px] flex-1"
        >
          {/*
            min-h-[420px] above is a deliberate floor, not decoration.
            SchemaCanvas relies on `h-full` cascading from every ancestor to
            give the canvas — and this wrapper's own absolutely-positioned
            children — a real box to measure against. A consumer page that
            puts this component inside height:auto chrome (conduit's
            Schema Builder route did exactly this) collapses the whole chain
            to 0px, and an `absolute bottom-3` child of a 0-height box then
            renders flush against whatever sits directly above it — which is
            how the quick-start tip ended up on top of the page header
            instead of near the canvas. A fixed min-height doesn't
            participate in that percentage-of-auto collapse, so it holds the
            floor regardless of what the consumer's own layout does.
          */}
          {canvasContent}
          {showToolbar ? (
            <>
              <SchemaToolbar
                onTidyUp={handleTidyUp}
                onFitView={handleFitView}
                onSearchChange={setSearchQuery}
                searchQuery={searchQuery}
                resultCount={searchResults.length}
                totalCount={controller.entities.length}
                onExportPng={handleExportPng}
              />
              {quickStartVisible ? (
                <div
                  ref={quickStartRef}
                  role="note"
                  aria-label="Schema Builder quick start"
                  className="absolute bottom-3 left-3 z-10 max-w-sm rounded-lg border border-role-primary/40 bg-card/95 p-3 text-xs text-text-secondary shadow-sm backdrop-blur"
                >
                  <div className="flex items-start gap-2">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-text" aria-hidden="true" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-semibold text-foreground">Schema Builder quick start</p>
                      <p className="flex gap-1">
                        <MousePointer2 className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                        Click a card to inspect fields. Drag the header grip to move it.
                      </p>
                      <p className="flex gap-1">
                        <Link2 className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                        Drag a blue connector dot to another card to create a relationship.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuickStartVisible(false)}
                      aria-label="Dismiss quick start tips"
                      className="-mr-1 -mt-1 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        {isPanelOpen ? (
          <EntityPropertiesPanel
            entity={selectedEntity}
            existingNames={existingNames}
            onClose={() => {
              setIsPanelOpen(false);
              setSelectedEntity(null);
            }}
            onSave={handleSaveEntity}
            onDelete={handleDeleteEntity}
            isPlatformDeveloper={controller.isPlatformDeveloper}
          />
        ) : null}

        <RelationshipConfigDialog
          open={isRelationDialogOpen}
          onOpenChange={(o) => {
            setIsRelationDialogOpen(o);
            if (!o) pendingConnection.current = null;
          }}
          sourceName={sourceLabel}
          targetName={targetLabel}
          onConfirm={handleRelationConfirm}
        />

        {(() => {
          // Derive dialog context inline — only referenced here, so a useMemo
          // wrapper would be overkill for two cheap array lookups per render.
          if (!fieldDialogEntityId) return null;
          const entity = controller.entities.find(
            (e) => e.id === fieldDialogEntityId,
          );
          if (!entity) return null;
          const entityFields = controller.fields[entity.id] ?? [];
          const existingFieldNames = entityFields.map((f) =>
            f.field_name.toLowerCase(),
          );
          return (
            <FieldCreateDialog
              open={true}
              onOpenChange={(o) => {
                if (!o) setFieldDialogEntityId(null);
              }}
              entityLabel={entity.label}
              entityName={entity.name}
              existingFieldNames={existingFieldNames}
              nextSortOrder={entityFields.length}
              onConfirm={async (payload) => {
                try {
                  await controller.createField({
                    tenant_id: tenantId,
                    entity_id: entity.id,
                    entity_type: entity.name,
                    field_name: payload.field_name,
                    field_type: payload.field_type,
                    label: payload.label,
                    placeholder: payload.placeholder,
                    is_required: payload.is_required,
                    options: null,
                    sort_order: payload.sort_order,
                    is_active: true,
                    scope: null,
                    is_system: false,
                    is_locked: false,
                  });
                  setFieldDialogEntityId(null);
                } catch (err) {
                  onError?.(`Failed to create field for ${entity.label}`, err);
                  throw err;
                }
              }}
            />
          );
        })()}

        {(() => {
          // Phase 2 edit-dialog derivation. Looking up the field every
          // render (instead of stashing the whole field in state) keeps the
          // dialog in sync if `controller.fields` refreshes via Realtime or
          // a mutation-invalidate round-trip while it is open.
          if (!fieldEditContext) return null;
          const entity = controller.entities.find(
            (e) => e.id === fieldEditContext.entityId,
          );
          if (!entity) return null;
          const entityFields = controller.fields[entity.id] ?? [];
          const field = entityFields.find(
            (f) => f.id === fieldEditContext.fieldId,
          );
          if (!field) return null;
          const existingFieldNames = entityFields.map((f) =>
            f.field_name.toLowerCase(),
          );
          return (
            <FieldEditDialog
              open={true}
              onOpenChange={(o) => {
                if (!o) setFieldEditContext(null);
              }}
              entityLabel={entity.label}
              entityName={entity.name}
              field={field}
              existingFieldNames={existingFieldNames}
              onSave={async (payload) => {
                try {
                  await controller.updateField(field.id, {
                    field_name: payload.field_name,
                    field_type: payload.field_type,
                    label: payload.label,
                    placeholder: payload.placeholder,
                    is_required: payload.is_required,
                  });
                  setFieldEditContext(null);
                } catch (err) {
                  onError?.(`Failed to update field ${field.field_name}`, err);
                  throw err;
                }
              }}
              onDelete={async () => {
                try {
                  await controller.deleteField(field.id);
                  setFieldEditContext(null);
                } catch (err) {
                  onError?.(`Failed to delete field ${field.field_name}`, err);
                  throw err;
                }
              }}
              onRenamePhysical={async (newName, opts) => {
                // Phase 3B: the two-phase dry-run → wet-run flow is owned by
                // the dialog. `renameField` with `physical: true` forwards to
                // the `rename_physical_column` RPC; metadata-only renames go
                // through `updateField` via the dialog's fast path and never
                // hit this callback.
                const result = (await controller.renameField(
                  entity.id,
                  field.id,
                  newName,
                  { physical: true, dryRun: opts.dryRun },
                )) as RenamePhysicalColumnResult;
                return result;
              }}
            />
          );
        })()}
      </div>
    );
  },
);
