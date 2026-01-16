import * as XLSX from 'xlsx'
import { EventFormat } from '@repo/proto'

// Column header mappings (Russian → English field names)
const COLUMN_MAPPINGS: Record<string, string> = {
  // Russian headers from the provided Excel template
  '№': 'rowNumber',
  'Даты проведения': 'dates',
  'Наименование мероприятия': 'title',
  'Цель мероприятия': 'purpose',
  'Описание мероприятия': 'description',
  'Целевая аудитория': 'targetAudience',
  'Охват/кол-во участников': 'participantCount',
  'Место проведения': 'location',
  'Периодичность': 'frequency',
  'Ответственные подразделения': 'responsibleDepartment',
  // Alternative/fallback English headers
  'Title': 'title',
  'Description': 'description',
  'Location': 'location',
  'Start Date': 'startDate',
  'End Date': 'endDate',
  'Format': 'format',
}

// Known organization name mappings (Russian abbreviation/name → normalized key)
export const ORGANIZATION_NAME_MAPPINGS: Record<string, string> = {
  // ДСВР - Департамент студенческой внеучебной работы
  'дсвр': 'ДСВР',
  'департамент студенческой внеучебной работы': 'ДСВР',
  
  // Студенческие клубы
  'студ. клубы': 'Студ. клубы',
  'студ.клубы': 'Студ. клубы',
  'студенческие клубы': 'Студ. клубы',
  'студклубы': 'Студ. клубы',
  
  // Школы ОП
  'школы оп': 'Школы ОП',
  'школа оп': 'Школы ОП',
  
  // ДМиСО - Департамент маркетинга и социальных медиа
  'дмисо': 'ДМиСО',
  'дм и со': 'ДМиСО',
  'департамент маркетинга': 'ДМиСО',
  
  // AITUSA
  'aitusa': 'AITUSA',
  'аитуса': 'AITUSA',
  
  // Школа креативной индустрии
  'школа креативной индустрии': 'Школа креативной индустрии',
  'шки': 'Школа креативной индустрии',
  'креативная индустрия': 'Школа креативной индустрии',
  
  // Студенческий отдел ОПО
  'студ. отдел опо': 'Студ. отдел ОПО',
  'студ.отдел опо': 'Студ. отдел ОПО',
  'студенческий отдел опо': 'Студ. отдел ОПО',
  'отдел опо': 'Студ. отдел ОПО',
}

/**
 * Normalize organization name from Excel to match known organizations
 */
export function normalizeOrganizationName(name: string): string | null {
  if (!name) return null
  
  const normalized = name.toLowerCase().trim()
  
  // Direct match
  if (ORGANIZATION_NAME_MAPPINGS[normalized]) {
    return ORGANIZATION_NAME_MAPPINGS[normalized]
  }
  
  // Partial match - check if any key is contained in the input
  for (const [key, value] of Object.entries(ORGANIZATION_NAME_MAPPINGS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value
    }
  }
  
  // Return original if no match (will need manual selection)
  return null
}

export interface ParsedEvent {
  rowNumber?: number
  title: string
  description: string
  purpose?: string
  location: string
  dates?: string
  formattedDates?: string // Human-readable date range
  startDate?: string
  endDate?: string
  targetAudience?: string
  participantCount?: string
  frequency?: string
  responsibleDepartment?: string
  normalizedOrganization?: string | null // Matched organization name from database
  format: EventFormat
}

/**
 * Format a date range for display
 */
function formatDateRange(startDate?: Date, endDate?: Date): string {
  if (!startDate) return ''
  
  const formatDate = (d: Date) => {
    const day = d.getDate().toString().padStart(2, '0')
    const month = (d.getMonth() + 1).toString().padStart(2, '0')
    return `${day}.${month}`
  }
  
  if (!endDate || startDate.getTime() === endDate.getTime()) {
    return formatDate(startDate)
  }
  
  return `${formatDate(startDate)} - ${formatDate(endDate)}`
}

