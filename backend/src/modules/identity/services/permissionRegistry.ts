/**
 * permissionRegistry.ts
 * ─────────────────────────────────────────────────────────────────────────
 * THE single source of truth for AngiSoft permission keys.
 *
 * Problem this solves (ANGISOFT_DIGITAL_HQ_PLAN.md §5.2, §12):
 * three incompatible vocabularies were in use simultaneously —
 *   1. seed keys            (`backend/prisma/seed.ts`)  e.g. `content.manage`
 *   2. UI catalogue keys    (`routes/staff-access.ts`) e.g. `services.manage`
 *   3. route guard keys     (scattered)                e.g. `services.create`
 * A role granted one set did not satisfy a guard checking another, so access
 * was effectively undefined.
 *
 * This module canonicalises on the **route guard vocabulary**, because that is
 * what actually enforces access. The other two vocabularies are mapped into it
 * via `LEGACY_KEY_ALIASES` and retired at the same time.
 *
 * Metadata (group / risk / scope / description) lives here in code rather than
 * on the `Permission` table, because that table has no metadata columns yet.
 * `prisma/seed.ts` seeds `Permission` rows from this list, so the DB remains
 * the runtime source the resolver reads. Adding metadata columns is a Phase 2
 * migration; nothing downstream changes when it happens.
 *
 * `order` is the display order **within** a group. Group order is defined by
 * `PERMISSION_GROUPS`; the two are never mixed.
 */

// ─── Types ────────────────────────────────────────────────────────────────

export type PermissionGroup =
    | 'Profile'
    | 'Staff'
    | 'Publications'
    | 'Services'
    | 'Service Categories'
    | 'Products'
    | 'Product FAQs'
    | 'FAQs'
    | 'Bookings'
    | 'Enquiries'
    | 'Leads'
    | 'Sales Pipeline'
    | 'Newsletters'
    | 'Surveys'
    | 'Product Inquiries'
    | 'Support Tickets'
    | 'Expenses'
    | 'Leave'
    | 'Attendance'
    | 'Payroll'
    | 'Approvals'
    | 'Projects'
    | 'Clients'
    | 'Careers'
    | 'Industries'
    | 'Solutions'
    | 'Company Stats'
    | 'Certifications'
    | 'Media'
    | 'Reviews'
    | 'Pages'
    | 'Analytics'
    | 'Chatbot'
    | 'AI Workforce'
    | 'Administration';

export type PermissionRisk = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * `global`    — any record
 * `assigned`  — only records the employee is assigned to (join table / FK)
 * `own`       — only records they authored or own
 */
export type PermissionScope = 'global' | 'assigned' | 'own';

export interface PermissionDefinition {
    key: string;
    display: string;
    description: string;
    group: PermissionGroup;
    risk: PermissionRisk;
    /** True when the permission only permits records the employee is assigned to. */
    scopeRequiresAssignment?: boolean;
    /** UX grouping for the admin Role & Permissions screen. */
    order: number;
}

// ─── Canonical registry ───────────────────────────────────────────────────

