import ExcelJS from 'exceljs'
import type { Event } from '@repo/proto'

// ============================================================================
// Color Constants (ARGB format for ExcelJS)
// ============================================================================

const COLORS = {
  // Header colors - Professional blue
  headerBg: 'FF2563EB', // Blue 600
  headerText: 'FFFFFFFF', // White
  // Row colors
  rowEven: 'FFFFFFFF', // White
  rowOdd: 'FFF1F5F9', // Slate 100
  // Border colors
  borderLight: 'FFE2E8F0', // Slate 200
  borderHeader: 'FF1D4ED8', // Blue 700
  // Text colors
  textPrimary: 'FF1E293B', // Slate 800
  textSecondary: 'FF64748B', // Slate 500
  // Accent
  accent: 'FF3B82F6' // Blue 500
} as const

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format date range as "dd.mm - dd.mm" or "dd.mm" if same day
 */
function formatDateRange(startDateStr: string, endDateStr: string): string {
  if (!startDateStr) return '-'

  try {
    const startDate = new Date(startDateStr)
    const startDay = startDate.getDate().toString().padStart(2, '0')
    const startMonth = (startDate.getMonth() + 1).toString().padStart(2, '0')

    if (!endDateStr) {
      return `${startDay}.${startMonth}`
    }

    const endDate = new Date(endDateStr)
    const endDay = endDate.getDate().toString().padStart(2, '0')
    const endMonth = (endDate.getMonth() + 1).toString().padStart(2, '0')

    // Same day - show single date
    if (startDay === endDay && startMonth === endMonth && startDate.getFullYear() === endDate.getFullYear()) {
      return `${startDay}.${startMonth}`
    }

    return `${startDay}.${startMonth} - ${endDay}.${endMonth}`
  } catch {
    return '-'
  }
}

/**
 * Apply border to a cell
 */
function applyBorder(cell: ExcelJS.Cell, isHeader = false) {
  const borderColor = isHeader ? COLORS.borderHeader : COLORS.borderLight
  cell.border = {
    top: { style: 'thin', color: { argb: borderColor } },
    left: { style: 'thin', color: { argb: borderColor } },
    bottom: { style: 'thin', color: { argb: borderColor } },
    right: { style: 'thin', color: { argb: borderColor } }
  }
}

// ============================================================================
// Export Options Interface
// ============================================================================

interface ExportOptions {
  /** Filename without extension */
  filename?: string
  /** Include tags column */
  includeTags?: boolean
  /** Include organization details */
  includeOrganization?: boolean
  /** Include registration stats */
  includeStats?: boolean
}

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * Export events to Excel file with professional styling
 */
