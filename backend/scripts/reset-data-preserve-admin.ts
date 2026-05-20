import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const ADMIN_EMAIL = 'admin@angisoft.co.ke';

async function deleteMany(label: string, action: () => Promise<{ count: number }>) {
    const result = await action();
    console.log(`Deleted ${result.count} ${label}`);
}

async function main() {
    if (process.env.CONFIRM_FULL_DB_RESET !== 'YES') {
        throw new Error('Refusing to reset database without CONFIRM_FULL_DB_RESET=YES');
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error('DATABASE_URL is not configured');

    const url = new URL(databaseUrl);
    console.log(`Reset target: ${url.hostname}/${url.pathname.replace('/', '')}`);
    console.log(`Preserving admin login: ${ADMIN_EMAIL}`);

    const admin = await prisma.employee.findUnique({ where: { email: ADMIN_EMAIL } });
    if (!admin) throw new Error(`Cannot preserve ${ADMIN_EMAIL}; account was not found`);

    await prisma.$transaction(async (tx) => {
        await deleteMany('files', () => tx.file.deleteMany({}));
        await deleteMany('project activities', () => tx.projectActivity.deleteMany({}));
        await deleteMany('project milestones', () => tx.projectMilestone.deleteMany({}));
        await deleteMany('project comments', () => tx.projectComment.deleteMany({}));
        await deleteMany('project deliverables', () => tx.projectDeliverable.deleteMany({}));
        await deleteMany('client projects', () => tx.clientProject.deleteMany({}));
        await deleteMany('payments', () => tx.payment.deleteMany({}));
        await deleteMany('notes', () => tx.note.deleteMany({}));
        await deleteMany('bookings', () => tx.booking.deleteMany({}));
        await deleteMany('client access tokens', () => tx.clientAccessToken.deleteMany({}));
        await deleteMany('ticket messages', () => tx.ticketMessage.deleteMany({}));
        await deleteMany('support tickets', () => tx.supportTicket.deleteMany({}));
        await deleteMany('product inquiries', () => tx.productInquiry.deleteMany({}));
        await deleteMany('clients', () => tx.client.deleteMany({}));
        await deleteMany('blog comments', () => tx.blogComment.deleteMany({}));
        await deleteMany('blog reactions', () => tx.blogReaction.deleteMany({}));
        await deleteMany('blog posts', () => tx.blogPost.deleteMany({}));
        await deleteMany('blog categories', () => tx.blogCategory.deleteMany({}));
        await deleteMany('review reactions', () => tx.reviewReaction.deleteMany({}));
        await deleteMany('testimonials', () => tx.testimonial.deleteMany({}));
        await deleteMany('project employees', () => tx.projectEmployee.deleteMany({}));
        await deleteMany('projects', () => tx.project.deleteMany({}));
        await deleteMany('services', () => tx.service.deleteMany({}));
        await deleteMany('service categories', () => tx.serviceCategory.deleteMany({}));
        await deleteMany('product FAQs', () => tx.productFaq.deleteMany({}));
        await deleteMany('products', () => tx.product.deleteMany({}));
        await deleteMany('subscriber preferences', () => tx.subscriberPreference.deleteMany({}));
        await deleteMany('subscribers', () => tx.subscriber.deleteMany({}));
        await deleteMany('survey responses', () => tx.surveyResponse.deleteMany({}));
        await deleteMany('surveys', () => tx.survey.deleteMany({}));
        await deleteMany('chat messages', () => tx.chatMessage.deleteMany({}));
        await deleteMany('chat conversations', () => tx.chatConversation.deleteMany({}));
        await deleteMany('certifications', () => tx.certification.deleteMany({}));
        await deleteMany('staff blogs', () => tx.staffBlog.deleteMany({}));
        await deleteMany('employee portfolio items', () => tx.employeePortfolioItem.deleteMany({}));
        await deleteMany('employee profile stats', () => tx.employeeProfileStat.deleteMany({}));
        await deleteMany('refresh tokens', () => tx.refreshToken.deleteMany({}));
        await deleteMany('two-factor backup codes for non-admins', () => tx.twoFactorBackupCode.deleteMany({ where: { employeeId: { not: admin.id } } }));
        await deleteMany('employee role assignments', () => tx.employeeRoleAssignment.deleteMany({}));
        await deleteMany('role permissions', () => tx.rolePermission.deleteMany({}));
        await deleteMany('app roles', () => tx.appRole.deleteMany({}));
        await deleteMany('permissions', () => tx.permission.deleteMany({}));
        await deleteMany('non-admin employees', () => tx.employee.deleteMany({ where: { id: { not: admin.id } } }));
        await deleteMany('settings', () => tx.setting.deleteMany({}));
        await deleteMany('notifications', () => tx.notification.deleteMany({}));
        await deleteMany('announcements', () => tx.announcement.deleteMany({}));
        await deleteMany('newsletters', () => tx.newsletter.deleteMany({}));
        await deleteMany('leads', () => tx.lead.deleteMany({}));
        await deleteMany('page views', () => tx.pageView.deleteMany({}));
        await deleteMany('analytics events', () => tx.analyticsEvent.deleteMany({}));
        await deleteMany('audit logs', () => tx.auditLog.deleteMany({}));
        await deleteMany('FAQs', () => tx.faq.deleteMany({}));
        await deleteMany('job postings', () => tx.jobPosting.deleteMany({}));
        await deleteMany('company stats', () => tx.companyStat.deleteMany({}));
        await deleteMany('home page sections', () => tx.homePageSection.deleteMany({}));
    }, { timeout: 120000 });

    console.log('Database content reset complete. Next run: SEED_OVERWRITE_PUBLIC_CONTENT=true npm run prisma:seed');
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
