import dotenv from 'dotenv';
import prisma from '../src/db';

dotenv.config();

// Targeted upsert for the `site_industries` setting only — canonical 12
// industries with explicit slug + description. Avoids re-running the full
// seed (which would be gated by SEED_OVERWRITE_PUBLIC_CONTENT).
const industriesValue = {
  badge: 'Industries We Serve',
  title: 'Digital systems for real industry workflows',
  subtitle:
    'AngiSoft applies software, data, automation, and platform thinking to the sectors where practical technology can improve operations.',
  industries: [
    {
      slug: 'retail',
      name: 'Retail and SMEs',
      icon: 'FaShoppingCart',
      description: 'POS, stock, sales and business-management workflows.',
      bgImage: '/uploads/public/images/services/retail-bg.jpg',
      services: [
        { icon: 'FaBarcode', name: 'POS Systems' },
        { icon: 'FaStore', name: 'Online Stores' },
        { icon: 'FaReceipt', name: 'Inventory Management' },
        { icon: 'FaTags', name: 'Loyalty Programs' },
        { icon: 'FaChartPie', name: 'Sales Analytics' },
        { icon: 'FaTruckLoading', name: 'Order Fulfillment' },
      ],
    },
    {
      slug: 'education',
      name: 'Education',
      icon: 'FaGraduationCap',
      description: 'School management, learning and student-support systems.',
      bgImage: '/uploads/public/images/services/education-bg.jpg',
      services: [
        { icon: 'FaSchool', name: 'School Management' },
        { icon: 'FaLaptopCode', name: 'E-Learning Platforms' },
        { icon: 'FaChalkboardTeacher', name: 'Virtual Classrooms' },
        { icon: 'FaBook', name: 'Content Management' },
        { icon: 'FaChartPie', name: 'Student Analytics' },
        { icon: 'FaClipboardList', name: 'Examination Systems' },
      ],
    },
    {
      slug: 'real-estate',
      name: 'Real Estate',
      icon: 'FaHome',
      description: 'Property discovery, management and stakeholder coordination.',
      bgImage: '/uploads/public/images/services/realestate-bg.jpg',
      services: [
        { icon: 'FaBuilding', name: 'Property Management' },
        { icon: 'FaKey', name: 'Tenant Portals' },
        { icon: 'FaWarehouse', name: 'Inventory Tracking' },
        { icon: 'FaClipboardList', name: 'Lease Management' },
        { icon: 'FaCalculator', name: 'Rent Collection' },
        { icon: 'FaDrawPolygon', name: 'Virtual Tours' },
      ],
    },
    {
      slug: 'fuel-energy',
      name: 'Fuel & Energy',
      icon: 'FaWarehouse',
      description: 'Station, pump and energy operations tooling.',
      bgImage: '/uploads/public/images/services/energy-bg.jpg',
      services: [
        { icon: 'FaGasPump', name: 'Station Management' },
        { icon: 'FaTachometerAlt', name: 'Pump Monitoring' },
        { icon: 'FaChartLine', name: 'Energy Analytics' },
        { icon: 'FaClipboardList', name: 'Dispatching & Reconciliation' },
        { icon: 'FaWarehouse', name: 'Bulk Inventory' },
        { icon: 'FaBolt', name: 'Grid Operations' },
      ],
    },
    {
      slug: 'healthcare',
      name: 'Healthcare',
      icon: 'FaHeartbeat',
      description: 'EHR/EMR, patient portals and hospital management.',
      bgImage: '/uploads/public/images/services/healthcare-bg.jpg',
      services: [
        { icon: 'FaStethoscope', name: 'EHR/EMR Systems' },
        { icon: 'FaUserMd', name: 'Patient Portals' },
        { icon: 'FaHospital', name: 'Hospital Management' },
        { icon: 'FaPills', name: 'Pharmacy Management' },
        { icon: 'FaCalendarCheck', name: 'Appointment Scheduling' },
        { icon: 'FaChartPie', name: 'Health Analytics' },
      ],
    },
    {
      slug: 'telecommunications',
      name: 'Telecommunications',
      icon: 'FaWifi',
      description: 'ISP billing, network monitoring and customer-service platforms.',
      bgImage: '/uploads/public/images/services/telecom-bg.jpg',
      services: [
        { icon: 'FaWifi', name: 'ISP Billing' },
        { icon: 'FaSignal', name: 'Network Monitoring' },
        { icon: 'FaServer', name: 'Infrastructure Mgmt' },
        { icon: 'FaHeadset', name: 'Customer Portals' },
        { icon: 'FaChartPie', name: 'Usage Analytics' },
        { icon: 'FaClipboardList', name: 'Service Provisioning' },
      ],
    },
    {
      slug: 'finance',
      name: 'Finance',
      icon: 'FaUniversity',
      description: 'Payment processing, financial dashboards and compliance reporting.',
      bgImage: '/uploads/public/images/services/finance-bg.jpg',
      services: [
        { icon: 'FaCreditCard', name: 'Payment Processing' },
        { icon: 'FaChartPie', name: 'Financial Dashboards' },
        { icon: 'FaWallet', name: 'Mobile Banking' },
        { icon: 'FaMoneyBillWave', name: 'Loan Management' },
        { icon: 'FaShieldAlt', name: 'Fraud Detection' },
        { icon: 'FaFileContract', name: 'Compliance Reporting' },
      ],
    },
    {
      slug: 'ecommerce',
      name: 'eCommerce',
      icon: 'FaStore',
      description: 'Online stores, POS, inventory and order fulfilment.',
      bgImage: '/uploads/public/images/services/retail-bg.jpg',
      services: [
        { icon: 'FaStore', name: 'Online Stores' },
        { icon: 'FaBarcode', name: 'POS Integration' },
        { icon: 'FaBoxes', name: 'Inventory Management' },
        { icon: 'FaTruck', name: 'Order Fulfilment' },
        { icon: 'FaTags', name: 'Promotions & Discounts' },
        { icon: 'FaChartPie', name: 'Commerce Analytics' },
      ],
    },
    {
      slug: 'creative',
      name: 'Creative Industries',
      icon: 'FaPaintBrush',
      description: 'Digital platforms for artists, DJs and content distribution.',
      bgImage: '/uploads/public/images/services/ai-automation.jpg',
      services: [
        { icon: 'FaMusic', name: 'Distribution Platforms' },
        { icon: 'FaChartPie', name: 'Royalty Tracking' },
        { icon: 'FaLaptopCode', name: 'Streaming Systems' },
        { icon: 'FaClipboardList', name: 'Rights Management' },
        { icon: 'FaPaintBrush', name: 'Portfolio Tools' },
        { icon: 'FaBullhorn', name: 'Audience Engagement' },
      ],
    },
    {
      slug: 'professional-services',
      name: 'Professional Services',
      icon: 'FaBriefcase',
      description: 'Operational systems, documents, reporting and digital workflows.',
      bgImage: '/uploads/public/images/services/it-consulting.jpg',
      services: [
        { icon: 'FaUserTie', name: 'CRM Systems' },
        { icon: 'FaFileContract', name: 'Contract Management' },
        { icon: 'FaCalculator', name: 'Billing & Invoicing' },
        { icon: 'FaHandshake', name: 'Client Portals' },
        { icon: 'FaClipboardList', name: 'Document Workflows' },
        { icon: 'FaChartBar', name: 'Practice Reporting' },
      ],
    },
    {
      slug: 'hospitality',
      name: 'Hospitality',
      icon: 'FaConciergeBell',
      description: 'Booking, customer-service and operations tooling.',
      bgImage: '/uploads/public/images/services/hospitality-bg.jpg',
      services: [
        { icon: 'FaBed', name: 'Reservation Systems' },
        { icon: 'FaConciergeBell', name: 'Guest Services' },
        { icon: 'FaUtensils', name: 'Food & Beverage' },
        { icon: 'FaChartLine', name: 'Occupancy Analytics' },
        { icon: 'FaClipboardList', name: 'Housekeeping Ops' },
        { icon: 'FaHeadset', name: 'Guest Comms' },
      ],
    },
    {
      slug: 'transport-logistics',
      name: 'Transport & Logistics',
      icon: 'FaTruck',
      description: 'Fleet, dispatch, tracking and coordination workflows.',
      bgImage: '/uploads/public/images/services/logistics-bg.jpg',
      services: [
        { icon: 'FaRoute', name: 'Route Optimization' },
        { icon: 'FaBoxes', name: 'Warehouse Management' },
        { icon: 'FaTruckLoading', name: 'Fleet Tracking' },
        { icon: 'FaMapMarkedAlt', name: 'Dispatch & Tracking' },
        { icon: 'FaClipboardList', name: 'Order Management' },
        { icon: 'FaWarehouse', name: 'Inventory Coordination' },
      ],
    },
  ],
};

async function run() {
  await prisma.setting.upsert({
    where: { key: 'site_industries' },
    update: { value: industriesValue as any },
    create: { key: 'site_industries', value: industriesValue as any },
  });
  console.log('✅ Upserted site_industries with 12 canonical industries');
}

run()
  .catch((e) => {
    console.error('❌ Failed to upsert site_industries:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