export const PERMISSIONS: PermissionDefinition[] = [
    // ── Profile ──────────────────────────────────────────────────────────
    { key: 'profile.view_own', display: 'View Own Profile', description: 'View own employee record', group: 'Profile', risk: 'LOW', order: 10 },
    { key: 'profile.update_own', display: 'Edit Own Profile', description: 'Edit own bio, links, titles, skills', group: 'Profile', risk: 'LOW', order: 11 },
    { key: 'profile.manage_visibility_own', display: 'Manage Own Visibility', description: 'Toggle public/private profile, set display title', group: 'Profile', risk: 'MEDIUM', order: 12 },
    { key: 'profile.manage_gallery_own', display: 'Manage Own Gallery', description: 'Add/edit portfolio items and profile stats', group: 'Profile', risk: 'MEDIUM', order: 13 },

    // ── Staff ────────────────────────────────────────────────────────────
    { key: 'staff.view', display: 'View Staff', description: 'View the employee directory', group: 'Staff', risk: 'LOW', order: 20 },
    { key: 'staff.invite', display: 'Invite Staff', description: 'Send employee invitations', group: 'Staff', risk: 'MEDIUM', order: 21 },
    { key: 'staff.assign_permissions', display: 'Assign Permissions', description: 'Grant or deny permissions for an employee', group: 'Staff', risk: 'HIGH', order: 22 },
    { key: 'staff.assign_department', display: 'Assign Department', description: 'Set an employee\'s department', group: 'Staff', risk: 'MEDIUM', order: 23 },
    { key: 'staff.assign_position', display: 'Assign Position', description: 'Set an employee\'s position and defaults', group: 'Staff', risk: 'MEDIUM', order: 24 },
    { key: 'staff.suspend', display: 'Suspend Staff', description: 'Suspend or revoke employee access', group: 'Staff', risk: 'HIGH', order: 25 },

    // ── Publications ─────────────────────────────────────────────────────
    { key: 'publications.create', display: 'Create Publications', description: 'Draft blog posts and staff publications', group: 'Publications', risk: 'LOW', order: 30 },
    { key: 'publications.view_own', display: 'View Own Publications', description: 'View own drafts', group: 'Publications', risk: 'LOW', order: 31, scopeRequiresAssignment: true },
    { key: 'publications.update_own', display: 'Edit Own Publications', description: 'Edit own drafts', group: 'Publications', risk: 'LOW', order: 32, scopeRequiresAssignment: true },
    { key: 'publications.review', display: 'Review Publications', description: 'Approve or request changes on drafts', group: 'Publications', risk: 'MEDIUM', order: 33 },
    { key: 'publications.publish', display: 'Publish Publications', description: 'Publish to the public site', group: 'Publications', risk: 'MEDIUM', order: 34 },
    { key: 'publications.delete', display: 'Delete Publications', description: 'Delete blog posts and staff publications', group: 'Publications', risk: 'MEDIUM', order: 35 },

    // ── Services ─────────────────────────────────────────────────────────
    { key: 'services.view', display: 'View Services', description: 'View the service catalogue', group: 'Services', risk: 'LOW', order: 40 },
    { key: 'services.create', display: 'Create Services', description: 'Create services', group: 'Services', risk: 'MEDIUM', order: 41 },
    { key: 'services.update', display: 'Edit Services', description: 'Edit services', group: 'Services', risk: 'MEDIUM', order: 42 },
    { key: 'services.archive', display: 'Archive Services', description: 'Archive services', group: 'Services', risk: 'MEDIUM', order: 43 },
    { key: 'services.manage_pricing', display: 'Manage Service Pricing', description: 'Edit service pricing packages', group: 'Services', risk: 'MEDIUM', order: 44 },

    // ── Service Categories ───────────────────────────────────────────────
    { key: 'service_categories.view', display: 'View Service Categories', description: 'View service categories', group: 'Service Categories', risk: 'LOW', order: 10 },
    { key: 'service_categories.create', display: 'Create Service Categories', description: 'Create service categories', group: 'Service Categories', risk: 'MEDIUM', order: 11 },
    { key: 'service_categories.update', display: 'Edit Service Categories', description: 'Edit service categories', group: 'Service Categories', risk: 'MEDIUM', order: 12 },
    { key: 'service_categories.delete', display: 'Delete Service Categories', description: 'Delete service categories', group: 'Service Categories', risk: 'MEDIUM', order: 13 },

    // ── Products ─────────────────────────────────────────────────────────
    { key: 'products.view', display: 'View Products', description: 'View the product catalogue', group: 'Products', risk: 'LOW', order: 40 },
    { key: 'products.create', display: 'Create Products', description: 'Create products', group: 'Products', risk: 'MEDIUM', order: 41 },
    { key: 'products.update', display: 'Edit Products', description: 'Edit products', group: 'Products', risk: 'MEDIUM', order: 42 },
    { key: 'products.archive', display: 'Archive Products', description: 'Archive products', group: 'Products', risk: 'MEDIUM', order: 43 },
    { key: 'products.view_assigned', display: 'View Assigned Products', description: 'View products the employee is on the team of', group: 'Products', risk: 'LOW', order: 44, scopeRequiresAssignment: true },
    { key: 'products.update_assigned', display: 'Edit Assigned Products', description: 'Edit products the employee is on the team of', group: 'Products', risk: 'MEDIUM', order: 45, scopeRequiresAssignment: true },

    // ── Product FAQs ─────────────────────────────────────────────────────
    { key: 'product_faqs.view', display: 'View Product FAQs', description: 'View product FAQs', group: 'Product FAQs', risk: 'LOW', order: 10 },
    { key: 'product_faqs.create', display: 'Create Product FAQs', description: 'Create product FAQs', group: 'Product FAQs', risk: 'MEDIUM', order: 11 },
    { key: 'product_faqs.update', display: 'Edit Product FAQs', description: 'Edit product FAQs', group: 'Product FAQs', risk: 'MEDIUM', order: 12 },
    { key: 'product_faqs.delete', display: 'Delete Product FAQs', description: 'Delete product FAQs', group: 'Product FAQs', risk: 'MEDIUM', order: 13 },

    // ── FAQs ─────────────────────────────────────────────────────────────
    { key: 'faqs.view', display: 'View FAQs', description: 'View the FAQ library', group: 'FAQs', risk: 'LOW', order: 10 },
    { key: 'faqs.create', display: 'Create FAQs', description: 'Create FAQs', group: 'FAQs', risk: 'MEDIUM', order: 11 },
    { key: 'faqs.update', display: 'Edit FAQs', description: 'Edit FAQs', group: 'FAQs', risk: 'MEDIUM', order: 12 },
    { key: 'faqs.delete', display: 'Delete FAQs', description: 'Delete FAQs', group: 'FAQs', risk: 'MEDIUM', order: 13 },

    // ── Bookings ─────────────────────────────────────────────────────────
    { key: 'bookings.view_all', display: 'View All Bookings', description: 'View every booking', group: 'Bookings', risk: 'MEDIUM', order: 40 },
    { key: 'bookings.view_assigned', display: 'View Assigned Bookings', description: 'View bookings assigned to the employee', group: 'Bookings', risk: 'LOW', order: 41, scopeRequiresAssignment: true },
    { key: 'bookings.update_assigned', display: 'Review Assigned Bookings', description: 'Accept/reject and update assigned bookings', group: 'Bookings', risk: 'MEDIUM', order: 42, scopeRequiresAssignment: true },
    { key: 'bookings.change_stage', display: 'Change Booking Stage', description: 'Advance the booking stage machine', group: 'Bookings', risk: 'MEDIUM', order: 43, scopeRequiresAssignment: true },
    { key: 'bookings.add_progress', display: 'Add Booking Progress', description: 'Post progress updates to a booking', group: 'Bookings', risk: 'MEDIUM', order: 44, scopeRequiresAssignment: true },
    { key: 'bookings.message_customer', display: 'Message Customer', description: 'Send messages on a booking', group: 'Bookings', risk: 'MEDIUM', order: 45, scopeRequiresAssignment: true },
    { key: 'bookings.assign', display: 'Assign Bookings', description: 'Assign a booking to staff', group: 'Bookings', risk: 'MEDIUM', order: 46 },

    // ── Enquiries ────────────────────────────────────────────────────────
    { key: 'enquiries.view_all', display: 'View All Enquiries', description: 'View every contact enquiry', group: 'Enquiries', risk: 'MEDIUM', order: 10 },
    { key: 'enquiries.view_assigned', display: 'View Assigned Enquiries', description: 'View enquiries assigned to the employee', group: 'Enquiries', risk: 'LOW', order: 11, scopeRequiresAssignment: true },
    { key: 'enquiries.respond', display: 'Respond to Enquiries', description: 'Reply to and update enquiries', group: 'Enquiries', risk: 'MEDIUM', order: 12, scopeRequiresAssignment: true },
    { key: 'enquiries.close', display: 'Close Enquiries', description: 'Close enquiries', group: 'Enquiries', risk: 'MEDIUM', order: 13, scopeRequiresAssignment: true },

    // ── Leads ────────────────────────────────────────────────────────────
    { key: 'leads.view', display: 'View Leads', description: 'View the lead pipeline', group: 'Leads', risk: 'LOW', order: 10 },
    { key: 'leads.create', display: 'Create Leads', description: 'Create leads', group: 'Leads', risk: 'MEDIUM', order: 11 },
    { key: 'leads.update', display: 'Edit Leads', description: 'Edit and re-stage leads', group: 'Leads', risk: 'MEDIUM', order: 12 },
    { key: 'leads.delete', display: 'Delete Leads', description: 'Delete leads', group: 'Leads', risk: 'MEDIUM', order: 13 },

    // ── Sales Pipeline ───────────────────────────────────────────────────
    { key: 'sales.pipeline.view', display: 'View Sales Pipeline', description: 'View the department-wide sales pipeline dashboard', group: 'Sales Pipeline', risk: 'LOW', order: 5 },
    { key: 'opportunities.view', display: 'View Opportunities', description: 'View the opportunity pipeline', group: 'Sales Pipeline', risk: 'LOW', order: 10 },
    { key: 'opportunities.create', display: 'Create Opportunities', description: 'Create opportunities', group: 'Sales Pipeline', risk: 'MEDIUM', order: 11 },
    { key: 'opportunities.update', display: 'Edit Opportunities', description: 'Edit and re-stage opportunities', group: 'Sales Pipeline', risk: 'MEDIUM', order: 12 },
    { key: 'opportunities.delete', display: 'Delete Opportunities', description: 'Delete opportunities', group: 'Sales Pipeline', risk: 'MEDIUM', order: 13 },
    { key: 'quotes.view', display: 'View Quotes', description: 'View quotations', group: 'Sales Pipeline', risk: 'LOW', order: 20 },
    { key: 'quotes.create', display: 'Create Quotes', description: 'Create quotations', group: 'Sales Pipeline', risk: 'MEDIUM', order: 21 },
    { key: 'quotes.update', display: 'Edit Quotes', description: 'Edit quotations', group: 'Sales Pipeline', risk: 'MEDIUM', order: 22 },
    { key: 'quotes.send', display: 'Send Quotes', description: 'Send quotations to clients', group: 'Sales Pipeline', risk: 'MEDIUM', order: 23 },
    { key: 'quotes.approve', display: 'Approve Quotes', description: 'Approve quotations above the configured approval threshold', group: 'Sales Pipeline', risk: 'HIGH', order: 23.5 },
    { key: 'quotes.accept', display: 'Accept Quotes', description: 'Mark quotations accepted by the client', group: 'Sales Pipeline', risk: 'MEDIUM', order: 24 },
    { key: 'quotes.delete', display: 'Delete Quotes', description: 'Delete quotations', group: 'Sales Pipeline', risk: 'MEDIUM', order: 25 },
    { key: 'invoices.view', display: 'View Invoices', description: 'View invoices', group: 'Sales Pipeline', risk: 'LOW', order: 30 },
    { key: 'invoices.create', display: 'Create Invoices', description: 'Create invoices', group: 'Sales Pipeline', risk: 'MEDIUM', order: 31 },
    { key: 'invoices.update', display: 'Edit Invoices', description: 'Edit draft invoices', group: 'Sales Pipeline', risk: 'MEDIUM', order: 32 },
    { key: 'invoices.issue', display: 'Issue Invoices', description: 'Issue invoices to clients', group: 'Sales Pipeline', risk: 'MEDIUM', order: 33 },
    { key: 'invoices.void', display: 'Void Invoices', description: 'Void issued invoices', group: 'Sales Pipeline', risk: 'HIGH', order: 34 },
    { key: 'invoices.delete', display: 'Delete Invoices', description: 'Delete draft invoices', group: 'Sales Pipeline', risk: 'MEDIUM', order: 35 },

    // ── Newsletters ──────────────────────────────────────────────────────
    { key: 'newsletters.view', display: 'View Newsletters', description: 'View campaigns and subscribers', group: 'Newsletters', risk: 'LOW', order: 10 },
    { key: 'newsletters.create', display: 'Create Newsletters', description: 'Create newsletter campaigns', group: 'Newsletters', risk: 'MEDIUM', order: 11 },
    { key: 'newsletters.update', display: 'Edit Newsletters', description: 'Edit newsletter campaigns', group: 'Newsletters', risk: 'MEDIUM', order: 12 },
    { key: 'newsletters.delete', display: 'Delete Newsletters', description: 'Delete newsletter campaigns', group: 'Newsletters', risk: 'MEDIUM', order: 13 },
    { key: 'newsletters.send', display: 'Send Newsletters', description: 'Send campaigns and broadcasts to subscribers', group: 'Newsletters', risk: 'HIGH', order: 14 },

    // ── Surveys ──────────────────────────────────────────────────────────
    { key: 'surveys.view', display: 'View Surveys', description: 'View surveys', group: 'Surveys', risk: 'LOW', order: 10 },
    { key: 'surveys.create', display: 'Create Surveys', description: 'Create surveys', group: 'Surveys', risk: 'MEDIUM', order: 11 },
    { key: 'surveys.update', display: 'Edit Surveys', description: 'Edit surveys', group: 'Surveys', risk: 'MEDIUM', order: 12 },
    { key: 'surveys.delete', display: 'Delete Surveys', description: 'Delete surveys', group: 'Surveys', risk: 'MEDIUM', order: 13 },
    { key: 'surveys.view_responses', display: 'View Survey Responses', description: 'Read submitted survey responses', group: 'Surveys', risk: 'MEDIUM', order: 14 },

    // ── Product Inquiries ────────────────────────────────────────────────
    { key: 'product_inquiries.view', display: 'View Product Inquiries', description: 'View product enquiries', group: 'Product Inquiries', risk: 'LOW', order: 10 },
    { key: 'product_inquiries.update', display: 'Respond to Product Inquiries', description: 'Reply to and update product enquiries', group: 'Product Inquiries', risk: 'MEDIUM', order: 11 },

    // ── Support Tickets ──────────────────────────────────────────────────
    { key: 'support_tickets.view', display: 'View Support Tickets', description: 'View support tickets', group: 'Support Tickets', risk: 'LOW', order: 10 },
    { key: 'support_tickets.create', display: 'Create Support Tickets', description: 'Open support tickets', group: 'Support Tickets', risk: 'LOW', order: 11 },
    { key: 'support_tickets.update', display: 'Edit Support Tickets', description: 'Update ticket status and assignment', group: 'Support Tickets', risk: 'MEDIUM', order: 12 },
    { key: 'support_tickets.respond', display: 'Respond to Support Tickets', description: 'Reply on support tickets', group: 'Support Tickets', risk: 'MEDIUM', order: 13 },

    // ── Expenses ─────────────────────────────────────────────────────────
    { key: 'expenses.view', display: 'View Expenses', description: 'View expense reports', group: 'Expenses', risk: 'LOW', order: 10 },
    { key: 'expenses.create', display: 'Create Expenses', description: 'Submit expense claims', group: 'Expenses', risk: 'LOW', order: 11 },
    { key: 'expenses.update', display: 'Edit Expenses', description: 'Edit expense drafts and details', group: 'Expenses', risk: 'MEDIUM', order: 12 },
    { key: 'expenses.approve', display: 'Approve Expenses', description: 'Approve expense claims (required above APPROVAL_THRESHOLD_EXPENSE)', group: 'Expenses', risk: 'HIGH', order: 13 },
    { key: 'expenses.mark_paid', display: 'Mark Expenses Paid', description: 'Record expense reimbursement', group: 'Expenses', risk: 'MEDIUM', order: 14 },
    { key: 'expenses.delete', display: 'Delete Expenses', description: 'Delete expense records', group: 'Expenses', risk: 'MEDIUM', order: 15 },

    // ── Leave ────────────────────────────────────────────────────────────
    { key: 'leave.request', display: 'Request Leave', description: 'Submit and cancel own leave requests', group: 'Leave', risk: 'LOW', order: 10 },
    { key: 'leave.view', display: 'View Leave Requests', description: 'View all leave requests', group: 'Leave', risk: 'MEDIUM', order: 11 },
    { key: 'leave.approve', display: 'Approve Leave', description: 'Approve or reject leave requests', group: 'Leave', risk: 'MEDIUM', order: 12 },

    // ── Attendance ───────────────────────────────────────────────────────
    { key: 'attendance.record', display: 'Record Attendance', description: 'Check in/out and view own attendance', group: 'Attendance', risk: 'LOW', order: 10 },
    { key: 'attendance.view', display: 'View Attendance', description: 'View all staff attendance records', group: 'Attendance', risk: 'MEDIUM', order: 11 },
    { key: 'attendance.manage', display: 'Manage Attendance', description: 'Create, edit and delete attendance records', group: 'Attendance', risk: 'MEDIUM', order: 12 },

    // ── Payroll ──────────────────────────────────────────────────────────
    { key: 'payroll.view', display: 'View Payslips', description: 'View all employee payslips', group: 'Payroll', risk: 'HIGH', order: 10 },
    { key: 'payroll.manage', display: 'Manage Payslips', description: 'Create and edit payslips', group: 'Payroll', risk: 'HIGH', order: 11 },
    { key: 'payroll.approve', display: 'Approve Payslips', description: 'Approve payslips for payment', group: 'Payroll', risk: 'HIGH', order: 12 },
    { key: 'payroll.mark_paid', display: 'Mark Payslips Paid', description: 'Record payslip payment', group: 'Payroll', risk: 'HIGH', order: 13 },

    // ── Approvals ────────────────────────────────────────────────────────
    { key: 'approvals.view', display: 'View Approvals', description: 'View approval requests and the permission catalogue', group: 'Approvals', risk: 'LOW', order: 10 },
    { key: 'approvals.manage', display: 'Manage Approvals', description: 'Create and cancel approval requests', group: 'Approvals', risk: 'MEDIUM', order: 11 },
    { key: 'approvals.respond', display: 'Respond to Approvals', description: 'Approve or reject steps on approval requests', group: 'Approvals', risk: 'MEDIUM', order: 12 },

    // ── Projects ─────────────────────────────────────────────────────────
    { key: 'projects.view', display: 'View Projects', description: 'View all showcase projects', group: 'Projects', risk: 'LOW', order: 40 },
    { key: 'projects.view_assigned', display: 'View Assigned Projects', description: 'View projects the employee is on', group: 'Projects', risk: 'LOW', order: 41, scopeRequiresAssignment: true },
    { key: 'projects.update_assigned', display: 'Edit Assigned Projects', description: 'Edit projects the employee is on', group: 'Projects', risk: 'MEDIUM', order: 42, scopeRequiresAssignment: true },
    { key: 'projects.manage', display: 'Manage Projects', description: 'Create, edit, delete any project', group: 'Projects', risk: 'MEDIUM', order: 43 },
    { key: 'projects.add_progress', display: 'Add Project Progress', description: 'Post project activity', group: 'Projects', risk: 'MEDIUM', order: 44, scopeRequiresAssignment: true },
    { key: 'projects.assign_team', display: 'Assign Project Team', description: 'Add staff to a project team', group: 'Projects', risk: 'MEDIUM', order: 45 },

    // ── Clients ──────────────────────────────────────────────────────────
    { key: 'client_projects.view_all', display: 'View All Client Projects', description: 'View every client project', group: 'Clients', risk: 'MEDIUM', order: 10 },
    { key: 'client_projects.view_assigned', display: 'View Assigned Client Projects', description: 'View client projects the employee is on', group: 'Clients', risk: 'LOW', order: 11, scopeRequiresAssignment: true },
    { key: 'client_projects.add_progress', display: 'Add Client Project Progress', description: 'Post milestones, deliverables, comments', group: 'Clients', risk: 'MEDIUM', order: 12, scopeRequiresAssignment: true },

    // ── Careers ──────────────────────────────────────────────────────────
    { key: 'careers.view', display: 'View Careers', description: 'View job postings and applications', group: 'Careers', risk: 'LOW', order: 10 },
    { key: 'careers.create', display: 'Create Job Postings', description: 'Create job postings', group: 'Careers', risk: 'MEDIUM', order: 11 },
    { key: 'careers.update', display: 'Edit Job Postings', description: 'Edit job postings', group: 'Careers', risk: 'MEDIUM', order: 12 },
    { key: 'careers.delete', display: 'Delete Job Postings', description: 'Delete job postings', group: 'Careers', risk: 'MEDIUM', order: 13 },
    { key: 'careers.applications.view', display: 'View Applications', description: 'View submitted job applications', group: 'Careers', risk: 'MEDIUM', order: 14 },
    { key: 'careers.applications.respond', display: 'Respond to Applications', description: 'Reply to and move job applications', group: 'Careers', risk: 'MEDIUM', order: 15 },
    { key: 'careers.update_content', display: 'Edit Careers Page', description: 'Edit the public careers page content', group: 'Careers', risk: 'MEDIUM', order: 16 },

    // ── Industries ───────────────────────────────────────────────────────
    { key: 'industries.view', display: 'View Industries', description: 'View industry records', group: 'Industries', risk: 'LOW', order: 10 },
    { key: 'industries.create', display: 'Create Industries', description: 'Create industries', group: 'Industries', risk: 'MEDIUM', order: 11 },
    { key: 'industries.update', display: 'Edit Industries', description: 'Edit industries', group: 'Industries', risk: 'MEDIUM', order: 12 },
    { key: 'industries.delete', display: 'Delete Industries', description: 'Delete industries', group: 'Industries', risk: 'MEDIUM', order: 13 },

    // ── Solutions ────────────────────────────────────────────────────────
    { key: 'solutions.view', display: 'View Solutions', description: 'View solution records', group: 'Solutions', risk: 'LOW', order: 10 },
    { key: 'solutions.create', display: 'Create Solutions', description: 'Create solutions', group: 'Solutions', risk: 'MEDIUM', order: 11 },
    { key: 'solutions.update', display: 'Edit Solutions', description: 'Edit solutions', group: 'Solutions', risk: 'MEDIUM', order: 12 },
    { key: 'solutions.delete', display: 'Delete Solutions', description: 'Delete solutions', group: 'Solutions', risk: 'MEDIUM', order: 13 },

    // ── Company Stats ────────────────────────────────────────────────────
    { key: 'company_stats.view', display: 'View Company Stats', description: 'View the public company statistics', group: 'Company Stats', risk: 'LOW', order: 10 },
    { key: 'company_stats.update', display: 'Edit Company Stats', description: 'Edit company statistics', group: 'Company Stats', risk: 'MEDIUM', order: 11 },
    { key: 'company_stats.delete', display: 'Delete Company Stats', description: 'Delete company statistics', group: 'Company Stats', risk: 'MEDIUM', order: 12 },

    // ── Certifications ───────────────────────────────────────────────────
    { key: 'certifications.view', display: 'View Certifications', description: 'View every employee certification', group: 'Certifications', risk: 'LOW', order: 10 },
    { key: 'certifications.create', display: 'Create Certifications', description: 'Add certifications for any employee', group: 'Certifications', risk: 'MEDIUM', order: 11 },
    { key: 'certifications.update', display: 'Edit Certifications', description: 'Edit any employee certification', group: 'Certifications', risk: 'MEDIUM', order: 12 },
    { key: 'certifications.delete', display: 'Delete Certifications', description: 'Delete any employee certification', group: 'Certifications', risk: 'MEDIUM', order: 13 },

    // ── Media ────────────────────────────────────────────────────────────
    { key: 'media.upload', display: 'Upload Media', description: 'Upload files and images', group: 'Media', risk: 'MEDIUM', order: 10 },
    { key: 'media.manage', display: 'Manage Media', description: 'Delete or replace any media', group: 'Media', risk: 'MEDIUM', order: 11 },

    // ── Reviews ──────────────────────────────────────────────────────────
    { key: 'reviews.moderate', display: 'Moderate Reviews', description: 'Approve, reject, reply to testimonials', group: 'Reviews', risk: 'MEDIUM', order: 10 },

    // ── Pages ────────────────────────────────────────────────────────────
    { key: 'pages.update_home', display: 'Edit Home Page', description: 'Edit homepage sections', group: 'Pages', risk: 'MEDIUM', order: 10 },
    { key: 'pages.update_about', display: 'Edit About Page', description: 'Edit About page sections', group: 'Pages', risk: 'MEDIUM', order: 11 },
    { key: 'pages.update_contact', display: 'Edit Contact Info', description: 'Edit contact details and settings', group: 'Pages', risk: 'MEDIUM', order: 12 },
    { key: 'pages.update_site_chrome', display: 'Edit Site Chrome', description: 'Edit footer, navigation, branding and UI settings', group: 'Pages', risk: 'HIGH', order: 13 },
    { key: 'pages.update_industries', display: 'Edit Industries Page', description: 'Edit industries page content', group: 'Pages', risk: 'MEDIUM', order: 14 },
    { key: 'pages.update_solutions', display: 'Edit Solutions Page', description: 'Edit solutions page content', group: 'Pages', risk: 'MEDIUM', order: 15 },
    { key: 'pages.update_announcements', display: 'Edit Announcements', description: 'Edit site announcements', group: 'Pages', risk: 'MEDIUM', order: 16 },

    // ── Analytics ────────────────────────────────────────────────────────
    { key: 'analytics.view', display: 'View Analytics', description: 'View analytics dashboards and events', group: 'Analytics', risk: 'LOW', order: 10 },
    { key: 'analytics.export', display: 'Export Analytics', description: 'Export analytics data', group: 'Analytics', risk: 'MEDIUM', order: 11 },

    // ── Chatbot ──────────────────────────────────────────────────────────
    { key: 'chatbot.view_all', display: 'View Chatbot Conversations', description: 'Read all chatbot conversations', group: 'Chatbot', risk: 'MEDIUM', order: 10 },
    { key: 'chatbot.respond', display: 'Respond in Chatbot', description: 'Reply to and escalate chatbot conversations', group: 'Chatbot', risk: 'MEDIUM', order: 11 },

    // ── Administration ───────────────────────────────────────────────────
    { key: 'administration.settings', display: 'Edit Settings', description: 'Edit site and administration settings', group: 'Administration', risk: 'HIGH', order: 10 },
    { key: 'administration.audit', display: 'View Audit Logs', description: 'View the audit log', group: 'Administration', risk: 'MEDIUM', order: 11 },
    { key: 'administration.roles', display: 'Manage Roles', description: 'Manage roles, presets, and the permission registry', group: 'Administration', risk: 'HIGH', order: 12 },
    { key: 'administration.impersonate', display: 'Impersonate Users', description: 'Impersonate another user for support', group: 'Administration', risk: 'HIGH', order: 13 },
    { key: 'payments.view_all', display: 'View Payments', description: 'View all payments and transactions', group: 'Administration', risk: 'MEDIUM', order: 14 },
    { key: 'payments.reconcile', display: 'Reconcile Payments', description: 'Run payment reconciliation and payouts', group: 'Administration', risk: 'HIGH', order: 15 },
    { key: 'ai_config.view', display: 'View AI Configuration', description: 'See AI provider and model configuration', group: 'Administration', risk: 'MEDIUM', order: 16 },
    { key: 'ai_config.update', display: 'Edit AI Configuration', description: 'Change AI provider keys and models', group: 'Administration', risk: 'HIGH', order: 17 },

    // ── AI Workforce ─────────────────────────────────────────────────────
    { key: 'agents.view', display: 'View AI Agents', description: 'See the automated agent roster, run history and reports', group: 'AI Workforce', risk: 'LOW', order: 10 },
    { key: 'agents.run', display: 'Run AI Agents', description: 'Trigger an agent run manually', group: 'AI Workforce', risk: 'MEDIUM', order: 11 },
    { key: 'agents.manage', display: 'Manage AI Agents', description: 'Pause/resume agents and change their schedules', group: 'AI Workforce', risk: 'HIGH', order: 12 },
];

