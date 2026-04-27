'use client';
import React from 'react';
import type { z } from 'zod';
import { DataTablePropsSchema } from '../../schemas/widgetProps.js';
import {
  EDITOR_ERROR_CLASS,
  EDITOR_INPUT_CLASS,
  EDITOR_LABEL_CLASS,
  EDITOR_SECTION_CLASS,
  validateWith,
  type PropsEditorShellProps,
} from './editorCommon.js';

type DataTableProps = z.infer<typeof DataTablePropsSchema>;

export function DataTablePropsEditor({ props, onChange }: PropsEditorShellProps<DataTableProps>) {
  const { issues } = validateWith(DataTablePropsSchema, props);

  const handleEntityChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    onChange({ ...props, entity: e.target.value });
  };
  const handleColumnsChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    // Split on comma — anchored literal, no regex engine.
    const list = e.target.value.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    onChange({ ...props, columns: list });
  };
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const n = Number.parseInt(e.target.value, 10);
    onChange({ ...props, page_size: Number.isFinite(n) ? n : props.page_size });
  };

  return (
    <div className={EDITOR_SECTION_CLASS}>
      <div>
        <label className={EDITOR_LABEL_CLASS} htmlFor="dt-entity">Entity</label>
        <input
          id="dt-entity"
          type="text"
          value={props.entity ?? ''}
          onChange={handleEntityChange}
          className={EDITOR_INPUT_CLASS}
        />
        {issues.entity != null && <p className={EDITOR_ERROR_CLASS}>{issues.entity}</p>}
      </div>
      <div>
        <label className={EDITOR_LABEL_CLASS} htmlFor="dt-columns">Columns (comma-separated)</label>
        <input
          id="dt-columns"
          type="text"
          value={(props.columns ?? []).join(', ')}
          onChange={handleColumnsChange}
          className={EDITOR_INPUT_CLASS}
        />
        {issues.columns != null && <p className={EDITOR_ERROR_CLASS}>{issues.columns}</p>}
      </div>
      <div>
        <label className={EDITOR_LABEL_CLASS} htmlFor="dt-page-size">Page size</label>
        <input
          id="dt-page-size"
          type="number"
          min={1}
          max={100}
          value={props.page_size ?? 25}
          onChange={handlePageSizeChange}
          className={EDITOR_INPUT_CLASS}
        />
        {issues.page_size != null && <p className={EDITOR_ERROR_CLASS}>{issues.page_size}</p>}
      </div>
    </div>
  );
}
