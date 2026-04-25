import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerWidget,
  getRegisteredWidgets,
  getWidgetById,
  _resetRegistryForTests,
} from './registerWidget';

const StubComponent = () => null;

describe('registerWidget registry API', () => {
  beforeEach(() => {
    _resetRegistryForTests();
  });

  it('adds an entry that is retrievable by id', () => {
    registerWidget({ id: 'Stub', name: 'Stub Widget', component: StubComponent });
    const entry = getWidgetById('Stub');
    expect(entry).toBeDefined();
    expect(entry?.id).toBe('Stub');
    expect(entry?.name).toBe('Stub Widget');
  });

  it('listRegisteredWidgets returns all registered entries', () => {
    registerWidget({ id: 'A', name: 'A', component: StubComponent });
    registerWidget({ id: 'B', name: 'B', component: StubComponent });
    const ids = getRegisteredWidgets().map((e) => e.id).sort();
    expect(ids).toEqual(['A', 'B']);
  });

  it('is idempotent — re-registering the same id overwrites silently', () => {
    registerWidget({ id: 'X', name: 'first', component: StubComponent });
    registerWidget({ id: 'X', name: 'second', component: StubComponent });
    expect(getRegisteredWidgets().filter((e) => e.id === 'X')).toHaveLength(1);
    expect(getWidgetById('X')?.name).toBe('second');
  });

  it('throws on empty id', () => {
    expect(() =>
      registerWidget({ id: '', name: 'no', component: StubComponent })
    ).toThrow();
  });

  it('getWidgetById returns undefined for unknown id', () => {
    expect(getWidgetById('does-not-exist')).toBeUndefined();
  });

  it('accepts a PropsEditor on the entry', () => {
    const Editor = () => null;
    registerWidget({
      id: 'WithEditor',
      name: 'With Editor',
      component: StubComponent,
      PropsEditor: Editor,
      defaultProps: { foo: 'bar' },
    });
    const entry = getWidgetById('WithEditor');
    expect(entry?.PropsEditor).toBe(Editor);
    expect(entry?.defaultProps).toEqual({ foo: 'bar' });
  });
});
