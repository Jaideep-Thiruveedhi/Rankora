import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type Category = 'GENERAL' | 'EWS' | 'OBC_NCL' | 'SC' | 'ST'
type Quota = 'AIQ' | 'HS' | 'OS'
type Gender = 'MALE' | 'FEMALE' | 'TRANSGENDER'
type SeatType = 'OPEN' | 'GENDER_NEUTRAL'
type RoundNo = 'ROUND_1' | 'ROUND_2' | 'ROUND_3' | 'ROUND_4' | 'ROUND_5' | 'ROUND_6'

async function seed() {
  console.log('Seeding database with sample data...')

  // Create academic years
  const year2024 = await prisma.academicYear.upsert({
    where: { year: 2024 },
    update: {},
    create: { year: 2024 },
  })

  const year2023 = await prisma.academicYear.upsert({
    where: { year: 2023 },
    update: {},
    create: { year: 2023 },
  })

  // Create rounds
  for (const year of [year2024, year2023]) {
    for (let r = 1; r <= 6; r++) {
      const roundMap: Record<number, RoundNo> = {
        1: 'ROUND_1', 2: 'ROUND_2', 3: 'ROUND_3', 4: 'ROUND_4', 5: 'ROUND_5', 6: 'ROUND_6',
      }
      await prisma.counsellingRound.upsert({
        where: { yearId_roundNo: { yearId: year.id, roundNo: roundMap[r] } },
        update: {},
        create: { yearId: year.id, roundNo: roundMap[r] },
      })
    }
  }

  // Create category quotas
  const categories: Category[] = ['GENERAL', 'EWS', 'OBC_NCL', 'SC', 'ST']
  const quotas: Quota[] = ['AIQ', 'HS', 'OS']
  const genders: Gender[] = ['MALE', 'FEMALE', 'TRANSGENDER']
  const seatTypes: SeatType[] = ['OPEN', 'GENDER_NEUTRAL']

  for (const cat of categories) {
    for (const q of quotas) {
      for (const g of genders) {
        for (const st of seatTypes) {
          await prisma.categoryQuota.upsert({
            where: { category_quota_gender_seatType: { category: cat, quota: q, gender: g, seatType: st } },
            update: {},
            create: { category: cat, quota: q, gender: g, seatType: st },
          })
        }
      }
    }
  }

  // Sample institutes
  const institutes = [
    { code: 'IITB', name: 'Indian Institute of Technology Bombay', type: 'IIT', state: 'Maharashtra', city: 'Mumbai', nirfRank: 3 },
    { code: 'IITD', name: 'Indian Institute of Technology Delhi', type: 'IIT', state: 'Delhi', city: 'New Delhi', nirfRank: 2 },
    { code: 'IITM', name: 'Indian Institute of Technology Madras', type: 'IIT', state: 'Tamil Nadu', city: 'Chennai', nirfRank: 1 },
    { code: 'IITK', name: 'Indian Institute of Technology Kanpur', type: 'IIT', state: 'Uttar Pradesh', city: 'Kanpur', nirfRank: 4 },
    { code: 'IITKGP', name: 'Indian Institute of Technology Kharagpur', type: 'IIT', state: 'West Bengal', city: 'Kharagpur', nirfRank: 5 },
    { code: 'IITR', name: 'Indian Institute of Technology Roorkee', type: 'IIT', state: 'Uttarakhand', city: 'Roorkee', nirfRank: 6 },
    { code: 'IITG', name: 'Indian Institute of Technology Guwahati', type: 'IIT', state: 'Assam', city: 'Guwahati', nirfRank: 7 },
    { code: 'IITH', name: 'Indian Institute of Technology Hyderabad', type: 'IIT', state: 'Telangana', city: 'Hyderabad', nirfRank: 8 },
    { code: 'NITT', name: 'National Institute of Technology Tiruchirappalli', type: 'NIT', state: 'Tamil Nadu', city: 'Tiruchirappalli', nirfRank: 9 },
    { code: 'NITK', name: 'National Institute of Technology Karnataka', type: 'NIT', state: 'Karnataka', city: 'Surathkal', nirfRank: 12 },
    { code: 'NITW', name: 'National Institute of Technology Warangal', type: 'NIT', state: 'Telangana', city: 'Warangal', nirfRank: 15 },
    { code: 'NITC', name: 'National Institute of Technology Calicut', type: 'NIT', state: 'Kerala', city: 'Calicut', nirfRank: 23 },
    { code: 'NITR', name: 'National Institute of Technology Rourkela', type: 'NIT', state: 'Odisha', city: 'Rourkela', nirfRank: 16 },
    { code: 'NITS', name: 'National Institute of Technology Silchar', type: 'NIT', state: 'Assam', city: 'Silchar', nirfRank: 40 },
    { code: 'IIITD', name: 'Indraprastha Institute of Information Technology Delhi', type: 'IIIT', state: 'Delhi', city: 'New Delhi', nirfRank: 45 },
    { code: 'IIITH', name: 'International Institute of Information Technology Hyderabad', type: 'IIIT', state: 'Telangana', city: 'Hyderabad', nirfRank: 27 },
    { code: 'IIITB', name: 'International Institute of Information Technology Bangalore', type: 'IIIT', state: 'Karnataka', city: 'Bangalore', nirfRank: 48 },
    { code: 'DTU', name: 'Delhi Technological University', type: 'GFTI', state: 'Delhi', city: 'New Delhi', nirfRank: 29 },
    { code: 'NSIT', name: 'Netaji Subhas Institute of Technology', type: 'GFTI', state: 'Delhi', city: 'New Delhi', nirfRank: 35 },
    { code: 'IIITDMJ', name: 'IIIT Design and Manufacturing Jabalpur', type: 'IIIT', state: 'Madhya Pradesh', city: 'Jabalpur', nirfRank: 65 },
  ]

  const branches = [
    { code: 'CS', name: 'Computer Science and Engineering' },
    { code: 'IT', name: 'Information Technology' },
    { code: 'EC', name: 'Electronics and Communication Engineering' },
    { code: 'EE', name: 'Electrical Engineering' },
    { code: 'ME', name: 'Mechanical Engineering' },
    { code: 'CE', name: 'Civil Engineering' },
    { code: 'CH', name: 'Chemical Engineering' },
    { code: 'BT', name: 'Biotechnology' },
    { code: 'MT', name: 'Mathematics and Computing' },
    { code: 'AE', name: 'Aerospace Engineering' },
  ]

  // Upsert institutes and branches
  for (const inst of institutes) {
    const created = await prisma.institute.upsert({
      where: { code: inst.code },
      update: { ...inst, latitude: null, longitude: null },
      create: { ...inst, latitude: null, longitude: null },
    })
    for (const br of branches) {
      await prisma.branch.upsert({
        where: { instituteId_code: { instituteId: created.id, code: br.code } },
        update: { name: br.name },
        create: { instituteId: created.id, code: br.code, name: br.name },
      })
    }
  }

  // Sample cutoffs for 2024 Round 6
  interface SampleCutoff {
    inst: string
    branch: string
    cat: Category
    quota: Quota
    gender: Gender
    open: number
    close: number
  }

  const sampleCutoffs: SampleCutoff[] = [
    { inst: 'IITB', branch: 'CS', cat: 'GENERAL', quota: 'AIQ', gender: 'MALE', open: 1, close: 65 },
    { inst: 'IITB', branch: 'CS', cat: 'OBC_NCL', quota: 'AIQ', gender: 'MALE', open: 30, close: 250 },
    { inst: 'IITB', branch: 'CS', cat: 'SC', quota: 'AIQ', gender: 'MALE', open: 80, close: 650 },
    { inst: 'IITB', branch: 'CS', cat: 'ST', quota: 'AIQ', gender: 'MALE', open: 150, close: 850 },
    { inst: 'IITB', branch: 'EE', cat: 'GENERAL', quota: 'AIQ', gender: 'MALE', open: 100, close: 550 },
    { inst: 'IITB', branch: 'ME', cat: 'GENERAL', quota: 'AIQ', gender: 'MALE', open: 300, close: 1200 },
    { inst: 'IITB', branch: 'EC', cat: 'GENERAL', quota: 'AIQ', gender: 'MALE', open: 150, close: 800 },
    
    { inst: 'IITD', branch: 'CS', cat: 'GENERAL', quota: 'AIQ', gender: 'MALE', open: 2, close: 110 },
    { inst: 'IITD', branch: 'CS', cat: 'OBC_NCL', quota: 'AIQ', gender: 'MALE', open: 50, close: 350 },
    { inst: 'IITD', branch: 'CS', cat: 'SC', quota: 'AIQ', gender: 'MALE', open: 120, close: 800 },
    { inst: 'IITD', branch: 'EE', cat: 'GENERAL', quota: 'AIQ', gender: 'MALE', open: 150, close: 700 },
    { inst: 'IITD', branch: 'ME', cat: 'GENERAL', quota: 'AIQ', gender: 'MALE', open: 400, close: 1500 },
    
    { inst: 'IITM', branch: 'CS', cat: 'GENERAL', quota: 'AIQ', gender: 'MALE', open: 3, close: 150 },
    { inst: 'IITM', branch: 'CS', cat: 'OBC_NCL', quota: 'AIQ', gender: 'MALE', open: 60, close: 400 },
    { inst: 'IITM', branch: 'EE', cat: 'GENERAL', quota: 'AIQ', gender: 'MALE', open: 200, close: 900 },
    { inst: 'IITM', branch: 'ME', cat: 'GENERAL', quota: 'AIQ', gender: 'MALE', open: 500, close: 1800 },
    
    { inst: 'NITT', branch: 'CS', cat: 'GENERAL', quota: 'AIQ', gender: 'MALE', open: 800, close: 3500 },
    { inst: 'NITT', branch: 'CS', cat: 'OBC_NCL', quota: 'AIQ', gender: 'MALE', open: 1500, close: 6500 },
    { inst: 'NITT', branch: 'CS', cat: 'SC', quota: 'AIQ', gender: 'MALE', open: 3000, close: 12000 },
    { inst: 'NITT', branch: 'CS', cat: 'ST', quota: 'AIQ', gender: 'MALE', open: 5000, close: 18000 },
    { inst: 'NITT', branch: 'EC', cat: 'GENERAL', quota: 'AIQ', gender: 'MALE', open: 3000, close: 8000 },
    { inst: 'NITT', branch: 'EE', cat: 'GENERAL', quota: 'AIQ', gender: 'MALE', open: 4000, close: 10000 },
    { inst: 'NITT', branch: 'ME', cat: 'GENERAL', quota: 'AIQ', gender: 'MALE', open: 6000, close: 15000 },
    
    { inst: 'NITK', branch: 'CS', cat: 'GENERAL', quota: 'AIQ', gender: 'MALE', open: 1200, close: 4500 },
    { inst: 'NITK', branch: 'EC', cat: 'GENERAL', quota: 'AIQ', gender: 'MALE', open: 4000, close: 9000 },
    { inst: 'NITK', branch: 'EE', cat: 'GENERAL', quota: 'AIQ', gender: 'MALE', open: 5000, close: 11000 },
    
    { inst: 'NITW', branch: 'CS', cat: 'GENERAL', quota: 'AIQ', gender: 'MALE', open: 1500, close: 5000 },
    { inst: 'NITW', branch: 'EC', cat: 'GENERAL', quota: 'AIQ', gender: 'MALE', open: 4500, close: 10000 },
    { inst: 'NITW', branch: 'EE', cat: 'GENERAL', quota: 'AIQ', gender: 'MALE', open: 5500, close: 12000 },
    
    { inst: 'IIITH', branch: 'CS', cat: 'GENERAL', quota: 'AIQ', gender: 'MALE', open: 200, close: 800 },
    { inst: 'IIITH', branch: 'EC', cat: 'GENERAL', quota: 'AIQ', gender: 'MALE', open: 800, close: 2500 },
    { inst: 'IIITH', branch: 'IT', cat: 'GENERAL', quota: 'AIQ', gender: 'MALE', open: 300, close: 1200 },
    
    { inst: 'DTU', branch: 'CS', cat: 'GENERAL', quota: 'AIQ', gender: 'MALE', open: 2000, close: 6000 },
    { inst: 'DTU', branch: 'EC', cat: 'GENERAL', quota: 'AIQ', gender: 'MALE', open: 6000, close: 14000 },
    { inst: 'DTU', branch: 'EE', cat: 'GENERAL', quota: 'AIQ', gender: 'MALE', open: 7000, close: 16000 },
  ]

  const round2024_6 = await prisma.counsellingRound.findFirst({
    where: { yearId: year2024.id, roundNo: 'ROUND_6' },
  })

  if (round2024_6) {
    for (const sc of sampleCutoffs) {
      const inst = await prisma.institute.findUnique({ where: { code: sc.inst } })
      const br = inst ? await prisma.branch.findFirst({ where: { instituteId: inst.id, code: sc.branch } }) : null
      const cq = await prisma.categoryQuota.findUnique({
        where: { category_quota_gender_seatType: { category: sc.cat, quota: sc.quota, gender: sc.gender, seatType: 'OPEN' } },
      })
      if (inst && br && cq) {
        await prisma.cutoff.upsert({
          where: {
            instituteId_branchId_yearId_roundId_categoryQuotaId: {
              instituteId: inst.id,
              branchId: br.id,
              yearId: year2024.id,
              roundId: round2024_6.id,
              categoryQuotaId: cq.id,
            },
          },
          update: { openingRank: sc.open, closingRank: sc.close, source: 'SAMPLE_DATA' },
          create: {
            instituteId: inst.id,
            branchId: br.id,
            yearId: year2024.id,
            roundId: round2024_6.id,
            categoryQuotaId: cq.id,
            openingRank: sc.open,
            closingRank: sc.close,
            source: 'SAMPLE_DATA',
          },
        })
      }
    }
  }

  // Sample percentiles
  const percentiles = [
    { percentile: 99.99, rank: 100 },
    { percentile: 99.9, rank: 1000 },
    { percentile: 99.5, rank: 5000 },
    { percentile: 99, rank: 10000 },
    { percentile: 98, rank: 20000 },
    { percentile: 97, rank: 30000 },
    { percentile: 96, rank: 40000 },
    { percentile: 95, rank: 50000 },
    { percentile: 90, rank: 100000 },
    { percentile: 85, rank: 150000 },
    { percentile: 80, rank: 200000 },
    { percentile: 70, rank: 300000 },
    { percentile: 60, rank: 400000 },
    { percentile: 50, rank: 500000 },
  ]

  for (const p of percentiles) {
    await prisma.percentileRankMapping.upsert({
      where: { yearId_percentile: { yearId: year2024.id, percentile: p.percentile } },
      update: { rank: p.rank },
      create: { yearId: year2024.id, percentile: p.percentile, rank: p.rank },
    })
  }

  console.log('Seeding complete!')
  await prisma.$disconnect()
}

seed().catch(console.error)