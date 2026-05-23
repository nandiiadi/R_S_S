import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const outputPath = path.resolve('src/version-info.json')

let commit = 'docker'
let buildTime = new Date().toISOString()

try {
  commit = execSync('git rev-parse --short HEAD')
    .toString()
    .trim()
} catch {
  console.warn('[version-info] Git metadata unavailable, using fallback version')
}

const versionInfo = {
  commit,
  buildTime,
}

fs.writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2))

console.log('[version-info] Generated src/version.json')