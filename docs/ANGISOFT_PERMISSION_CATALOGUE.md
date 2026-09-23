# AngiSoft Permission Catalogue

Every permission grounded in an **existing model/route/endpoint**. Permissions with no current implementation are marked *[FUTURE]*.
Scope: `global` = any record; `assigned` = only records the employee is assigned to; `own` = only records they authored/own.

---

## Profile
| Key | Display | Description | Group | Risk | Scope | Model | Endpoint | Admin Page | Default Role | Direct | Scope Req |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `profile.view_own` | View Own Profile | View own employee record | Profile | Low | own | Employee | GET /api/staff-dashboard/profile | StaffDashboard | STAFF | Yes | No |
| `profile.update_own` | Edit Own Profile | Edit own bio, links, titles | Profile | Low | own | Employee | PUT /api/employee-profiles | StaffDashboard | STAFF | Yes | No |
| `profile.manage_visibility_own` | Manage Own Visibility | Toggle public/private, set display title | Profile | Medium | own | Employee | PUT /api/employee-profiles | StaffDashboard | STAFF | Yes | No |
| `profile.manage_gallery_own` | Manage Own Gallery | Add portfolio items/stats | Profile | Low | own | EmployeePortfolioItem, EmployeeProfileStat | /api/employee-profiles/portfolio | StaffDashboard | STAFF | Yes | No |

## Staff (administration of people)
| Key | Display | Description | Group | Risk | Scope | Model | Endpoint | Admin Page | Default | Direct | Scope Req |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `staff.view` | View Staff | List employees in admin | Staff | Low | global | Employee | GET /api/admin/staff | StaffManagement | ADMIN | Yes | No |
| `staff.create` | Invite Staff | Send staff invite | Staff | High | global | Employee | POST /api/admin/staff | StaffManagement | ADMIN | No | No |
| `staff.update` | Edit Staff | Edit any employee | Staff | High | global | Employee | PUT /api/admin/staff/:id | StaffManagement | ADMIN | No | No |
| `staff.assign_department` | Assign Department | Set department | Staff | High | global | Employee.department, Department | /api/admin/staff/:id/access | /admin/staff/:id/access | ADMIN | No | No |
| `staff.assign_position` | Assign Position | Set position/seniority | Staff | High | global | Employee | /api/admin/staff/:id/access | /admin/staff/:id/access | ADMIN | No | No |
| `staff.assign_permissions` | Assign Permissions | Grant/deny perms | Staff | Critical | global | EmployeePermission, EmployeeRoleAssignment | /api/admin/staff/:id/access | /admin/staff/:id/access | ADMIN | No | No |
| `staff.assign_projects` | Assign Projects | Add to project teams | Staff | Medium | global | ProjectEmployee | /api/admin/projects/:id/team | ProjectsAdmin | ADMIN | Yes | Yes |
| `staff.assign_products` | Assign Products | Add to product teams | Staff | Medium | global | ProductTeamMember | /api/admin/products/:id/team | ProductsAdmin | ADMIN | Yes | Yes |
| `staff.archive` | Archive Staff | Disable ex-staff | Staff | High | global | Employee | DELETE /api/admin/staff/:id | StaffManagement | ADMIN | No | No |

## Publications
| Key | Display | Description | Group | Risk | Scope | Model | Endpoint | Admin Page | Default | Direct | Scope Req |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `publications.view_own` | View Own Drafts | See own posts | Publications | Low | own | BlogPost | GET /api/staff-blogs/my | BlogAdmin | STAFF | Yes | No |
| `publications.create` | Create Publication | Draft new post | Publications | Low | own | BlogPost | POST /api/staff-blogs | BlogAdmin | STAFF | Yes | No |
| `publications.update_own` | Edit Own Publication | Edit own posts | Publications | Low | own | BlogPost | PUT /api/staff-blogs/:id | BlogAdmin | STAFF | Yes | No |
| `publications.submit_review` | Submit for Review | Send to review queue | Publications | Low | own | BlogPost | POST /api/staff-blogs/:id/submit | BlogAdmin | STAFF | Yes | No |
| `publications.review` | Review Publications | Open review queue | Publications | Medium | global | BlogPost | GET /api/admin/blogs?review=1 | BlogAdmin | ADMIN | Yes | No |
| `publications.publish` | Publish | Make public | Publications | High | global | BlogPost | PUT /api/admin/blogs/:id/publish | BlogAdmin | ADMIN | Yes | No |
| `publications.archive` | Archive Publication | Unpublish/archive | Publications | Medium | global | BlogPost | DELETE /api/admin/blogs/:id | BlogAdmin | ADMIN | Yes | No |

