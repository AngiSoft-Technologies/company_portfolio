import { apiPost } from '@angisoft/api-client';
import type { ApiResponse } from '@angisoft/types';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: string;
}

export interface ChatRequest {
  message: string;
  history?: ChatMessage[];
  sessionId?: string;
}

export async function sendChatMessage(req: ChatRequest): Promise<ApiResponse<{ reply: string }>> {
  return apiPost<ApiResponse<{ reply: string }>>('/chatbot/chat', req);
}

export async function getChatHistory(sessionId: string): Promise<ApiResponse<ChatMessage[]>> {
  return apiPost<ApiResponse<ChatMessage[]>>('/chatbot/history', { sessionId });
}

export const SYSTEM_PROMPT = `You are AngiSoft's AI assistant, helping visitors and clients of AngiSoft Technologies.
Answer based on the provided context: products (PetroFlow, DukaFlow, KejaLink, AngiTunes), services,
process, pricing, and contact details. Be concise, accurate, and helpful.`;

export function buildChatPrompt(message: string, context: string, history: ChatMessage[] = []): ChatMessage[] {
  const base: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'system', content: `Context:\n${context}` },
  ];
  return [...base, ...history.slice(-8), { role: 'user', content: message }];
}

export default sendChatMessage;