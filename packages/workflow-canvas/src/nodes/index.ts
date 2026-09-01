/** Node components, their handle sets, and the open node-type registry. */

export { WorkflowHandles, type WorkflowHandlesProps } from './handles.js';
export {
  FLOW_IN,
  FLOW_OUT,
  LOOP_IN,
  LOOP_OUT,
  SEQUENTIAL_HANDLES,
  decisionBranchHandles,
} from './handles.js';
export { LOD_DETAIL_VISIBLE, cardShellClass, readCommon } from './shared.js';
export { StepNode, STEP_DEFAULT_SIZE } from './StepNode.js';
export {
  DecisionNode,
  DECISION_DEFAULT_SIZE,
  decisionBranches,
  decisionHandles,
} from './DecisionNode.js';
export {
  TerminatorNode,
  TERMINATOR_DEFAULT_SIZE,
  terminatorHandles,
  terminatorRole,
} from './TerminatorNode.js';
export { HandoffNode, HANDOFF_DEFAULT_SIZE } from './HandoffNode.js';
export {
  SwimlaneNode,
  SWIMLANE_DEFAULT_SIZE,
  SWIMLANE_HEADER_HEIGHT,
  swimlaneLaneId,
} from './SwimlaneNode.js';
export {
  BUILT_IN_NODE_DATA_SCHEMAS,
  BUILT_IN_NODE_DESCRIPTORS,
  DECISION_DESCRIPTOR,
  HANDOFF_DESCRIPTOR,
  STEP_DESCRIPTOR,
  SWIMLANE_DESCRIPTOR,
  TERMINATOR_DESCRIPTOR,
  createNodeTypeRegistry,
  workflowNodeTypeRegistry,
} from './registry.js';
export type {
  NodeDataValidation,
  WorkflowNodeTypeDescriptor,
  WorkflowNodeTypeRegistry,
} from './registry.js';
