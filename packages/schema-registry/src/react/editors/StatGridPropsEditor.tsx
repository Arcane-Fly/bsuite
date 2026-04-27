'use client';
import React from 'react';
import type { z } from 'zod';
import { StatGridPropsSchema } from '../../schemas/widgetProps.js';
import {
  EDITOR_ERROR_CLASS,
  EDITOR_INPUT_CLASS,
  EDITOR_LABEL_CLASS,
  EDITOR_SECTION_CLASS,
  validateWith,
  type PropsEditorShellProps,
} from './editorCommon.js';

type StatGridProps = z.infer<typeof StatGridPropsSchema>;

export function StatGridPropsEditor({ props, onChange }: PropsEditorShellProps<StatGridProps>) {
  const { issues } = validateWith(StatGridPropsSchema, props);

  return (
    <div className={EDITOR_SECTION_CLASS}>
      <div>
        <label className={EDITOR_LABEL_CLASS} htmlFor="sg-entity">Entity</label>
        <input
          id="sg-entity"
          type="text"
          value={props.entity ?? ''}
          onChange={(e) => onChange({ ...props, entity: e.target.value })}
          className={EDITOR_INPUT_CLASS}
        />
        {issues.entity != null && <p className={EDITOR_ERROR_CLASS}>{issues.entity}</p>}
      </div>
      <div>
        <label className={EDITOR_LABEL_CLASS} htmlFor="sg-metric">Metric (count | sum:col | avg:col)</label>
        <input
          id="sg-metric"
          type="text"
          value={String(props.metric ?? 'count')}
          onChange={(e) => onChange({ ...props, metric: e.target.value })}
          className={EDITOR_INPUT_CLASS}
        />
        {issues.metric != null && <p className={EDITOR_ERROR_CLASS}>{issues.metric}</p>}
      </div>
      <div>
        <label className={EDITOR_LABEL_CLASS} htmlFor="sg-group-by">Group by (optional)</label>
        <input
          id="sg-group-by"
          type="text"
          value={(props.group_by as string | undefined) ?? ''}
          onChange={(e) => onChange({ ...props, group_by: e.target.value })}
          className={EDITOR_INPUT_CLASS}
        />
      </div>
    </div>
  );
}
