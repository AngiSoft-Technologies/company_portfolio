import React from 'react';
import AdminCrudPage from './AdminCrudPage';

const AnnouncementsAdmin = () => (
  <AdminCrudPage
    title="Announcements"
    description="Manage public and internal announcements."
    endpoint="/announcements"
    adminEndpoint="/announcements/admin"
    createLabel="Add Announcement"
    columns={[
      { key: 'title', title: 'Title' },
      { key: 'audience', title: 'Audience' },
      { key: 'priority', title: 'Priority' },
      { key: 'published', title: 'Published', render: (value) => value ? '✓' : '✗' }
    ]}
    fields={[
      { name: 'title', label: 'Title', required: true },
      { name: 'body', label: 'Body', type: 'textarea', rows: 5, required: true },
      { name: 'audience', label: 'Audience', defaultValue: 'all' },
      { name: 'priority', label: 'Priority', defaultValue: 'normal' },
      { name: 'publishedAt', label: 'Published At', type: 'datetime-local', nullable: true },
      { name: 'expiresAt', label: 'Expires At', type: 'datetime-local', nullable: true },
      { name: 'published', label: 'Published', type: 'checkbox', defaultValue: false }
    ]}
  />
);

export default AnnouncementsAdmin;
