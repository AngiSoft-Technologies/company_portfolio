# AngiSoft Permission Catalogue

> **🛠 OPERATIONAL** — Generated mirror of the live registry. Source of truth: `backend/src/modules/identity/services/permissionRegistry.ts` (`PERMISSIONS` + `PERMISSION_GROUPS`). Regenerate after registry changes.
> Guards, the admin Role & Permissions screen, presets, and seeds all derive from this registry — do not hand-edit keys here.
> Scope: `assigned` = permission has `scopeRequiresAssignment` (only records the employee is assigned to via join table/FK).

## Profile

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `profile.manage_gallery_own` | Manage Own Gallery | Add/edit portfolio items and profile stats | MEDIUM | global |
| `profile.manage_visibility_own` | Manage Own Visibility | Toggle public/private profile, set display title | MEDIUM | global |
| `profile.update_own` | Edit Own Profile | Edit own bio, links, titles, skills | LOW | global |
| `profile.view_own` | View Own Profile | View own employee record | LOW | global |

## Staff

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `staff.assign_department` | Assign Department | Set an employee's department | MEDIUM | global |
| `staff.assign_permissions` | Assign Permissions | Grant or deny permissions for an employee | HIGH | global |
| `staff.assign_position` | Assign Position | Set an employee's position and defaults | MEDIUM | global |
| `staff.invite` | Invite Staff | Send employee invitations | MEDIUM | global |
| `staff.suspend` | Suspend Staff | Suspend or revoke employee access | HIGH | global |
| `staff.view` | View Staff | View the employee directory | LOW | global |

## Publications

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `publications.create` | Create Publications | Draft blog posts and staff publications | LOW | global |
| `publications.delete` | Delete Publications | Delete blog posts and staff publications | MEDIUM | global |
| `publications.publish` | Publish Publications | Publish to the public site | MEDIUM | global |
| `publications.review` | Review Publications | Approve or request changes on drafts | MEDIUM | global |
| `publications.update_own` | Edit Own Publications | Edit own drafts | LOW | assigned |
| `publications.view_own` | View Own Publications | View own drafts | LOW | assigned |

## Services

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `services.archive` | Archive Services | Archive services | MEDIUM | global |
| `services.create` | Create Services | Create services | MEDIUM | global |
| `services.manage_pricing` | Manage Service Pricing | Edit service pricing packages | MEDIUM | global |
| `services.update` | Edit Services | Edit services | MEDIUM | global |
| `services.view` | View Services | View the service catalogue | LOW | global |

## Service Categories

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `service_categories.create` | Create Service Categories | Create service categories | MEDIUM | global |
| `service_categories.delete` | Delete Service Categories | Delete service categories | MEDIUM | global |
| `service_categories.update` | Edit Service Categories | Edit service categories | MEDIUM | global |
| `service_categories.view` | View Service Categories | View service categories | LOW | global |

## Products

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `products.archive` | Archive Products | Archive products | MEDIUM | global |
| `products.create` | Create Products | Create products | MEDIUM | global |
| `products.update` | Edit Products | Edit products | MEDIUM | global |
| `products.update_assigned` | Edit Assigned Products | Edit products the employee is on the team of | MEDIUM | assigned |
| `products.view` | View Products | View the product catalogue | LOW | global |
| `products.view_assigned` | View Assigned Products | View products the employee is on the team of | LOW | assigned |

## Product FAQs

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `product_faqs.create` | Create Product FAQs | Create product FAQs | MEDIUM | global |
| `product_faqs.delete` | Delete Product FAQs | Delete product FAQs | MEDIUM | global |
| `product_faqs.update` | Edit Product FAQs | Edit product FAQs | MEDIUM | global |
| `product_faqs.view` | View Product FAQs | View product FAQs | LOW | global |

## FAQs

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `faqs.create` | Create FAQs | Create FAQs | MEDIUM | global |
| `faqs.delete` | Delete FAQs | Delete FAQs | MEDIUM | global |
| `faqs.update` | Edit FAQs | Edit FAQs | MEDIUM | global |
| `faqs.view` | View FAQs | View the FAQ library | LOW | global |

