import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import { parse } from 'csv-parse/sync'

const prisma = new PrismaClient()

interface JosaaRow {
  institute: string
  branch: string
  category: string
  quota: string
  gender: string
  openingRank: string
  closingRank: string
  year: string
  round: string
}

const CATEGORY_MAP: Record<string, string> = {
  'GEN': 'GENERAL',
  'GENERAL': 'GENERAL',
  'EWS': 'EWS',
  'OBC-NCL': 'OBC_NCL',
  'OBC': 'OBC_NCL',
  'SC': 'SC',
  'ST': 'ST',
}

const QUOTA_MAP: Record<string, string> = {
  'AI': 'AIQ',
  'AIQ': 'AIQ',
  'HS': 'HS',
  'OS': 'OS',
  'GOI': 'AIQ',
  'J&K': 'OS',
  'LA': 'OS',
}

const GENDER_MAP: Record<string, string> = {
  'Male': 'MALE',
  'Female': 'FEMALE',
  'Transgender': 'TRANSGENDER',
  'Gender-Neutral': 'GENDER_NEUTRAL',
}

const SEAT_TYPE_MAP: Record<string, string> = {
  'OPEN': 'OPEN',
  'OPEN (PwD)': 'OPEN_PWD',
  'Gender-Neutral': 'GENDER_NEUTRAL',
  'Female-only (including Supernumerary)': 'FEMALE_ONLY',
}

type Category = 'GENERAL' | 'EWS' | 'OBC_NCL' | 'SC' | 'ST'
type Quota = 'AIQ' | 'HS' | 'OS'
type Gender = 'MALE' | 'FEMALE' | 'TRANSGENDER'
type SeatType = 'OPEN' | 'OPEN_PWD' | 'GENDER_NEUTRAL' | 'FEMALE_ONLY'
type RoundNo = 'ROUND_1' | 'ROUND_2' | 'ROUND_3' | 'ROUND_4' | 'ROUND_5' | 'ROUND_6'

function normalizeCategory(cat: string): Category {
  const normalized = CATEGORY_MAP[cat.toUpperCase().trim()] || 'GENERAL'
  return normalized as Category
}

function normalizeQuota(q: string): Quota {
  const normalized = QUOTA_MAP[q.toUpperCase().trim()] || 'AIQ'
  return normalized as Quota
}

function normalizeGender(g: string): Gender {
  const normalized = GENDER_MAP[g.trim()] || 'MALE'
  return normalized as Gender
}

function normalizeSeatType(st: string): SeatType {
  const normalized = SEAT_TYPE_MAP[st.trim()] || 'OPEN'
  return normalized as SeatType
}

function parseRank(rank: string): number | null {
  const cleaned = rank.trim().replace(/,/g, '')
  if (!cleaned || cleaned === '-' || cleaned === 'NA') return null
  const parsed = parseInt(cleaned, 10)
  return isNaN(parsed) ? null : parsed
}

async function upsertInstitute(code: string, name: string, type: string, state: string, city: string) {
  return prisma.institute.upsert({
    where: { code },
    update: { name, type, state, city },
    create: { code, name, type, state, city },
  })
}

async function upsertBranch(instituteId: string, code: string, name: string) {
  return prisma.branch.upsert({
    where: { instituteId_code: { instituteId, code } },
    update: { name },
    create: { instituteId, code, name },
  })
}

async function upsertAcademicYear(year: number) {
  return prisma.academicYear.upsert({
    where: { year },
    update: {},
    create: { year },
  })
}

async function upsertCounsellingRound(yearId: string, roundNo: number) {
  const roundMap: Record<number, RoundNo> = {
    1: 'ROUND_1', 2: 'ROUND_2', 3: 'ROUND_3', 4: 'ROUND_4', 5: 'ROUND_5', 6: 'ROUND_6',
  }
  return prisma.counsellingRound.upsert({
    where: { yearId_roundNo: { yearId, roundNo: roundMap[roundNo] } },
    update: {},
    create: { yearId, roundNo: roundMap[roundNo] },
  })
}

async function upsertCategoryQuota(category: Category, quota: Quota, gender: Gender, seatType: SeatType) {
  return prisma.categoryQuota.upsert({
    where: { category_quota_gender_seatType: { category, quota, gender, seatType } },
    update: {},
    create: { category, quota, gender, seatType },
  })
}

async function importJosaaCsv(filePath: string, year: number, round: number, source: string) {
  console.log('Importing ' + filePath + ' for year ' + year + ' round ' + round)
  
  const content = fs.readFileSync(filePath, 'utf-8')
  const records = parse(content, { columns: true, skip_empty_lines: true, trim: true }) as JosaaRow[]
  
  console.log('Found ' + records.length + ' records')
  
  const yearRecord = await upsertAcademicYear(year)
  const roundRecord = await upsertCounsellingRound(yearRecord.id, round)
  
  let imported = 0
  let errors = 0
  
  for (const row of records) {
    try {
      const instituteName = row.institute.trim()
      const instituteCode = instituteName.split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g, '')
      const branchCode = row.branch.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
      const branchName = row.branch.trim()
      
      const category = normalizeCategory(row.category)
      const quota = normalizeQuota(row.quota)
      const gender = normalizeGender(row.gender)
      const seatType = normalizeSeatType(row.gender.includes('Female') ? 'Female-only (including Supernumerary)' : 'OPEN')
      
      const openingRank = parseRank(row.openingRank)
      const closingRank = parseRank(row.closingRank)
      
      if (!closingRank && !openingRank) continue
      
      const institute = await upsertInstitute(instituteCode, instituteName, 'UNKNOWN', 'UNKNOWN', 'UNKNOWN')
      const branch = await upsertBranch(institute.id, branchCode, branchName)
      const categoryQuota = await upsertCategoryQuota(category, quota, gender, seatType)
      
      await prisma.cutoff.upsert({
        where: {
          instituteId_branchId_yearId_roundId_categoryQuotaId: {
            instituteId: institute.id,
            branchId: branch.id,
            yearId: yearRecord.id,
            roundId: roundRecord.id,
            categoryQuotaId: categoryQuota.id,
          },
        },
        update: { openingRank, closingRank, source, sourceUrl: filePath },
        create: {
          instituteId: institute.id,
          branchId: branch.id,
          yearId: yearRecord.id,
          roundId: roundRecord.id,
          categoryQuotaId: categoryQuota.id,
          openingRank,
          closingRank,
          source,
          sourceUrl: filePath,
        },
      })
      imported++
    } catch (error) {
      console.error('Error importing row:', row, error)
      errors++
    }
  }
  
  console.log('Imported ' + imported + ' cutoffs, ' + errors + ' errors')
  return { imported, errors }
}

async function main() {
  const args = process.argv.slice(2)
  const filePath = args[0]
  const year = parseInt(args[1] || '2024')
  const round = parseInt(args[2] || '6')
  const source = args[3] || 'JOSSA_CSV'
  
  if (!filePath) {
    console.error('Usage: npx ts-node scripts/etl/import-csv.ts <file-path> [year] [round] [source]')
    process.exit(1)
  }
  
  await importJosaaCsv(filePath, year, round, source)
  await prisma.$disconnect()
}

main().catch(console.error)