export interface ExcelParseResult {
  success: boolean
  events: ParsedEvent[]
  errors: string[]
  headers: string[]
  rawData: Record<string, unknown>[]
}

/**
 * Convert Excel serial date number to JavaScript Date
 */
function excelSerialToDate(serial: number): Date {
  // Excel dates start from December 30, 1899
  const utcDays = Math.floor(serial - 25569)
  const utcValue = utcDays * 86400 * 1000
  return new Date(utcValue)
}

/**
 * Parse date range string like "17.01. - 19.01." or Excel serial numbers into start and end dates
 */
function parseDateRange(dateStr: string, year: number = new Date().getFullYear()): { startDate: Date; endDate: Date } | null {
  if (!dateStr) return null
  
  // Check if it's an Excel serial number (5-digit number)
  const serialMatch = dateStr.match(/^(\d{5})$/)
  if (serialMatch) {
    const date = excelSerialToDate(parseInt(serialMatch[1]))
    return {
      startDate: new Date(date.setHours(9, 0, 0, 0)),
      endDate: new Date(new Date(date).setHours(18, 0, 0, 0)),
    }
  }
  
  // Check for serial number range like "46041 - 46042"
  const serialRangeMatch = dateStr.match(/(\d{5})\s*-\s*(\d{5})/)
  if (serialRangeMatch) {
    const startDate = excelSerialToDate(parseInt(serialRangeMatch[1]))
    const endDate = excelSerialToDate(parseInt(serialRangeMatch[2]))
    startDate.setHours(9, 0, 0, 0)
    endDate.setHours(18, 0, 0, 0)
    return { startDate, endDate }
  }
  
  // Match patterns like "17.01. - 19.01." or "17.01.-19.01." or "17.01 - 19.01"
  const rangeMatch = dateStr.match(/(\d{1,2})\.(\d{1,2})\.?\s*-\s*(\d{1,2})\.(\d{1,2})\.?/)
  if (rangeMatch) {
    const [, startDay, startMonth, endDay, endMonth] = rangeMatch
    return {
      startDate: new Date(year, parseInt(startMonth) - 1, parseInt(startDay), 9, 0),
      endDate: new Date(year, parseInt(endMonth) - 1, parseInt(endDay), 18, 0),
    }
  }
  
  // Single date pattern like "17.01."
  const singleMatch = dateStr.match(/(\d{1,2})\.(\d{1,2})\.?/)
  if (singleMatch) {
    const [, day, month] = singleMatch
    const date = new Date(year, parseInt(month) - 1, parseInt(day))
    return {
      startDate: new Date(date.setHours(9, 0, 0, 0)),
      endDate: new Date(date.setHours(18, 0, 0, 0)),
    }
  }
  
  return null
}

/**
 * Determine event format based on location string
 */
function determineFormat(location?: string): EventFormat {
  if (!location) return EventFormat.OFFLINE
  
  const locationLower = location.toLowerCase()
  if (locationLower.includes('online') || locationLower.includes('virtual') || locationLower.includes('zoom') || locationLower.includes('teams')) {
    return EventFormat.ONLINE
  }
  return EventFormat.OFFLINE
}

/**
 * Normalize column header to match our expected field names
 */
function normalizeHeader(header: string): string {
  const trimmed = header.trim()
  return COLUMN_MAPPINGS[trimmed] || trimmed.toLowerCase().replace(/\s+/g, '_')
}

/**
 * Find a value in a mapped object by partial key match
 */
function findValueByPartialKey(obj: Record<string, string>, partialKey: string): string | undefined {
  const lowerPartial = partialKey.toLowerCase()
  for (const [key, value] of Object.entries(obj)) {
    if (key.toLowerCase().includes(lowerPartial) && value) {
      return value
    }
  }
  return undefined
}

/**
 * Parse an Excel file and extract events
 */