## Bookings

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `bookings.add_progress` | Add Booking Progress | Post progress updates to a booking | MEDIUM | assigned |
| `bookings.assign` | Assign Bookings | Assign a booking to staff | MEDIUM | global |
| `bookings.change_stage` | Change Booking Stage | Advance the booking stage machine | MEDIUM | assigned |
| `bookings.message_customer` | Message Customer | Send messages on a booking | MEDIUM | assigned |
| `bookings.update_assigned` | Review Assigned Bookings | Accept/reject and update assigned bookings | MEDIUM | assigned |
| `bookings.view_all` | View All Bookings | View every booking | MEDIUM | global |
| `bookings.view_assigned` | View Assigned Bookings | View bookings assigned to the employee | LOW | assigned |

## Enquiries

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `enquiries.close` | Close Enquiries | Close enquiries | MEDIUM | assigned |
| `enquiries.respond` | Respond to Enquiries | Reply to and update enquiries | MEDIUM | assigned |
| `enquiries.view_all` | View All Enquiries | View every contact enquiry | MEDIUM | global |
| `enquiries.view_assigned` | View Assigned Enquiries | View enquiries assigned to the employee | LOW | assigned |

## Leads

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `leads.create` | Create Leads | Create leads | MEDIUM | global |
| `leads.delete` | Delete Leads | Delete leads | MEDIUM | global |
| `leads.update` | Edit Leads | Edit and re-stage leads | MEDIUM | global |
| `leads.view` | View Leads | View the lead pipeline | LOW | global |

## Sales Pipeline

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `invoices.create` | Create Invoices | Create invoices | MEDIUM | global |
| `invoices.delete` | Delete Invoices | Delete draft invoices | MEDIUM | global |
| `invoices.issue` | Issue Invoices | Issue invoices to clients | MEDIUM | global |
| `invoices.update` | Edit Invoices | Edit draft invoices | MEDIUM | global |
| `invoices.view` | View Invoices | View invoices | LOW | global |
| `invoices.void` | Void Invoices | Void issued invoices | HIGH | global |
| `opportunities.create` | Create Opportunities | Create opportunities | MEDIUM | global |
| `opportunities.delete` | Delete Opportunities | Delete opportunities | MEDIUM | global |
| `opportunities.update` | Edit Opportunities | Edit and re-stage opportunities | MEDIUM | global |
| `opportunities.view` | View Opportunities | View the opportunity pipeline | LOW | global |
| `quotes.accept` | Accept Quotes | Mark quotations accepted by the client | MEDIUM | global |
| `quotes.approve` | Approve Quotes | Approve quotations above the configured approval threshold | HIGH | global |
| `quotes.create` | Create Quotes | Create quotations | MEDIUM | global |
| `quotes.delete` | Delete Quotes | Delete quotations | MEDIUM | global |
| `quotes.send` | Send Quotes | Send quotations to clients | MEDIUM | global |
| `quotes.update` | Edit Quotes | Edit quotations | MEDIUM | global |
| `quotes.view` | View Quotes | View quotations | LOW | global |
| `sales.pipeline.view` | View Sales Pipeline | View the department-wide sales pipeline dashboard | LOW | global |

## Newsletters

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `newsletters.create` | Create Newsletters | Create newsletter campaigns | MEDIUM | global |
| `newsletters.delete` | Delete Newsletters | Delete newsletter campaigns | MEDIUM | global |
| `newsletters.send` | Send Newsletters | Send campaigns and broadcasts to subscribers | HIGH | global |
| `newsletters.update` | Edit Newsletters | Edit newsletter campaigns | MEDIUM | global |
| `newsletters.view` | View Newsletters | View campaigns and subscribers | LOW | global |

## Surveys

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `surveys.create` | Create Surveys | Create surveys | MEDIUM | global |
| `surveys.delete` | Delete Surveys | Delete surveys | MEDIUM | global |
| `surveys.update` | Edit Surveys | Edit surveys | MEDIUM | global |
| `surveys.view` | View Surveys | View surveys | LOW | global |
| `surveys.view_responses` | View Survey Responses | Read submitted survey responses | MEDIUM | global |

