import React from 'react';
import AdminCrudPage from './AdminCrudPage';

const FaqsAdmin = () => (
  <AdminCrudPage
    title="FAQs"
    description="Manage public questions used by the website and chatbot."
    endpoint="/faqs"
    adminEndpoint="/faqs/all"
    createLabel="Add FAQ"
    columns={[
      { key: 'question', title: 'Question' },
      { key: 'category', title: 'Category' },
      { key: 'order', title: 'Order' },
      { key: 'published', title: 'Published', render: (value) => value ? '✓' : '✗' }
    ]}
    fields={[
      { name: 'question', label: 'Question', required: true },
      { name: 'answer', label: 'Answer', type: 'textarea', rows: 5, required: true },
      { name: 'category', label: 'Category', defaultValue: 'General' },
      { name: 'order', label: 'Order', type: 'number', defaultValue: 0 },
      { name: 'published', label: 'Published', type: 'checkbox', defaultValue: true }
    ]}
  />
);

export default FaqsAdmin;
