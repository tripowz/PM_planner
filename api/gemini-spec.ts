const GEMINI_MODEL = 'gemini-2.5-flash'
const DEFAULT_REPO = 'tripowz/PM_planner'
const DEFAULT_BRANCH = 'main'
const MAX_FILE_CHARS = 28_000
const MAX_DOC_FILE_CHARS = 95_000
const MAX_REPO_CHARS = 360_000

type AiMode = 'spec' | 'review' | 'bug' | 'system' | 'roadmap'

type GeminiSpecRequest = {
  mode?: AiMode
  prompt?: string
  repo?: string
  branch?: string
  includeRepo?: boolean
  appContext?: {
    tasks?: unknown[]
    flags?: unknown[]
    decisions?: unknown[]
    notes?: unknown[]
    retros?: unknown[]
  }
}

type GithubTreeItem = {
  path: string
  type: 'blob' | 'tree'
  size?: number
}

const importantFiles = [
  'docs/AI_TZ_REVIEW_INSTRUCTIONS.md',
  'docs/PM_SYSTEM_INPUT_SMARTBOOKING.md',
  'docs/SMARTBOOKING_SOURCE_INDEX.md',
  'docs/SMARTBOOKING_API_ROUTES_SUMMARY.md',
  'docs/SMARTBOOKING_DB_ENTITIES_SUMMARY.md',
  'docs/SMARTBOOKING_FRONTEND_ROUTES_SUMMARY.md',
  'docs/SMARTBOOKING_BOT_EVENTS_SUMMARY.md',
  'package.json',
  'README.md',
  'index.html',
  'vite.config.ts',
  'tailwind.config.js',
  'tsconfig.json',
  'src/main.tsx',
  'src/App.tsx',
  'src/index.css',
  'src/lib/supabase.ts',
  'supabase/config.toml',
]

function json(res: any, status: number, body: unknown) {
  res.status(status).setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

function parseRepo(value?: string) {
  const clean = (value || DEFAULT_REPO).replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/^\/+|\/+$/g, '')
  const [owner, repo] = clean.split('/')
  if (!owner || !repo) return DEFAULT_REPO.split('/') as [string, string]
  return [owner, repo] as [string, string]
}

function shouldIncludeFile(path: string) {
  if (importantFiles.includes(path)) return true
  if (path.startsWith('supabase/migrations/') && path.endsWith('.sql')) return true
  if (path.startsWith('docs/') && /\.(md|txt)$/.test(path)) return true
  return false
}

function maxCharsForFile(path: string) {
  return path.startsWith('docs/') ? MAX_DOC_FILE_CHARS : MAX_FILE_CHARS
}

function fileRank(path: string) {
  const importantIndex = importantFiles.indexOf(path)
  if (importantIndex >= 0) return importantIndex
  if (path.startsWith('docs/')) return 100
  if (path.startsWith('supabase/migrations/')) return 200
  return 300
}

async function verifySupabaseUser(req: any) {
  const auth = String(req.headers.authorization || '')
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : ''
  if (!token) throw new Error('РўСЂРµР±СѓРµС‚СЃСЏ Р°РІС‚РѕСЂРёР·Р°С†РёСЏ Supabase.')

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase env РЅРµ РЅР°СЃС‚СЂРѕРµРЅС‹ РЅР° СЃРµСЂРІРµСЂРµ.')

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      authorization: `Bearer ${token}`,
    },
  })
  if (!response.ok) throw new Error('РЎРµСЃСЃРёСЏ Supabase РЅРµРґРµР№СЃС‚РІРёС‚РµР»СЊРЅР°.')
  return response.json()
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'pm-cockpit-gemini-spec',
      accept: 'application/vnd.github+json',
    },
  })
  if (!response.ok) throw new Error(`GitHub request failed ${response.status}`)
  return response.text()
}

