// Components — the canvas, plus the Phase 2 editing chrome that goes over it.
export {
  WorkflowCanvas,
  WorkflowInspector,
  WorkflowPalette,
  WorkflowToolbar,
} from './components/index.js';
export type {
  WorkflowCanvasProps,
  WorkflowInspectorProps,
  WorkflowPaletteProps,
  WorkflowToolbarProps,
  WorkflowAssigneeOption,
  WorkflowEmailTemplateOption,
} from './components/index.js';

// Step action vocabulary — the inspector's picker, and the availability
// contract a consumer wires `WorkflowInspector`'s `actionContext` prop from.
export {
  WORKFLOW_ACTION_KINDS,
  WORKFLOW_ACTION_VOCABULARY,
  TASK_PRIORITY_OPTIONS,
  actionVocabularyEntry,
  unmetActionRequirement,
  describeUnmetRequirement,
} from './actionVocabulary.js';
export type {
  WorkflowActionKind,
  WorkflowActionVocabularyEntry,
  WorkflowActionContext,
  WorkflowActionRequirement,
  TaskPriorityOption,
} from './actionVocabulary.js';

// Node types — the registry is the point of this package. See nodes/registry.ts.
export {
  BUILT_IN_NODE_DATA_SCHEMAS,
  BUILT_IN_NODE_DESCRIPTORS,
  DuplicateNodeKindError,
  DECISION_DESCRIPTOR,
  HANDOFF_DESCRIPTOR,
  STEP_DESCRIPTOR,
  SWIMLANE_DESCRIPTOR,
  TERMINATOR_DESCRIPTOR,
  createNodeTypeRegistry,
  workflowNodeTypeRegistry,
  DecisionNode,
  HandoffNode,
  StepNode,
  SwimlaneNode,
  TerminatorNode,
  WorkflowHandles,
  SEQUENTIAL_HANDLES,
  FLOW_IN,
  FLOW_OUT,
  LOOP_IN,
  LOOP_OUT,
  decisionBranchHandles,
  decisionBranches,
  decisionHandles,
  terminatorHandles,
  terminatorRole,
  swimlaneLaneId,
  SWIMLANE_HEADER_HEIGHT,
} from './nodes/index.js';
export type {
  NodeDataValidation,
  WorkflowNodeTypeDescriptor,
  WorkflowNodeTypeRegistry,
  WorkflowHandlesProps,
} from './nodes/index.js';

// Connection validation — LOOP-PERMISSIVE. Read validation/connection.ts before
// changing anything here.
export { createIsValidConnection, validateConnection } from './validation/connection.js';
export type {
  ConnectionRefusalCode,
  ConnectionVerdict,
  ValidateConnectionArgs,
} from './validation/connection.js';

// Layout
export { computeSwimlaneLayout } from './utils/index.js';
export type { SwimlaneLayoutOptions, SwimlaneLayoutResult } from './utils/index.js';

// Hooks
export {
  useWorkflowController,
  useWorkflowRealtimeSubscription,
  useUndoRedo,
  isDragEnd,
  isDragStart,
  isStructuralChange,
  UNDO_STACK_LIMIT,
  DEFAULT_SAVE_DEBOUNCE_MS,
  workflowDefinitionOptions,
  workflowDefinitionsOptions,
  workflowDraftOptions,
  workflowVersionOptions,
  workflowVersionsOptions,
} from './hooks/index.js';
export type {
  UseWorkflowControllerOptions,
  UseWorkflowRealtimeOptions,
  UndoRedoApi,
  WorkflowController,
} from './hooks/index.js';

// Zod schemas + the graph round trip
export {
  DecisionNodeDataSchema,
  HandoffNodeDataSchema,
  StepNodeDataSchema,
  SwimlaneNodeDataSchema,
  TerminatorNodeDataSchema,
  ViewportSchema,
  WorkflowEdgeSchema,
  WorkflowGraphSchema,
  WorkflowNodeKindSchema,
  WorkflowNodeSchema,
  XYPositionSchema,
  deserialiseGraph,
  serialiseGraph,
} from './schemas.js';
export type { WorkflowGraphJson } from './schemas.js';

// Shared types + the table contract
export { WORKFLOW_NODE_KINDS, emptyWorkflowGraph } from './types.js';
export type {
  DecisionNodeData,
  HandoffNodeData,
  StepNodeData,
  SwimlaneNodeData,
  TerminatorNodeData,
  TerminatorRole,
  WorkflowDefinitionRow,
  WorkflowDefinitionVersionRow,
  WorkflowEdge,
  WorkflowGraph,
  WorkflowHandleKind,
  WorkflowHandleSide,
  WorkflowHandleSpec,
  WorkflowNode,
  WorkflowNodeCommonData,
  WorkflowNodeData,
  WorkflowNodeKind,
  WorkflowVersionStatus,
} from './types.js';

// Service — for consumers doing CRUD outside the controller hook.
export {
  createDraftVersion,
  createWorkflowDefinition,
  deleteWorkflowVersion,
  duplicateWorkflowDefinition,
  getDraftVersion,
  getPublishedGraph,
  getWorkflowDefinition,
  getWorkflowVersion,
  listWorkflowDefinitions,
  listWorkflowVersions,
  publishVersion,
  saveVersionGraph,
  updateVersionAiContext,
  updateWorkflowDefinition,
} from './service.js';
export { WorkflowServiceError, WorkflowSourceMissingError } from './service.js';
export type {
  CreateDraftVersionArgs,
  CreateWorkflowDefinitionArgs,
  DuplicateWorkflowDefinitionArgs,
  LooseSupabaseClient,
} from './service.js';
