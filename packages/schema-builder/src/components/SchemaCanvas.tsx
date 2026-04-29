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
import { AlertTriangle, Workflow } from 'lucide-react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { SchemaController } from '../hooks/useSchemaController.js';
import type {
  AppScope,
  RelationType,
  TenantEntity,
} from '../types.js';
import { computeDagreLayout } from '../utils/autoLayout.js';
import { exportCanvasToPng } from '../utils/exportPng.js';
import { EntityNode, type EntityNodeData } from './EntityNode.js';
import { EntityPropertiesPanel } from './EntityPropertiesPanel.js';
import { FieldCreateDialog } from './FieldCreateDialog.js';
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
        ? 'var(--accent-secondary, #a855f7)'
        : 'var(--accent-primary, #3b82f6)',
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
    const [selectedEntity, setSelectedEntity] = useState<TenantEntity | null>(
      null,
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [fieldDialogEntityId, setFieldDialogEntityId] = useState<
      string | null
    >(null);
    const pendingConnection = useRef<Connection | null>(null);
    const flowRef = useRef<ReactFlowInstance<
      Node<EntityNodeData>,
      Edge
    > | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);

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

      const builtNodes: Node<EntityNodeData>[] = controller.entities.map(
        (entity, i) => {
          const meta = entity.metadata as Record<string, unknown> | null;
          const position =
            (meta?.position as { x: number; y: number } | undefined) ?? {
              x: 100 + (i % 4) * 280,
              y: 100 + Math.floor(i / 4) * 180,
            };
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
    }, [controller.entities, controller.relations, controller.fields]);

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
          const entity = node.data.entity as TenantEntity;
          if (entity.is_system) continue;
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
    const handleTidyUp = useCallback(() => {
      if (localNodes.length === 0) return;
      const laidOut = computeDagreLayout(localNodes, localEdges);
      setLocalNodes(laidOut);
      const persist = laidOut.map((node) => {
        const entity = (node.data as EntityNodeData | undefined)?.entity;
        if (!entity || entity.is_system) return Promise.resolve();
        return controller
          .updateEntityPosition(node.id, node.position)
          .catch(() => {});
      });
      Promise.all(persist).finally(() => {
        requestAnimationFrame(() => {
          flowRef.current?.fitView({ duration: 400, padding: 0.1 });
        });
      });
    }, [localNodes, localEdges, controller]);

    const handleFitView = useCallback(() => {
      flowRef.current?.fitView({ duration: 400, padding: 0.1 });
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
      if (entity.is_system) {
        onError?.('Cannot add fields to a system entity');
        return;
      }
      setFieldDialogEntityId(targetEntityId);
    }, [controller.entities, pickTargetEntityId, onError]);

    // Cmd+K "Add Field" dispatches this event; the canvas owns the UI flow.
    useEffect(() => {
      const handler = () => addFieldToSelectedEntity();
      window.addEventListener('bsuite-add-field', handler);
      return () => window.removeEventListener('bsuite-add-field', handler);
    }, [addFieldToSelectedEntity]);

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

    const canvasContent = controller.isLoading ? (
      <div className="flex h-full w-full items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <span className="text-sm text-neutral-500">Loading schema...</span>
      </div>
    ) : controller.loadError ? (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-3 bg-neutral-50 dark:bg-neutral-950"
        role="alert"
      >
        <AlertTriangle className="h-10 w-10 text-red-500" />
        <p className="text-sm font-medium text-red-600 dark:text-red-400">
          Failed to load schema
        </p>
        <p className="max-w-sm px-4 text-center text-xs text-neutral-500">
          {controller.loadError.message}
        </p>
      </div>
    ) : localNodes.length === 0 ? (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-3 bg-neutral-50 dark:bg-neutral-950"
        role="status"
      >
        <Workflow className="h-10 w-10 text-neutral-400" />
        <p className="text-sm font-medium text-neutral-600">No entities yet</p>
        <p className="max-w-sm px-4 text-center text-xs text-neutral-500">
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
        onNodeDoubleClick={onNodeDoubleClick}
        onInit={(inst) => {
          flowRef.current = inst;
        }}
        fitView
        aria-label="Entity relationship diagram"
      >
        <Background gap={16} />
        <Controls />
        <MiniMap />
      </ReactFlow>
    );

    return (
      <div className="flex h-full w-full">
        <div ref={wrapperRef} className="relative h-full flex-1">
          {canvasContent}
          {showToolbar ? (
            <SchemaToolbar
              onTidyUp={handleTidyUp}
              onFitView={handleFitView}
              onSearchChange={setSearchQuery}
              searchQuery={searchQuery}
              onExportPng={handleExportPng}
            />
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
              onConfirm={(payload) => {
                controller
                  .createField({
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
                  })
                  .catch(() => {});
                setFieldDialogEntityId(null);
              }}
            />
          );
        })()}
      </div>
    );
  },
);
