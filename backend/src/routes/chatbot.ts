import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';
import { sendMail } from '../services/email';

async function sendChatbotNotification(opts: {
  type: 'escalation' | 'high_intent';
  conversation: {
    id: string;
    visitorName: string;
    visitorEmail: string;
    visitorPhone?: string | null;
    intent?: string | null;
  };
  recentMessages: { sender: string; message: string; createdAt: Date }[];
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

export default function chatbotRouter(prisma: PrismaClient) {
  const router = Router();
  const prismaChat = prisma as PrismaClient & {
    chatConversation: any;
    chatMessage: any;
  };

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

  const buildTextOrFilters = (keywords: string[], fields: string[]) => {
    if (keywords.length === 0) return [];
    return keywords.flatMap((keyword) =>
      fields.map((field) => ({
        [field]: { contains: keyword, mode: 'insensitive' as const }
      }))
    );
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

    const serviceOr = buildTextOrFilters(keywords, ['title', 'description', 'category', 'scope', 'targetAudience']);
    const projectOr = buildTextOrFilters(keywords, ['title', 'description', 'type']);
    const projectOrFull = keywords.length
      ? [...projectOr, { techStack: { hasSome: keywords } }]
      : projectOr;
    const blogOr = buildTextOrFilters(keywords, ['title', 'content']);
    const blogOrFull = keywords.length
      ? [...blogOr, { tags: { hasSome: keywords } }]
      : blogOr;
    const faqOr = buildTextOrFilters(keywords, ['question', 'answer', 'category']);
    const testimonialOr = buildTextOrFilters(keywords, ['name', 'company', 'role', 'text']);
    const teamOr = buildTextOrFilters(keywords, ['firstName', 'lastName', 'bio']);
    const categoryOr = buildTextOrFilters(keywords, ['name', 'description']);

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
        ? prisma.service.findMany({
            where: {
              published: true,
              ...(serviceOr.length ? { OR: serviceOr } : {})
            },
            orderBy: { updatedAt: 'desc' },
            take: 4,
            select: {
              id: true,
              title: true,
              description: true,
              category: true,
              priceFrom: true,
              scope: true,
              targetAudience: true,
              categoryRef: { select: { name: true } }
            }
          })
        : Promise.resolve([]),
      topics.projects
        ? prisma.project.findMany({
            where: {
              published: true,
              ...(projectOrFull.length ? { OR: projectOrFull } : {})
            },
            orderBy: { updatedAt: 'desc' },
            take: 3,
            select: {
              id: true,
              title: true,
              description: true,
              type: true,
              techStack: true,
              demoUrl: true,
              repoUrl: true
            }
          })
        : Promise.resolve([]),
      topics.blog
        ? prisma.blogPost.findMany({
            where: {
              published: true,
              ...(blogOrFull.length ? { OR: blogOrFull } : {})
            },
            orderBy: { publishedAt: 'desc' },
            take: 3,
            select: {
              id: true,
              title: true,
              slug: true,
              tags: true,
              publishedAt: true
            }
          })
        : Promise.resolve([]),
      topics.faq
        ? prisma.faq.findMany({
            where: {
              published: true,
              ...(faqOr.length ? { OR: faqOr } : {})
            },
            orderBy: { order: 'asc' },
            take: 4,
            select: { question: true, answer: true, category: true }
          })
        : Promise.resolve([]),
      topics.testimonials
        ? prisma.testimonial.findMany({
            where: {
              confirmed: true,
              ...(testimonialOr.length ? { OR: testimonialOr } : {})
            },
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: { name: true, company: true, role: true, text: true, rating: true }
          })
        : Promise.resolve([]),
      topics.team
        ? prisma.employee.findMany({
            where: {
              acceptedAt: { not: null },
              bio: { not: null },
              ...(teamOr.length ? { OR: teamOr } : {})
            },
            orderBy: { createdAt: 'desc' },
            take: 4,
            select: { firstName: true, lastName: true, role: true, bio: true }
          })
        : Promise.resolve([]),
      topics.services
        ? prisma.serviceCategory.findMany({
            where: {
              published: true,
              ...(categoryOr.length ? { OR: categoryOr } : {})
            },
            orderBy: { order: 'asc' },
            take: 6,
            select: { name: true, description: true }
          })
        : Promise.resolve([]),
      topics.contact
        ? prisma.setting.findUnique({ where: { key: 'site_contact' } })
        : Promise.resolve(null),
      topics.about
        ? prisma.setting.findUnique({ where: { key: 'site_about' } })
        : Promise.resolve(null),
      topics.booking
        ? prisma.setting.findUnique({ where: { key: 'site_booking' } })
        : Promise.resolve(null)
    ]);

    return {
      services: services.map((service: any) => ({
        ...service,
        categoryName: service.categoryRef?.name ?? null
      })),
      projects,
      blogPosts,
      faqs,
      testimonials,
      team,
      categories,
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

  // Get AI response from OpenAI or Hugging Face
  const getAIResponse = async (
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }>,
    contextText: string,
    internalContext: InternalContext
  ): Promise<string> => {
    try {
      const apiKey = process.env.OPENAI_API_KEY || process.env.HUGGINGFACE_API_KEY;
      
      if (!apiKey) {
        console.warn('AI API key not configured, using fallback responses');
        return getFallbackResponse(userMessage, internalContext);
      }

      // Use OpenAI if available
      if (process.env.OPENAI_API_KEY) {
        return await getOpenAIResponse(userMessage, conversationHistory, contextText);
      }

      // Fall back to Hugging Face
      if (process.env.HUGGINGFACE_API_KEY) {
        return await getHuggingFaceResponse(userMessage, conversationHistory, contextText);
      }

      return getFallbackResponse(userMessage, internalContext);
    } catch (error) {
      console.error('AI API error:', error);
      return getFallbackResponse(userMessage, internalContext);
    }
  };

  const getOpenAIResponse = async (
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }>,
    contextText: string
  ): Promise<string> => {
    const systemPrompt = buildSystemPrompt(contextText);
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          ...conversationHistory,
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Unable to generate response';
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
  const getRecommendations = async (userMessage: string, prisma: PrismaClient) => {
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

    let relevantServices = [];
    for (const [keyword, category] of Object.entries(keywords)) {
      if (message.includes(keyword)) {
        const services = await prisma.service.findMany({
          where: {
            published: true,
            OR: [
              { category: { contains: category, mode: 'insensitive' } },
              { categoryRef: { name: { contains: category, mode: 'insensitive' } } }
            ]
          },
          take: 2,
        });
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
          ? await prismaChat.chatConversation.findUnique({
              where: { id: conversationId },
            })
          : null;

        if (conversation && conversation.visitorEmail !== visitorEmail) {
          conversation = null;
        }

        if (!conversation) {
          conversation = await prismaChat.chatConversation.create({
            data: {
              visitorName,
              visitorEmail,
              visitorPhone,
              deviceFingerprint,
            },
          });
        } else if (deviceFingerprint || visitorPhone || visitorName) {
          await prismaChat.chatConversation.update({
            where: { id: conversation.id },
            data: {
              deviceFingerprint: deviceFingerprint || conversation.deviceFingerprint,
              visitorPhone: visitorPhone || conversation.visitorPhone,
              visitorName: visitorName || conversation.visitorName,
            },
          });
        }

        // Save user message
        await prismaChat.chatMessage.create({
          data: {
            conversationId: conversation.id,
            sender: 'visitor',
            message,
          },
        });

        // Get conversation history
        const history = await prismaChat.chatMessage.findMany({
          where: { conversationId: conversation.id },
          orderBy: { createdAt: 'asc' },
          take: 10,
        });

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
            const contactSetting = await prisma.setting.findUnique({ where: { key: 'site_contact' } });
            contactInfo = contactSetting?.value ?? null;
          }
          const handoffMessage = buildHandoffMessage(contactInfo);
          await prismaChat.chatMessage.create({
            data: {
              conversationId: conversation.id,
              sender: 'bot',
              message: handoffMessage,
            },
          });

          await prismaChat.chatConversation.update({
            where: { id: conversation.id },
            data: { status: 'escalated', intent: 'support' },
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
        await prismaChat.chatMessage.create({
          data: {
            conversationId: conversation.id,
            sender: 'bot',
            message: botResponse,
          },
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

        await prismaChat.chatConversation.update({
          where: { id: conversation.id },
          data: { intent },
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
        orFilters.push({ id: conversationId });
      }

      if (deviceFingerprint) {
        orFilters.push({ deviceFingerprint });
      }

      if (visitorEmail && visitorPhone) {
        orFilters.push({ visitorEmail, visitorPhone });
      }

      if (visitorEmail && visitorName) {
        orFilters.push({ visitorEmail, visitorName });
      }

      const conversations = await prismaChat.chatConversation.findMany({
        where: { OR: orFilters },
        include: {
          messages: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { updatedAt: 'desc' },
        take: Number(limit),
      });

      res.json({
        latestConversationId: conversations[0]?.id ?? null,
        conversations: conversations.map((conversation: any) => ({
          id: conversation.id,
          status: conversation.status,
          intent: conversation.intent,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
          messages: conversation.messages.map((msg: any) => ({
            id: msg.id,
            sender: msg.sender,
            message: msg.message,
            createdAt: msg.createdAt,
          })),
        })),
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

      const conversation = await prismaChat.chatConversation.findUnique({
        where: { id },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });

      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      res.json(conversation);
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

      const conversations = await prismaChat.chatConversation.findMany({
        where: status !== 'all' ? { status: String(status) } : {},
        include: {
          messages: { take: 1, orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      });

      const total = await prismaChat.chatConversation.count({
        where: status !== 'all' ? { status: String(status) } : {},
      });

      res.json({
        conversations,
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

      const updated = await prismaChat.chatConversation.update({
        where: { id },
        data: {
          status: status || undefined,
          notes: notes || undefined,
          quality: quality || undefined,
        },
      });

      res.json(updated);
    } catch (error) {
      console.error('Error updating conversation:', error);
      res.status(500).json({ error: 'Failed to update conversation' });
    }
  });

  return router;
}