## Services
| Key | Display | Description | Group | Risk | Scope | Model | Endpoint | Admin Page | Default | Direct | Scope Req |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `services.view` | View Services | List services | Services | Low | global | Service | GET /api/services/admin | ServicesAdmin | ADMIN, DEVELOPER | Yes | No |
| `services.create` | Create Service | Add service | Services | Medium | global | Service | POST /api/services/admin | ServicesAdmin | ADMIN | Yes | No |
| `services.update` | Update Service | Edit any service | Services | Medium | global | Service | PUT /api/services/:id | ServicesAdmin | ADMIN | Yes | No |
| `services.update_assigned` | Update Assigned Service | Edit services assigned to you | Services | Medium | assigned | Service, ServiceTeamMember | PUT /api/staff/services/:id | *[FUTURE]* | — | Yes | Yes |
| `services.publish` | Publish Service | Toggle published | Services | Medium | global | Service | PUT /api/services/:id | ServicesAdmin | ADMIN | Yes | No |
| `services.manage_pricing` | Manage Pricing | Edit price packages | Services | High | global | Service.pricing | ServicesAdmin | ADMIN | Yes | No |
| `services.manage_faqs` | Manage FAQs | Edit service FAQs | Services | Low | global | ServiceFaq | FaqsAdmin | ADMIN | Yes | No |
| `services.archive` | Archive Service | Remove service | Services | High | global | Service | DELETE /api/services/:id | ServicesAdmin | ADMIN | Yes | No |

## Products
| Key | Display | Description | Group | Risk | Scope | Model | Endpoint | Admin Page | Default | Direct | Scope Req |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `products.view` | View Products | List products | Products | Low | global | Product | GET /api/products/admin | ProductsAdmin | ADMIN | Yes | No |
| `products.view_assigned` | View Assigned Products | See products on your team | Products | Low | assigned | Product, ProductTeamMember | GET /api/staff/products | *[FUTURE]* | — | Yes | Yes |
| `products.update` | Update Product | Edit any product | Products | High | global | Product | PUT /api/products/:id | ProductsAdmin | ADMIN | Yes | No |
| `products.update_assigned` | Update Assigned Product | Edit only team products | Products | High | assigned | Product, ProductTeamMember | PUT /api/staff/products/:id | *[FUTURE]* | — | Yes | Yes |
| `products.manage_media` | Manage Product Media | Upload banners/screenshots | Products | Medium | global | Product.bannerUrl, .screenshots | ProductsAdmin | ADMIN | Yes | No |
| `products.publish` | Publish Product | Toggle live | Products | High | global | Product | PUT /api/products/:id | ProductsAdmin | ADMIN | Yes | No |
| `products.archive` | Archive Product | Deprecate product | Products | High | global | Product | DELETE /api/products/:id | ProductsAdmin | ADMIN | Yes | No |

## Bookings
| Key | Display | Description | Group | Risk | Scope | Model | Endpoint | Admin Page | Default | Direct | Scope Req |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `bookings.view_all` | View All Bookings | List every booking | Bookings | Medium | global | Booking | GET /api/bookings/admin | BookingsManagement | ADMIN | Yes | No |
| `bookings.view_assigned` | View Assigned Bookings | See assigned bookings | Bookings | Low | assigned | Booking.assignedToId | GET /api/staff/bookings | BookingsManagement | STAFF | Yes | Yes |
| `bookings.update_assigned` | Update Assigned Booking | Edit assigned booking | Bookings | Medium | assigned | Booking.assignedToId | PUT /api/staff/bookings/:id | BookingsManagement | STAFF | Yes | Yes |
| `bookings.change_stage` | Advance Stage | Move stage machine | Bookings | Medium | assigned | Booking.currentStage | PUT /api/bookings/admin/:id/stage | BookingsManagement | ADMIN, STAFF(assigned) | Yes | Yes |
| `bookings.add_progress` | Add Progress | Post booking event | Bookings | Low | assigned | BookingEvent | POST /api/bookings/admin/:id/events | BookingsManagement | STAFF(assigned) | Yes | Yes |
| `bookings.message_customer` | Message Customer | Contact client | Bookings | Medium | assigned | Note | POST /api/bookings/:id/notes | BookingsManagement | STAFF(assigned) | Yes | Yes |
| `bookings.create_quotation` | Create Quotation | Issue quote | Bookings | High | assigned | Booking.details(quotation) | PUT /api/bookings/admin/:id | ADMIN | Yes | Yes |
| `bookings.complete` | Complete Booking | Mark done | Bookings | Medium | assigned | Booking.currentStage | PUT /api/bookings/admin/:id/stage | ADMIN | Yes | No |
| `bookings.cancel` | Cancel Booking | Void booking | Bookings | High | global | Booking.status | PUT /api/bookings/admin/:id/status | ADMIN | Yes | No |