export const PERMISSION_KEYS: readonly string[] = PERMISSIONS.map((p) => p.key);

export const PERMISSION_BY_KEY: ReadonlyMap<string, PermissionDefinition> = new Map(
    PERMISSIONS.map((p) => [p.key, p]),
);

/**
 * Group display order. A permission\'s numeric `order` only sorts it within its
 * own group; groups are ordered by position in this array.
 */
export const PERMISSION_GROUPS: readonly PermissionGroup[] = [
    'Profile',
    'Staff',
    'Publications',
    'Services',
    'Service Categories',
    'Products',
    'Product FAQs',
    'FAQs',
    'Bookings',
    'Enquiries',
    'Leads',
    'Sales Pipeline',
    'Newsletters',
    'Surveys',
    'Product Inquiries',
    'Support Tickets',
    'Expenses',
    'Leave',
    'Attendance',
    'Payroll',
    'Approvals',
    'Projects',
    'Clients',
    'Careers',
    'Industries',
    'Solutions',
    'Company Stats',
    'Certifications',
    'Media',
    'Reviews',
    'Pages',
    'Analytics',
    'Chatbot',
    'AI Workforce',
    'Administration',
];

/** Permissions grouped for the admin Role & Permissions screen. */
export function groupedPermissions(): { group: PermissionGroup; permissions: PermissionDefinition[] }[] {
    return PERMISSION_GROUPS.map((group) => ({
        group,
        permissions: PERMISSIONS
            .filter((p) => p.group === group)
            .sort((a, b) => a.order - b.order),
    })).filter((entry) => entry.permissions.length > 0);
}

