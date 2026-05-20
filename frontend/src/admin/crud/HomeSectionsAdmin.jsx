import React from 'react';
import AdminCrudPage from './AdminCrudPage';

const HomeSectionsAdmin = () => (
  <AdminCrudPage
    title="Home Sections"
    description="Control homepage section visibility, order, and section settings."
    endpoint="/home-sections"
    adminEndpoint="/home-sections/admin"
    createLabel="Add Section"
    columns={[
      { key: 'sectionId', title: 'Section ID' },
      { key: 'title', title: 'Title' },
      { key: 'component', title: 'Component' },
      { key: 'order', title: 'Order' },
      { key: 'visible', title: 'Visible', render: (value) => value ? '✓' : '✗' }
    ]}
    fields={[
      { name: 'sectionId', label: 'Section ID', required: true },
      { name: 'title', label: 'Title', required: true },
      { name: 'component', label: 'Component', nullable: true },
      { name: 'description', label: 'Description', type: 'textarea', nullable: true },
      { name: 'order', label: 'Order', type: 'number', defaultValue: 0 },
      { name: 'settings', label: 'Settings JSON', type: 'json', rows: 6, placeholder: '{\n  "badge": "..."\n}' },
      { name: 'visible', label: 'Visible', type: 'checkbox', defaultValue: true }
    ]}
  />
);

export default HomeSectionsAdmin;
