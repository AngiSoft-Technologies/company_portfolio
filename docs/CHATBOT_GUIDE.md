# AI ChatBot Integration Guide

## Overview
The AngiSoft chatbot is an advanced AI-powered assistant that:
- Collects visitor information (name, email, phone) for lead generation
- Responds to inquiries using OpenAI or Hugging Face AI
- Recommends relevant services based on user queries
- Logs all conversations in the database for analytics
- Integrates with the booking system

## Architecture

### Frontend (React Component)
**File:** `frontend/src/components/ChatBot/ChatBot.jsx`

#### Features:
1. **Two-Stage Conversation**
   - **Stage 1 (Contact):** Collects name → email → phone
   - **Stage 2 (Chat):** AI-powered conversation with recommendations

2. **Lead Collection**
   ```javascript
   {
     name: string,      // Visitor name
     email: string,     // Visitor email
     phone?: string     // Optional phone
   }
   ```

3. **Message Flow**
   - User messages sent to `/api/chatbot/chat` endpoint
   - Bot returns AI response + product recommendations
   - Conversation ID tracked for session continuity

### Backend (Node.js/Express)
**File:** `backend/src/routes/chatbot.ts`

#### Endpoints:

**1. Send Message**
```bash
POST /api/chatbot/chat
Content-Type: application/json

{
  "conversationId": "uuid-optional",
  "visitorName": "John Doe",
  "visitorEmail": "john@example.com",
  "visitorPhone": "+254710398690",
  "message": "I need a mobile app"
}

Response:
{
  "conversationId": "uuid",
  "message": "AI response text...",
  "recommendations": [
    {
      "id": "service-id",
      "title": "Mobile App Development",
      "description": "Custom Flutter/Kotlin apps..."
    }
  ],
  "intent": "booking" // or "inquiry", "support"
}
```

**2. Get Conversation (Admin)**
```bash
GET /api/chatbot/conversations/{conversationId}

Response:
{
  "id": "uuid",
  "visitorName": "John Doe",
  "visitorEmail": "john@example.com",
  "messages": [
    {
      "id": "msg-id",
      "sender": "visitor", // or "bot"
      "message": "text",
      "createdAt": "2026-02-08T..."
    }
  ]
}
```

**3. List Conversations (Admin)**
```bash
GET /api/chatbot/conversations?status=open&page=1&limit=20

Response:
{
  "conversations": [...],
  "total": 150,
  "pages": 8
}
```

**4. Update Conversation (Admin)**
```bash
PUT /api/chatbot/conversations/{conversationId}

{
  "status": "closed",
  "notes": "Customer interested in mobile app",
  "quality": 5
}
```

## AI Integration

### OpenAI (Recommended)
**Best for:** Production use, highest quality responses

