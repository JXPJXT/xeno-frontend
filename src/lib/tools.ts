const API_BASE = '/api/v1';

function headers(token: string, tenantId: string) {
  return {
    'Authorization': `Bearer ${token}`,
    'x-tenant-id': tenantId,
    'Content-Type': 'application/json',
  };
}

async function call(url: string, opts: RequestInit) {
  const res = await fetch(url, opts);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `API error ${res.status}`);
  return json.data ?? json;
}

/**
 * Resolve a segment name to its UUID by scanning campaigns/analytics or using a known mapping.
 * Since there's no direct /segments endpoint, we'll look up the segment from existing data.
 */
async function resolveSegmentId(segmentName: string, h: Record<string, string>, signal?: AbortSignal): Promise<string> {
  // Try to find the segment by querying intelligence compute or searching existing campaigns
  // The segments are stored in the DB — let's look at existing campaigns to find segment IDs
  try {
    const campaigns = await call(`${API_BASE}/campaigns`, { headers: h, signal });
    const list = Array.isArray(campaigns) ? campaigns : [];
    for (const c of list) {
      if (c.segment?.name && c.segment.name.toLowerCase().includes(segmentName.toLowerCase())) {
        return c.segmentId || c.segment.id;
      }
    }
  } catch { /* fallback below */ }

  // If we can't find it, use the decisioning engine which knows segment names
  // The decisioning engine returns a segmentId
  try {
    const strategy = await call(`${API_BASE}/decisions`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({ goal: `target ${segmentName} customers` }),
      signal,
    });
    if (strategy?.audience?.segmentId) return strategy.audience.segmentId;
  } catch { /* give up */ }

  throw new Error(`Could not resolve segment "${segmentName}" to an ID. Try using the get_ai_strategy tool first.`);
}

export async function executeTool(
  name: string,
  args: Record<string, any>,
  token: string,
  tenantId: string,
  signal?: AbortSignal,
): Promise<any> {
  const h = headers(token, tenantId);

  switch (name) {
    case 'get_platform_overview':
      return call(`${API_BASE}/analytics/overview`, { headers: h, signal });

    case 'get_customer_segments':
      return call(`${API_BASE}/campaigns/segments`, { headers: h, signal });

    case 'get_customers': {
      const params = new URLSearchParams();
      if (args.limit) params.set('limit', String(args.limit));
      if (args.search) params.set('search', args.search);
      return call(`${API_BASE}/customers?${params}`, { headers: h, signal });
    }

    case 'get_customer_intelligence':
      return call(`${API_BASE}/intelligence/customers/${args.customerId}`, { headers: h, signal });

    case 'get_campaigns':
      return call(`${API_BASE}/campaigns`, { headers: h, signal });

    case 'get_campaign_results':
      return call(`${API_BASE}/analytics/campaigns/${args.campaignId}`, { headers: h, signal });

    case 'create_campaign': {
      // Resolve segment name to UUID
      let segmentId = args.segmentId;
      if (!segmentId && args.segmentName) {
        segmentId = await resolveSegmentId(args.segmentName, h, signal);
      }

      let subject = args.subject;
      let body = args.messageBody || args.message || '';

      if (args.messageTemplate) {
        if (typeof args.messageTemplate === 'string') {
          body = args.messageTemplate;
        } else if (typeof args.messageTemplate === 'object' && args.messageTemplate !== null) {
          if (args.messageTemplate.body) body = args.messageTemplate.body;
          if (args.messageTemplate.subject) subject = args.messageTemplate.subject;
        }
      }

      return call(`${API_BASE}/campaigns`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({
          name: args.name,
          segmentId,
          channel: args.channel,
          messageSubject: subject,
          messageBody: body,
        }),
        signal,
      });
    }

    case 'launch_campaign':
      return call(`${API_BASE}/campaigns/${args.campaignId}/launch`, {
        method: 'POST',
        headers: h,
        signal,
      });

    case 'get_ai_strategy':
      return call(`${API_BASE}/decisions`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({ goal: args.goal }),
        signal,
      });

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
