import { resolveIcon as resolveByName } from '../iconRegistry';
import { resolveAssetUrl } from '../constants';

// Canonical solutions, kept in sync with the "Solutions" nav in site_navigation.
// Solutions have no dedicated backend model; this is the single source of truth
// for the /solutions index and /solutions/:slug detail pages. Slugs MUST match
// the nav hrefs (e.g. /solutions/point-of-sale -> slug "point-of-sale").
const SOLUTIONS = [
    {
        slug: 'business-management',
        name: 'Business Management',
        icon: 'FaCogs',
        description: 'Practical operations and management systems.',
        headline: 'Business Management Systems',
        longDescription: 'End-to-end management platforms that tie your operations, people, and reporting into one place — so you spend less time switching tools and more time running the business.',
        bgImage: '/uploads/public/images/services/it-consulting.jpg',
        features: ['Operations Dashboards', 'Task & Workflow Management', 'Reporting & Analytics', 'Role-Based Access', 'Document Handling', 'Third-Party Integrations'],
    },
    {
        slug: 'point-of-sale',
        name: 'Point of Sale',
        icon: 'FaCashRegister',
        description: 'Retail and restaurant POS with stock and reporting.',
        headline: 'Point of Sale Systems',
        longDescription: 'Fast, reliable POS for retail shops and restaurants — with stock control, receipts, and real-time sales reporting that keep the counter moving and the books clean.',
        bgImage: '/uploads/public/images/services/retail-bg.jpg',
        features: ['Sales & Checkout', 'Receipt Printing', 'Stock & Inventory Sync', 'Sales Reports', 'Multi-Outlet Support', 'Payment Integration'],
    },
    {
        slug: 'customer-management',
        name: 'Customer Management',
        icon: 'FaUsers',
        description: 'CRM and customer-support workflows.',
        headline: 'Customer Management (CRM)',
        longDescription: 'Customer relationship and support platforms that capture every interaction, automate follow-ups, and give your team a single view of each client.',
        bgImage: '/uploads/public/images/services/it-consulting.jpg',
        features: ['Contact & Account Records', 'Pipeline Management', 'Support Tickets', 'Automated Follow-Ups', 'Interaction History', 'Reporting'],
    },
    {
        slug: 'operations-management',
        name: 'Operations Management',
        icon: 'FaClipboardList',
        description: 'Scheduling, tasks and process automation.',
        headline: 'Operations Management',
        longDescription: 'Tools to schedule work, assign tasks, and automate the repetitive processes that slow teams down — with visibility across every location.',
        bgImage: '/uploads/public/images/services/it-consulting.jpg',
        features: ['Scheduling & Planning', 'Task Assignment', 'Process Automation', 'Approval Workflows', 'Activity Tracking', 'Performance Metrics'],
    },
    {
        slug: 'financial-tracking',
        name: 'Financial Tracking',
        icon: 'FaChartLine',
        description: 'Budgets, expenses and financial reporting.',
        headline: 'Financial Tracking',
        longDescription: 'Budgeting, expense tracking, and financial reporting that turns scattered spreadsheets into one clear picture of where the money goes.',
        bgImage: '/uploads/public/images/services/finance-bg.jpg',
        features: ['Budgets & Forecasts', 'Expense Tracking', 'Financial Reports', 'Cash-Flow Views', 'Category Insights', 'Export & Reconciliation'],
    },
    {
        slug: 'payments-billing',
        name: 'Payments & Billing',
        icon: 'FaCreditCard',
        description: 'Invoicing, billing and payment collection.',
        headline: 'Payments & Billing',
        longDescription: 'Invoice, billing, and payment-collection systems that get you paid faster — with reminders, receipts, and clean records for every transaction.',
        bgImage: '/uploads/public/images/services/finance-bg.jpg',
        features: ['Invoicing', 'Recurring Billing', 'Payment Collection', 'Payment Reminders', 'Receipts & Records', 'Reconciliation'],
    },
    {
        slug: 'asset-management',
        name: 'Asset Management',
        icon: 'FaWarehouse',
        description: 'Track and maintain physical and digital assets.',
        headline: 'Asset Management',
        longDescription: 'Track and maintain physical and digital assets across their lifecycle — from acquisition and assignment to maintenance and retirement.',
        bgImage: '/uploads/public/images/services/it-consulting.jpg',
        features: ['Asset Register', 'Assignment & Location', 'Maintenance Scheduling', 'Depreciation Tracking', 'Audit History', 'Lifecycle Reports'],
    },
    {
        slug: 'document-management',
        name: 'Document Management',
        icon: 'FaFileContract',
        description: 'Document storage, versioning and workflows.',
        headline: 'Document Management',
        longDescription: 'Secure storage, versioning, and approval workflows for your documents — so the right version is always findable and the right people can sign off.',
        bgImage: '/uploads/public/images/services/it-consulting.jpg',
        features: ['Secure Storage', 'Version Control', 'Approval Workflows', 'Search & Retrieval', 'Access Controls', 'Audit Trail'],
    },
    {
        slug: 'staff-portals',
        name: 'Staff Portals',
        icon: 'FaUserTie',
        description: 'Employee self-service and HR portals.',
        headline: 'Staff Portals',
        longDescription: 'Employee self-service portals where staff can view payslips, request leave, and update their details without looping in HR for every small task.',
        bgImage: '/uploads/public/images/services/it-consulting.jpg',
        features: ['Self-Service Profiles', 'Payslip Access', 'Leave Requests', 'Announcements', 'Document Access', 'Directory'],
    },
    {
        slug: 'human-resource-systems',
        name: 'HR Systems',
        icon: 'FaUsers',
        description: 'Recruitment, payroll and people operations.',
        headline: 'HR Systems',
        longDescription: 'Recruitment, payroll, and people-operations systems that cover the employee journey from hire to exit — accurate, compliant, and paper-light.',
        bgImage: '/uploads/public/images/services/it-consulting.jpg',
        features: ['Recruitment & Applicant Tracking', 'Payroll', 'Leave Management', 'Performance Reviews', 'People Analytics', 'Compliance'],
    },
    {
        slug: 'learning-platforms',
        name: 'Learning Platforms',
        icon: 'FaChalkboardTeacher',
        description: 'Training, courses and student information systems.',
        headline: 'Learning Platforms',
        longDescription: 'Training, course delivery, and student-information systems for schools and businesses — built to make learning and tracking effortless.',
        bgImage: '/uploads/public/images/services/education-bg.jpg',
        features: ['Course Management', 'Online Lessons', 'Assessments', 'Student Records', 'Progress Tracking', 'Certificates'],
    },
    {
        slug: 'ecommerce',
        name: 'eCommerce',
        icon: 'FaStore',
        description: 'Online stores and catalog management.',
        headline: 'eCommerce Platforms',
        longDescription: 'Online stores and catalog management that connect your products to customers — with inventory, checkout, and fulfilment working together.',
        bgImage: '/uploads/public/images/services/retail-bg.jpg',
        features: ['Online Storefront', 'Catalog Management', 'Cart & Checkout', 'Inventory Sync', 'Order Management', 'Promotions'],
    },
    {
        slug: 'inventory-management',
        name: 'Inventory Management',
        icon: 'FaBoxes',
        description: 'Stock, warehouses and procurement.',
        headline: 'Inventory Management',
        longDescription: 'Stock, warehouse, and procurement tools that keep the right items in the right place — reducing shrinkage and stockouts alike.',
        bgImage: '/uploads/public/images/services/retail-bg.jpg',
        features: ['Stock Tracking', 'Warehouse Management', 'Procurement', 'Reorder Alerts', 'Barcode Scanning', 'Inventory Reports'],
    },
    {
        slug: 'web-portals',
        name: 'Web Portals',
        icon: 'FaGlobe',
        description: 'Client, member and partner portals.',
        headline: 'Web Portals',
        longDescription: 'Client, member, and partner portals that give each audience a secure, branded front door to the services and data they need.',
        bgImage: '/uploads/public/images/services/it-consulting.jpg',
        features: ['Client Portals', 'Member Access', 'Partner Portals', 'Secure Login', 'Self-Service Actions', 'Branded Experience'],
    },
];

