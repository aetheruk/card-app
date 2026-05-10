#!/usr/bin/env bun
import fs from 'fs/promises'
import path from 'path'

const GITHUB_REPO = 'PokemonTCG/pokemon-tcg-data'
const BRANCH = 'master'

function githubHeaders() {
  const headers = { Accept: 'application/vnd.github.v3+json' }
  if (process.env.GITHUB_TOKEN) headers.Authorization = `token ${process.env.GITHUB_TOKEN}`
  return headers
}

async function listContents(dir) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${dir}?ref=${BRANCH}`
  const res = await fetch(url, { headers: githubHeaders() })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to list ${dir}: ${res.status} ${res.statusText} - ${text}`)
  }
  return res.json()
}

async function downloadToFile(url, dest) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`)
  await fs.writeFile(dest, await res.text(), 'utf8')
}

async function main() {
  const root = path.resolve(process.cwd(), '..')
  const outRoot = path.join(root, 'source_data', 'tcg')
  const targets = [
    { dir: 'cards/en', out: path.join(outRoot, 'cards', 'en') },
    { dir: 'sets', out: path.join(outRoot, 'sets') },
  ]

  for (const target of targets) {
    await fs.mkdir(target.out, { recursive: true })
    console.log(`Listing ${target.dir}...`)
    const items = await listContents(target.dir)
    const files = items.filter((item) => item.type === 'file' && item.name.endsWith('.json'))
    for (const file of files) {
      const dest = path.join(target.out, file.name)
      process.stdout.write(`Downloading ${file.name}... `)
      await downloadToFile(file.download_url, dest)
      console.log('OK')
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
