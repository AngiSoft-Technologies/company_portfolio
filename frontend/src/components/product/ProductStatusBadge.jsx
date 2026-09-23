import React from 'react';
import { getProductStatusMeta } from '../../utils/products/normalizeProduct';

// Status badge — uses className from getProductStatusMeta for colour theming.
const ProductStatusBadge = ({ status, label, className }) => {
    const meta = getProductStatusMeta(status);
    const text = label || meta.label;
    const cls = className || meta.className;
    return (
        <span className={`product-status-badge ${cls}`}>
            <span className="product-status-badge__dot" aria-hidden="true" />
            {text}
        </span>
    );
};

export default ProductStatusBadge;
