import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import { runMigrations } from './migrations'
import { seedIfEmpty } from './seed'
import { seedDemoIfNeeded } from './demo-seed'

let dbInstance: Database.Database | null = null

export function getDbPath(): string {
  const userData = app.getPath('userData')
  if (!fs.existsSync(userData)) {
    fs.mkdirSync(userData, { recursive: true })
  }
  return path.join(userData, 'doc-flow.sqlite')
}

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance
  const dbPath = getDbPath()
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  runMigrations(db)
  seedIfEmpty(db)
  seedDemoIfNeeded(db)
  dbInstance = db
  return db
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}
