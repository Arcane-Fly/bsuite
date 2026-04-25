'use client';
import React from 'react';
import type { z } from 'zod';
import { FormRendererPropsSchema } from '../../schemas/widgetProps';
import {
  EDITOR_ERROR_CLASS,
  EDITOR_INPUT_CLASS,
  EDITOR_LABEL_CLASS,
  EDITOR_SECTION_CLASS,
  validateWith,
  type PropsEditorShellProps,
} from './editorCommon';

type FormRendererProps = z.infer<typeof FormRendererPropsSchema>;

export function FormRendererPropsEditor({ props, onChange }: PropsEditorShellProps<FormRendererProps>) {
  const { issues } = validateWith(FormRendererPropsSchema, props);

  const handleFieldsChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    // Split on comma — anchored literal, no regex engine.
    const list = e.target.value.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    onChange({ ...props, fields: list });
  };

  return (
    <div className={EDITOR_SECTION_CLASS}>
      <div>
        <label className={EDITOR_LABEL_CLASS} htmlFor="fr-entity">Entity</label>
        <input
          id="fr-entity"
          type="text"
          value={props.entity ?? ''}
          onChange={(e) => onChange({ ...props, entity: e.target.value })}
          className={EDITOR_INPUT_CLASS}
        />
        {issues.entity != null && <p className={EDITOR_ERROR_CLASS}>{issues.entity}</p>}
      </div>
      <div>
        <label className={EDITOR_LABEL_CLASS} htmlFor="fr-fields">Fields (comma-separated)</label>
        <input
          id="fr-fields"
          type="text"
          value={(props.fields ?? []).join(', ')}
          onChange={handleFieldsChange}
          className={EDITOR_INPUT_CLASS}
        />
        {issues.fields != null && <p className={EDITOR_ERROR_CLASS}>{issues.fields}</p>}
      </div>
      <div>
        <label className={EDITOR_LABEL_CLASS} htmlFor="fr-submit">Submit label</label>
        <input
          id="fr-submit"
          type="text"
          value={String(props.submit_label ?? 'Submit')}
          onChange={(e) => onChange({ ...props, submit_label: e.target.value })}
          className={EDITOR_INPUT_CLASS}
        />
      </div>
    </div>
  );
}