async function loadRepositoryContext(repoValue?: string, branchValue?: string) {
  const [owner, repo] = parseRepo(repoValue)
  const branch = branchValue || DEFAULT_BRANCH
  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
  const treeResponse = await fetch(treeUrl, {
    headers: {
      'user-agent': 'pm-cockpit-gemini-spec',
      accept: 'application/vnd.github+json',
    },
  })

  if (!treeResponse.ok) {
    throw new Error(`РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРѕС‡РёС‚Р°С‚СЊ GitHub repo ${owner}/${repo}:${branch}`)
  }

  const treeJson = await treeResponse.json() as { tree?: GithubTreeItem[] }
  const files = (treeJson.tree ?? [])
    .filter((item) => item.type === 'blob' && shouldIncludeFile(item.path))
    .sort((a, b) => fileRank(a.path) - fileRank(b.path) || a.path.localeCompare(b.path))

  let total = 0
  const chunks: string[] = []

  for (const file of files) {
    if (total >= MAX_REPO_CHARS) break
    if ((file.size ?? 0) > 260_000) continue

    try {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`
      const content = await fetchText(rawUrl)
      const trimmed = content.slice(0, Math.min(maxCharsForFile(file.path), MAX_REPO_CHARS - total))
      chunks.push(`\n--- FILE: ${file.path} ---\n${trimmed}`)
      total += trimmed.length
    } catch (error) {
      chunks.push(`\n--- FILE: ${file.path} ---\n[РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРѕС‡РёС‚Р°С‚СЊ С„Р°Р№Р»: ${error instanceof Error ? error.message : 'unknown error'}]`)
    }
  }

  return {
    repo: `${owner}/${repo}`,
    branch,
    chars: total,
    files: files.map((file) => file.path),
    context: chunks.join('\n'),
  }
}

function compactAppContext(context: GeminiSpecRequest['appContext']) {
  if (!context) return 'РљРѕРЅС‚РµРєСЃС‚ РёР· РїСЂРёР»РѕР¶РµРЅРёСЏ РЅРµ РїРµСЂРµРґР°РЅ.'
  return JSON.stringify({
    tasks: context.tasks?.slice(0, 80) ?? [],
    flags: context.flags?.slice(0, 40) ?? [],
    decisions: context.decisions?.slice(0, 40) ?? [],
    notes: context.notes?.slice(0, 30) ?? [],
    retros: context.retros?.slice(0, 20) ?? [],
  }, null, 2)
}

function modeInstruction(mode?: AiMode) {
  if (mode === 'review') return 'РџСЂРѕРІРµСЂСЊ РіРѕС‚РѕРІРѕРµ РёР»Рё С‡РµСЂРЅРѕРІРѕРµ РўР— SmartBooking РєР°Рє senior PM + solution architect. РќРµ РїРµСЂРµРїРёСЃС‹РІР°Р№ РјРѕР»С‡Р°: СЃРЅР°С‡Р°Р»Р° РґР°Р№ verdict, gaps, evidence, unknowns, risks, tests, Р·Р°С‚РµРј recommended rewrite.'
  if (mode === 'bug') return 'Р”РёР°РіРЅРѕСЃС‚РёСЂСѓР№ Р±Р°Рі: РІРµСЂРѕСЏС‚РЅС‹Рµ РїСЂРёС‡РёРЅС‹, Р·Р°С‚СЂРѕРЅСѓС‚С‹Рµ РјРѕРґСѓР»Рё, РїР»Р°РЅ РїСЂРѕРІРµСЂРєРё, С„РёРєСЃС‹, acceptance criteria.'
  if (mode === 'system') return 'РР·СѓС‡Рё СЃРёСЃС‚РµРјСѓ: Р°СЂС…РёС‚РµРєС‚СѓСЂР°, РґРѕРјРµРЅРЅР°СЏ РјРѕРґРµР»СЊ, РїРѕС‚РѕРєРё РґР°РЅРЅС‹С…, СЂРёСЃРєРё, С‚РµС…РґРѕР»Рі, СЃР»РµРґСѓСЋС‰РёРµ РёРЅР¶РµРЅРµСЂРЅС‹Рµ С€Р°РіРё.'
  if (mode === 'roadmap') return 'РЎРѕСЃС‚Р°РІСЊ roadmap: СЌС‚Р°РїС‹, РїСЂРёРѕСЂРёС‚РµС‚С‹, Р·Р°РІРёСЃРёРјРѕСЃС‚Рё, MVP scope, РјРµС‚СЂРёРєРё РіРѕС‚РѕРІРЅРѕСЃС‚Рё, РїРѕСЂСЏРґРѕРє СЂРµР»РёР·РѕРІ.'
  return 'РЎРѕР·РґР°Р№ РєР°С‡РµСЃС‚РІРµРЅРЅРѕРµ РўР—: С†РµР»Рё, РєРѕРЅС‚РµРєСЃС‚, user stories, С„СѓРЅРєС†РёРѕРЅР°Р»СЊРЅС‹Рµ Рё РЅРµС„СѓРЅРєС†РёРѕРЅР°Р»СЊРЅС‹Рµ С‚СЂРµР±РѕРІР°РЅРёСЏ, UX, РґР°РЅРЅС‹Рµ, API, edge cases, acceptance criteria, РїР»Р°РЅ СЂРµР°Р»РёР·Р°С†РёРё.'
}

function smartBookingOutputContract() {
  return [
    'РћР‘РЇР—РђРўР•Р›Р¬РќР«Р™ Р¤РћР РњРђРў РћРўР’Р•РўРђ Р”Р›РЇ SMARTBOOKING:',
    'Verdict: Ready / Not Ready',
    '',
    '1. Summary',
    '2. Impact map',
    '3. Evidence',
    '   РўР°Р±Р»РёС†Р°: Р’С‹РІРѕРґ/С‚СЂРµР±РѕРІР°РЅРёРµ | Evidence status | РСЃС‚РѕС‡РЅРёРє | Р РёСЃРє, РµСЃР»Рё РЅРµРІРµСЂРЅРѕ',
    '   Evidence status РёСЃРїРѕР»СЊР·СѓР№ С‚РѕР»СЊРєРѕ РёР· СЃРїРёСЃРєР°: Confirmed by code, Confirmed by PM, Assumption, Unknown, Needs dev confirmation, Legacy risk.',
    '4. Unknowns & assumptions',
    '   РўР°Р±Р»РёС†Р°: ID | Type | Item | Current assumption | Risk | Owner to confirm | Status',
    '5. Missing requirements',
    '6. Required API/data/event changes',
    '7. Required tests',
    '8. Release risks',
    '9. Questions to PM',
    '10. Decision Log entries to add',
    '11. Recommended rewrite',
    '',
    'GUARDRAILS:',
    '- РќРµ РїРёС€Рё "СЃРёСЃС‚РµРјР° РґРµР»Р°РµС‚ X", РµСЃР»Рё СЌС‚Рѕ РЅРµ РїРѕРґС‚РІРµСЂР¶РґРµРЅРѕ РєРѕРґРѕРј, PM РёР»Рё РґРѕРєСѓРјРµРЅС‚Р°С†РёРµР№.',
    '- Р•СЃР»Рё РґРѕРєР°Р·Р°С‚РµР»СЊСЃС‚РІР° РЅРµС‚, РїРѕРјРµС‡Р°Р№ РєР°Рє Assumption РёР»Рё Unknown.',
    '- Р•СЃР»Рё Unknown/Assumption РІР»РёСЏРµС‚ РЅР° РґРµРЅСЊРіРё, Р±СЂРѕРЅРёСЂРѕРІР°РЅРёСЏ, РєР°РЅР°Р»С‹, РїР»Р°С‚РµР¶Рё, PII РёР»Рё Р±РµР·РѕРїР°СЃРЅРѕСЃС‚СЊ, verdict РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ Not Ready.',
    '- Р•СЃР»Рё impact map РЅРµРїРѕР»РЅС‹Р№, РЅРµ РїСЂРёРЅРёРјР°Р№ РўР— РєР°Рє Ready.',
    '- РћР±СЏР·Р°С‚РµР»СЊРЅРѕ РїСЂРѕРІРµСЂСЏР№ permissions, state transitions, events/webhooks/RabbitMQ, audit logs, regression risks.',
  ].join('\n')
}

function specOutputContract() {
  return [
    'BUSINESS TZ MODE CONTRACT:',
    'The main markdown answer must be a complete detailed Russian business/product TZ, not a programming task and not a short summary.',
    'The user is not a programmer. Explain how the feature must work from business logic, product behavior, hotel operations, roles, scenarios, rules, exceptions, money/bookings/channels, and user expectations.',
    'Use SmartBooking docs as the source of truth. Mention technical areas only in a final handoff section, in plain PM language.',
    '',
    'Required sections for the business TZ:',
    '1. Название фичи',
    '2. Короткое описание простыми словами',
    '3. Зачем это бизнесу и какую проблему решает',
    '4. Кто будет пользоваться: роли, права, ограничения доступа',
    '5. Текущая логика/контекст из SmartBooking docs',
    '6. Как должно работать после внедрения',
    '7. Основной пользовательский сценарий step-by-step',
    '8. Альтернативные сценарии',
    '9. Негативные сценарии и ошибки',
    '10. Бизнес-правила BR-001, BR-002, ...',
    '11. Правила расчетов: цены, налоги, скидки, комиссии, оплаты, если применимо',
    '12. Правила бронирований: статусы, изменения, отмены, каналы, источники, если применимо',
    '13. Правила доступности/инвентаря/room type/rates, если применимо',
    '14. Что пользователь видит на экране: поля, кнопки, подсказки, состояния',
    '15. Что система должна проверить перед сохранением',
    '16. Что происходит после сохранения: уведомления, история, отчеты, синхронизации',
    '17. Конфликты и спорные ситуации: кто прав, что блокируем, что разрешаем',
    '18. Примеры на реальных кейсах: минимум 3 сценария с входными данными и ожидаемым результатом',
    '19. Что должно попасть в отчеты/аналитику/экспорт',
    '20. Acceptance criteria на бизнес-языке',
    '21. Чек-лист проверки для PM/QA без программирования',
    '22. Риски для бизнеса и как их снизить',
    '23. Вопросы, которые нужно уточнить у PM/операций/отеля',
    '24. Что передать разработке: короткий plain-language список затронутых модулей, экранов, данных, интеграций',
    '25. Backlog: какие задачи создать и в каком порядке',
    '',
    'Evidence rules:',
    '- For each important business rule include Evidence status: Confirmed by docs, Confirmed by PM, Assumption, Unknown, Needs dev confirmation, Legacy risk.',
    '- If there is no support in docs, mark it as Assumption or Unknown in simple language.',
    '- If Unknown/Assumption affects money, bookings, channels, payments, PII, or security, mark it as a business blocker.',
    '- Do not lead with API/DB/code. The main answer must be understandable for a PM/business owner.',
  ].join('\n')
}

function outputContract(mode?: AiMode) {
  if (mode === 'spec') return specOutputContract()
  return smartBookingOutputContract()
}

function strictSpecInstruction(mode?: AiMode) {
  if (mode !== 'spec') return ''
  return [
    'STRICT SPEC REQUIREMENT:',
    'You must study the repository docs and produce the full business/product TZ in markdown before the JSON block.',
    'Write for a non-programmer PM/business owner first. Use plain Russian and explain how the system should behave.',
    'Avoid code-level language unless it is in the final handoff-to-development section.',
    'Do not answer with "нужно уточнить" only. If there are unknowns, still write the best possible business logic and mark blockers explicitly.',
  ].join('\n')
}

function cockpitActionPlanContract() {
  return [
    'РџРћРЎР›Р• РћРЎРќРћР’РќРћР“Рћ MARKDOWN-РћРўР’Р•РўРђ РћР‘РЇР—РђРўР•Р›Р¬РќРћ Р”РћР‘РђР’Р¬ РњРђРЁРРќРќР«Р™ Р‘Р›РћРљ:',
    'PM_COCKPIT_ACTION_PLAN_JSON:',
    '```json',
    '{',
    '  "tasks": [',
    '    {',
    '      "title": "РєРѕСЂРѕС‚РєРѕРµ РґРµР№СЃС‚РІРёРµ РґР»СЏ РєРѕРјР°РЅРґС‹",',
    '      "description": "С‡С‚Рѕ СЃРґРµР»Р°С‚СЊ Рё РїРѕС‡РµРјСѓ",',
    '      "project": "Angular PMS | site-generator | Mobile | Backend/API | Managed-service | Cross-product | Personal",',
    '      "type": "feature | bug | research | ops | tech-debt | meeting | spike | docs",',
    '      "impact": "high | medium | low",',
    '      "effort": "XS | S | M | L | XL",',
    '      "priority": "P0 | P1 | P2 | P3",',
    '      "status": "inbox | backlog | week",',
    '      "entryPoint": "РјРѕРґСѓР»СЊ/СЌРєСЂР°РЅ/API/РїСЂРѕС†РµСЃСЃ",',
    '      "acceptanceCriteria": ["РїСЂРѕРІРµСЂСЏРµРјС‹Р№ РєСЂРёС‚РµСЂРёР№"],',
    '      "tags": ["ai", "smartbooking"],',
    '      "estimatedMinutes": 240',
    '    }',
    '  ],',
    '  "flags": [',
    '    {',
    '      "title": "СЂРёСЃРє",',
    '      "description": "РїРѕС‡РµРјСѓ РѕРїР°СЃРЅРѕ Рё С‡С‚Рѕ РїСЂРѕРІРµСЂРёС‚СЊ",',
    '      "severity": "critical | high | medium | low",',
    '      "category": "technical | product | process | business | security",',
    '      "owner": "PM | Tech Lead | Backend | QA | Product"',
    '    }',
    '  ],',
    '  "decisions": [',
    '    {',
    '      "title": "СЂРµС€РµРЅРёРµ РёР»Рё РІРѕРїСЂРѕСЃ РґР»СЏ decision log",',
    '      "status": "proposed",',
    '      "context": "РєРѕРЅС‚РµРєСЃС‚",',
    '      "decision": "С‡С‚Рѕ РїСЂРµРґР»Р°РіР°РµС‚СЃСЏ СЂРµС€РёС‚СЊ",',
    '      "alternatives": "Р°Р»СЊС‚РµСЂРЅР°С‚РёРІС‹",',
    '      "consequences": "РїРѕСЃР»РµРґСЃС‚РІРёСЏ",',
    '      "tags": ["ai", "decision-log"]',
    '    }',
    '  ],',
    '  "notes": [',
    '    {',
    '      "title": "AI Р°РЅР°Р»РёР· / РўР— / bug analysis",',
    '      "content": "РєСЂР°С‚РєР°СЏ РІС‹Р¶РёРјРєР° РґР»СЏ Notes",',
    '      "pinned": true,',
    '      "tags": ["ai", "analysis"]',
    '    }',
    '  ]',
    '}',
    '```',
    '',
    'РџСЂР°РІРёР»Р° JSON: С‚РѕР»СЊРєРѕ РІР°Р»РёРґРЅС‹Р№ JSON Р±РµР· РєРѕРјРјРµРЅС‚Р°СЂРёРµРІ; РјР°РєСЃРёРјСѓРј 18 tasks, 10 flags, 8 decisions, 4 notes.',
    'Implementation/dev/QA work РєР»Р°РґРё РІ tasks СЃРѕ status backlog. Р’РѕРїСЂРѕСЃС‹ Рє PM Рё РЅРµРёР·РІРµСЃС‚РЅС‹Рµ, РєРѕС‚РѕСЂС‹Рµ РЅР°РґРѕ СѓС‚РѕС‡РЅРёС‚СЊ, РєР»Р°РґРё РІ tasks СЃРѕ status inbox Рё type research. РЎСЂРѕС‡РЅС‹Рµ P0/P1 РїСЂРѕРІРµСЂРєРё РјРѕР¶РЅРѕ РєР»Р°СЃС‚СЊ РІ status week.',
  ].join('\n')
}

function cleanActionPlanContract() {
  return [
    'After the full markdown TZ/analysis, add exactly one machine-readable block:',
    'PM_COCKPIT_ACTION_PLAN_JSON:',
    '```json',
    '{',
    '  "tasks": [',
    '    {',
    '      "title": "short team action",',
    '      "description": "what to do and why",',
    '      "project": "Angular PMS | site-generator | Mobile | Backend/API | Managed-service | Cross-product | Personal",',
    '      "type": "feature | bug | research | ops | tech-debt | meeting | spike | docs",',
    '      "impact": "high | medium | low",',
    '      "effort": "XS | S | M | L | XL",',
    '      "priority": "P0 | P1 | P2 | P3",',
    '      "status": "inbox | backlog | week",',
    '      "entryPoint": "module/screen/API/process",',
    '      "acceptanceCriteria": ["testable criterion"],',
    '      "tags": ["ai", "smartbooking"],',
    '      "estimatedMinutes": 240',
    '    }',
    '  ],',
    '  "flags": [',
    '    {',
    '      "title": "risk",',
    '      "description": "why it is risky and what to verify",',
    '      "severity": "critical | high | medium | low",',
    '      "category": "technical | product | process | business | security",',
    '      "owner": "PM | Tech Lead | Backend | QA | Product"',
    '    }',
    '  ],',
    '  "decisions": [',
    '    {',
    '      "title": "decision log item",',
    '      "status": "proposed",',
    '      "context": "context",',
    '      "decision": "decision to make",',
    '      "alternatives": "alternatives",',
    '      "consequences": "consequences",',
    '      "tags": ["ai", "decision-log"]',
    '    }',
    '  ],',
    '  "notes": [',
    '    {',
    '      "title": "AI analysis / TZ / bug analysis",',
    '      "content": "short note summary",',
    '      "pinned": true,',
    '      "tags": ["ai", "analysis"]',
    '    }',
    '  ]',
    '}',
    '```',
    'JSON rules: valid JSON only, no comments, max 18 tasks, 10 flags, 8 decisions, 4 notes.',
  ].join('\n')
}

function extractGeminiText(payload: any) {
  return (payload?.candidates?.[0]?.content?.parts ?? [])
    .map((part: any) => part?.text || '')
    .filter(Boolean)
    .join('\n')
}

function extractActionPlan(text: string) {
  const blockPattern = /\n*PM_COCKPIT_ACTION_PLAN_JSON:\s*```(?:json)?\s*([\s\S]*?)\s*```/i
  const match = text.match(blockPattern)
  if (!match) return { result: text.trim(), actionPlan: null }

  try {
    return {
      result: text.replace(match[0], '').trim(),
      actionPlan: JSON.parse(match[1]),
    }
  } catch {
    return { result: text.trim(), actionPlan: null }
  }
}

function normalizeUsage(payload: any) {
  const usage = payload?.usageMetadata || {}
  return {
    prompt_tokens: usage.promptTokenCount ?? 0,
    completion_tokens: usage.candidatesTokenCount ?? 0,
    total_tokens: usage.totalTokenCount ?? 0,
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })
  if (!process.env.GEMINI_API_KEY) return json(res, 500, { error: 'GEMINI_API_KEY РЅРµ Р·Р°РґР°РЅ РІ Vercel Environment Variables.' })

  let body: GeminiSpecRequest
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return json(res, 400, { error: 'РќРµРєРѕСЂСЂРµРєС‚РЅС‹Р№ JSON body.' })
  }

  const prompt = body.prompt?.trim()
  if (!prompt) return json(res, 400, { error: 'РћРїРёС€РёС‚Рµ, С‡С‚Рѕ РЅСѓР¶РЅРѕ РёР·СѓС‡РёС‚СЊ РёР»Рё РєР°РєРѕРµ РўР— СЃРѕР·РґР°С‚СЊ.' })

  try {
    await verifySupabaseUser(req)

    const repoContext = body.includeRepo === false
      ? { repo: body.repo || DEFAULT_REPO, branch: body.branch || DEFAULT_BRANCH, chars: 0, files: [] as string[], context: 'Repo context РѕС‚РєР»СЋС‡РµРЅ РїРѕР»СЊР·РѕРІР°С‚РµР»РµРј.' }
      : await loadRepositoryContext(body.repo, body.branch)

    const userContent = [
      `Р РµР¶РёРј: ${body.mode || 'spec'}.`,
      modeInstruction(body.mode),
      strictSpecInstruction(body.mode || 'spec'),
      outputContract(body.mode || 'spec'),
      cleanActionPlanContract(),
      `\nР—Р°РїСЂРѕСЃ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ:\n${prompt}`,
      `\nРљРѕРЅС‚РµРєСЃС‚ РїСЂРёР»РѕР¶РµРЅРёСЏ РёР· Supabase:\n${compactAppContext(body.appContext)}`,
      `\nРљРѕРЅС‚РµРєСЃС‚ СЂРµРїРѕР·РёС‚РѕСЂРёСЏ ${repoContext.repo}:${repoContext.branch} (${repoContext.files.length} С„Р°Р№Р»РѕРІ, ${repoContext.chars} СЃРёРјРІРѕР»РѕРІ):\n${repoContext.context}`,
    ].join('\n\n')

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text: [
              'In spec mode, write a full detailed Russian TZ/PRD first. Do not answer with a short summary or generic checklist.',
              'Use all docs/* files in the repository context before writing the spec. The JSON action plan must be only at the very end.',
              'РўС‹ senior product analyst Рё solution architect РґР»СЏ SmartBooking PM-СЃРёСЃС‚РµРјС‹.',
              'РћС‚РІРµС‡Р°Р№ РЅР° СЂСѓСЃСЃРєРѕРј СЏР·С‹РєРµ, СЃС‚СЂСѓРєС‚СѓСЂРЅРѕ Рё РїСЂР°РєС‚РёС‡РµСЃРєРё.',
              'РќРµ РІС‹РґСѓРјС‹РІР°Р№ С„Р°РєС‚С‹ Рѕ РєРѕРґРµ. Р•СЃР»Рё РґР°РЅРЅС‹С… РЅРµ С…РІР°С‚Р°РµС‚, РїРѕРјРµС‡Р°Р№ СЌС‚Рѕ РєР°Рє РїСЂРµРґРїРѕР»РѕР¶РµРЅРёРµ.',
              'Р”РѕРєСѓРјРµРЅС‚С‹ РґРѕР»Р¶РЅС‹ Р±С‹С‚СЊ РїСЂРёРіРѕРґРЅС‹ РґР»СЏ РїРµСЂРµРґР°С‡Рё СЂР°Р·СЂР°Р±РѕС‚С‡РёРєСѓ: РєРѕРЅРєСЂРµС‚РЅС‹Рµ С‚СЂРµР±РѕРІР°РЅРёСЏ, acceptance criteria, СЂРёСЃРєРё Рё РїР»Р°РЅ СЂРµР°Р»РёР·Р°С†РёРё.',
              'РСЃС‚РѕС‡РЅРёРє РёСЃС‚РёРЅС‹ РґР»СЏ SmartBooking: docs/AI_TZ_REVIEW_INSTRUCTIONS.md Рё docs/PM_SYSTEM_INPUT_SMARTBOOKING.md РёР· РєРѕРЅС‚РµРєСЃС‚Р° СЂРµРїРѕР·РёС‚РѕСЂРёСЏ.',
            ].join('\n'),
          }],
        },
        contents: [{
          role: 'user',
          parts: [{ text: userContent }],
        }],
        generationConfig: {
          temperature: 0.35,
          topP: 0.9,
          maxOutputTokens: 20000,
        },
      }),
    })

    const payload = await response.json()
    if (!response.ok) {
      return json(res, response.status, { error: payload?.error?.message || 'Gemini request failed' })
    }

    const textResult = extractGeminiText(payload)
    const extracted = extractActionPlan(textResult)

    return json(res, 200, {
      model: GEMINI_MODEL,
      repo: repoContext.repo,
      branch: repoContext.branch,
      files: repoContext.files,
      result: extracted.result,
      actionPlan: extracted.actionPlan,
      usage: normalizeUsage(payload),
      freeTier: true,
    })
  } catch (error) {
    console.error(error)
    return json(res, 500, { error: error instanceof Error ? error.message : 'Gemini request failed' })
  }
}

