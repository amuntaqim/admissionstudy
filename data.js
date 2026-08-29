import { kv } from '@vercel/kv';

export const config = { runtime: 'edge' };

const DEFAULT_DASHBOARD_CARDS = {
  totalExams: { label: 'মোট পরীক্ষা', visible: true },
  upcomingExams: { label: 'আসন্ন পরীক্ষা', visible: true },
  thisMonthExams: { label: 'এই মাসের আসন্ন পরীক্ষা', visible: true },
  totalMarks: { label: 'মোট প্রাপ্ত নম্বর (প্রাপ্ত/মোট)', visible: true },
  avgRank: { label: 'সেন্ট্রাল র‍্যাঙ্ক (গড়)', visible: true },
  totalWrong: { label: 'মোট ভুল উত্তর', visible: true },
  totalCorrect: { label: 'মোট ঠিক উত্তর', visible: true },
  totalAdmission: { label: 'মোট এডমিশন পরীক্ষা', visible: true },
  pastExams: { label: 'সমাপ্ত পরীক্ষা', visible: true },
  avgPercent: { label: 'গড় প্রাপ্ত নম্বর (%)', visible: true },
  bestRank: { label: 'সর্বোচ্চ কেন্দ্রীয় র‍্যাঙ্ক', visible: true },
  avgRankUdbhasBranch: { label: 'উদ্ভাস (Branch) গড় কেন্দ্রীয় র‍্যাঙ্ক', visible: true },
  avgRankUdbhasWeekly: { label: 'উদ্ভাস Weekly (Branch) গড় কেন্দ্রীয় র‍্যাঙ্ক', visible: true },
  totalAbsent: { label: 'মোট অনুপস্থিত পরীক্ষা', visible: true },
};

const DEFAULT_CAT_PET = { enabled: true, messages: ['হাই! ধন্যবাদ ভিজিট করার জন্য 🐾'] };