export function getSolutionSlug(value = '') {
    return String(value)
        .toLowerCase()
        .trim()
        .replace(/&/g, ' ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function resolveSolutionIcon(iconName, fallback = 'FaPuzzlePiece') {
    return resolveByName(iconName) || resolveByName(fallback);
}

export function getSolutionRoute(slugOrSolution) {
    const slug = typeof slugOrSolution === 'string'
        ? slugOrSolution
        : getSolutionSlug(slugOrSolution?.slug || slugOrSolution?.name);
    if (!slug) return '/solutions';
    return `/solutions/${slug}`;
}

export function normalizeSolution(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const slug = raw.slug ? getSolutionSlug(raw.slug) : getSolutionSlug(raw.name);
    return {
        id: raw.id || slug,
        slug,
        name: raw.name || 'Solution',
        icon: resolveSolutionIcon(raw.icon),
        bgImage: resolveAssetUrl(raw.bgImage || '/uploads/public/images/services/it-consulting.jpg'),
        description: raw.description || '',
        headline: raw.headline || raw.name || 'Solution',
        longDescription: raw.longDescription || raw.description || '',
        features: (raw.features || []).filter(Boolean),
    };
}

export function normalizeSolutions(list) {
    if (!Array.isArray(list)) return [];
    return list.map(normalizeSolution).filter(Boolean);
}

export const SOLUTIONS_RAW = SOLUTIONS;
export const solutionsList = normalizeSolutions(SOLUTIONS);
