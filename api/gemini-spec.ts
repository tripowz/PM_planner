const GEMINI_MODEL = 'gemini-2.5-flash'
const DEFAULT_REPO = 'tripowz/PM_planner'
const DEFAULT_BRANCH = 'main'
const MAX_FILE_CHARS = 28_000
const MAX_DOC_FILE_CHARS = 95_000
const MAX_REPO_CHARS = 240_000

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

async function verifySupabaseUser(req: any) {
  const auth = String(req.headers.authorization || '')
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : ''
  if (!token) throw new Error('Требуется авторизация Supabase.')

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase env не настроены на сервере.')

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      authorization: `Bearer ${token}`,
    },
  })
  if (!response.ok) throw new Error('Сессия Supabase недействительна.')
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
    throw new Error(`Не удалось прочитать GitHub repo ${owner}/${repo}:${branch}`)
  }

  const treeJson = await treeResponse.json() as { tree?: GithubTreeItem[] }
  const files = (treeJson.tree ?? [])
    .filter((item) => item.type === 'blob' && shouldIncludeFile(item.path))
    .sort((a, b) => importantFiles.indexOf(b.path) - importantFiles.indexOf(a.path))

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
      chunks.push(`\n--- FILE: ${file.path} ---\n[Не удалось прочитать файл: ${error instanceof Error ? error.message : 'unknown error'}]`)
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
  if (!context) return 'Контекст из приложения не передан.'
  return JSON.stringify({
    tasks: context.tasks?.slice(0, 80) ?? [],
    flags: context.flags?.slice(0, 40) ?? [],
    decisions: context.decisions?.slice(0, 40) ?? [],
    notes: context.notes?.slice(0, 30) ?? [],
    retros: context.retros?.slice(0, 20) ?? [],
  }, null, 2)
}

function modeInstruction(mode?: AiMode) {
  if (mode === 'review') return 'Проверь готовое или черновое ТЗ SmartBooking как senior PM + solution architect. Не переписывай молча: сначала дай verdict, gaps, evidence, unknowns, risks, tests, затем recommended rewrite.'
  if (mode === 'bug') return 'Диагностируй баг: вероятные причины, затронутые модули, план проверки, фиксы, acceptance criteria.'
  if (mode === 'system') return 'Изучи систему: архитектура, доменная модель, потоки данных, риски, техдолг, следующие инженерные шаги.'
  if (mode === 'roadmap') return 'Составь roadmap: этапы, приоритеты, зависимости, MVP scope, метрики готовности, порядок релизов.'
  return 'Создай качественное ТЗ: цели, контекст, user stories, функциональные и нефункциональные требования, UX, данные, API, edge cases, acceptance criteria, план реализации.'
}

function smartBookingOutputContract() {
  return [
    'ОБЯЗАТЕЛЬНЫЙ ФОРМАТ ОТВЕТА ДЛЯ SMARTBOOKING:',
    'Verdict: Ready / Not Ready',
    '',
    '1. Summary',
    '2. Impact map',
    '3. Evidence',
    '   Таблица: Вывод/требование | Evidence status | Источник | Риск, если неверно',
    '   Evidence status используй только из списка: Confirmed by code, Confirmed by PM, Assumption, Unknown, Needs dev confirmation, Legacy risk.',
    '4. Unknowns & assumptions',
    '   Таблица: ID | Type | Item | Current assumption | Risk | Owner to confirm | Status',
    '5. Missing requirements',
    '6. Required API/data/event changes',
    '7. Required tests',
    '8. Release risks',
    '9. Questions to PM',
    '10. Decision Log entries to add',
    '11. Recommended rewrite',
    '',
    'GUARDRAILS:',
    '- Не пиши "система делает X", если это не подтверждено кодом, PM или документацией.',
    '- Если доказательства нет, помечай как Assumption или Unknown.',
    '- Если Unknown/Assumption влияет на деньги, бронирования, каналы, платежи, PII или безопасность, verdict должен быть Not Ready.',
    '- Если impact map неполный, не принимай ТЗ как Ready.',
    '- Обязательно проверяй permissions, state transitions, events/webhooks/RabbitMQ, audit logs, regression risks.',
  ].join('\n')
}

function extractGeminiText(payload: any) {
  return (payload?.candidates?.[0]?.content?.parts ?? [])
    .map((part: any) => part?.text || '')
    .filter(Boolean)
    .join('\n')
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
  if (!process.env.GEMINI_API_KEY) return json(res, 500, { error: 'GEMINI_API_KEY не задан в Vercel Environment Variables.' })

  let body: GeminiSpecRequest
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return json(res, 400, { error: 'Некорректный JSON body.' })
  }

  const prompt = body.prompt?.trim()
  if (!prompt) return json(res, 400, { error: 'Опишите, что нужно изучить или какое ТЗ создать.' })

  try {
    await verifySupabaseUser(req)

    const repoContext = body.includeRepo === false
      ? { repo: body.repo || DEFAULT_REPO, branch: body.branch || DEFAULT_BRANCH, chars: 0, files: [] as string[], context: 'Repo context отключен пользователем.' }
      : await loadRepositoryContext(body.repo, body.branch)

    const userContent = [
      `Режим: ${body.mode || 'spec'}.`,
      modeInstruction(body.mode),
      smartBookingOutputContract(),
      `\nЗапрос пользователя:\n${prompt}`,
      `\nКонтекст приложения из Supabase:\n${compactAppContext(body.appContext)}`,
      `\nКонтекст репозитория ${repoContext.repo}:${repoContext.branch} (${repoContext.files.length} файлов, ${repoContext.chars} символов):\n${repoContext.context}`,
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
              'Ты senior product analyst и solution architect для SmartBooking PM-системы.',
              'Отвечай на русском языке, структурно и практически.',
              'Не выдумывай факты о коде. Если данных не хватает, помечай это как предположение.',
              'Документы должны быть пригодны для передачи разработчику: конкретные требования, acceptance criteria, риски и план реализации.',
              'Источник истины для SmartBooking: docs/AI_TZ_REVIEW_INSTRUCTIONS.md и docs/PM_SYSTEM_INPUT_SMARTBOOKING.md из контекста репозитория.',
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
          maxOutputTokens: 12000,
        },
      }),
    })

    const payload = await response.json()
    if (!response.ok) {
      return json(res, response.status, { error: payload?.error?.message || 'Gemini request failed' })
    }

    return json(res, 200, {
      model: GEMINI_MODEL,
      repo: repoContext.repo,
      branch: repoContext.branch,
      files: repoContext.files,
      result: extractGeminiText(payload),
      usage: normalizeUsage(payload),
      freeTier: true,
    })
  } catch (error) {
    console.error(error)
    return json(res, 500, { error: error instanceof Error ? error.message : 'Gemini request failed' })
  }
}
