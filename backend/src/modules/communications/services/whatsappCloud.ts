import crypto from 'crypto';

export type WhatsAppSendTextInput = {
  accessToken: string;
  phoneNumberId: string;
  to: string;
  body: string;
};

export function verifyMetaSignature(rawBody: Buffer, signatureHeader: string | undefined, appSecret: string): boolean {
  if (!signatureHeader || !appSecret) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function waPost(phoneNumberId: string, accessToken: string, payload: unknown) {
  const res = await fetch(`https://graph.facebook.com/v23.0/${encodeURIComponent(phoneNumberId)}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error((json as any)?.error?.message || `WhatsApp send failed (${res.status})`);
    err.payload = json; err.status = res.status; throw err;
  }
  return json;
}

export async function sendWhatsAppText(input: WhatsAppSendTextInput) {
  return waPost(input.phoneNumberId, input.accessToken, {
    messaging_product: 'whatsapp', recipient_type: 'individual', to: input.to, type: 'text', text: { body: input.body },
  });
}

export async function sendWhatsAppTemplate(input: { accessToken: string; phoneNumberId: string; to: string; name: string; languageCode?: string; components?: any[] }) {
  return waPost(input.phoneNumberId, input.accessToken, {
    messaging_product: 'whatsapp', to: input.to, type: 'template',
    template: { name: input.name, language: { code: input.languageCode || 'en_US' }, components: input.components || [] },
  });
}

export function extractWhatsAppMessages(payload: any) {
  const out: Array<{ from: string; to?: string; id: string; timestamp?: string; text?: string; type: string; name?: string; phoneNumberId?: string; displayPhoneNumber?: string }> = [];
  for (const entry of payload?.entry || []) {
    for (const change of entry?.changes || []) {
      const value = change?.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      const displayPhoneNumber = value?.metadata?.display_phone_number;
      const contacts = Array.isArray(value?.contacts) ? value.contacts : [];
      const nameByWa = new Map(contacts.map((c: any) => [c.wa_id, c?.profile?.name]));
      for (const msg of value?.messages || []) {
        const text = msg?.text?.body ?? msg?.button?.text ?? msg?.interactive?.button_reply?.title ?? msg?.interactive?.list_reply?.title ?? null;
        out.push({
          from: msg.from, to: displayPhoneNumber, id: msg.id, timestamp: msg.timestamp, text: text ?? undefined,
          type: msg.type || 'unknown', name: nameByWa.get(msg.from) as string | undefined, phoneNumberId, displayPhoneNumber,
        });
      }
    }
  }
  return out;
}

export function extractWhatsAppStatuses(payload: any) {
  const out: Array<{ id: string; status: string; timestamp?: string; recipientId?: string; errors?: any[]; phoneNumberId?: string }> = [];
  for (const entry of payload?.entry || []) {
    for (const change of entry?.changes || []) {
      const value = change?.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      for (const st of value?.statuses || []) {
        out.push({ id: st.id, status: st.status, timestamp: st.timestamp, recipientId: st.recipient_id, errors: st.errors, phoneNumberId });
      }
    }
  }
  return out;
}