## Enquiries
| Key | Display | Description | Group | Risk | Scope | Model | Endpoint | Admin Page | Default | Direct | Scope Req |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `enquiries.view_all` | View All Enquiries | List enquiries | Enquiries | Low | global | ContactEnquiry | GET /api/contact-enquiries/admin | *[FUTURE]* | ADMIN | Yes | No |
| `enquiries.view_assigned` | View Assigned Enquiries | See assigned enquiries | Enquiries | Low | assigned | ContactEnquiry.assigneeId | *[FUTURE]* | — | STAFF | Yes | Yes |
| `enquiries.respond` | Respond | Reply to enquiry | Enquiries | Medium | assigned | ContactEnquiry | PUT /api/contact-enquiries/:id | — | STAFF(assigned) | Yes | Yes |
| `enquiries.convert_to_booking` | Convert to Booking | Create booking | Enquiries | High | assigned | Booking | POST /api/bookings | ADMIN | Yes | Yes |
| `enquiries.close` | Close Enquiry | Resolve/spam | Enquiries | Low | assigned | ContactEnquiry | PUT /api/contact-enquiries/:id | — | STAFF(assigned) | Yes | Yes |

## Reviews
| Key | Display | Description | Group | Risk | Scope | Model | Endpoint | Admin Page | Default | Direct | Scope Req |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `reviews.moderate` | Moderate Reviews | Approve/reject | Reviews | Medium | global | Testimonial | GET/PUT /api/testimonials/admin | TestimonialsAdmin | ADMIN | Yes | No |
| `reviews.reply` | Reply to Review | Public reply | Reviews | Low | global | Testimonial | PUT /api/testimonials/:id/reply | TestimonialsAdmin | ADMIN | Yes | No |
| `reviews.publish` | Publish Review | Show publicly | Reviews | Low | global | Testimonial | PUT /api/testimonials/:id | TestimonialsAdmin | ADMIN | Yes | No |
| `reviews.feature` | Feature Review | Pin review | Reviews | Low | global | Testimonial | PUT /api/testimonials/:id/feature | TestimonialsAdmin | ADMIN | Yes | No |

## Media
| Key | Display | Description | Group | Risk | Scope | Model | Endpoint | Admin Page | Default | Direct | Scope Req |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `media.upload` | Upload Media | Upload files | Media | Medium | global | File, MediaAsset | POST /api/uploads/local/image | FileUpload | STAFF | Yes | No |
| `media.update_own` | Manage Own Media | Edit own uploads | Media | Low | own | File | PUT /api/uploads/files/:id | FileUploadManager | STAFF | Yes | No |
| `media.delete_any` | Delete Any Media | Remove files | Media | High | global | File | DELETE /api/uploads/files/:id | FileUploadManager | ADMIN | No | No |

## Page Content
| Key | Display | Description | Group | Risk | Scope | Model | Endpoint | Admin Page | Default | Direct | Scope Req |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `pages.update_home` | Edit Home | Edit home sections | Page Content | High | global | HomeSection | /api/home-sections | HomeSectionsAdmin | ADMIN | Yes | No |
| `pages.update_about` | Edit About | Edit about page | Page Content | High | global | AboutSection | /api/about-sections | AboutAdmin | ADMIN | Yes | No |
| `pages.update_contact` | Edit Contact | Edit contact info | Page Content | Medium | global | SiteSettings | /api/settings | SiteSettingsAdmin | ADMIN | Yes | No |
| `pages.update_footer` | Edit Footer | Edit footer | Page Content | Medium | global | SiteSettings | /api/settings | SiteSettingsAdmin | ADMIN | Yes | No |
| `pages.update_navigation` | Edit Navigation | Edit menus | Page Content | High | global | Navigation | /api/settings | SiteSettingsAdmin | ADMIN | Yes | No |
| `pages.publish` | Publish Page Changes | Go live | Page Content | High | global | WebContent | PUT /api/site/publish | SiteSettingsAdmin | ADMIN | No | No |

