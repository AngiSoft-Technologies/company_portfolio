import React from 'react';
import AdminCrudPage from './AdminCrudPage';

const CareersAdmin = () => (
  <AdminCrudPage
    title="Careers"
    description="Manage public job posts and future talent-pool opportunities."
    endpoint="/careers"
    adminEndpoint="/careers/admin"
    createLabel="Add Career Post"
    columns={[
      { key: 'title', title: 'Title' },
      { key: 'department', title: 'Department' },
      { key: 'type', title: 'Type' },
      { key: 'published', title: 'Published', render: (value) => value ? '✓' : '✗' }
    ]}
    fields={[
      { name: 'title', label: 'Title', required: true },
      { name: 'slug', label: 'Slug', required: true },
      { name: 'department', label: 'Department' },
      { name: 'location', label: 'Location' },
      { name: 'type', label: 'Type', defaultValue: 'interest' },
      { name: 'description', label: 'Description', type: 'textarea', rows: 5, required: true },
      { name: 'requirements', label: 'Requirements (one per line)', type: 'array', rows: 5 },
      { name: 'benefits', label: 'Benefits (one per line)', type: 'array', rows: 5 },
      { name: 'salaryRange', label: 'Salary / Compensation Range', nullable: true },
      { name: 'expiresAt', label: 'Expires At', type: 'datetime-local', nullable: true },
      { name: 'published', label: 'Published', type: 'checkbox', defaultValue: false }
    ]}
  />
);

export default CareersAdmin;