**Setup:**
1. Get API key from [platform.openai.com](https://platform.openai.com)
2. Add to `.env`:
   ```env
   OPENAI_API_KEY=sk-proj-xxxxx
   ```
3. Uses `gpt-3.5-turbo` model (change in `chatbot.ts` if needed)

**Cost:** ~$0.002 per conversation (~500 tokens)

### Hugging Face (Fallback)
**Best for:** Free alternative, offline capability

**Setup:**
1. Get API key from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Add to `.env`:
   ```env
   HUGGINGFACE_API_KEY=hf_xxxxx
   ```
3. Uses `Mistral-7B-Instruct` model

**Cost:** Free with rate limits

## Database Schema

### ChatConversation
```prisma
model ChatConversation {
  id              String   @id @default(uuid())
  visitorName     String
  visitorEmail    String
  visitorPhone    String?
  intent          String?  // "booking", "inquiry", "support"
  messages        ChatMessage[]
  quality         Int?     // 1-5 rating
  notes           String?
  status          String   @default("open") // open, closed, converted
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model ChatMessage {
  id              String   @id @default(uuid())
  conversationId  String
  sender          String   @default("visitor") // "visitor" or "bot"
  message         String
  tokens          Int?
  createdAt       DateTime @default(now())
}
```

## Lead Generation & Analytics

### Conversation States:
- **open:** Active conversation
- **closed:** User left without converting
- **converted:** User booked or took action

### Intent Detection:
- `booking` → User interested in project booking
- `inquiry` → General information request
- `support` → Technical support needed

### Admin Dashboard (Future):
```
Total Conversations: 450
Open Leads: 45
Conversion Rate: 12%
Avg Quality Score: 4.2/5
Popular Intents: booking (60%), inquiry (30%), support (10%)
```

## Product Recommendations

### How It Works:
1. System analyzes user message for keywords
2. Queries database for matching services/projects
3. Returns top 3 most relevant items
4. User can click to view full details

### Keywords Mapped:
```javascript
{
  'mobile': 'Mobile',
  'app': 'App',
  'web': 'Web',
  'data': 'Data',
  'analytics': 'Analytics',
  'security': 'Security',
  'ecommerce': 'E-commerce',
  'cms': 'CMS',
  'automation': 'Automation',
  'saas': 'SaaS'
}
```

## Usage Examples

### Frontend - Initialize Chat
```javascript
// Already integrated in App.jsx
import ChatBot from './components/ChatBot/ChatBot';

function App() {
  return (
    <>
      <YourPages />
      <ChatBot />
    </>
  );
}
```

### Frontend - Send Message
```javascript
const response = await fetch('/api/chatbot/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    conversationId: 'uuid-or-undefined',
    visitorName: 'John',
    visitorEmail: 'john@example.com',
    visitorPhone: '+254710398690',
    message: 'I need an e-commerce platform'
  })
});

const data = await response.json();
console.log(data.message); // AI response
console.log(data.recommendations); // [Service objects]
```

### Backend - Log Conversation
```typescript
// Auto-logged when message is received
// Access via: GET /api/chatbot/conversations/{id}
```

## Deployment Checklist

- [ ] Set `OPENAI_API_KEY` or `HUGGINGFACE_API_KEY` in production `.env`
- [ ] Run database migration: `npx prisma migrate deploy`
- [ ] Update CORS_ORIGIN to include Netlify domain (if needed)
- [ ] Test chat on staging environment
- [ ] Set up Sentry logging for error tracking
- [ ] Add rate limiting to `/api/chatbot/chat` endpoint (optional)
- [ ] Create admin dashboard for viewing conversations
- [ ] Set up email notifications for high-intent leads

## Configuration

### OpenAI Settings (chatbot.ts)
```typescript
{
  model: 'gpt-3.5-turbo',        // Can upgrade to gpt-4
  temperature: 0.7,              // 0-1: lower = more deterministic
  max_tokens: 500,               // Response length limit
}
```

### System Prompt (customizable):
```
"You are a professional and friendly chatbot for AngiSoft Technologies, 
a custom software development company based in Kenya. Help clients with 
inquiries about services (mobile apps, web development, data analysis, 
cybersecurity), pricing, team expertise, and project bookings."
```

## Troubleshooting

### Issue: "Failed to process message"
**Solution:** Check API key configuration and rate limits
```bash
# Test OpenAI connection
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Issue: Recommendations not showing
**Solution:** Verify services exist in database
```bash
# Check services
SELECT COUNT(*) FROM "Service" WHERE published = true;
```

### Issue: Bot responses delayed
**Solution:** OpenAI API timeout or rate limit exceeded
- Increase `max_tokens` in config
- Implement caching for common questions
- Use Hugging Face fallback

### Issue: Conversations not saved
**Solution:** Check database connection
```bash
# Test Prisma
npx prisma db execute --stdin < /dev/null
```

## Future Enhancements

1. **Multi-language Support**
   - Detect language from message
   - Translate responses

2. **Conversation Analysis**
   - Sentiment analysis
   - Customer satisfaction scoring
   - Auto-categorization

3. **Integration with CRM**
   - Push leads to Salesforce/HubSpot
   - Link to existing customer records

4. **Advanced Routing**
   - Escalate to human agent if needed
   - Route to specific team members

5. **Analytics Dashboard**
   - Conversation metrics
   - Conversion funnel
   - FAQ suggestions

## Support

For issues or questions:
- Email: support@angisoft.co.ke
- WhatsApp: +254710398690
- Issues: [GitHub Issues](https://github.com/yourusername/repo)
