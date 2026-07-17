import React from 'react';
import AdminCrudPage from './AdminCrudPage';

// CMS editor for the About page. Each row is one composed section, keyed by a
// stable `key` the public page looks up (hero, intro, numberStories, geography,
// timeline, industries, clients, clientStats, clientHighlights, serviceGallery,
// solutionTypes, whyGuarantee, fullServices, pricing, merchandise, technologies,
// quotation, cta). Images must be uploaded via the media/upload UI and stored as
// `/uploads/public/...` paths so resolveAssetUrl() resolves them on the server.
const AboutAdmin = () => (
  <AdminCrudPage
    title="About Page Sections"
    description="Edit the composed About page. Each section is a row; its content is stored as JSON. Image fields must use /uploads/public/... paths."
    endpoint="/about-sections"
    adminEndpoint="/about-sections/admin"
    createLabel="Add Section"
    columns={[
      { key: 'key', title: 'Key' },
      { key: 'title', title: 'Title' },
      { key: 'order', title: 'Order' },
      { key: 'published', title: 'Published', render: (value) => (value ? '✓' : '✗') }
    ]}
    fields={[
      { name: 'key', label: 'Key (stable id)', required: true, placeholder: 'hero | intro | numberStories | geography | timeline | industries | clients | clientStats | clientHighlights | serviceGallery | solutionTypes | whyGuarantee | fullServices | pricing | merchandise | technologies | quotation | cta' },
      { name: 'title', label: 'Title', required: true },
      { name: 'order', label: 'Order', type: 'number', defaultValue: 0 },
      { name: 'published', label: 'Published', type: 'checkbox', defaultValue: true },
      { name: 'content', label: 'Content JSON', type: 'json', rows: 14, placeholder: '{\n  "eyebrow": "...",\n  "title": "...",\n  "imageUrl": "/uploads/public/images/about/..."\n}' }
    ]}
  />
);

export default AboutAdmin;