## Projects
| Key | Display | Description | Group | Risk | Scope | Model | Endpoint | Admin Page | Default | Direct | Scope Req |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `projects.view_all` | View All Projects | List projects | Projects | Low | global | Project | GET /api/projects/admin | ProjectsAdmin | ADMIN | Yes | No |
| `projects.view_assigned` | View Assigned Projects | See team projects | Projects | Low | assigned | Project, ProjectEmployee | GET /api/staff/projects | ProjectsAdmin | STAFF | Yes | Yes |
| `projects.update_assigned` | Update Assigned Project | Edit team project | Projects | Medium | assigned | Project, ProjectEmployee | PUT /api/staff/projects/:id | ProjectsAdmin | STAFF | Yes | Yes |
| `projects.assign_team` | Assign Project Team | Add members | Projects | Medium | global | ProjectEmployee | PUT /api/projects/:id/team | ProjectsAdmin | ADMIN | Yes | No |
| `projects.add_progress` | Add Progress | Post milestone/activity | Projects | Low | assigned | ProjectActivity | POST /api/projects/:id/activity | ProjectsAdmin | STAFF(assigned) | Yes | Yes |
| `projects.publish_public_info` | Publish Project Info | Public portfolio | Projects | Medium | assigned | Project.published | PUT /api/projects/:id | ADMIN | Yes | No |

## Analytics
| Key | Display | Description | Group | Risk | Scope | Model | Endpoint | Admin Page | Default | Direct | Scope Req |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `analytics.view_dashboard` | View Dashboard | Admin stats | Analytics | Low | global | (aggregate) | GET /api/admin/dashboard/stats | EnhancedAdminDashboard | ADMIN | Yes | No |
| `analytics.view_bookings` | Booking Analytics | Booking metrics | Analytics | Low | global | Booking | GET /api/admin/dashboard/stats | EnhancedAdminDashboard | ADMIN | Yes | No |
| `analytics.view_content` | Content Analytics | Blog/service views | Analytics | Low | global | PageView | *[FUTURE]* | — | ADMIN | Yes | No |
| `analytics.view_enquiries` | Enquiry Analytics | Enquiry metrics | Analytics | Low | global | ContactEnquiry | *[FUTURE]* | — | ADMIN | Yes | No |
| `analytics.view_publications` | Publication Analytics | Blog metrics | Analytics | Low | global | BlogPost | *[FUTURE]* | — | ADMIN | Yes | No |

## Administration (reserved)
| Key | Display | Description | Group | Risk | Scope | Model | Endpoint | Admin Page | Default | Direct | Scope Req |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `users.manage` | Manage Users | Create/disable accounts | Administration | Critical | global | Employee | POST/DELETE /api/admin/staff | StaffManagement | SUPER_ADMIN | No | No |
| `roles.manage` | Manage Roles | Create AppRoles | Administration | Critical | global | AppRole | /api/roles | /admin/roles | SUPER_ADMIN | No | No |
| `permissions.manage` | Manage Permissions | Define permissions | Administration | Critical | global | Permission | /api/roles/permissions | /admin/roles | SUPER_ADMIN | No | No |
| `departments.manage` | Manage Departments | CRUD departments | Administration | High | global | Department | /api/admin/departments | *[FUTURE]* | SUPER_ADMIN | No | No |
| `positions.manage` | Manage Positions | CRUD positions | Administration | High | global | Position | /api/admin/positions | *[FUTURE]* | SUPER_ADMIN | No | No |
| `settings.manage` | Manage Settings | Site settings | Administration | High | global | SiteSettings | /api/settings | SiteSettingsAdmin | ADMIN | Yes | No |
| `audit.view` | View Audit Log | Read audit trail | Administration | Medium | global | AuditLog | GET /api/admin/audit | *[FUTURE]* | ADMIN | Yes | No |
