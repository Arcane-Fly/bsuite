'use client';
import React from 'react';
import type { z } from 'zod';
import { EntitySelectorPropsSchema } from '../../schemas/widgetProps';
import {
  EDITOR_ERROR_CLASS,
  EDITOR_INPUT_CLASS,
  EDITOR_LABEL_CLASS,
  EDITOR_SECTION_CLASS,
  validateWith,
  type PropsEditorShellProps,
} from './editorCommon';

type EntitySelectorProps = z.infer<typeof EntitySelectorPropsSchema>;

export function EntitySelectorPropsEditor({ props, onChange }: PropsEditorShellProps<EntitySelectorProps>) {
  const { issues } = validateWith(EntitySelectorPropsSchema, props);

  return (
    <div className={EDITOR_SECTION_CLASS}>
      <div>
        <label className={EDITOR_LABEL_CLASS} htmlFor="es-entity">Entity</label>
        <input
          id="es-entity"
          type="text"
          value={props.entity ?? ''}
          onChange={(e) => onChange({ ...props, entity: e.target.value })}
          className={EDITOR_INPUT_CLASS}
        />
        {issues.entity != null && <p className={EDITOR_ERROR_CLASS}>{issues.entity}</p>}
      </div>
      <div>
        <label className={EDITOR_LABEL_CLASS} htmlFor="es-display-field">Display field</label>
        <input
          id="es-display-field"
          type="text"
          value={props.display_field ?? ''}
          onChange={(e) => onChange({ ...props, display_field: e.target.value })}
          className={EDITOR_INPUT_CLASS}
        />
        {issues.display_field != null && <p className={EDITOR_ERROR_CLASS}>{issues.display_field}</p>}
      </div>
      <div>
        <label className={EDITOR_LABEL_CLASS} htmlFor="es-target-field">Target field</label>
        <input
          id="es-target-field"
          type="text"
          value={props.target_field ?? ''}
          onChange={(e) => onChange({ ...props, target_field: e.target.value })}
          className={EDITOR_INPUT_CLASS}
        />
        {issues.target_field != null && <p className={EDITOR_ERROR_CLASS}>{issues.target_field}</p>}
      </div>
    </div>
  );
}
