import React from 'react';

/**
 * Recursive, schema-driven editor for nested About-section content.
 *
 * A field schema is one of:
 *   - { type: 'object', fields: [<schema>...] }   grouped sub-fields
 *   - { type: 'list', item: <schema>, itemLabel } repeatable array of <schema>
 *   - leaf: text | textarea | number | checkbox | array | select
 *
 * It is intentionally framework-light: it receives a `value` and calls
 * `onChange(next)` so the parent (AdminCrudPage) owns the live object held in
 * form state. Nested objects/lists recurse, which is what lets the 3-level
 * technologies tree (columns -> sections -> groups -> technologies) render.
 */

const FieldShell = ({ label, children, inline }) => (
  <div style={{ marginBottom: inline ? 0 : '0.75rem' }}>
    {label && <label className="block text-sm font-semibold mb-1">{label}</label>}
    {children}
  </div>
);

const inputClass = 'admin-section-card w-full p-2 border rounded';

// Renders a single leaf field bound to value/onChange.
const LeafField = ({ field, value, onChange }) => {
  switch (field.type) {
    case 'checkbox':
      return (
        <FieldShell label={field.label} inline>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
            />
            {field.label && <span>{field.checkboxLabel || 'Enabled'}</span>}
          </label>
        </FieldShell>
      );
    case 'textarea':
      return (
        <FieldShell label={field.label}>
          <textarea
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
            rows={field.rows || 3}
            placeholder={field.placeholder}
          />
        </FieldShell>
      );
    case 'select':
      return (
        <FieldShell label={field.label}>
          <select
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
          >
            {(field.options || []).map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </FieldShell>
      );
    case 'array':
      return (
        <FieldShell label={field.label}>
          <textarea
            value={Array.isArray(value) ? value.join('\n') : ''}
            onChange={(e) => onChange(e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))}
            className={inputClass}
            rows={field.rows || 4}
            placeholder={field.placeholder || 'One item per line'}
          />
        </FieldShell>
      );
    case 'number':
      return (
        <FieldShell label={field.label}>
          <input
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
            className={inputClass}
            placeholder={field.placeholder}
          />
        </FieldShell>
      );
    default:
      return (
        <FieldShell label={field.label}>
          <input
            type={field.type || 'text'}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
            placeholder={field.placeholder}
          />
        </FieldShell>
      );
  }
};

// Recursively render a schema node at a given value slice.
const Node = ({ schema, value, onChange, depth = 0 }) => {
  if (!schema) return null;

  if (schema.type === 'object') {
    return (
      <div style={{
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '0.5rem',
        padding: depth > 0 ? '0.75rem' : 0,
        background: depth > 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
      }}>
        {(schema.title || schema.label) && (
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '0.5rem' }}>
            {schema.title || schema.label}
          </div>
        )}
        {(schema.fields || []).map((sub) => (
          <Node
            key={sub.name}
            schema={sub}
            depth={depth + 1}
            value={value == null ? undefined : value[sub.name]}
            onChange={(next) => onChange({ ...(value || {}), [sub.name]: next })}
          />
        ))}
      </div>
    );
  }

  if (schema.type === 'list') {
    const items = Array.isArray(value) ? value : [];
    const update = (idx, next) => onChange(items.map((it, i) => (i === idx ? next : it)));
    const remove = (idx) => onChange(items.filter((_, i) => i !== idx));
    const add = () => {
      const base = typeof schema.itemDefault === 'function'
        ? schema.itemDefault()
        : (schema.itemDefault || (schema.item.type === 'object' ? {} : ''));
      onChange([...items, base]);
    };
    return (
      <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          {schema.title && (
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--primary)' }}>
              {schema.title}
            </span>
          )}
          <button type="button" className="admin-btn-secondary" style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem' }} onClick={add}>
            + {schema.addLabel || 'Add'}
          </button>
        </div>
        {items.length === 0 && (
          <div style={{ fontSize: '0.8125rem', opacity: 0.5, fontStyle: 'italic', marginBottom: '0.5rem' }}>No items yet.</div>
        )}
        {items.map((item, idx) => (
          <div key={idx} style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.4rem', padding: '0.6rem', marginBottom: '0.5rem', background: 'rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{schema.itemLabel || 'Item'} #{idx + 1}</span>
              <button type="button" className="admin-btn-danger" style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }} onClick={() => remove(idx)}>Remove</button>
            </div>
            <Node schema={schema.item} depth={depth + 1} value={item} onChange={(next) => update(idx, next)} />
          </div>
        ))}
      </div>
    );
  }

  return <LeafField field={schema} value={value} onChange={onChange} />;
};

const NestedEditor = ({ schema, value, onChange }) => {
  if (!schema) return null;
  return (
    <div style={{ borderTop: '1px dashed rgba(255,255,255,0.12)', borderBottom: '1px dashed rgba(255,255,255,0.12)', padding: '1rem 0', margin: '0.5rem 0' }}>
      <Node schema={schema} value={value} onChange={onChange} />
    </div>
  );
};

export default NestedEditor;
