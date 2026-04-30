const GROQ_BASE_URL = 'https://api.groq.com/openai/v1'
const GROQ_MODEL = 'llama-3.3-70b-versatile'
const DEFAULT_REPO = 'tripowz/PM_planner'
const DEFAULT_BRANCH = 'main'
const MAX_FILE_CHARS = 22_000
const MAX_REPO_CHARS = 150_000

type AiMode = 'spec' | 'bug' | 'system' | 'roadmap'

type GroqSpecRequest = {
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
      'user-agent': 'pm-cockpit-groq-spec',
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
      'user-agent': 'pm-cockpit-groq-spec',
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
      const trimmed = content.slice(0, Math.min(MAX_FILE_CHARS, MAX_REPO_CHARS - total))
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

function compactAppContext(context: GroqSpecRequest['appContext']) {
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
  if (mode === 'bug') return 'Диагностируй баг: вероятные причины, затронутые модули, план проверки, фиксы, acceptance criteria.'
  if (mode === 'system') return 'Изучи систему: архитектура, доменная модель, потоки данных, риски, техдолг, следующие инженерные шаги.'
  if (mode === 'roadmap') return 'Составь roadmap: этапы, приоритеты, зависимости, MVP scope, метрики готовности, порядок релизов.'
  return 'Создай качественное ТЗ: цели, контекст, user stories, функциональные и нефункциональные требования, UX, данные, API, edge cases, acceptance criteria, план реализации.'
}

function extractGroqText(payload: any) {
  return payload?.choices?.[0]?.message?.content || ''
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })
  if (!process.env.GROQ_API_KEY) return json(res, 500, { error: 'GROQ_API_KEY не задан в Vercel Environment Variables.' })

  let body: GroqSpecRequest
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

    const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.35,
        top_p: 0.9,
        max_completion_tokens: 12000,
        messages: [
          {
            role: 'system',
            content: [
              'Ты senior product analyst и software architect для PM Cockpit.',
              'Отвечай на русском языке, структурно и практически.',
              'Не выдумывай факты о коде. Если данных не хватает, помечай это как предположение.',
              'Документы должны быть пригодны для передачи разработчику: конкретные требования, acceptance criteria, риски и план реализации.',
            ].join('\n'),
          },
          {
            role: 'user',
            content: [
              `Режим: ${body.mode || 'spec'}.`,
              modeInstruction(body.mode),
              `\nЗапрос пользователя:\n${prompt}`,
              `\nКонтекст приложения из Supabase:\n${compactAppContext(body.appContext)}`,
              `\nКонтекст репозитория ${repoContext.repo}:${repoContext.branch} (${repoContext.files.length} файлов, ${repoContext.chars} символов):\n${repoContext.context}`,
            ].join('\n\n'),
          },
        ],
      }),
    })

    const payload = await response.json()
    if (!response.ok) {
      return json(res, response.status, { error: payload?.error?.message || 'Groq request failed' })
    }

    return json(res, 200, {
      model: GROQ_MODEL,
      repo: repoContext.repo,
      branch: repoContext.branch,
      files: repoContext.files,
      result: extractGroqText(payload),
      usage: payload.usage,
    })
  } catch (error) {
    console.error(error)
    return json(res, 500, { error: error instanceof Error ? error.message : 'Groq request failed' })
  }
}