## Product Inquiries

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `product_inquiries.update` | Respond to Product Inquiries | Reply to and update product enquiries | MEDIUM | global |
| `product_inquiries.view` | View Product Inquiries | View product enquiries | LOW | global |

## Support Tickets

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `support_tickets.create` | Create Support Tickets | Open support tickets | LOW | global |
| `support_tickets.respond` | Respond to Support Tickets | Reply on support tickets | MEDIUM | global |
| `support_tickets.update` | Edit Support Tickets | Update ticket status and assignment | MEDIUM | global |
| `support_tickets.view` | View Support Tickets | View support tickets | LOW | global |

## Expenses

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `expenses.approve` | Approve Expenses | Approve expense claims (required above APPROVAL_THRESHOLD_EXPENSE) | HIGH | global |
| `expenses.create` | Create Expenses | Submit expense claims | LOW | global |
| `expenses.delete` | Delete Expenses | Delete expense records | MEDIUM | global |
| `expenses.mark_paid` | Mark Expenses Paid | Record expense reimbursement | MEDIUM | global |
| `expenses.update` | Edit Expenses | Edit expense drafts and details | MEDIUM | global |
| `expenses.view` | View Expenses | View expense reports | LOW | global |

## Leave

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `leave.approve` | Approve Leave | Approve or reject leave requests | MEDIUM | global |
| `leave.request` | Request Leave | Submit and cancel own leave requests | LOW | global |
| `leave.view` | View Leave Requests | View all leave requests | MEDIUM | global |

## Attendance

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `attendance.manage` | Manage Attendance | Create, edit and delete attendance records | MEDIUM | global |
| `attendance.record` | Record Attendance | Check in/out and view own attendance | LOW | global |
| `attendance.view` | View Attendance | View all staff attendance records | MEDIUM | global |

## Payroll

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `payroll.approve` | Approve Payslips | Approve payslips for payment | HIGH | global |
| `payroll.manage` | Manage Payslips | Create and edit payslips | HIGH | global |
| `payroll.mark_paid` | Mark Payslips Paid | Record payslip payment | HIGH | global |
| `payroll.view` | View Payslips | View all employee payslips | HIGH | global |

## Approvals

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `approvals.manage` | Manage Approvals | Create and cancel approval requests | MEDIUM | global |
| `approvals.respond` | Respond to Approvals | Approve or reject steps on approval requests | MEDIUM | global |
| `approvals.view` | View Approvals | View approval requests and the permission catalogue | LOW | global |

## Projects

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `projects.add_progress` | Add Project Progress | Post project activity | MEDIUM | assigned |
| `projects.assign_team` | Assign Project Team | Add staff to a project team | MEDIUM | global |
| `projects.manage` | Manage Projects | Create, edit, delete any project | MEDIUM | global |
| `projects.update_assigned` | Edit Assigned Projects | Edit projects the employee is on | MEDIUM | assigned |
| `projects.view` | View Projects | View all showcase projects | LOW | global |
| `projects.view_assigned` | View Assigned Projects | View projects the employee is on | LOW | assigned |

## Clients

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `client_projects.add_progress` | Add Client Project Progress | Post milestones, deliverables, comments | MEDIUM | assigned |
| `client_projects.view_all` | View All Client Projects | View every client project | MEDIUM | global |
| `client_projects.view_assigned` | View Assigned Client Projects | View client projects the employee is on | LOW | assigned |

## Careers

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `careers.applications.respond` | Respond to Applications | Reply to and move job applications | MEDIUM | global |
| `careers.applications.view` | View Applications | View submitted job applications | MEDIUM | global |
| `careers.create` | Create Job Postings | Create job postings | MEDIUM | global |
| `careers.delete` | Delete Job Postings | Delete job postings | MEDIUM | global |
| `careers.update` | Edit Job Postings | Edit job postings | MEDIUM | global |
| `careers.update_content` | Edit Careers Page | Edit the public careers page content | MEDIUM | global |
| `careers.view` | View Careers | View job postings and applications | LOW | global |