const DEFAULT_STATE = {
  events: [],
  gaps: [],
  vuls: [],
  siteText: {
    brandTitle: 'NextGate',
    brandSubtitle: 'পরীক্ষা ট্র্যাকার',
    pageTitle: 'NextGate — পরীক্ষা ট্র্যাকার',
    addBtnLabel: 'নতুন পরীক্ষা যোগ করুন',
    calHeading: 'ক্যালেন্ডার',
    eventsHeadingDashboard: 'আসন্ন পরীক্ষাসমূহ',
    eventsHeadingAll: 'সব পরীক্ষা',
    eventsHeadingCalNoDate: 'একটি তারিখ নির্বাচন করুন',
    eventsHeadingCalDate: 'নির্বাচিত দিনের পরীক্ষা',
    statTotalLabel: 'মোট পরীক্ষা',
    statSoonLabel: '৭ দিনের মধ্যে',
    statMonthLabel: 'এই মাসে',
    statPastLabel: 'সমাপ্ত পরীক্ষা',
    primaryColor: '#D9333F',
    greetingOverride: '',
    countdownPast: 'পরীক্ষা সম্পন্ন হয়েছে',
    countdownToday: 'আজই পরীক্ষা!',
    countdownTomorrow: 'আগামীকাল',
    countdownDays: 'আর {days} দিন বাকি',
    countdownDaysHours: 'আর {days} দিন {hours} ঘন্টা বাকি',
    dashboardCards: DEFAULT_DASHBOARD_CARDS,
    catPet: DEFAULT_CAT_PET
  },
    tagColors: {},
  customQuotes: [],
  quoteIndex: 0
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, ...extraHeaders }
  });
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method === 'GET') {
    try {
      const data = await kv.get('state');
      console.log('[nextgate/data] GET -> gaps:', data && Array.isArray(data.gaps) ? data.gaps.length : 0,
        'vuls:', data && Array.isArray(data.vuls) ? data.vuls.length : 0,
        'events:', data && Array.isArray(data.events) ? data.events.length : 0);
      return jsonResponse(data || DEFAULT_STATE, 200, { 'Cache-Control': 'no-store, no-cache, must-revalidate' });
    } catch (readError) {
      console.error('[nextgate/data] GET failed, returning defaults:', readError);
      return jsonResponse(DEFAULT_STATE, 200, { 'Cache-Control': 'no-store, no-cache, must-revalidate' });
    }
  }

  if (req.method === 'POST') {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return jsonResponse({
        error: 'ADMIN_PASSWORD env var is not set on the server. Add it in Vercel: Project Settings → Environment Variables, then redeploy.'
      }, 500);
    }

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (token !== adminPassword) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return jsonResponse({ error: 'Invalid JSON in request body: ' + parseError.message }, 400);
    }

    if (!body || typeof body !== 'object') {
      return jsonResponse({ error: 'Request body must be a JSON object.' }, 400);
    }

    // Ensure dashboardCards is always present, even if the client sent a partial siteText
    const safeSiteText = (body.siteText && typeof body.siteText === 'object') ? body.siteText : DEFAULT_STATE.siteText;
    if (!safeSiteText.dashboardCards || typeof safeSiteText.dashboardCards !== 'object') {
      safeSiteText.dashboardCards = DEFAULT_STATE.siteText.dashboardCards;
    }
    if (!safeSiteText.catPet || typeof safeSiteText.catPet !== 'object' || !Array.isArray(safeSiteText.catPet.messages)) {
      safeSiteText.catPet = DEFAULT_STATE.siteText.catPet;
    }

    const safeState = {
      events: Array.isArray(body.events) ? body.events : [],
      gaps: Array.isArray(body.gaps) ? body.gaps : [],
      vuls: Array.isArray(body.vuls) ? body.vuls : [],
      siteText: safeSiteText,
      tagColors: (body.tagColors && typeof body.tagColors === 'object') ? body.tagColors : {},
            customQuotes: Array.isArray(body.customQuotes) ? body.customQuotes : [],
            quoteIndex: typeof body.quoteIndex === 'number' ? body.quoteIndex : 0,
      timerBgUrl: typeof body.timerBgUrl === 'string' ? body.timerBgUrl : ''
    };

    // Debug log so this is traceable in Vercel function logs (Project -> Deployments -> Functions -> /api/data -> logs)
    console.log('[nextgate/data] POST incoming -> events:', safeState.events.length,
      'gaps:', safeState.gaps.length, 'vuls:', safeState.vuls.length);
    if (Array.isArray(body.gaps) === false) {
      console.warn('[nextgate/data] body.gaps was NOT an array, coerced to []. Raw value was:', JSON.stringify(body.gaps));
    }
    if (Array.isArray(body.vuls) === false) {
      console.warn('[nextgate/data] body.vuls was NOT an array, coerced to []. Raw value was:', JSON.stringify(body.vuls));
    }

    try {
      await kv.set('state', safeState);
    } catch (writeError) {
      console.error('[nextgate/data] kv.set failed:', writeError);
      return jsonResponse({
        error: 'Failed to write to Vercel KV: ' + (writeError && writeError.message ? writeError.message : String(writeError))
      }, 500);
    }

    // Read back immediately to confirm the write actually persisted (catches silent storage failures)
    try {
      const verify = await kv.get('state');
      const savedGaps = verify && Array.isArray(verify.gaps) ? verify.gaps.length : 0;
      const savedVuls = verify && Array.isArray(verify.vuls) ? verify.vuls.length : 0;
      console.log('[nextgate/data] POST verified after write -> gaps:', savedGaps, 'vuls:', savedVuls);
      if (savedGaps !== safeState.gaps.length || savedVuls !== safeState.vuls.length) {
        console.error('[nextgate/data] MISMATCH after write! sent gaps:', safeState.gaps.length,
          'saved gaps:', savedGaps, 'sent vuls:', safeState.vuls.length, 'saved vuls:', savedVuls);
      }
    } catch (verifyError) {
      console.error('[nextgate/data] verify-read after write failed:', verifyError);
    }

    return jsonResponse({ ok: true, counts: { events: safeState.events.length, gaps: safeState.gaps.length, vuls: safeState.vuls.length } });
  }

  return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });
}
