'use client';
import React from 'react';
import type { z } from 'zod';
import { CardPropsSchema } from '../../schemas/widgetProps.js';
import {
  EDITOR_ERROR_CLASS,
  EDITOR_INPUT_CLASS,
  EDITOR_LABEL_CLASS,
  EDITOR_SECTION_CLASS,
  validateWith,
  type PropsEditorShellProps,
} from './editorCommon.js';

type CardProps = z.infer<typeof CardPropsSchema>;

export function CardPropsEditor({ props, onChange }: PropsEditorShellProps<CardProps>) {
  const { issues } = validateWith(CardPropsSchema, props);

  return (
    <div className={EDITOR_SECTION_CLASS}>
      <div>
        <label className={EDITOR_LABEL_CLASS} htmlFor="card-title">Title</label>
        <input
          id="card-title"
          type="text"
          value={props.title ?? ''}
          onChange={(e) => onChange({ ...props, title: e.target.value })}
          className={EDITOR_INPUT_CLASS}
        />
        {issues.title != null && <p className={EDITOR_ERROR_CLASS}>{issues.title}</p>}
      </div>
      <div>
        <label className="inline-flex items-center gap-2 text-xs font-medium">
          <input
            type="checkbox"
            checked={props.collapsible === true}
            onChange={(e) => onChange({ ...props, collapsible: e.target.checked })}
          />
          Collapsible
        </label>
      </div>
    </div>
  );
}
