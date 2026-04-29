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
import { EntityNode, type EntityNodeData } from './EntityNode.js';
import { EntityPropertiesPanel } from './EntityPropertiesPanel.js';
import { RelationshipConfigDialog } from './RelationshipConfigDialog.js';

const RELATION_LABELS: Record<RelationType, string> = {
  one_to_one: '1:1',
  one_to_many: '1:N',
  many_to_many: 'N:N',
  inherits_from: '⬆ inherits',
};

const nodeTypes = { entity: EntityNode };

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
    const pendingConnection = useRef<Connection | null>(null);
    const flowRef = useRef<ReactFlowInstance<
      Node<EntityNodeData>,
      Edge
    > | null>(null);

    useImperativeHandle(ref, () => ({
      focusEntity: (entityId) => {
        const flow = flowRef.current;
        if (!flow) return;
        const node = flow.getNode(entityId);
        if (!node) return;
        flow.setCenter(
          node.position.x + (node.width ?? 200) / 2,
          node.position.y + (node.height ?? 120) / 2,
          { zoom: 1.2, duration: 400 },
        );
      },
      openCreateEntity: () => {
        setSelectedEntity(null);
        setIsPanelOpen(true);
      },
    }));

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
          return {
            id: entity.id,
            type: 'entity',
            position,
            data: {
              label: entity.label,
              entity,
            },
          } as Node<EntityNodeData>;
        },
      );

      const builtEdges: Edge[] = controller.relations
        .filter(
          (r) =>
            entityById.has(r.source_entity_id) &&
            entityById.has(r.target_entity_id),
        )
        .map((rel) => ({
          id: rel.id,
          source: rel.source_entity_id,
          target: rel.target_entity_id,
          label:
            rel.source_label ||
            RELATION_LABELS[rel.relation_type] ||
            rel.relation_type,
          type: 'smoothstep',
          animated: rel.relation_type === 'inherits_from',
          style: stylesForRelation(rel.relation_type),
          labelBgPadding: [6, 4] as [number, number],
          labelBgBorderRadius: 4,
        }));

      return { nodes: builtNodes, edges: builtEdges };
    }, [controller.entities, controller.relations]);

    // Local visual overlay for pending edits — React Flow needs mutable state
    // to animate drag and edit operations smoothly before controller confirms.
    const [localNodes, setLocalNodes] = useState<Node<EntityNodeData>[]>(nodes);
    const [localEdges, setLocalEdges] = useState<Edge[]>(edges);

    // Re-sync local state when controller data changes (Realtime or mutation
    // settle). Use reference equality so React Flow's mid-drag local state is
    // preserved across unrelated re-renders.
    useEffect(() => {
      setLocalNodes(nodes);
    }, [nodes]);
    useEffect(() => {
      setLocalEdges(edges);
    }, [edges]);

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

        try {
          const newRelation = await controller.createRelation({
            id: crypto.randomUUID(),
            tenant_id: tenantId,
            source_entity_id: params.source,
            target_entity_id: params.target,
            source_field_id: null,
            target_field_id: null,
            relation_type: config.relation_type,
            source_label: config.source_label,
            target_label: config.target_label,
            on_delete: 'SET NULL',
            on_update: 'CASCADE',
            is_system: false,
            app_scope: appScope,
            metadata: {},
          });

          setLocalEdges((eds) =>
            addEdge(
              {
                ...params,
                id: newRelation.id,
                type: 'smoothstep',
                label:
                  config.source_label ||
                  RELATION_LABELS[newRelation.relation_type] ||
                  newRelation.relation_type,
                animated: newRelation.relation_type === 'inherits_from',
                style: stylesForRelation(newRelation.relation_type),
              },
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
        <div className="relative h-full flex-1">{canvasContent}</div>

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
      </div>
    );
  },
);
