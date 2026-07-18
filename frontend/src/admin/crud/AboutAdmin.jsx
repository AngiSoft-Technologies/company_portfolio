import React, { useMemo, useState } from 'react';
import AdminCrudPage from './AdminCrudPage';

// CMS editor for the About page. Each row is one composed section, keyed by a
// stable `key` the public page looks up. The `content` of each section is a
// rich nested object whose SHAPE the React component that renders it dictates
// (e.g. AboutServiceMap reads content.services[], AboutTechnologies reads
// content.columns[].sections[].groups[].technologies[]).
//
// To keep those shapes editable safely by an admin, each section key gets a
// declarative sub-schema below (schemaFor). The structured editor (NestedEditor)
// renders typed, repeatable form rows instead of one raw JSON textarea, so an
// admin can't accidentally break the strict shape contract the public page
// relies on. A "Edit as JSON" toggle is kept as an expert escape hatch.

// ---- Reusable leaf definitions -------------------------------------------
const str = (name, label, placeholder) => ({ name, label, type: 'text', placeholder });
const txt = (name, label, rows = 3) => ({ name, label, type: 'textarea', rows });
const bool = (name, label) => ({ name, label, type: 'checkbox', checkboxLabel: label });
const strList = (name, label, placeholder) => ({ name, label, type: 'array', placeholder: placeholder || 'One item per line' });

// ---- Per-section sub-schemas (component = source of truth) ----------------
const schemaFor = (key) => {
  switch (key) {
    case 'geography':
      return {
        type: 'object',
        title: 'Geography',
        fields: [
          txt('intro', 'Intro', 3),
          str('mapImageUrl', 'Map image URL', '/uploads/public/images/about/geography/...'),
          str('mapAlt', 'Map alt text'),
          { type: 'list', name: 'regions', title: 'Regions', itemLabel: 'Region', item: {
            type: 'object', fields: [
              str('id', 'Id'), str('title', 'Title'),
              str('lineOne', 'Line one'), str('lineTwo', 'Line two'),
              str('color', 'Color (hex)'),
            ],
          } },
          { type: 'list', name: 'locations', title: 'Map locations', itemLabel: 'Location', item: {
            type: 'object', fields: [
              str('id', 'Id'), str('x', 'X %'), str('y', 'Y %'),
              str('regionIndex', 'Region index'), str('align', 'Align'),
            ],
          } },
          { type: 'object', name: 'delivery', title: 'Delivery', fields: [
            bool('enabled', 'Enabled'),
            txt('introduction', 'Introduction', 3),
            { type: 'list', name: 'benefits', title: 'Benefits', itemLabel: 'Benefit', item: {
              type: 'object', fields: [str('id', 'Id'), str('title', 'Title'), txt('description', 'Description', 2)],
            } },
          ] },
        ],
      };

    case 'serviceMap':
      return {
        type: 'object', title: 'Service Map', fields: [
          { type: 'object', name: 'introTile', title: 'Intro tile', fields: [str('title', 'Title'), str('to', 'Link to')] },
          { type: 'list', name: 'services', title: 'Services', itemLabel: 'Service', item: {
            type: 'object', fields: [
              str('id', 'Id'), str('title', 'Title'), str('icon', 'Icon'),
              str('imageUrl', 'Image URL', '/uploads/public/images/about/service-map/...'),
              str('imageAlt', 'Image alt'), str('to', 'Link to'),
            ],
          } },
        ],
      };

    case 'solutionTypes':
      return {
        type: 'object', title: 'Solution Types', fields: [
          str('title', 'Title'), txt('description', 'Description', 3),
          { type: 'list', name: 'solutions', title: 'Solutions', itemLabel: 'Solution', item: {
            type: 'object', fields: [str('id', 'Id'), str('title', 'Title'), str('to', 'Link to')],
          } },
        ],
      };

    case 'technologies':
      return {
        type: 'object', title: 'Technologies', fields: [
          { type: 'list', name: 'columns', title: 'Columns', itemLabel: 'Column', item: {
            type: 'object', fields: [
              str('id', 'Id'), str('title', 'Title'), bool('enabled', 'Enabled'),
              { type: 'list', name: 'sections', title: 'Sections', itemLabel: 'Section', item: {
                type: 'object', fields: [
                  str('id', 'Id'), str('title', 'Title'), bool('enabled', 'Enabled'),
                  { type: 'list', name: 'groups', title: 'Groups', itemLabel: 'Group', item: {
                    type: 'object', fields: [
                      str('id', 'Id'), str('title', 'Title'), bool('enabled', 'Enabled'),
                      strList('technologies', 'Technologies (one per line)'),
                    ],
                  } },
                ],
              } },
            ],
          } },
        ],
      };

    case 'specializedCapabilities':
      return {
        type: 'object', title: 'Specialized Capabilities', fields: [
          txt('introduction', 'Introduction', 3),
          { type: 'list', name: 'capabilities', title: 'Capabilities', itemLabel: 'Capability', item: {
            type: 'object', fields: [
              str('id', 'Id'), str('title', 'Title'), str('icon', 'Icon'), str('to', 'Link to'),
            ],
          } },
        ],
      };

    case 'collaboration':
      return {
        type: 'object', title: 'Collaboration', fields: [
          { type: 'list', name: 'models', title: 'Models', itemLabel: 'Model', item: {
            type: 'object', fields: [
              str('id', 'Id'), str('title', 'Title'),
              str('imageUrl', 'Image URL', '/uploads/public/images/about/collaboration/...'),
              str('imageAlt', 'Image alt'),
              strList('items', 'Items (one per line)'),
            ],
          } },
        ],
      };

    case 'sustainability':
      return {
        type: 'object', title: 'Sustainability', fields: [
          { type: 'object', name: 'link', title: 'Link', fields: [
            str('label', 'Label'), str('to', 'Link to'),
            { name: 'type', label: 'Type', type: 'select', options: [
              { value: 'internal', label: 'internal' },
              { value: 'external', label: 'external' },
            ] },
          ] },
        ],
      };

    case 'clientsHeading':
      return {
        type: 'object', title: 'Clients', fields: [
          str('title', 'Title'), txt('description', 'Description', 3),
          str('targetMarketLabel', 'Target market label'),
          strList('targetMarkets', 'Target markets (one per line)'),
        ],
      };

    // Default: no structured schema for this key — fall back to raw JSON.
    default:
      return null;
  }
};

