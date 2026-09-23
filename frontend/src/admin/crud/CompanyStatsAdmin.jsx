import React from 'react';
import AdminCrudPage from './AdminCrudPage';

const CompanyStatsAdmin = () => (
  <AdminCrudPage
    title="Company Stats"
    description="Manage homepage fact cards with conservative, truthful AngiSoft metrics."
    endpoint="/company-stats"
    adminEndpoint="/company-stats/admin"
    createLabel="Add Stat"
    columns={[
      { key: 'label', title: 'Label' },
      { key: 'value', title: 'Value' },
      { key: 'suffix', title: 'Suffix' },
      { key: 'description', title: 'Description' },
      { key: 'order', title: 'Order' },
      { key: 'published', title: 'Published', render: (value) => value ? '✓' : '✗' }
    ]}
    fields={[
      { name: 'label', label: 'Label', required: true },
      { name: 'value', label: 'Value', type: 'number', defaultValue: 0, required: true },
      { name: 'valueType', label: 'Value Type', type: 'select', defaultValue: 'plain',
        options: [
          { value: 'plain', label: 'Plain Number' },
          { value: 'count', label: 'Count' },
          { value: 'year', label: 'Year' },
          { value: 'percentage', label: 'Percentage' },
          { value: 'currency', label: 'Currency' },
          { value: 'decimal', label: 'Decimal' },
          { value: 'duration', label: 'Duration' },
          { value: 'date', label: 'Date' },
          { value: 'identifier', label: 'Identifier' }
        ]
      },
      { name: 'prefix', label: 'Prefix', defaultValue: '' },
      { name: 'suffix', label: 'Suffix', defaultValue: '' },
      { name: 'icon', label: 'Icon Key', nullable: true },
      { name: 'description', label: 'Description', type: 'textarea', nullable: true },
      { name: 'order', label: 'Order', type: 'number', defaultValue: 0 },
      { name: 'published', label: 'Published', type: 'checkbox', defaultValue: true }
    ]}
  />
);

export default CompanyStatsAdmin;