// ─── Migration map (retiring the two legacy vocabularies) ─────────────────

/**
 * Old key → canonical key. `effectivePermissions.ts` checks this table before
 * resolving, so existing seeded grants keep working while roles are migrated.
 *
 * Only keys that actually DIFFER from their canonical target are listed — a key
 * that is already canonical must not appear here, or it would be a no-op entry
 * that hides a typo.
 */
/**
 * The canonical key union, derived from the registry itself.
 *
 * This type IS the compile-time check: annotating the tables below with it
 * means an unknown key is a type error at its declaration site, so it can never
 * reach the database. A helper function cannot do this, because a
 * `readonly string[]` annotation widens the literals away before any helper
 * sees them.
 */
type _KnownKey = (typeof PERMISSIONS)[number]['key'];

export const LEGACY_KEY_ALIASES: Readonly<Record<string, _KnownKey>> = {
    // ── Vocabulary 1: seed.ts (legacy coarse keys) ──
    'content.view': 'publications.review',
    'content.manage': 'publications.review',
    'content.publish': 'publications.publish',
    'content.delete': 'publications.delete',
    'settings.view': 'analytics.view',
    'settings.manage': 'administration.settings',
    'roles.view': 'staff.view',
    'roles.manage': 'administration.roles',
    'staff.manage': 'staff.assign_permissions',
    'staff.profile.manage': 'profile.update_own',
    'products.manage': 'products.update',
    'services.manage': 'services.update',
    'blog.manage': 'publications.review',
    'careers.manage': 'pages.update_announcements',

    // ── Vocabulary 2: staff-access.ts UI catalogue ──
    'profile.view': 'profile.view_own',
    'profile.edit': 'profile.update_own',
    'profile.manage': 'profile.manage_visibility_own',
    'publications.view': 'publications.review',
    'publications.manage': 'publications.publish',
    'pricing.view': 'services.manage_pricing',
    'pricing.manage': 'services.manage_pricing',
    'bookings.view': 'bookings.view_all',
    'bookings.manage': 'bookings.assign',
    'enquiries.view': 'enquiries.view_all',
    'enquiries.manage': 'enquiries.close',
    'reviews.view': 'reviews.moderate',
    'reviews.manage': 'reviews.moderate',
    'media.view': 'media.upload',
    'page_content.view': 'pages.update_home',
    'page_content.manage': 'pages.update_home',
};