const AboutAdmin = () => {
  const [rawJson, setRawJson] = useState(false);

  const fields = useMemo(() => [
    { name: 'key', label: 'Key (stable id)', required: true, placeholder: 'geography | serviceMap | solutionTypes | technologies | specializedCapabilities | collaboration | sustainability | clientsHeading | ...' },
    { name: 'title', label: 'Title', required: true },
    { name: 'order', label: 'Order', type: 'number', defaultValue: 0 },
    { name: 'published', label: 'Published', type: 'checkbox', defaultValue: true },
    rawJson
      ? { name: 'content', label: 'Content JSON', type: 'json', rows: 14, placeholder: '{\n  "title": "...",\n  "imageUrl": "/uploads/public/images/about/..."\n}' }
      : { name: 'content', label: 'Content', type: 'object', schema: (row) => schemaFor(row?.key), defaultValue: {} },
  ], [rawJson]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
        <label className="flex items-center gap-2 text-sm font-semibold" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={rawJson} onChange={(e) => setRawJson(e.target.checked)} />
          Edit as JSON
        </label>
      </div>
      <AdminCrudPage
        title="About Page Sections"
        description="Edit the composed About page. Each section is a row. Rich sections use structured editors that match the public page's exact data shape; toggle 'Edit as JSON' for the raw blob."
        endpoint="/about-sections"
        adminEndpoint="/about-sections/admin"
        createLabel="Add Section"
        columns={[
          { key: 'key', title: 'Key' },
          { key: 'title', title: 'Title' },
          { key: 'order', title: 'Order' },
          { key: 'published', title: 'Published', render: (value) => (value ? '✓' : '✗') }
        ]}
        fields={fields}
      />
    </div>
  );
};

export default AboutAdmin;
