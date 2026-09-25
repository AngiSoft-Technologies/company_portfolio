import { Router, Request, Response } from 'express';
import type { Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';
import { or, and } from '@prisma/orm-postgres/orm-client';
import { param } from '@prisma/orm-postgres/relational-core/expression';
import { z } from 'zod';
import { validateRequest } from '../../../shared/middleware/validation';
import { sendMail } from '../../../shared/services/email';
import { loadAIConfig, aiComplete } from '../../../modules/ai/services/aiProvider';

async function sendChatbotNotification(opts: {
  type: 'escalation' | 'high_intent';
  conversation: {
    id: string;
    visitorName: string;
    visitorEmail: string;
    visitorPhone?: string | null;
    intent?: string | null;
  };
  recentMessages: { sender: string; message: string; createdAt: string }[];
}) {
  const adminEmail = process.env.CHATBOT_ADMIN_EMAIL;
  if (!adminEmail) return;

  const { type, conversation, recentMessages } = opts;
  const subject =
    type === 'escalation'
      ? `[URGENT] Chatbot Escalation — ${conversation.visitorName}`
      : `New High-Intent Lead — ${conversation.visitorName}`;

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const dashboardLink = `${frontendUrl}/admin/chat-conversations`;

  const messagesHtml = recentMessages
    .slice(-5)
    .map(
      (m) =>
        `<p style="margin:4px 0;"><strong>${m.sender === 'visitor' ? conversation.visitorName : 'Bot'}:</strong> ${m.message}</p>`
    )
    .join('');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:${type === 'escalation' ? '#EF4444' : '#10B981'};">
        ${type === 'escalation' ? 'Escalation Alert' : 'New High-Intent Lead'}
      </h2>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:6px 12px;font-weight:bold;">Name</td><td style="padding:6px 12px;">${conversation.visitorName}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:bold;">Email</td><td style="padding:6px 12px;">${conversation.visitorEmail}</td></tr>
        ${conversation.visitorPhone ? `<tr><td style="padding:6px 12px;font-weight:bold;">Phone</td><td style="padding:6px 12px;">${conversation.visitorPhone}</td></tr>` : ''}
        <tr><td style="padding:6px 12px;font-weight:bold;">Intent</td><td style="padding:6px 12px;">${conversation.intent || 'Unknown'}</td></tr>
      </table>
      <h3>Recent Messages</h3>
      <div style="background:#f4f4f5;padding:12px;border-radius:8px;">${messagesHtml}</div>
      <p style="margin-top:24px;">
        <a href="${dashboardLink}" style="background:#0891b2;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">
          View in Dashboard
        </a>
      </p>
      <hr style="margin:32px 0;border:none;border-top:1px solid #eee;" />
      <p style="color:#999;font-size:12px;">AngiSoft Technologies — Automated Chatbot Notification</p>
    </div>
  `;

  await sendMail({
    to: adminEmail,
    subject,
    html,
    purpose: type === 'escalation' ? 'support' : 'general',
  });
}

const ChatMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  visitorName: z.string().min(2),
  visitorEmail: z.string().email(),
  visitorPhone: z.string().optional(),
  deviceFingerprint: z.string().min(8).max(200).optional(),
  message: z.string().min(1).max(5000),
});

type ChatMessageRequest = z.infer<typeof ChatMessageSchema>;

const ChatHistorySchema = z
  .object({
    conversationId: z.string().uuid().optional(),
    visitorName: z.string().min(2).optional(),
    visitorEmail: z.string().email().optional(),
    visitorPhone: z.string().optional(),
    deviceFingerprint: z.string().min(8).max(200).optional(),
    limit: z.number().int().min(1).max(5).optional(),
  })
  .refine(
    (data) =>
      Boolean(
        data.conversationId ||
          data.deviceFingerprint ||
          (data.visitorEmail && (data.visitorPhone || data.visitorName))
      ),
    {
      message: 'Provide conversationId, deviceFingerprint, or visitorEmail with visitorName/visitorPhone.',
    }
  );

type InternalContext = {
  services: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    priceFrom: number | null;
    scope: string | null;
    targetAudience: string | null;
    categoryName: string | null;
  }>;
  projects: Array<{
    id: string;
    title: string;
    description: string;
    type: string;
    techStack: string[];
    demoUrl: string | null;
    repoUrl: string | null;
  }>;
  blogPosts: Array<{
    id: string;
    title: string;
    slug: string;
    tags: string[];
    publishedAt: Date | null;
  }>;
  faqs: Array<{
    question: string;
    answer: string;
    category: string;
  }>;
  testimonials: Array<{
    name: string;
    company: string | null;
    role: string | null;
    text: string;
    rating: number | null;
  }>;
  team: Array<{
    firstName: string;
    lastName: string;
    role: string;
    bio: string | null;
  }>;
  categories: Array<{
    name: string;
    description: string | null;
  }>;
  contact: any | null;
  about: any | null;
  booking: any | null;
};

export default function chatbotRouter(prisma: Db) {
  const router = Router();

  const MAX_CONTEXT_CHARS = 6000;
  const STOPWORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'to', 'for', 'of', 'in', 'on', 'with', 'is', 'are', 'was', 'were',
    'about', 'our', 'your', 'what', 'which', 'how', 'do', 'does', 'we', 'you', 'i', 'me', 'my',
    'can', 'could', 'would', 'should', 'please', 'hi', 'hello', 'hey', 'thanks', 'thank', 'need',
    'looking', 'like', 'want', 'just', 'tell'
  ]);

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 3)}...`;
  };

  const extractKeywords = (message: string) => {
    const tokens = message
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .filter((word) => word.length > 2 && !STOPWORDS.has(word));
    return Array.from(new Set(tokens)).slice(0, 6);
  };

  const detectTopics = (message: string) => ({
    services: /service|offer|pricing|price|cost|quote|package|plan|app|web|mobile|data|cyber|security|automation|saas|cms|analytics|dashboard|kotlin|flutter|react/i.test(message),
    projects: /project|portfolio|case study|work|example/i.test(message),
    blog: /blog|article|post|news/i.test(message),
    team: /team|staff|developer|engineer|designer|who/i.test(message),
    faq: /faq|question|help|support|how|timeline|duration|process/i.test(message),
    testimonials: /testimonial|review|client|feedback|rating/i.test(message),
    contact: /contact|email|phone|whatsapp|call|reach|location|address|hours|support/i.test(message),
    about: /about|company|mission|vision|values|angisoft|angisoft technologies/i.test(message),
    booking: /book|booking|estimate|proposal|start project|project types|requirements|quote/i.test(message)
  });

  const buildTextOrFilter = (keywords: string[], fields: string[]) => {
    if (keywords.length === 0) return null;
    const patterns = keywords.flatMap((keyword) =>
      fields.map((field) => (m: any) => m[field].ilike(`%${keyword}%`))
    );
    return (m: any) => or(...patterns.map((p: any) => p(m)));
  };

  const fetchArrayOverlapIds = async (model: 'Project' | 'BlogPost', column: 'techStack' | 'tags', values: string[]): Promise<string[]> => {
    const plan = model === 'Project'
      ? prisma.raw.sql`SELECT "id" FROM "Project" WHERE "techStack" && ${param(values, { codecId: 'pg/text-array@1' })}`
          .returnsRow({ id: prisma.sql.public.Project.columns.id })
          .build()
      : prisma.raw.sql`SELECT "id" FROM "BlogPost" WHERE "tags" && ${param(values, { codecId: 'pg/text-array@1' })}`
          .returnsRow({ id: prisma.sql.public.BlogPost.columns.id })
          .build();
    const rows = await prisma.runtime().query(plan);
    return (rows as any[]).map((r) => r.id);
  };

  const formatContact = (contact: any) => {
    if (!contact || typeof contact !== 'object') return null;
    const parts: string[] = [];
    if (contact.companyName) parts.push(`Company: ${contact.companyName}`);
    if (contact.email) parts.push(`Email: ${contact.email}`);
    if (contact.phone) parts.push(`Phone: ${contact.phone}`);
    if (contact.whatsapp) parts.push(`WhatsApp: ${contact.whatsapp}`);
    if (contact.address && typeof contact.address === 'object') {
      const address = [contact.address.street, contact.address.city, contact.address.country]
        .filter(Boolean)
        .join(', ');
      if (address) parts.push(`Address: ${address}`);
    }
    if (contact.hours && typeof contact.hours === 'object') {
      const hours = [contact.hours.weekdays, contact.hours.weekends].filter(Boolean).join(' | ');
      if (hours) parts.push(`Hours: ${hours}`);
    }
    return parts.length ? parts.join(' | ') : null;
  };

  const formatAbout = (about: any) => {
    if (!about) return null;
    if (typeof about === 'string') return about;
    if (typeof about !== 'object') return null;
    const description = Array.isArray(about.description)
      ? about.description[0]
      : about.description;
    const achievements = Array.isArray(about.achievements)
      ? about.achievements.slice(0, 3).join('; ')
      : null;
    return [description, achievements].filter(Boolean).join(' ');
  };

  const formatBooking = (booking: any) => {
    if (!booking || typeof booking !== 'object') return null;
    const steps = Array.isArray(booking.steps)
      ? booking.steps.map((step: any) => step.title).filter(Boolean).join(', ')
      : null;
    const projectTypes = Array.isArray(booking.projectTypes)
      ? booking.projectTypes.map((type: any) => type.label).filter(Boolean).join(', ')
      : null;
    const summaryParts = [];
    if (steps) summaryParts.push(`Steps: ${steps}`);
    if (projectTypes) summaryParts.push(`Project types: ${projectTypes}`);
    return summaryParts.length ? summaryParts.join(' | ') : null;
  };

  const formatInternalContext = (context: InternalContext) => {
    const parts: string[] = [];
    const about = formatAbout(context.about);
    if (about) {
      parts.push(`About: ${truncateText(about, 400)}`);
    }
    const contact = formatContact(context.contact);
    if (contact) {
      parts.push(`Contact: ${contact}`);
    }
    const booking = formatBooking(context.booking);
    if (booking) {
      parts.push(`Booking: ${booking}`);
    }
    if (context.categories.length) {
      parts.push(
        `Service categories: ${context.categories
          .map((cat) => `${cat.name}${cat.description ? ` (${truncateText(cat.description, 80)})` : ''}`)
          .join(', ')}`
      );
    }
    if (context.services.length) {
      parts.push(
        `Services:\n${context.services
          .map((service) => {
            const price = service.priceFrom !== null && service.priceFrom !== undefined
              ? ` | Price from ${service.priceFrom}`
              : '';
            const scope = service.scope ? ` | Scope: ${service.scope}` : '';
            const category = service.categoryName || service.category;
            return `- ${service.title} (${category})${price}${scope}: ${truncateText(service.description, 140)}`;
          })
          .join('\n')}`
      );
    }
    if (context.projects.length) {
      parts.push(
        `Projects:\n${context.projects
          .map((project) => {
            const tech = project.techStack?.length ? ` | Tech: ${project.techStack.slice(0, 5).join(', ')}` : '';
            return `- ${project.title} (${project.type})${tech}: ${truncateText(project.description, 140)}`;
          })
          .join('\n')}`
      );
    }
    if (context.blogPosts.length) {
      parts.push(
        `Blog posts:\n${context.blogPosts
          .map((post) => {
            const tags = post.tags?.length ? ` | Tags: ${post.tags.slice(0, 5).join(', ')}` : '';
            return `- ${post.title} (${post.slug})${tags}`;
          })
          .join('\n')}`
      );
    }
    if (context.faqs.length) {
      parts.push(
        `FAQs:\n${context.faqs
          .map((faq) => `- ${faq.question}: ${truncateText(faq.answer, 160)}`)
          .join('\n')}`
      );
    }
    if (context.testimonials.length) {
      parts.push(
        `Testimonials:\n${context.testimonials
          .map((testimonial) => {
            const meta = [testimonial.role, testimonial.company].filter(Boolean).join(', ');
            return `- ${testimonial.name}${meta ? ` (${meta})` : ''}: ${truncateText(testimonial.text, 160)}`;
          })
          .join('\n')}`
      );
    }
    if (context.team.length) {
      parts.push(
        `Team:\n${context.team
          .map((member) => {
            const name = `${member.firstName} ${member.lastName}`.trim();
            const bio = member.bio ? `: ${truncateText(member.bio, 120)}` : '';
            return `- ${name} (${member.role})${bio}`;
          })
          .join('\n')}`
      );
    }
    return truncateText(parts.join('\n'), MAX_CONTEXT_CHARS);
  };

  const buildSystemPrompt = (contextText: string) => {
    const basePrompt = `You are a professional and friendly chatbot for AngiSoft Technologies, a custom software development company based in Kenya.
You help clients with inquiries about services, pricing, team expertise, projects, and bookings.
Use ONLY the facts in the CONTEXT below and the conversation history. If the answer is not in the context, say you don't have that information and offer to connect them with the team.
Never invent prices, staff counts, or project details. Keep answers concise, helpful, and professional.`;

    if (!contextText) {
      return `${basePrompt}\nIf no context is provided, ask a clarifying question and suggest contacting the team.`;
    }

    return `${basePrompt}\n\nCONTEXT:\n${contextText}`;
  };

  const shouldEscalateToHuman = (message: string) => {
    const text = message.toLowerCase();
    const humanRequest = [
      'human',
      'agent',
      'representative',
      'person',
      'talk to someone',
      'call me',
      'live chat',
      'support person'
    ];
    const criticalSignals = [
      'urgent',
      'asap',
      'emergency',
      'critical',
      'down',
      'outage',
      'system is down',
      'payment failed',
      'failed payment',
      'chargeback',
      'refund',
      'fraud',
      'hacked',
      'breach',
      'security issue',
      'data loss',
      'lost data',
      'cannot login',
      'can\'t login',
      'unable to login',
      'account locked',
      'locked out'
    ];

    const hasHumanRequest = humanRequest.some((phrase) => text.includes(phrase));
    const hasCriticalSignal = criticalSignals.some((phrase) => text.includes(phrase));

    return hasHumanRequest || hasCriticalSignal;
  };

  const buildHandoffMessage = (contact: any) => {
    const contactSummary = formatContact(contact);
    if (contactSummary) {
      return `Thanks for letting us know. I’m connecting you to a human assistant now. You can also reach us directly here: ${contactSummary}`;
    }
    return 'Thanks for letting us know. I’m connecting you to a human assistant now. Our team will follow up shortly.';
  };

  const getInternalContext = async (userMessage: string): Promise<InternalContext> => {
    const message = userMessage.toLowerCase();
    const keywords = extractKeywords(message);
    const topics = detectTopics(message);
    const hasTopic = Object.values(topics).some(Boolean);

    if (!hasTopic && keywords.length === 0) {
      return {
        services: [],
        projects: [],
        blogPosts: [],
        faqs: [],
        testimonials: [],
        team: [],
        categories: [],
        contact: null,
        about: null,
        booking: null
      };
    }

    const serviceFilter = buildTextOrFilter(keywords, ['title', 'description', 'category', 'scope', 'targetAudience']);
    const projectFilter = buildTextOrFilter(keywords, ['title', 'description', '_type']);
    const blogFilter = buildTextOrFilter(keywords, ['title', 'content']);
    const faqFilter = buildTextOrFilter(keywords, ['question', 'answer', 'category']);
    const testimonialFilter = buildTextOrFilter(keywords, ['name', 'company', 'role', 'text']);
    const teamFilter = buildTextOrFilter(keywords, ['firstName', 'lastName', 'bio']);
    const categoryFilter = buildTextOrFilter(keywords, ['name', 'description']);

    const projectTechIds = topics.projects && keywords.length
      ? await fetchArrayOverlapIds('Project', 'techStack', keywords)
      : [];
    const blogTagIds = topics.blog && keywords.length
      ? await fetchArrayOverlapIds('BlogPost', 'tags', keywords)
      : [];

    const [
      services,
      projects,
      blogPosts,
      faqs,
      testimonials,
      team,
      categories,
      contact,
      about,
      booking
    ] = await Promise.all([
      topics.services || topics.booking
        ? (async () => {
            let q: any = prisma.orm.public.Service.where({ published: true });
            if (serviceFilter) q = q.where(serviceFilter);
            const rows = await q
              .orderBy((s: any) => s.updatedAt.desc())
              .limit(4)
              .select('id', 'title', 'description', 'category', 'priceFrom', 'scope', 'targetAudience')
              .include('categoryServiceCategory', (c: any) => c.select('name'))
              .all();
            return rows.map((s: any) => {
              const { categoryServiceCategory, ...rest } = s;
              return { ...rest, categoryName: categoryServiceCategory?.name ?? null };
            });
          })()
        : Promise.resolve([]),
      topics.projects
        ? (async () => {
            let q: any = prisma.orm.public.Project.where({ published: true });
            const exprs: any[] = [];
            if (projectFilter) exprs.push(projectFilter);
            if (projectTechIds.length) exprs.push((p: any) => p.id.in(projectTechIds));
            if (exprs.length) q = q.where((p: any) => or(...exprs.map((e: any) => e(p))));
            const rows = await q
              .orderBy((p: any) => p.updatedAt.desc())
              .limit(3)
              .select('id', 'title', 'description', '_type', 'techStack', 'demoUrl', 'repoUrl')
              .all();
            return rows.map((p: any) => {
              const { _type, ...rest } = p;
              return { ...rest, type: _type };
            });
          })()
        : Promise.resolve([]),
      topics.blog
        ? (async () => {
            let q: any = prisma.orm.public.BlogPost.where({ published: true });
            const exprs: any[] = [];
            if (blogFilter) exprs.push(blogFilter);
            if (blogTagIds.length) exprs.push((b: any) => b.id.in(blogTagIds));
            if (exprs.length) q = q.where((b: any) => or(...exprs.map((e: any) => e(b))));
            return q
              .orderBy((b: any) => b.publishedAt.desc())
              .limit(3)
              .select('id', 'title', 'slug', 'tags', 'publishedAt')
              .all();
          })()
        : Promise.resolve([]),
      topics.faq
        ? (async () => {
            let q: any = prisma.orm.public.Faq.where({ published: true });
            if (faqFilter) q = q.where(faqFilter);
            return q
              .orderBy((f: any) => f.order.asc())
              .limit(4)
              .select('question', 'answer', 'category')
              .all();
          })()
        : Promise.resolve([]),
      topics.testimonials
        ? (async () => {
            let q: any = prisma.orm.public.Testimonial.where({ confirmed: true });
            if (testimonialFilter) q = q.where(testimonialFilter);
            return q
              .orderBy((t: any) => t.createdAt.desc())
              .limit(3)
              .select('name', 'company', 'role', 'text', 'rating')
              .all();
          })()
        : Promise.resolve([]),
      topics.team
        ? (async () => {
            let q: any = prisma.orm.public.Employee
              .where((e: any) => e.acceptedAt.isNotNull())
              .where((e: any) => e.bio.isNotNull());
            if (teamFilter) q = q.where(teamFilter);
            return q
              .orderBy((e: any) => e.createdAt.desc())
              .limit(4)
              .select('firstName', 'lastName', 'role', 'bio')
              .all();
          })()
        : Promise.resolve([]),
      topics.services
        ? (async () => {
            let q: any = prisma.orm.public.ServiceCategory.where({ published: true });
            if (categoryFilter) q = q.where(categoryFilter);
            return q
              .orderBy((c: any) => c.order.asc())
              .limit(6)
              .select('name', 'description')
              .all();
          })()
        : Promise.resolve([]),
      topics.contact
        ? prisma.orm.public.Setting.where({ key: 'site_contact' }).first()
        : Promise.resolve(null),
      topics.about
        ? prisma.orm.public.Setting.where({ key: 'site_about' }).first()
        : Promise.resolve(null),
      topics.booking
        ? prisma.orm.public.Setting.where({ key: 'site_booking' }).first()
        : Promise.resolve(null)
    ]);

    return {
      services: services as any,
      projects: projects as any,
      blogPosts: blogPosts as any,
      faqs: faqs as any,
      testimonials: testimonials as any,
      team: team as any,
      categories: categories as any,
      contact: contact?.value ?? null,
      about: about?.value ?? null,
      booking: booking?.value ?? null
    };
  };

  const getExternalContext = async (payload: {
    message: string;
    conversationId: string;
    visitorName: string;
    visitorEmail: string;
    visitorPhone?: string;
  }) => {
    const url = process.env.CHATBOT_EXTERNAL_CONTEXT_URL;
    if (!url) return null;

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (process.env.CHATBOT_EXTERNAL_CONTEXT_TOKEN) {
        headers.Authorization = `Bearer ${process.env.CHATBOT_EXTERNAL_CONTEXT_TOKEN}`;
      }
      const includeVisitor = process.env.CHATBOT_EXTERNAL_INCLUDE_VISITOR === 'true';
      const body: Record<string, any> = {
        message: payload.message,
        conversationId: payload.conversationId
      };
      if (includeVisitor) {
        body.visitor = {
          name: payload.visitorName,
          email: payload.visitorEmail,
          phone: payload.visitorPhone
        };
      }
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        console.warn('External context API error:', response.status);
        return null;
      }

      const data = await response.json();
      if (typeof data === 'string') return data;
      if (typeof data?.context === 'string') return data.context;
      return JSON.stringify(data);
    } catch (error) {
      console.warn('External context fetch failed:', error);
      return null;
    }
  };

  // Get the AI reply from the configured model provider (NVIDIA NIM, OpenAI,
  // Anthropic, Google Gemini, Moonshot, Groq, … see services/aiProvider.ts).
  // An admin can pick the provider/model/API key from /admin/ai-config; the
  // env AI_* / OPENAI_API_KEY values are used until one is saved.
  const getAIResponse = async (
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }>,
    contextText: string,
    internalContext: InternalContext
  ): Promise<string> => {
    try {
      const { config, source } = await loadAIConfig(prisma as any);

      // Legacy fallback: a Hugging Face key set in env still works when no
      // generic provider is configured.
      if (source === 'env' && !config.apiKey && process.env.HUGGINGFACE_API_KEY) {
        return await getHuggingFaceResponse(userMessage, conversationHistory, contextText);
      }

      if (!config.enabled || !config.apiKey) {
        console.warn('AI API key not configured, using fallback responses');
        return getFallbackResponse(userMessage, internalContext);
      }

      const systemPrompt = buildSystemPrompt(contextText);
      return await aiComplete(
        config,
        [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: userMessage },
        ],
        { maxTokens: config.maxTokens, temperature: config.temperature }
      );
    } catch (error) {
      console.error('AI API error:', error);
      return getFallbackResponse(userMessage, internalContext);
    }
  };

  const getHuggingFaceResponse = async (
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }>,
    contextText: string
  ): Promise<string> => {
    const systemPrompt = buildSystemPrompt(contextText);
    const conversationText = conversationHistory
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Bot'}: ${msg.content}`)
      .join('\n');

    const response = await fetch(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: `System: ${systemPrompt}\n${conversationText}\nUser: ${userMessage}\nBot:`,
          parameters: { max_new_tokens: 300 },
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Hugging Face API error');
    }

    const data = await response.json();
    const text = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;

    if (!text) {
      throw new Error('No response from Hugging Face API');
    }

    // Extract only the bot response (after the last "Bot:" marker)
    const botResponse = text.split('Bot:').pop()?.trim() || 'Unable to generate response';
    return botResponse;
  };

  const getFallbackResponse = (userMessage: string, internalContext: InternalContext): string => {
    const message = userMessage.toLowerCase();
    const contact = formatContact(internalContext.contact);

    // Service inquiries
    if (message.includes('service') || message.includes('offer') || message.includes('what do you')) {
      if (internalContext.services.length) {
        const servicesList = internalContext.services.map((service) => service.title).join(', ');
        return `Here are some of our current services: ${servicesList}. What type of project are you interested in?`;
      }
      return 'We offer custom software development, mobile apps, web development, data analysis dashboards, cybersecurity consulting, and automation solutions. What type of project are you interested in?';
    }

    // Pricing/booking
    if (message.includes('price') || message.includes('cost') || message.includes('booking') || message.includes('book')) {
      const booking = formatBooking(internalContext.booking);
      if (booking) {
        return `Pricing depends on scope, but here is our booking flow: ${booking}. Tell me a bit about your project and I can help you estimate.`;
      }
      return 'We offer flexible pricing based on your project requirements. I can help you get started! What\'s your project about? This helps us provide an accurate quote.';
    }

    // Timeline
    if (message.includes('how long') || message.includes('timeline') || message.includes('duration')) {
      return 'Project timelines vary from 2 weeks to 3+ months depending on complexity. During a consultation, we\'ll provide accurate estimates for your specific needs.';
    }

    // Team/experience
    if (message.includes('team') || message.includes('experience') || message.includes('who') || message.includes('staff')) {
      if (internalContext.team.length) {
        const teamList = internalContext.team.map((member) => `${member.firstName} ${member.lastName} (${member.role})`).join(', ');
        return `Here are some of our team members: ${teamList}. Want to know about a specific specialty?`;
      }
      return 'AngiSoft has a talented team of developers, designers, and consultants with 5+ years of experience. We specialize in custom solutions for the African market.';
    }

    // Projects/portfolio
    if (message.includes('project') || message.includes('portfolio') || message.includes('work') || message.includes('case')) {
      if (internalContext.projects.length) {
        const projectList = internalContext.projects.map((project) => project.title).join(', ');
        return `Here are some recent projects: ${projectList}. Would you like details on any of these?`;
      }
      return 'We have delivered a variety of projects across web, mobile, data, and cybersecurity. Share your industry or goal, and I can provide relevant examples.';
    }

    // Blog
    if (message.includes('blog') || message.includes('article') || message.includes('post') || message.includes('news')) {
      if (internalContext.blogPosts.length) {
        const postsList = internalContext.blogPosts.map((post) => post.title).join(', ');
        return `Here are some of our latest posts: ${postsList}. Want the link or summary for any of them?`;
      }
      return 'We publish updates and insights periodically. Tell me what topic you\'re interested in and I can point you to the right post.';
    }

    // FAQs / Support
    if (message.includes('faq') || message.includes('question') || message.includes('help') || message.includes('support')) {
      if (internalContext.faqs.length) {
        const topFaq = internalContext.faqs[0];
        return `${topFaq.question} ${topFaq.answer}`;
      }
    }

    // Testimonials
    if (message.includes('testimonial') || message.includes('review') || message.includes('feedback')) {
      if (internalContext.testimonials.length) {
        const topTestimonial = internalContext.testimonials[0];
        return `${topTestimonial.name} shared: "${truncateText(topTestimonial.text, 160)}"`;
      }
    }

    // Technologies
    if (message.includes('tech') || message.includes('stack') || message.includes('language') || message.includes('framework')) {
      return 'We work with React, Vue, Angular, Node.js, Python, Kotlin, Flutter, PostgreSQL, and cloud platforms like AWS & Azure. We choose the best tech for your needs.';
    }

    // Contact/Support
    if (message.includes('contact') || message.includes('email') || message.includes('phone') || message.includes('support')) {
      if (contact) {
        return `You can reach us here: ${contact}.`;
      }
      return 'You can reach us via our website contact form or email support@angisoft.co.ke. We typically respond within 2 hours during business hours.';
    }

    // Default
    return 'That\'s a great question! I can help you further if you share more details. What\'s your main interest—a mobile app, web platform, data analysis, or something else?';
  };

  // Get product recommendations based on user input
  const getRecommendations = async (userMessage: string, prisma: Db) => {
    const message = userMessage.toLowerCase();

    // Fetch relevant services/projects based on keywords
    const keywords: { [key: string]: string } = {
      'mobile': 'Mobile',
      'app': 'App',
      'web': 'Web',
      'data': 'Data',
      'analytics': 'Analytics',
      'security': 'Security',
      'ecommerce': 'E-commerce',
      'cms': 'CMS',
      'automation': 'Automation',
      'saas': 'SaaS',
    };

    let relevantServices: any[] = [];
    for (const [keyword, category] of Object.entries(keywords)) {
      if (message.includes(keyword)) {
        const services = await prisma.orm.public.Service
          .where({ published: true })
          .where((s: any) => or(
            s.category.ilike(`%${category}%`),
            s.categoryServiceCategory.some((c: any) => c.name.ilike(`%${category}%`))
          ))
          .limit(2)
          .all();
        relevantServices.push(...services);
      }
    }

    return relevantServices.slice(0, 3);
  };

  // Send chat message
  router.post(
    '/chat',
    validateRequest(ChatMessageSchema),
    async (req: Request<{}, {}, ChatMessageRequest>, res: Response) => {
      try {
        const {
          conversationId,
          visitorName,
          visitorEmail,
          visitorPhone,
          deviceFingerprint,
          message
        } = req.body;

        // Find or create conversation
        let conversation = conversationId
          ? await prisma.orm.public.ChatConversation.where({ id: conversationId }).first()
          : null;

        if (conversation && conversation.visitorEmail !== visitorEmail) {
          conversation = null;
        }

        if (!conversation) {
          conversation = await prisma.orm.public.ChatConversation.create({
            id: newId(),
            updatedAt: ts(),
            visitorName,
            visitorEmail,
            visitorPhone: visitorPhone ?? null,
            deviceFingerprint: deviceFingerprint ?? null
          });
        } else if (deviceFingerprint || visitorPhone || visitorName) {
          await prisma.orm.public.ChatConversation.where({ id: conversation.id }).update({
            deviceFingerprint: deviceFingerprint || conversation.deviceFingerprint,
            visitorPhone: visitorPhone || conversation.visitorPhone,
            visitorName: visitorName || conversation.visitorName,
          });
        }

        // Save user message
        await prisma.orm.public.ChatMessage.create({
          id: newId(),
          conversationId: conversation.id,
          sender: 'visitor',
          message
        });

        // Get conversation history
        const history = await prisma.orm.public.ChatMessage
          .where({ conversationId: conversation.id })
          .orderBy((m: any) => m.createdAt.asc())
          .limit(10)
          .all();

        const conversationHistory = history.map((msg: { sender: string; message: string }) => ({
          role: msg.sender === 'visitor' ? 'user' : 'assistant',
          content: msg.message,
        }));

        // Build internal context
        const internalContext = await getInternalContext(message);

        // Escalate to human if needed
        if (shouldEscalateToHuman(message)) {
          let contactInfo = internalContext.contact;
          if (!contactInfo) {
            const contactSetting = await prisma.orm.public.Setting.where({ key: 'site_contact' }).first();
            contactInfo = contactSetting?.value ?? null;
          }
          const handoffMessage = buildHandoffMessage(contactInfo);
          await prisma.orm.public.ChatMessage.create({
            id: newId(),
            conversationId: conversation.id,
            sender: 'bot',
            message: handoffMessage
          });

          await prisma.orm.public.ChatConversation.where({ id: conversation.id }).update({
            status: 'escalated',
            intent: 'support'
          });

          // Notify admin of escalation (fire-and-forget)
          sendChatbotNotification({
            type: 'escalation',
            conversation: {
              id: conversation.id,
              visitorName,
              visitorEmail,
              visitorPhone,
              intent: 'support',
            },
            recentMessages: history,
          }).catch((err) => console.error('Escalation notification failed:', err));

          return res.json({
            conversationId: conversation.id,
            message: handoffMessage,
            recommendations: [],
            intent: 'support',
            handoff: true,
          });
        }

        // Fetch external context if configured
        const externalContext = await getExternalContext({
          message,
          conversationId: conversation.id,
          visitorName,
          visitorEmail,
          visitorPhone
        });

        const contextTextParts = [];
        const internalContextText = formatInternalContext(internalContext);
        if (internalContextText) contextTextParts.push(internalContextText);
        if (externalContext) contextTextParts.push(`External data:\n${truncateText(externalContext, 1200)}`);
        const contextText = contextTextParts.join('\n\n');

        // Get AI response
        const botResponse = await getAIResponse(message, conversationHistory, contextText, internalContext);

        // Get product recommendations
        const recommendations = await getRecommendations(message, prisma);

        // Save bot response
        await prisma.orm.public.ChatMessage.create({
          id: newId(),
          conversationId: conversation.id,
          sender: 'bot',
          message: botResponse
        });

        // Update conversation intent based on content
        const intents: { [key: string]: string } = {
          'book': 'booking',
          'quote': 'inquiry',
          'help': 'support',
          'info': 'inquiry',
        };

        let intent = conversation.intent;
        for (const [keyword, intType] of Object.entries(intents)) {
          if (message.toLowerCase().includes(keyword)) {
            intent = intType;
            break;
          }
        }

        await prisma.orm.public.ChatConversation.where({ id: conversation.id }).update({
          intent
        });

        // Notify admin on first booking-intent detection (fire-and-forget)
        if (intent === 'booking' && conversation.intent !== 'booking') {
          sendChatbotNotification({
            type: 'high_intent',
            conversation: {
              id: conversation.id,
              visitorName,
              visitorEmail,
              visitorPhone,
              intent: 'booking',
            },
            recentMessages: history,
          }).catch((err) => console.error('High-intent notification failed:', err));
        }

        res.json({
          conversationId: conversation.id,
          message: botResponse,
          recommendations,
          intent,
        });
      } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to process message' });
      }
    }
  );

  // Get conversation history for a visitor (public)
  router.post('/history', validateRequest(ChatHistorySchema), async (req: Request, res: Response) => {
    try {
      const {
        conversationId,
        visitorName,
        visitorEmail,
        visitorPhone,
        deviceFingerprint,
        limit = 2,
      } = req.body as z.infer<typeof ChatHistorySchema>;

      const orFilters: any[] = [];

      if (conversationId) {
        orFilters.push((c: any) => c.id.eq(conversationId));
      }

      if (deviceFingerprint) {
        orFilters.push((c: any) => c.deviceFingerprint.eq(deviceFingerprint));
      }

      if (visitorEmail && visitorPhone) {
        orFilters.push((c: any) => and(c.visitorEmail.eq(visitorEmail), c.visitorPhone.eq(visitorPhone)));
      }

      if (visitorEmail && visitorName) {
        orFilters.push((c: any) => and(c.visitorEmail.eq(visitorEmail), c.visitorName.eq(visitorName)));
      }

      const conversations = await prisma.orm.public.ChatConversation
        .where((c: any) => or(...orFilters.map((f: any) => f(c))))
        .include('chatMessages', (m: any) => m.orderBy((x: any) => x.createdAt.asc()))
        .orderBy((c: any) => c.updatedAt.desc())
        .limit(Number(limit))
        .all();

      res.json({
        latestConversationId: conversations[0]?.id ?? null,
        conversations: conversations.map((conversation: any) => {
          const { chatMessages, ...rest } = conversation;
          return {
            id: rest.id,
            status: rest.status,
            intent: rest.intent,
            createdAt: rest.createdAt,
            updatedAt: rest.updatedAt,
            messages: chatMessages.map((msg: any) => ({
              id: msg.id,
              sender: msg.sender,
              message: msg.message,
              createdAt: msg.createdAt,
            })),
          };
        }),
      });
    } catch (error) {
      console.error('Error fetching chat history:', error);
      res.status(500).json({ error: 'Failed to fetch chat history' });
    }
  });

  // Get conversation (for admin dashboard)
  router.get('/conversations/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const conversation = await prisma.orm.public.ChatConversation
        .where({ id })
        .include('chatMessages', (m: any) => m.orderBy((x: any) => x.createdAt.asc()))
        .first();

      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      const { chatMessages, ...rest } = conversation as any;
      res.json({ ...rest, messages: chatMessages });
    } catch (error) {
      console.error('Error fetching conversation:', error);
      res.status(500).json({ error: 'Failed to fetch conversation' });
    }
  });

  // List conversations (admin only)
  router.get('/conversations', async (req: Request, res: Response) => {
    try {
      const { status = 'open', page = 1, limit = 20 } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      let query: any = prisma.orm.public.ChatConversation;
      if (status !== 'all') query = query.where({ status: String(status) });
      const conversations = await query
        .include('chatMessages', (m: any) => m.orderBy((x: any) => x.createdAt.desc()).limit(1))
        .orderBy((c: any) => c.createdAt.desc())
        .limit(Number(limit))
        .offset(skip)
        .all();

      let countQuery: any = prisma.orm.public.ChatConversation;
      if (status !== 'all') countQuery = countQuery.where({ status: String(status) });
      const total = await countQuery
        .aggregate((a: any) => ({ n: a.count() }))
        .then((r: any) => r.n);

      res.json({
        conversations: conversations.map((c: any) => {
          const { chatMessages, ...rest } = c;
          return { ...rest, messages: chatMessages };
        }),
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      });
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  });

  // Update conversation status
  router.put('/conversations/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, notes, quality } = req.body;

      const payload: any = {};
      if (status) payload.status = status;
      if (notes) payload.notes = notes;
      if (quality) payload.quality = quality;

      const updated = await prisma.orm.public.ChatConversation.where({ id }).update(payload);

      res.json(updated);
    } catch (error) {
      console.error('Error updating conversation:', error);
      res.status(500).json({ error: 'Failed to update conversation' });
    }
  });

  return router;
}