/**
 * Canonicalise a key. Returns the input unchanged when it is already canonical
 * (or unknown — an unknown key must not be silently remapped).
 */
export function canonicalKey(key: string): string {
    return LEGACY_KEY_ALIASES[key] ?? key;
}

/** True when the key exists in the canonical registry. */
export function isCanonicalKey(key: string): boolean {
    return PERMISSION_BY_KEY.has(key);
}

/**
 * Starter bundles, keyed by system role. These are what `seed.ts` writes into
 * `AppRole → RolePermission`, so a fresh install gets a coherent baseline that
 * matches the access each role had under the old `requireRoles(...)` guards.
 *
 * `SUPER_ADMIN` is not listed: the resolver grants it the `*` wildcard.
 */
export const ROLE_DEFAULT_PERMISSIONS: Readonly<Record<string, readonly _KnownKey[]>> = {
    // Correct by construction; the cast is needed because `p.key` widens to `string`.
    ADMIN: PERMISSIONS.map((p) => p.key) as readonly _KnownKey[],
    MARKETING: [
        'profile.view_own', 'profile.update_own',
        'analytics.view', 'analytics.export',
        'publications.create', 'publications.view_own', 'publications.update_own', 'publications.review', 'publications.publish', 'publications.delete',
        'services.view', 'services.create', 'services.update', 'services.manage_pricing',
        'service_categories.view', 'service_categories.create', 'service_categories.update', 'service_categories.delete',
        'products.view', 'products.create', 'products.update', 'products.archive',
        'product_faqs.view', 'product_faqs.create', 'product_faqs.update', 'product_faqs.delete',
        'faqs.view', 'faqs.create', 'faqs.update', 'faqs.delete',
        'reviews.moderate',
        'industries.view', 'industries.create', 'industries.update', 'industries.delete',
        'solutions.view', 'solutions.create', 'solutions.update', 'solutions.delete',
        'company_stats.view', 'company_stats.update',
        'pages.update_home', 'pages.update_about', 'pages.update_contact',
        'pages.update_industries', 'pages.update_solutions', 'pages.update_announcements',
        'chatbot.view_all', 'chatbot.respond',
        'media.upload', 'media.manage',
        'leads.view', 'leads.create', 'leads.update',
        'sales.pipeline.view',
        'opportunities.view', 'opportunities.create', 'opportunities.update', 'opportunities.delete',
        'quotes.view', 'quotes.create', 'quotes.update', 'quotes.send', 'quotes.accept', 'quotes.delete',
        'invoices.view', 'invoices.create', 'invoices.update', 'invoices.issue', 'invoices.void', 'invoices.delete',
        'newsletters.view', 'newsletters.create', 'newsletters.update',
        'surveys.view', 'surveys.create', 'surveys.update', 'surveys.view_responses',
        'product_inquiries.view', 'product_inquiries.update',
        'enquiries.view_all', 'enquiries.respond', 'enquiries.close',
        'support_tickets.view', 'support_tickets.respond',
        'careers.view',
        'agents.view',
    ],
    CONTENT_CREATOR: [
        'profile.view_own', 'profile.update_own',
        'publications.create', 'publications.view_own', 'publications.update_own',
        'services.view',
        'service_categories.view',
        'products.view',
        'product_faqs.view', 'product_faqs.create', 'product_faqs.update',
        'faqs.view', 'faqs.create', 'faqs.update',
        'industries.view',
        'solutions.view',
        'company_stats.view',
        'pages.update_home', 'pages.update_about', 'pages.update_industries',
        'media.upload',
        'careers.view',
    ],
    BLOG_MANAGER: [
        'profile.view_own', 'profile.update_own',
        'publications.create', 'publications.view_own', 'publications.update_own', 'publications.review', 'publications.publish',
        'media.upload',
        'faqs.view', 'faqs.create', 'faqs.update',
        'product_faqs.view',
        'pages.update_home',
        'analytics.view',
    ],
    HR: [
        'profile.view_own', 'profile.update_own',
        'staff.view', 'staff.invite', 'staff.assign_department', 'staff.assign_position', 'staff.suspend',
        'pages.update_announcements',
        'chatbot.view_all', 'chatbot.respond',
        'enquiries.view_all', 'enquiries.respond',
        'careers.view', 'careers.create', 'careers.update', 'careers.delete',
        'careers.applications.view', 'careers.applications.respond', 'careers.update_content',
        'certifications.view', 'certifications.create', 'certifications.update', 'certifications.delete',
        'leave.request', 'leave.view', 'leave.approve',
        'expenses.view', 'expenses.create', 'expenses.update', 'expenses.approve', 'expenses.mark_paid', 'expenses.delete',
        'attendance.record', 'attendance.view', 'attendance.manage',
        'payroll.view', 'payroll.manage', 'payroll.approve', 'payroll.mark_paid',
        'approvals.view', 'approvals.manage', 'approvals.respond',
        'agents.view',
    ],
    DEVELOPER: [
        'profile.view_own', 'profile.update_own', 'profile.manage_visibility_own', 'profile.manage_gallery_own',
        'analytics.view',
        'publications.create', 'publications.view_own', 'publications.update_own',
        'projects.view', 'projects.view_assigned', 'projects.update_assigned', 'projects.add_progress',
        'products.view_assigned', 'products.update_assigned',
        'media.upload',
    ],
    STAFF: [
        'profile.view_own', 'profile.update_own', 'profile.manage_visibility_own', 'profile.manage_gallery_own',
        'leave.request', 'expenses.create', 'attendance.record',
        // Approval chains are transparent internally; the per-step permission
        // still decides who may actually sign off.
        'approvals.view', 'approvals.respond',
    ],
};

