#!/usr/bin/env node
// 用 GitHub REST API (api.github.com) 上传静态站到 Pages，绕开被墙的 github.com:443 git 协议。
// token 只从环境变量 GITHUB_TOKEN 读取。
import fs from 'node:fs'
import path from 'node:path'

const TOKEN = process.env.GITHUB_TOKEN || ''
const OWNER = 'lesile1312'
const REPO = 'sk-hynix-memory-behind-ai'
const SITE_DIR = path.resolve('C:/Users/28315/WorkBuddy/2026-11-18-19-53-00/site/dist')
const API = 'https://api.github.com'
const H = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'workbuddy-ghpages-deploy',
  'Content-Type': 'application/json',
}
const log = (...a) => console.log(...a)
const die = (m) => { console.error('✗ ' + m); process.exit(1) }
if (!TOKEN) die('缺少 GITHUB_TOKEN')

async function api(method, p, body) {
  const r = await fetch(API + p, {
    method, headers: H,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await r.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch { json = text }
  return { ok: r.ok, status: r.status, body: json }
}

const me = await api('GET', '/user')
if (!me.ok || !me.body?.login) die(`认证失败 ${me.status}: ${me.body?.message || me.body}`)
log(`✓ 已认证：${me.body.login}`)

const repo = await api('GET', `/repos/${OWNER}/${REPO}`)
if (!repo.ok) die(`仓库读取失败 ${repo.status}`)
const BRANCH = repo.body.default_branch || 'main'
log(`✓ 仓库：${repo.body.full_name} (默认分支 ${BRANCH})`)

// 空仓库无法创建 git blob（409 Git Repository is empty）——先用 Contents API 写一份 README 初始化分支
const readmeProbe = await api('GET', `/repos/${OWNER}/${REPO}/contents/README.md?ref=${BRANCH}`)
if (readmeProbe.status === 404) {
  const init = await api('PUT', `/repos/${OWNER}/${REPO}/contents/README.md`, {
    message: 'init: bootstrap repository',
    content: Buffer.from('# SK hynix — THE MEMORY BEHIND AI\n\nStatic site published with GitHub Pages.\n').toString('base64'),
    branch: BRANCH,
  })
  if (!init.ok) die(`初始化仓库失败 ${init.status}: ${init.body?.message || ''}`)
  log('✓ 空仓库已初始化（README.md）')
} else if (!readmeProbe.ok) {
  log(`⚠ 检查 README 返回 ${readmeProbe.status}，继续尝试上传`)
}

// 收集所有静态文件（排除 .git）
fs.writeFileSync(path.join(SITE_DIR, '.nojekyll'), '')
const files = []
function walk(dir, rel = '') {
  for (const name of fs.readdirSync(dir)) {
    if (name === '.git') continue
    const full = path.join(dir, name)
    const r = path.join(rel, name).replace(/\\/g, '/')
    if (fs.statSync(full).isDirectory()) walk(full, r)
    else files.push({ path: r, full })
  }
}
walk(SITE_DIR)
log(`✓ 待上传 ${files.length} 个文件，共 ${(files.reduce((s, f) => s + fs.statSync(f.full).size, 0) / 1024 / 1024).toFixed(1)} MB`)

// 逐个建 blob（大文件 base64 可能较大，用最小压缩）
const tree = []
for (let i = 0; i < files.length; i++) {
  const f = files[i]
  const b64 = fs.readFileSync(f.full).toString('base64')
  const res = await api('POST', `/repos/${OWNER}/${REPO}/git/blobs`, { content: b64, encoding: 'base64' })
  if (!res.ok) die(`blob 失败 ${f.path}: ${res.status} ${res.body?.message || ''}`)
  tree.push({ path: f.path, mode: '100644', type: 'blob', sha: res.body.sha })
  if ((i + 1) % 5 === 0 || i === files.length - 1) log(`  blob ${i + 1}/${files.length}`)
}

// 建 tree
const t = await api('POST', `/repos/${OWNER}/${REPO}/git/trees`, { tree, base_tree: null })
if (!t.ok) die(`tree 失败 ${t.status}: ${t.body?.message || ''}`)
log('✓ tree 已创建')

// 查现有分支 ref 作为 parent
let parent = null
const ref = await api('GET', `/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`)
if (ref.ok) parent = ref.body.object?.sha
else if (ref.status !== 404) log(`  ⚠ 读取 ${BRANCH} ref 返回 ${ref.status}`)

const commitBody = { message: 'deploy: SK hynix THE MEMORY BEHIND AI 静态站', tree: t.body.sha }
if (parent) commitBody.parents = [parent]
const c = await api('POST', `/repos/${OWNER}/${REPO}/git/commits`, commitBody)
if (!c.ok) die(`commit 失败 ${c.status}: ${c.body?.message || ''}`)
log('✓ commit 已创建')

if (parent) {
  const upd = await api('PATCH', `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, { sha: c.body.sha, force: true })
  if (!upd.ok) die(`更新 ref 失败 ${upd.status}: ${upd.body?.message || ''}`)
} else {
  const cr = await api('POST', `/repos/${OWNER}/${REPO}/git/refs`, { ref: `refs/heads/${BRANCH}`, sha: c.body.sha })
  if (!cr.ok) die(`创建 ref 失败 ${cr.status}: ${cr.body?.message || ''}`)
}
log(`✓ ${BRANCH} 已更新`)

// 开 Pages
let pages = await api('POST', `/repos/${OWNER}/${REPO}/pages`, { source: { branch: BRANCH, path: '/' } })
if (pages.ok) log(`✓ Pages 已开启 (${BRANCH} / root)`)
else if (pages.status === 409) {
  const upd = await api('PUT', `/repos/${OWNER}/${REPO}/pages`, { source: { branch: BRANCH, path: '/' } })
  log(upd.ok ? `✓ Pages source 已更新为 ${BRANCH} / root` : `⚠ Pages source 更新失败 ${upd.status}: ${upd.body?.message || ''}`)
} else log(`⚠ Pages 开启失败 ${pages.status}: ${pages.body?.message || ''}`)

const SITE_URL = `https://${OWNER}.github.io/${REPO}/`
log(`\n等待 Pages 构建… ${SITE_URL}`)
let live = false
for (let i = 0; i < 40; i++) {
  try {
    const r = await fetch(SITE_URL, { redirect: 'follow' })
    if (r.ok) { live = true; break }
  } catch { /* 尚未生效 */ }
  await new Promise((r) => setTimeout(r, 6000))
  if ((i + 1) % 5 === 0) log(`  …已等待 ${(i + 1) * 6}s`)
}
log('')
log(live ? `✅ 已上线：${SITE_URL}` : `⏳ 未在 4 分钟内上线，请手动确认：${SITE_URL}`)
log(`仓库：https://github.com/${OWNER}/${REPO}`)