export async function parseExcelFile(file: File): Promise<ExcelParseResult> {
  const errors: string[] = []
  const events: ParsedEvent[] = []
  
  try {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      return { success: false, events: [], errors: ['No sheets found in the file'], headers: [], rawData: [] }
    }
    
    const sheet = workbook.Sheets[sheetName]
    
    // Convert to JSON with headers
    const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: false,
    })
    
    if (rawData.length === 0) {
      return { success: false, events: [], errors: ['No data found in the sheet'], headers: [], rawData: [] }
    }
    
    // Get headers from first row
    const headers = Object.keys(rawData[0] || {})
    
    // Process each row
    rawData.forEach((row, index) => {
      try {
        // Skip header rows (rows that contain "Январь", "Февраль", etc. as month markers)
        const firstValue = String(Object.values(row)[0] || '')
        if (firstValue.match(/^(Январь|Февраль|Март|Апрель|Май|Июнь|Июль|Август|Сентябрь|Октябрь|Ноябрь|Декабрь)$/i)) {
          return // Skip month header rows
        }
        
        // Map columns
        const mapped: Record<string, string> = {}
        for (const [key, value] of Object.entries(row)) {
          const normalizedKey = normalizeHeader(key)
          mapped[normalizedKey] = String(value || '')
        }
        
        // Extract title
        const title = mapped.title || mapped.наименование_мероприятия || ''
        if (!title || title.length < 3) {
          return // Skip rows without valid titles
        }
        
        // Extract description (combine purpose + description if both exist)
        const purpose = mapped.purpose || mapped.цель_мероприятия || ''
        const desc = mapped.description || mapped.описание_мероприятия || ''
        const description = [purpose, desc].filter(Boolean).join('\n\n') || title
        
        // Extract location
        const location = mapped.location || mapped.место_проведения || mapped.responsibledepartment || 'TBD'
        
        // Parse dates
        const dateStr = mapped.dates || mapped.даты_проведения || ''
        const parsedDates = parseDateRange(dateStr)
        
        // Parse organization - try multiple possible key formats
        const deptStr = mapped.responsibledepartment || 
                        mapped.ответственные_подразделения ||
                        mapped['ответственные подразделения'] ||
                        findValueByPartialKey(mapped, 'ответствен') ||
                        findValueByPartialKey(mapped, 'подразделен') ||
                        ''
        
        const normalizedOrg = normalizeOrganizationName(deptStr)

        const event: ParsedEvent = {
          rowNumber: index + 2, // +2 because Excel rows are 1-indexed and we have a header
          title,
          description,
          purpose,
          location,
          dates: dateStr,
          formattedDates: parsedDates ? formatDateRange(parsedDates.startDate, parsedDates.endDate) : dateStr,
          startDate: parsedDates?.startDate.toISOString(),
          endDate: parsedDates?.endDate.toISOString(),
          targetAudience: mapped.targetaudience || mapped.целевая_аудитория || '',
          participantCount: mapped.participantcount || mapped['охват/кол-во_участников'] || '',
          frequency: mapped.frequency || mapped.периодичность || '',
          responsibleDepartment: deptStr,
          normalizedOrganization: normalizedOrg,
          format: determineFormat(location),
        }
        
        events.push(event)
      } catch (rowError) {
        errors.push(`Row ${index + 2}: ${rowError instanceof Error ? rowError.message : 'Unknown error'}`)
      }
    })
    
    return {
      success: events.length > 0,
      events,
      errors,
      headers,
      rawData,
    }
  } catch (error) {
    return {
      success: false,
      events: [],
      errors: [error instanceof Error ? error.message : 'Failed to parse Excel file'],
      headers: [],
      rawData: [],
    }
  }
}

/**
 * Convert parsed events to CreateEventRequest format
 */
export function toCreateEventRequest(event: ParsedEvent, organizationId: number, userId: number) {
  return {
    title: event.title,
    description: event.description,
    location: event.location,
    startTime: event.startDate || new Date().toISOString(),
    endTime: event.endDate || new Date().toISOString(),
    format: event.format,
    organizationId,
    userId,
    tagIds: [],
  }
}