// ─── Validation ─────────────────────────────────────────────────────────
// Compile-time safety comes from the `_KnownKey` annotations on the two
// tables above: an unknown key is a type error at its declaration site, so it
// can never reach the database. A helper function cannot do this — a
// `readonly string[]` annotation widens the literals away before any helper
// sees them.
//
// The runtime counterpart below covers the same invariants for data that is
// not literal-typed (values from a request or an older seed).

/** Runtime counterpart, used by the seed and the admin UI. */
export function validateRegistryIntegrity(): { ok: boolean; problems: string[] } {
    const problems: string[] = [];

    const canonical = new Set(PERMISSION_KEYS);

    for (const [role, keys] of Object.entries(ROLE_DEFAULT_PERMISSIONS)) {
        for (const key of keys) {
            if (!canonical.has(key)) {
                problems.push(`role ${role}: unknown key "${key}"`);
            }
        }
    }

    for (const [oldKey, newKey] of Object.entries(LEGACY_KEY_ALIASES)) {
        if (!canonical.has(newKey)) {
            problems.push(`alias ${oldKey} -> ${newKey}: target is not a canonical key`);
        }
        if (canonical.has(oldKey)) {
            problems.push(`alias ${oldKey} -> ${newKey}: source is already canonical (no-op entry)`);
        }
    }

    // Duplicate keys would make the registry ambiguous.
    const seen = new Set<string>();
    for (const p of PERMISSIONS) {
        if (seen.has(p.key)) problems.push(`duplicate registry key "${p.key}"`);
        seen.add(p.key);
    }

    // A permission whose group is missing from PERMISSION_GROUPS would silently
    // disappear from the admin UI.
    const groups = new Set(PERMISSION_GROUPS);
    for (const p of PERMISSIONS) {
        if (!groups.has(p.group)) problems.push(`permission ${p.key}: unknown group "${p.group}"`);
    }

    return { ok: problems.length === 0, problems };
}
