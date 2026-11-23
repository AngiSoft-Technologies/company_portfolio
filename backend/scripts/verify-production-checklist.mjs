#!/usr/bin/env node
/**
 * Executable form of docs/ANGISOFT_DIGITAL_HQ_PLAN.md §17.
 *
 * Read-only production checks. It never sends credentials, writes data, or
 * moves money. Override hosts with ADMIN_BASE_URL / WEB_BASE_URL /
 * API_BASE_URL for preview deployments.
 *
 * Usage: node scripts/verify-production-checklist.mjs
 */
const ADMIN = (process.env.ADMIN_BASE_URL || 'https://admin.angisoft.co.ke').replace(/\/$/, '');
const WEB = (process.env.WEB_BASE_URL || 'https://www.angisoft.co.ke').replace(/\/$/, '');
const API = (process.env.API_BASE_URL || 'https://api.angisoft.co.ke').replace(/\/$/, '');

const results = [];

async function request(label, url, options = {}) {
  try {
    const response = await fetch(url, { redirect: 'manual', ...options });
    const body = await response.text();
    results.push({
      label,
      url,
      status: response.status,
      contentType: response.headers.get('content-type') || '',
      cacheControl: response.headers.get('cache-control') || '',
      bodyPreview: body.slice(0, 160).replace(/\s+/g, ' ').trim(),
    });
    return { response, body };
  } catch (error) {
    results.push({ label, url, error: error instanceof Error ? error.message : String(error) });
    return { response: null, body: '' };
  }
}

function assert(label, condition, detail) {
  results.push({ label, pass: Boolean(condition), detail });
}

async function main() {
  const adminHealth = await request('admin /v1/health', `${ADMIN}/v1/health`);
  assert(
    'admin /v1/health is JSON from the API',
    adminHealth.response?.status === 200 &&
      /application\/json/i.test(adminHealth.response.headers.get('content-type') || ''),
    `status=${adminHealth.response?.status} content-type=${adminHealth.response?.headers.get('content-type') || 'none'} body=${adminHealth.body.slice(0, 80)}`
  );

  const adminChat = await request('admin /v1/chatbot/conversations (unauthenticated)', `${ADMIN}/v1/chatbot/conversations`);
  assert(
    'admin chatbot conversations is 401 JSON',
    adminChat.response?.status === 401 &&
      /application\/json/i.test(adminChat.response.headers.get('content-type') || ''),
    `status=${adminChat.response?.status} content-type=${adminChat.response?.headers.get('content-type') || 'none'} body=${adminChat.body.slice(0, 80)}`
  );

  const webHealth = await request('web /v1/health', `${WEB}/v1/health`);
  assert(
    'web /v1/health is JSON from the API',
    webHealth.response?.status === 200 &&
      /application\/json/i.test(webHealth.response.headers.get('content-type') || ''),
    `status=${webHealth.response?.status} content-type=${webHealth.response?.headers.get('content-type') || 'none'} body=${webHealth.body.slice(0, 80)}`
  );

  const apiHealth = await request('api /health', `${API}/health`);
  assert(
    'api /health is JSON',
    apiHealth.response?.status === 200 &&
      /application\/json/i.test(apiHealth.response.headers.get('content-type') || ''),
    `status=${apiHealth.response?.status} content-type=${apiHealth.response?.headers.get('content-type') || 'none'}`
  );

  const apiHealthAlias = await request('api /v1/health', `${API}/v1/health`);
  assert(
    'api /v1/health alias is JSON',
    apiHealthAlias.response?.status === 200 &&
      /application\/json/i.test(apiHealthAlias.response.headers.get('content-type') || ''),
    `status=${apiHealthAlias.response?.status} content-type=${apiHealthAlias.response?.headers.get('content-type') || 'none'}`
  );

  const publicFaqs = await request('api /v1/faqs (public)', `${API}/v1/faqs`);
  const authFaqs = await request('api /v1/faqs (Bearer token)', `${API}/v1/faqs`, {
    headers: { Authorization: 'Bearer x' },
  });
  assert(
    'public faqs response is cacheable',
    publicFaqs.response?.status === 200 &&
      /s-maxage=/i.test(publicFaqs.response.headers.get('cache-control') || ''),
    `status=${publicFaqs.response?.status} cache-control=${publicFaqs.response?.headers.get('cache-control') || 'none'} body=${publicFaqs.body.slice(0, 80)}`
  );
  assert(
    'authenticated faqs response is not cached',
    !(authFaqs.response?.headers.get('cache-control') || ''),
    `status=${authFaqs.response?.status} cache-control=${authFaqs.response?.headers.get('cache-control') || 'none'} body=${authFaqs.body.slice(0, 80)}`
  );

  const checks = results.filter((r) => typeof r.pass === 'boolean');
  const failed = checks.filter((r) => !r.pass);
  console.log(JSON.stringify({ passed: checks.length - failed.length, failed: failed.length, results }, null, 2));
  process.exitCode = failed.length ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
