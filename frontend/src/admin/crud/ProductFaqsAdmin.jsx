import React, { useEffect, useState } from 'react';
import { apiGet } from '../../js/httpClient';
import AdminCrudPage from './AdminCrudPage';

const ProductFaqsAdmin = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    apiGet('/products/admin').then((data) => setProducts(data || [])).catch(() => setProducts([]));
  }, []);

  return (
    <AdminCrudPage
      title="Product FAQs"
      description="Manage questions shown on product detail pages."
      endpoint="/product-faqs"
      adminEndpoint="/product-faqs/admin"
      createLabel="Add Product FAQ"
      columns={[
        { key: 'question', title: 'Question' },
        { key: 'product', title: 'Product', render: (_value, row) => row.product?.name || row.productId },
        { key: 'order', title: 'Order' },
        { key: 'published', title: 'Published', render: (value) => value ? '✓' : '✗' }
      ]}
      fields={[
        { name: 'productId', label: 'Product', type: 'select', required: true, options: products.map((product) => ({ value: product.id, label: product.name })) },
        { name: 'question', label: 'Question', required: true },
        { name: 'answer', label: 'Answer', type: 'textarea', rows: 5, required: true },
        { name: 'order', label: 'Order', type: 'number', defaultValue: 0 },
        { name: 'published', label: 'Published', type: 'checkbox', defaultValue: true }
      ]}
    />
  );
};

export default ProductFaqsAdmin;