export async function exportEventsToExcel(events: Event[], options: ExportOptions = {}): Promise<void> {
  const {
    filename = `events_export_${new Date().toISOString().split('T')[0]}`,
    includeTags = false,
    includeOrganization = true,
    includeStats = true
  } = options

  // Create workbook with metadata
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'EMS Admin'
  workbook.created = new Date()
  workbook.modified = new Date()

  // Create worksheet with frozen header row
  const worksheet = workbook.addWorksheet('События', {
    properties: { tabColor: { argb: COLORS.accent } },
    views: [{ state: 'frozen', ySplit: 1 }]
  })

  // Build columns array - streamlined format
  const columns: Partial<ExcelJS.Column>[] = [
    { header: '№', key: 'rowNum', width: 6 },
    { header: 'ID', key: 'id', width: 7 },
    { header: 'Название', key: 'title', width: 45 },
    { header: 'Описание', key: 'description', width: 65 },
    { header: 'Место проведения', key: 'location', width: 28 },
    { header: 'Даты', key: 'dates', width: 16 }
  ]

  if (includeOrganization) {
    columns.push({ header: 'Организация', key: 'organization', width: 22 })
  }

  if (includeTags) {
    columns.push({ header: 'Теги', key: 'tags', width: 20 })
  }

  if (includeStats) {
    columns.push(
      { header: 'Регистрации', key: 'registrations', width: 13 },
      { header: 'Посетители', key: 'attendees', width: 12 }
    )
  }

  worksheet.columns = columns

  // Style header row - Professional look
  const headerRow = worksheet.getRow(1)
  headerRow.height = 28
  headerRow.eachCell((cell) => {
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: COLORS.headerText }
    }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.headerBg }
    }
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true
    }
    applyBorder(cell, true)
  })

  // Add data rows
  events.forEach((event, index) => {
    const rowData: Record<string, string | number> = {
      rowNum: index + 1,
      id: event.id,
      title: event.title || '-',
      description: event.description || '-',
      location: event.location || '-',
      dates: formatDateRange(event.startTime, event.endTime)
    }

    if (includeOrganization) {
      rowData.organization = event.organization?.title || '-'
    }

    if (includeTags && event.tags) {
      rowData.tags = event.tags.length > 0 ? event.tags.map((tag) => tag.name).join(', ') : '-'
    }

    if (includeStats) {
      rowData.registrations = event.totalRegistrations || 0
      rowData.attendees = event.totalAttendees || 0
    }

    const row = worksheet.addRow(rowData)

    // Apply row styling
    const isEven = index % 2 === 0
    row.height = 24

    row.eachCell((cell, colNumber) => {
      // Background color (zebra striping)
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? COLORS.rowEven : COLORS.rowOdd }
      }

      // Font
      cell.font = {
        name: 'Calibri',
        size: 10,
        color: { argb: COLORS.textPrimary }
      }

      // Default alignment
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'left',
        wrapText: true
      }

      // Border
      applyBorder(cell)

      // Get column key for special styling
      const column = worksheet.getColumn(colNumber)
      const columnKey = column.key

      // Center alignment for specific columns
      if (columnKey === 'rowNum' || columnKey === 'id' || columnKey === 'dates') {
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false }
      }

      // Description column - ensure proper wrapping with top alignment for readability
      if (columnKey === 'description') {
        cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true }
      }

      // Title column - top alignment for consistency with description
      if (columnKey === 'title') {
        cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true }
      }

      // Right alignment for numeric columns
      if (columnKey === 'registrations' || columnKey === 'attendees') {
        cell.alignment = { vertical: 'middle', horizontal: 'right', wrapText: false }
        cell.font = {
          name: 'Calibri',
          size: 10,
          color: { argb: COLORS.textPrimary }
        }
      }

      // Style row number column
      if (columnKey === 'rowNum') {
        cell.font = {
          name: 'Calibri',
          size: 10,
          color: { argb: COLORS.textSecondary }
        }
      }
    })

    // Adjust row height for long descriptions
    // ExcelJS column width is in "characters" at default font size
    // For Calibri 10pt, roughly 1 character = 1 width unit
    // Description column width is 65 characters
    const description = event.description || ''
    const descColWidth = 65
    
    if (description.length > descColWidth) {
      // Calculate number of lines needed (with some buffer for word wrapping)
      const estimatedLines = Math.ceil(description.length / (descColWidth * 0.85))
      // Each line needs ~15 points of height in Excel (at 10pt font)
      // Base height 20, then add 15 per line after first
      const calculatedHeight = Math.max(24, Math.min(120, 15 + estimatedLines * 15))
      row.height = calculatedHeight
    }
  })

  // Add subtle bottom border to last row
  const lastDataRow = worksheet.getRow(events.length + 1)
  lastDataRow.eachCell((cell) => {
    cell.border = {
      ...cell.border,
      bottom: { style: 'medium', color: { argb: COLORS.borderLight } }
    }
  })

  // Add auto-filter to header row
  const lastColumn = worksheet.columns.length
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: lastColumn }
  }

  // Set print options
  worksheet.pageSetup = {
    paperSize: 9, // A4
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    printTitlesRow: '1:1',
    margins: {
      left: 0.4,
      right: 0.4,
      top: 0.5,
      bottom: 0.5,
      header: 0.3,
      footer: 0.3
    }
  }

  // Generate file and trigger download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })

  // Create download link
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export selected events to Excel file
 */
export async function exportSelectedEventsToExcel(
  events: Event[],
  selectedIds: (string | number)[],
  options: ExportOptions = {}
): Promise<void> {
  const selectedEvents = events.filter((event) =>
    selectedIds.some((id) => String(id) === String(event.id))
  )

  if (selectedEvents.length === 0) {
    console.warn('No events selected for export')
    return
  }

  await exportEventsToExcel(selectedEvents, {
    ...options,
    filename: options.filename || `events_selected_${new Date().toISOString().split('T')[0]}`
  })
}
