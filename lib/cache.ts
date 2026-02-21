// lib/cache.ts
import fs from 'fs/promises';
import path from 'path';
import type { RawDocument, AnalyticsResult } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function saveRawDocuments(
  channel: string,
  date: string,
  keyword: string,
  documents: RawDocument[]
): Promise<void> {
  const dir = path.join(DATA_DIR, 'raw', channel);
  await ensureDir(dir);
  const filename = `${date}_${keyword.replace(/[^a-zA-Z0-9가-힣]/g, '_')}.json`;
  await fs.writeFile(
    path.join(dir, filename),
    JSON.stringify(documents, null, 2),
    'utf-8'
  );
}

export async function loadRawDocuments(
  channel: string,
  date: string,
  keyword: string
): Promise<RawDocument[] | null> {
  const dir = path.join(DATA_DIR, 'raw', channel);
  const filename = `${date}_${keyword.replace(/[^a-zA-Z0-9가-힣]/g, '_')}.json`;
  const filePath = path.join(dir, filename);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as RawDocument[];
  } catch {
    return null;
  }
}

export function getAnalyticsCacheKey(
  startDate: string,
  endDate: string,
  granularity: string,
  keywords: string[],
  channels: string[]
): string {
  const kStr = [...keywords].sort().join(',');
  const cStr = [...channels].sort().join(',');
  return `${startDate}_${endDate}_${granularity}_${kStr}_${cStr}`
    .replace(/[^a-zA-Z0-9가-힣_,.-]/g, '_')
    .slice(0, 200);
}

export async function saveAnalytics(
  cacheKey: string,
  analytics: AnalyticsResult
): Promise<void> {
  const dir = path.join(DATA_DIR, 'analytics');
  await ensureDir(dir);
  await fs.writeFile(
    path.join(dir, `${cacheKey}.json`),
    JSON.stringify(analytics, null, 2),
    'utf-8'
  );
}

export async function loadAnalytics(
  cacheKey: string
): Promise<AnalyticsResult | null> {
  const filePath = path.join(DATA_DIR, 'analytics', `${cacheKey}.json`);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as AnalyticsResult;
  } catch {
    return null;
  }
}

export async function saveAIResponse(
  cacheKey: string,
  response: object
): Promise<void> {
  const dir = path.join(DATA_DIR, 'analytics');
  await ensureDir(dir);
  await fs.writeFile(
    path.join(dir, `${cacheKey}_ai.json`),
    JSON.stringify(response, null, 2),
    'utf-8'
  );
}

export async function loadAIResponse(cacheKey: string): Promise<object | null> {
  const filePath = path.join(DATA_DIR, 'analytics', `${cacheKey}_ai.json`);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}