## Industries

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `industries.create` | Create Industries | Create industries | MEDIUM | global |
| `industries.delete` | Delete Industries | Delete industries | MEDIUM | global |
| `industries.update` | Edit Industries | Edit industries | MEDIUM | global |
| `industries.view` | View Industries | View industry records | LOW | global |

## Solutions

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `solutions.create` | Create Solutions | Create solutions | MEDIUM | global |
| `solutions.delete` | Delete Solutions | Delete solutions | MEDIUM | global |
| `solutions.update` | Edit Solutions | Edit solutions | MEDIUM | global |
| `solutions.view` | View Solutions | View solution records | LOW | global |

## Company Stats

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `company_stats.delete` | Delete Company Stats | Delete company statistics | MEDIUM | global |
| `company_stats.update` | Edit Company Stats | Edit company statistics | MEDIUM | global |
| `company_stats.view` | View Company Stats | View the public company statistics | LOW | global |

## Certifications

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `certifications.create` | Create Certifications | Add certifications for any employee | MEDIUM | global |
| `certifications.delete` | Delete Certifications | Delete any employee certification | MEDIUM | global |
| `certifications.update` | Edit Certifications | Edit any employee certification | MEDIUM | global |
| `certifications.view` | View Certifications | View every employee certification | LOW | global |

## Media

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `media.manage` | Manage Media | Delete or replace any media | MEDIUM | global |
| `media.upload` | Upload Media | Upload files and images | MEDIUM | global |

## Reviews

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `reviews.moderate` | Moderate Reviews | Approve, reject, reply to testimonials | MEDIUM | global |

## Pages

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `pages.update_about` | Edit About Page | Edit About page sections | MEDIUM | global |
| `pages.update_announcements` | Edit Announcements | Edit site announcements | MEDIUM | global |
| `pages.update_contact` | Edit Contact Info | Edit contact details and settings | MEDIUM | global |
| `pages.update_home` | Edit Home Page | Edit homepage sections | MEDIUM | global |
| `pages.update_industries` | Edit Industries Page | Edit industries page content | MEDIUM | global |
| `pages.update_site_chrome` | Edit Site Chrome | Edit footer, navigation, branding and UI settings | HIGH | global |
| `pages.update_solutions` | Edit Solutions Page | Edit solutions page content | MEDIUM | global |

## Analytics

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `analytics.export` | Export Analytics | Export analytics data | MEDIUM | global |
| `analytics.view` | View Analytics | View analytics dashboards and events | LOW | global |

## Chatbot

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `chatbot.respond` | Respond in Chatbot | Reply to and escalate chatbot conversations | MEDIUM | global |
| `chatbot.view_all` | View Chatbot Conversations | Read all chatbot conversations | MEDIUM | global |

## AI Workforce

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `agents.manage` | Manage AI Agents | Pause/resume agents and change their schedules | HIGH | global |
| `agents.run` | Run AI Agents | Trigger an agent run manually | MEDIUM | global |
| `agents.view` | View AI Agents | See the automated agent roster, run history and reports | LOW | global |

## Administration

| Key | Display | Description | Risk | Scope |
|---|---|---|---|---|
| `administration.audit` | View Audit Logs | View the audit log | MEDIUM | global |
| `administration.impersonate` | Impersonate Users | Impersonate another user for support | HIGH | global |
| `administration.roles` | Manage Roles | Manage roles, presets, and the permission registry | HIGH | global |
| `administration.settings` | Edit Settings | Edit site and administration settings | HIGH | global |
| `ai_config.update` | Edit AI Configuration | Change AI provider keys and models | HIGH | global |
| `ai_config.view` | View AI Configuration | See AI provider and model configuration | MEDIUM | global |
| `payments.reconcile` | Reconcile Payments | Run payment reconciliation and payouts | HIGH | global |
| `payments.view_all` | View Payments | View all payments and transactions | MEDIUM | global |

---

Total: 163 permissions across 35 groups.
