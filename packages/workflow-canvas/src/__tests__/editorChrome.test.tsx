/**
 * The Phase 2 editing chrome: palette, inspector, toolbar.
 *
 * WHAT EACH GROUP EXISTS TO CATCH
 *
 *  - PALETTE: it must be built FROM the registry. A hardcoded three-button
 *    palette would keep working for the built-in kinds and silently omit any
 *    kind a consumer adds through `registry.extend()`, which is the whole point
 *    of an open registry. The test extends the registry and expects the new
 *    kind to appear without the palette being touched.
 *  - INSPECTOR RENAME: one edit must be ONE undo step. `updateNodeData`
 *    checkpoints, so a per-keystroke commit would fill a 50-slot undo stack
 *    with one word and make Ctrl+Z useless for anything else. The field holds a
 *    local draft and commits on blur/Enter — asserted by counting calls.
 *  - INSPECTOR DELETE: deleting a lane takes its children with it (the
 *    controller removes orphans deliberately — a child of a missing parent
 *    renders at the origin with a console warning, which is a broken canvas
 *    rather than an error). Losing a lane's worth of steps to one click must be
 *    a question, not a surprise.
 *  - TOOLBAR PUBLISH: publish must be unavailable while the debounce is still
 *    holding an edit. Publishing mid-debounce freezes a version whose last
 *    edits are still in a timer, so the graph the user sees and the graph the
 *    tenant gets differ.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { describe, expect, it, vi } from 'vitest';

import { nestedFixedWidthOverflows } from '../components/chromeClasses.js';
import { WORKFLOW_ACTION_VOCABULARY } from '../actionVocabulary.js';
import { WorkflowInspector } from '../components/WorkflowInspector.js';
import { WorkflowPalette } from '../components/WorkflowPalette.js';
import { WorkflowToolbar } from '../components/WorkflowToolbar.js';
import type { WorkflowController } from '../hooks/useWorkflowController.js';
import { workflowNodeTypeRegistry } from '../nodes/registry.js';
import { StepNode, STEP_DEFAULT_SIZE } from '../nodes/StepNode.js';
import { terminatorHandles } from '../nodes/TerminatorNode.js';
import { StepNodeDataSchema } from '../schemas.js';
import { SEQUENTIAL_HANDLES } from '../nodes/handles.js';
import type { WorkflowNode } from '../types.js';
import { emptyWorkflowGraph } from '../types.js';

const LANE: WorkflowNode = {
  id: 'lane-gto',
  type: 'swimlane',
  position: { x: 0, y: 0 },
  data: { label: 'GTO / Labour Hire Team', laneId: 'gto', order: 0 },
};

const STEP: WorkflowNode = {
  id: 'step-1',
  type: 'step',
  parentId: 'lane-gto',
  position: { x: 40, y: 40 },
  data: { label: 'Accept employment offer', description: '' },
};

const END_TERMINATOR: WorkflowNode = {
  id: 'end-1',
  type: 'terminator',
  position: { x: 0, y: 0 },
  data: { label: 'End', role: 'end' },
};

const NOTIFY_STEP: WorkflowNode = {
  id: 'step-notify',
  type: 'step',
  position: { x: 0, y: 0 },
  data: {
    label: 'Tell the coordinator',
    actionKey: 'notify_internal',
    action: {
      kind: 'notify_internal',
      message: 'Inbound SMS received',
      // An unfamiliar key this package has never heard of — every commit made
      // through the inspector must round-trip it unchanged.
      custom_marker: 'kept-through-edits',
    },
  },
};

// crm7#2594 C6 / CODEX_ACCOUNTABILITY_20260909_INITIAL finding 1: extension
// keys whose value happens to be falsy (null, '', false, 0) must survive an
// edit exactly like `custom_marker` above does — only a key the PATCH itself
// just blanked may be dropped.
const NOTIFY_STEP_WITH_FALSY_EXTENSIONS: WorkflowNode = {
  id: 'step-notify-falsy',
  type: 'step',
  position: { x: 0, y: 0 },
  data: {
    label: 'Tell the coordinator',
    actionKey: 'notify_internal',
    action: {
      kind: 'notify_internal',
      message: 'a',
      extensionNull: null,
      extensionEmpty: '',
      extensionFalse: false,
      extensionZero: 0,
      extensionArray: [1, 2, 3],
      extensionObject: { nested: 'value' },
    },
  },
};

const SEND_EMAIL_STEP: WorkflowNode = {
  id: 'step-send-email',
  type: 'step',
  position: { x: 0, y: 0 },
  data: {
    label: 'Email the applicant',
    actionKey: 'send_email',
    action: { kind: 'send_email', template_key: 'welcome', to: 'someone@example.com' },
  },
};

function makeController(overrides: Partial<WorkflowController> = {}): WorkflowController {
  const graph = emptyWorkflowGraph();
  return {
    definition: null,
    versions: [],
    draft: null,
    registry: workflowNodeTypeRegistry,
    nodes: [
      LANE,
      STEP,
      END_TERMINATOR,
      NOTIFY_STEP,
      NOTIFY_STEP_WITH_FALSY_EXTENSIONS,
      SEND_EMAIL_STEP,
    ],
    edges: graph.edges,
    viewport: graph.viewport,
    isLoading: false,
    loadError: null,
    isDirty: false,
    isSaving: false,
    onNodesChange: vi.fn(),
    onEdgesChange: vi.fn(),
    onConnect: vi.fn(),
    onViewportChange: vi.fn(),
    isValidConnection: () => true,
    addNode: vi.fn(() => STEP),
    updateNodeData: vi.fn(),
    deleteNode: vi.fn(),
    autoLayout: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: false,
    canRedo: false,
    saveNow: vi.fn(async () => {}),
    createDraft: vi.fn(),
    publish: vi.fn(),
    rename: vi.fn(),
    duplicateToTenant: vi.fn(),
    isPlatformTemplate: false,
    isReadOnly: false,
    needsDraft: false,
    isGraphReady: true,
    ...overrides,
  } as unknown as WorkflowController;
}

function renderInFlow(ui: React.ReactElement) {
  return render(<ReactFlowProvider>{ui}</ReactFlowProvider>);
}

describe('WorkflowPalette', () => {
  it('offers every palette-visible kind the registry declares', () => {
    const controller = makeController();
    renderInFlow(<WorkflowPalette controller={controller} />);

    for (const descriptor of workflowNodeTypeRegistry.palette) {
      expect(
        screen.getByTestId(`workflow-palette-add-${descriptor.kind}`),
      ).toHaveTextContent(descriptor.label);
    }
  });

  it('offers a kind added through registry.extend() without being changed', () => {
    const extended = workflowNodeTypeRegistry.extend([
      {
        kind: 'notify',
        label: 'Notification',
        description: 'Tells somebody the process reached this point.',
        component: StepNode,
        handles: () => SEQUENTIAL_HANDLES,
        container: false,
        paletteVisible: true,
        defaultSize: STEP_DEFAULT_SIZE,
        defaultData: () => ({ label: 'Notify' }),
        dataSchema: StepNodeDataSchema,
      },
    ]);
    const controller = makeController({ registry: extended });
    renderInFlow(<WorkflowPalette controller={controller} />);

    expect(screen.getByTestId('workflow-palette-add-notify')).toBeInTheDocument();
  });

  it('does not offer a container kind — a lane is the frame, not a step', () => {
    const controller = makeController();
    renderInFlow(<WorkflowPalette controller={controller} />);
    expect(screen.queryByTestId('workflow-palette-add-swimlane')).toBeNull();
  });

  it('adds the chosen kind, in the active lane', () => {
    const addNode = vi.fn<WorkflowController['addNode']>(() => STEP);
    const controller = makeController({ addNode });
    renderInFlow(<WorkflowPalette controller={controller} activeLaneId="gto" />);

    fireEvent.click(screen.getByTestId('workflow-palette-add-decision'));

    expect(addNode).toHaveBeenCalledTimes(1);
    // The lane is passed through, so a node placed from the palette joins the
    // lane the user is working in rather than floating outside every lane.
    expect(addNode).toHaveBeenCalledWith('decision', expect.anything(), 'gto');
  });

  it('renders nothing when the workflow cannot be edited', () => {
    const controller = makeController({ isReadOnly: true });
    renderInFlow(<WorkflowPalette controller={controller} />);
    expect(screen.queryByTestId('workflow-palette')).toBeNull();
  });
});

describe('WorkflowInspector', () => {
  it('does NOT commit a rename per keystroke — one edit is one undo step', () => {
    const updateNodeData = vi.fn();
    const controller = makeController({ updateNodeData });
    render(<WorkflowInspector controller={controller} selectedNodeId="step-1" />);

    const field = screen.getByTestId('workflow-inspector-label');
    fireEvent.change(field, { target: { value: 'Accept the offer' } });
    expect(updateNodeData).not.toHaveBeenCalled();

    fireEvent.blur(field);
    expect(updateNodeData).toHaveBeenCalledTimes(1);
    expect(updateNodeData).toHaveBeenCalledWith('step-1', { label: 'Accept the offer' });
  });

  it('refuses a blank name and restores what was there', () => {
    const updateNodeData = vi.fn();
    const controller = makeController({ updateNodeData });
    render(<WorkflowInspector controller={controller} selectedNodeId="step-1" />);

    const field = screen.getByTestId('workflow-inspector-label');
    fireEvent.change(field, { target: { value: '   ' } });
    fireEvent.blur(field);

    expect(updateNodeData).not.toHaveBeenCalled();
    expect((field as HTMLInputElement).value).toBe('Accept employment offer');
  });

  it('deletes a childless step without asking', () => {
    const deleteNode = vi.fn();
    const confirmDelete = vi.fn(() => true);
    const controller = makeController({ deleteNode });
    render(
      <WorkflowInspector
        controller={controller}
        selectedNodeId="step-1"
        confirmDelete={confirmDelete}
      />,
    );

    fireEvent.click(screen.getByTestId('workflow-inspector-delete'));
    expect(confirmDelete).not.toHaveBeenCalled();
    expect(deleteNode).toHaveBeenCalledWith('step-1');
  });

  it('ASKS before deleting a lane, because its steps go with it', () => {
    const deleteNode = vi.fn();
    const confirmDelete = vi.fn(() => false);
    const controller = makeController({ deleteNode });
    render(
      <WorkflowInspector
        controller={controller}
        selectedNodeId="lane-gto"
        confirmDelete={confirmDelete}
      />,
    );

    fireEvent.click(screen.getByTestId('workflow-inspector-delete'));

    expect(confirmDelete).toHaveBeenCalledTimes(1);
    // Refused, so nothing is deleted — the whole point of asking.
    expect(deleteNode).not.toHaveBeenCalled();
  });

  it('renders nothing when no node is selected', () => {
    const controller = makeController();
    render(<WorkflowInspector controller={controller} selectedNodeId={null} />);
    expect(screen.queryByTestId('workflow-inspector')).toBeNull();
  });

  describe('terminator role (crm7#2603)', () => {
    it('offers Start and End, showing which is committed', () => {
      const controller = makeController();
      render(<WorkflowInspector controller={controller} selectedNodeId="end-1" />);

      expect(screen.getByTestId('workflow-inspector-role-start')).toHaveAttribute(
        'aria-checked',
        'false',
      );
      expect(screen.getByTestId('workflow-inspector-role-end')).toHaveAttribute(
        'aria-checked',
        'true',
      );
    });

    it('commits role: start in ONE undo step, which re-derives the handle set', () => {
      const updateNodeData = vi.fn();
      const controller = makeController({ updateNodeData });
      render(<WorkflowInspector controller={controller} selectedNodeId="end-1" />);

      fireEvent.click(screen.getByTestId('workflow-inspector-role-start'));

      expect(updateNodeData).toHaveBeenCalledTimes(1);
      expect(updateNodeData).toHaveBeenCalledWith('end-1', { role: 'start' });
      // The handle set is a pure function of `data.role` (TerminatorNode.tsx) —
      // committing the new role is what re-derives it, with no separate step.
      expect(terminatorHandles({ role: 'start' })).not.toEqual(terminatorHandles({ role: 'end' }));
    });

    it('does not commit when clicking the already-committed role', () => {
      const updateNodeData = vi.fn();
      const controller = makeController({ updateNodeData });
      render(<WorkflowInspector controller={controller} selectedNodeId="end-1" />);

      fireEvent.click(screen.getByTestId('workflow-inspector-role-end'));
      expect(updateNodeData).not.toHaveBeenCalled();
    });

    it('does not render a Role control for a step', () => {
      const controller = makeController();
      render(<WorkflowInspector controller={controller} selectedNodeId="step-1" />);
      expect(screen.queryByTestId('workflow-inspector-role-start')).toBeNull();
    });
  });

  describe('step action (crm7#2603)', () => {
    it('lists exactly the processor-implemented vocabulary, one constant, no duplicated strings', () => {
      const controller = makeController();
      render(<WorkflowInspector controller={controller} selectedNodeId="step-1" />);

      const select = screen.getByTestId('workflow-inspector-action-kind') as HTMLSelectElement;
      const kinds = Array.from(select.options)
        .map((o) => o.value)
        .filter((v) => v !== '');
      expect(kinds).toEqual(WORKFLOW_ACTION_VOCABULARY.map((entry) => entry.kind));
    });

    it('marks a skipped kind as not automated yet, with the processor own reason', () => {
      // The kind picker is driven by COMMITTED data, not a local draft (unlike
      // the text fields), so this needs a controller that actually applies a
      // patch — a bare vi.fn() would leave the select's value unmoved and the
      // assertion would pass for the wrong reason.
      const node = { ...STEP, id: 'step-kind-swap', data: { label: 'Notify', actionKey: '' } };
      const nodes = [node];
      const controller = makeController({
        nodes,
        updateNodeData: (id, patch) => {
          nodes[0] = { ...nodes[0], data: { ...nodes[0].data, ...patch } };
        },
      });
      const { rerender } = render(
        <WorkflowInspector controller={controller} selectedNodeId="step-kind-swap" />,
      );

      fireEvent.change(screen.getByTestId('workflow-inspector-action-kind'), {
        target: { value: 'send_sms' },
      });
      rerender(<WorkflowInspector controller={controller} selectedNodeId="step-kind-swap" />);

      expect(
        screen.getByTestId('workflow-inspector-action-not-automated'),
      ).toHaveTextContent('SMS provider not configured');
    });

    it('does not render an Action control for a terminator', () => {
      const controller = makeController();
      render(<WorkflowInspector controller={controller} selectedNodeId="end-1" />);
      expect(screen.queryByTestId('workflow-inspector-action-kind')).toBeNull();
    });

    it('does NOT commit a message edit per keystroke, and preserves an unknown key on commit', () => {
      const updateNodeData = vi.fn();
      const controller = makeController({ updateNodeData });
      render(<WorkflowInspector controller={controller} selectedNodeId="step-notify" />);

      const field = screen.getByTestId('workflow-inspector-action-message');
      fireEvent.change(field, { target: { value: 'Updated message' } });
      expect(updateNodeData).not.toHaveBeenCalled();

      fireEvent.blur(field);

      expect(updateNodeData).toHaveBeenCalledTimes(1);
      expect(updateNodeData).toHaveBeenCalledWith('step-notify', {
        action: {
          kind: 'notify_internal',
          message: 'Updated message',
          custom_marker: 'kept-through-edits',
        },
      });
    });

    it('sets kind AND action.kind together — the bridge reads action OR a built default, never a merge', () => {
      const updateNodeData = vi.fn();
      const controller = makeController({ updateNodeData });
      render(<WorkflowInspector controller={controller} selectedNodeId="step-1" />);

      fireEvent.change(screen.getByTestId('workflow-inspector-action-kind'), {
        target: { value: 'notify_internal' },
      });

      expect(updateNodeData).toHaveBeenCalledWith('step-1', {
        actionKey: 'notify_internal',
        action: { kind: 'notify_internal' },
      });
    });

    describe('field preservation on commit (CODEX_ACCOUNTABILITY_20260909_INITIAL finding 1)', () => {
      it('keeps every untouched key byte-for-byte — null, empty string, false, 0, array, object', () => {
        const updateNodeData = vi.fn();
        const controller = makeController({ updateNodeData });
        render(
          <WorkflowInspector controller={controller} selectedNodeId="step-notify-falsy" />,
        );

        const field = screen.getByTestId('workflow-inspector-action-message');
        fireEvent.change(field, { target: { value: 'b' } });
        fireEvent.blur(field);

        expect(updateNodeData).toHaveBeenCalledTimes(1);
        expect(updateNodeData).toHaveBeenCalledWith('step-notify-falsy', {
          action: {
            kind: 'notify_internal',
            message: 'b',
            extensionNull: null,
            extensionEmpty: '',
            extensionFalse: false,
            extensionZero: 0,
            extensionArray: [1, 2, 3],
            extensionObject: { nested: 'value' },
          },
        });
      });

      it('drops ONLY the key the patch itself just blanked, keeping every other key', () => {
        const updateNodeData = vi.fn();
        const controller = makeController({ updateNodeData });
        render(
          <WorkflowInspector controller={controller} selectedNodeId="step-notify-falsy" />,
        );

        const field = screen.getByTestId('workflow-inspector-action-message');
        fireEvent.change(field, { target: { value: '' } });
        fireEvent.blur(field);

        expect(updateNodeData).toHaveBeenCalledTimes(1);
        const [, patch] = updateNodeData.mock.calls[0] as [string, { action: Record<string, unknown> }];
        expect(patch.action).not.toHaveProperty('message');
        expect(patch.action).toEqual({
          kind: 'notify_internal',
          extensionNull: null,
          extensionEmpty: '',
          extensionFalse: false,
          extensionZero: 0,
          extensionArray: [1, 2, 3],
          extensionObject: { nested: 'value' },
        });
      });
    });

    describe('action availability by context (CODEX_ACCOUNTABILITY_20260909_INITIAL finding 2)', () => {
      it('disables send_email with its explanation when the subject cannot supply a candidate, and leaves notify_internal enabled', () => {
        const controller = makeController();
        render(
          <WorkflowInspector
            controller={controller}
            selectedNodeId="step-1"
            actionContext={{ subjectTable: 'communications' }}
          />,
        );

        const select = screen.getByTestId('workflow-inspector-action-kind') as HTMLSelectElement;
        const sendEmailOption = Array.from(select.options).find((o) => o.value === 'send_email')!;
        const notifyOption = Array.from(select.options).find((o) => o.value === 'notify_internal')!;

        expect(sendEmailOption.disabled).toBe(true);
        expect(notifyOption.disabled).toBe(false);
        expect(
          screen.getByTestId('workflow-inspector-action-unavailable-send_email'),
        ).toHaveTextContent(/candidate/i);
        expect(
          screen.getByTestId('workflow-inspector-action-unavailable-send_email'),
        ).toHaveTextContent(/communication/i);
      });

      it('names a completed form in the user\'s words when a form starts the workflow', () => {
        const controller = makeController();
        render(
          <WorkflowInspector
            controller={controller}
            selectedNodeId="step-1"
            actionContext={{ subjectTable: 'form_submission', hasCandidate: false }}
          />,
        );

        const reason = screen.getByTestId('workflow-inspector-action-unavailable-send_email');
        expect(reason).toHaveTextContent(/a completed form/);
        expect(reason).not.toHaveTextContent(/form_submission/);
      });

      it('explains every gate and skip in the user\'s words: no column, table or ticket names', () => {
        // bsuite#3208 d.crm walk 2026-09-26: the reason read "the processor reads the
        // recipient off the queue row's candidate_id" and a skip note cited
        // "conduit#229". crm7#2459's ruling: storage and ticket names never reach a label.
        const storage = /_id\b|queue row|processor|#\d+|form_submission|pipeline_entries/;
        for (const entry of WORKFLOW_ACTION_VOCABULARY) {
          expect(entry.requiresReason ?? '').not.toMatch(storage);
          expect(entry.notAutomatedReason ?? '').not.toMatch(storage);
        }
        const controller = makeController();
        render(
          <WorkflowInspector
            controller={controller}
            selectedNodeId="step-1"
            actionContext={{ subjectTable: 'placements', hasCandidate: false }}
          />,
        );
        const reason = screen.getByTestId('workflow-inspector-action-unavailable-send_email');
        expect(reason).toHaveTextContent(/a placement\./);
        expect(reason.textContent ?? '').not.toMatch(storage);
      });

      it('does not gate anything when actionContext is absent — current behaviour', () => {
        const controller = makeController();
        render(<WorkflowInspector controller={controller} selectedNodeId="step-1" />);

        const select = screen.getByTestId('workflow-inspector-action-kind') as HTMLSelectElement;
        for (const option of Array.from(select.options)) {
          expect(option.disabled).toBe(false);
        }
        expect(
          screen.queryByTestId('workflow-inspector-action-unavailable-reasons'),
        ).toBeNull();
      });

      it('shows the explanation inline for the CURRENTLY SAVED kind when it becomes unavailable, instead of silently clearing it', () => {
        const controller = makeController();
        render(
          <WorkflowInspector
            controller={controller}
            selectedNodeId="step-send-email"
            actionContext={{ subjectTable: 'communications' }}
          />,
        );

        // Still selected — not cleared.
        expect(
          (screen.getByTestId('workflow-inspector-action-kind') as HTMLSelectElement).value,
        ).toBe('send_email');
        expect(
          screen.getByTestId('workflow-inspector-action-unavailable-selected'),
        ).toHaveTextContent(/candidate/i);
      });
    });

    describe('real assignee/template selectors (CODEX_ACCOUNTABILITY_20260909_INITIAL finding 3)', () => {
      it('renders the assignee as a text input, honestly labelled, when no options are given', () => {
        const controller = makeController();
        render(<WorkflowInspector controller={controller} selectedNodeId="step-notify" />);

        const field = screen.getByTestId('workflow-inspector-action-assignee');
        expect(field.tagName).toBe('INPUT');
        expect(screen.getByText('Assignee user id')).toBeInTheDocument();
      });

      it('renders the assignee as a select when assigneeOptions is given, and writes action.to on change', () => {
        const updateNodeData = vi.fn();
        const controller = makeController({ updateNodeData });
        render(
          <WorkflowInspector
            controller={controller}
            selectedNodeId="step-notify"
            assigneeOptions={[
              { id: 'user-1', label: 'Alex Chen' },
              { id: 'user-2', label: 'Priya Singh' },
            ]}
          />,
        );

        const field = screen.getByTestId('workflow-inspector-action-assignee');
        expect(field.tagName).toBe('SELECT');

        fireEvent.change(field, { target: { value: 'user-2' } });

        expect(updateNodeData).toHaveBeenCalledWith('step-notify', {
          action: {
            kind: 'notify_internal',
            message: 'Inbound SMS received',
            custom_marker: 'kept-through-edits',
            to: 'user-2',
          },
        });
      });

      it('still shows a saved assignee that is not in the option list, disabled rather than dropped', () => {
        const controller = makeController();
        render(
          <WorkflowInspector
            controller={controller}
            selectedNodeId="step-notify"
            assigneeOptions={[{ id: 'user-1', label: 'Alex Chen' }]}
          />,
        );

        const select = screen.getByTestId('workflow-inspector-action-assignee') as HTMLSelectElement;
        expect(select.value).toBe('');
      });

      it('renders the template key as a text input, honestly labelled, when no options are given', () => {
        const controller = makeController();
        render(<WorkflowInspector controller={controller} selectedNodeId="step-send-email" />);

        const field = screen.getByTestId('workflow-inspector-action-template-key');
        expect(field.tagName).toBe('INPUT');
        expect(screen.getByText('Email template key')).toBeInTheDocument();
      });

      it('renders the template key as a select when emailTemplateOptions is given, and writes action.template_key on change', () => {
        const updateNodeData = vi.fn();
        const controller = makeController({ updateNodeData });
        render(
          <WorkflowInspector
            controller={controller}
            selectedNodeId="step-send-email"
            emailTemplateOptions={[
              { key: 'welcome', label: 'Welcome email' },
              { key: 'reminder', label: 'Reminder email' },
            ]}
          />,
        );

        const field = screen.getByTestId('workflow-inspector-action-template-key');
        expect(field.tagName).toBe('SELECT');

        fireEvent.change(field, { target: { value: 'reminder' } });

        expect(updateNodeData).toHaveBeenCalledWith('step-send-email', {
          action: { kind: 'send_email', to: 'someone@example.com', template_key: 'reminder' },
        });
      });

      it('shows a saved template key that is not in the option list as a disabled selected option, not dropped', () => {
        const controller = makeController();
        render(
          <WorkflowInspector
            controller={controller}
            selectedNodeId="step-send-email"
            emailTemplateOptions={[{ key: 'reminder', label: 'Reminder email' }]}
          />,
        );

        const select = screen.getByTestId('workflow-inspector-action-template-key') as HTMLSelectElement;
        expect(select.value).toBe('welcome');
        const savedOption = Array.from(select.options).find((o) => o.value === 'welcome')!;
        expect(savedOption.disabled).toBe(true);
      });
    });

    it('commits priority into the SAME action object as the message, not overwriting it', () => {
      const updateNodeData = vi.fn();
      let action: Record<string, unknown> = {
        kind: 'notify_internal',
        message: 'Inbound SMS received',
      };
      const nodes = [
        { ...STEP, id: 'step-live', type: 'step', data: { label: 'Notify', actionKey: 'notify_internal', action } },
      ];
      const controller = makeController({
        nodes,
        updateNodeData: (id, patch) => {
          updateNodeData(id, patch);
          action = (patch as { action: Record<string, unknown> }).action;
          nodes[0] = { ...nodes[0], data: { ...nodes[0].data, ...patch } };
        },
      });
      const { rerender } = render(
        <WorkflowInspector controller={controller} selectedNodeId="step-live" />,
      );

      fireEvent.change(screen.getByTestId('workflow-inspector-action-priority'), {
        target: { value: 'urgent' },
      });
      rerender(<WorkflowInspector controller={controller} selectedNodeId="step-live" />);

      expect(action).toEqual({ kind: 'notify_internal', message: 'Inbound SMS received', priority: 'urgent' });
    });
  });
});

describe('nested fixed-width overflow (crm7#2604 SEND_BACK)', () => {
  it('is the padded-region + same-width-child case the parent measured (224/240, 288/304)', () => {
    expect(nestedFixedWidthOverflows(224, 16, 224)).toBe(true);
    expect(nestedFixedWidthOverflows(288, 16, 288)).toBe(true);
    expect(nestedFixedWidthOverflows(224, 0, 224)).toBe(false);
    expect(nestedFixedWidthOverflows(288, 0, 288)).toBe(false);
    expect(nestedFixedWidthOverflows(224, 16, 208)).toBe(false);
  });
});

describe('chrome surface is not optional (crm7#2604)', () => {
  const PLACEMENT_ONLY = 'absolute left-2 top-2 z-10';

  it('keeps the palette card surface and w-56 when a consumer passes placement-only classes', () => {
    renderInFlow(
      <WorkflowPalette controller={makeController()} className={PLACEMENT_ONLY} />,
    );
    const el = screen.getByTestId('workflow-palette');
    expect(el.className).toContain('bg-card');
    expect(el.className).toContain('border-border');
    expect(el.className).toContain('w-56');
    expect(el.className).toContain('pointer-events-auto');
    expect(el.className).toContain('absolute');
  });

  it('keeps the toolbar flex surface when a consumer passes placement-only classes', () => {
    render(<WorkflowToolbar controller={makeController()} className={PLACEMENT_ONLY} />);
    const el = screen.getByTestId('workflow-toolbar');
    expect(el.className).toContain('bg-card');
    expect(el.className).toContain('flex');
    expect(el.className).toContain('flex-wrap');
    expect(el.className).toContain('pointer-events-auto');
  });

  it('keeps the inspector card surface and w-72 when a consumer passes placement-only classes', () => {
    render(
      <WorkflowInspector
        controller={makeController()}
        selectedNodeId="step-1"
        className={`${PLACEMENT_ONLY} w-72`}
      />,
    );
    const el = screen.getByTestId('workflow-inspector');
    expect(el.className).toContain('bg-card');
    expect(el.className).toContain('w-72');
    expect(el.className).toContain('overflow-y-auto');
  });
});

describe('WorkflowToolbar', () => {
  const draft = {
    id: 'ver-1',
    workflow_definition_id: 'def-1',
    tenant_id: 'tenant-1',
    version: 2,
    status: 'draft' as const,
    graph: emptyWorkflowGraph(),
    trigger_config: null,
    ai_context: null,
    created_by: null,
    published_by: null,
    created_at: null,
    updated_at: null,
    published_at: null,
  };

  it('says what will happen, not "Save"', () => {
    const controller = makeController({ draft });
    render(<WorkflowToolbar controller={controller} />);
    expect(screen.getByTestId('workflow-publish')).toHaveTextContent('Publish version 2');
  });

  it('refuses to publish while an edit is still unsaved', () => {
    const controller = makeController({ draft, isDirty: true });
    render(<WorkflowToolbar controller={controller} />);
    expect(screen.getByTestId('workflow-publish')).toBeDisabled();
    expect(screen.getByTestId('workflow-save-state')).toHaveTextContent('Unsaved changes');
  });

  it('leaves a refused publish to the error toast instead of throwing it at the page', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    try {
      // A plain function, not vi.fn: vitest's spy attaches its own handler to a
      // returned promise to record the result, which would hide the very
      // unhandled rejection this test exists to catch.
      let calls = 0;
      const publish = () => {
        calls += 1;
        return Promise.reject(new Error('Nothing leads to New step'));
      };
      render(<WorkflowToolbar controller={makeController({ draft, publish })} />);
      fireEvent.click(screen.getByTestId('workflow-publish'));
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(calls).toBe(1);
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });

  it('leaves a failed copy to the error toast instead of throwing it at the page', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    try {
      const duplicateToTenant = vi.fn(() => Promise.reject(new Error('copy refused')));
      const onDuplicated = vi.fn();
      render(
        <WorkflowToolbar
          controller={makeController({ draft, isPlatformTemplate: true, duplicateToTenant })}
          onDuplicated={onDuplicated}
        />,
      );
      fireEvent.click(screen.getByTestId('workflow-duplicate'));
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(duplicateToTenant).toHaveBeenCalledTimes(1);
      expect(onDuplicated).not.toHaveBeenCalled();
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });

  it('offers "copy" rather than "publish" on a platform template', () => {
    const controller = makeController({ draft, isPlatformTemplate: true });
    render(<WorkflowToolbar controller={controller} />);
    expect(screen.getByTestId('workflow-duplicate')).toBeInTheDocument();
    expect(screen.queryByTestId('workflow-publish')).toBeNull();
  });

  it('announces the save state rather than only drawing it', () => {
    const controller = makeController({ isSaving: true });
    render(<WorkflowToolbar controller={controller} />);
    const status = screen.getByTestId('workflow-save-state');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Saving…');
  });

  it('renders extra controls in the toolbar row, not as an overlay', () => {
    const controller = makeController({ draft });
    render(
      <WorkflowToolbar controller={controller}>
        <button type="button" data-testid="workflow-fullscreen">
          Full screen
        </button>
      </WorkflowToolbar>,
    );
    const extra = screen.getByTestId('workflow-fullscreen');
    expect(screen.getByTestId('workflow-toolbar').contains(extra)).toBe(true);
    expect(screen.getByTestId('workflow-publish')).toBeInTheDocument();
  });
});
