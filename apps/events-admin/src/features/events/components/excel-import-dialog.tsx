'use client'

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation } from '@connectrpc/connect-query'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  Undo2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Upload,
  X,
  Check
} from 'lucide-react'
import * as XLSX from 'xlsx'

import { createEvent, listOrganizations, deleteEvent } from '@repo/proto'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@repo/ui/components/dialog'
import { Button } from '@repo/ui/components/button'
import { ScrollArea } from '@repo/ui/components/scroll-area'
import { Progress } from '@repo/ui/components/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/components/select'
import { Label } from '@repo/ui/components/label'
import { Checkbox } from '@repo/ui/components/checkbox'
import { Input } from '@repo/ui/components/input'
import { Badge } from '@repo/ui/components/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@repo/ui/components/tooltip'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@repo/ui/components/table'

import { FileUpload } from '@repo/ui/components/file-upload'
import { parseExcelFile, toCreateEventRequest, type ExcelParseResult, type ParsedEvent } from '@/lib/excel-parser'
import { cn } from '@repo/ui/lib/utils'

interface ExcelImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'complete'

interface ImportResult {
  success: number
  failed: number
  createdIds: number[]
  errors: { row: number; title: string; reason: string; originalData: ParsedEvent }[]
}

const ITEMS_PER_PAGE = 25

// Step indicator component
function StepIndicator({ currentStep }: { currentStep: ImportStep }) {
  const steps = [
    { key: 'upload', label: 'Upload', number: 1 },
    { key: 'preview', label: 'Review', number: 2 },
    { key: 'importing', label: 'Import', number: 3 },
    { key: 'complete', label: 'Done', number: 4 }
  ]

  const currentIndex = steps.findIndex((s) => s.key === currentStep)

  return (
    <nav aria-label="Import progress" className="flex items-center justify-center gap-2">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex
        const isCurrent = index === currentIndex

        return (
          <div key={step.key} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isCurrent && 'bg-primary text-primary-foreground ring-2 ring-primary/20 ring-offset-2',
                  !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : step.number}
              </div>
              <span
                className={cn(
                  'text-sm font-medium hidden sm:inline',
                  isCurrent ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn('mx-3 h-px w-8 transition-colors', index < currentIndex ? 'bg-primary' : 'bg-border')}
              />
            )}
          </div>
        )
      })}
    </nav>
  )
}

export function ExcelImportDialog({ open, onOpenChange }: ExcelImportDialogProps) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<ImportStep>('upload')
  const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null)
  const [editedEvents, setEditedEvents] = useState<Map<number, Partial<ParsedEvent>>>(new Map())
  const [selectedEvents, setSelectedEvents] = useState<Set<number>>(new Set())
  const [defaultOrganizationId, setDefaultOrganizationId] = useState<string>('')
  const [eventOrganizations, setEventOrganizations] = useState<Map<number, string>>(new Map())
  const [importProgress, setImportProgress] = useState(0)
  const [importResults, setImportResults] = useState<ImportResult>({
    success: 0,
    failed: 0,
    createdIds: [],
    errors: []
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [isUndoing, setIsUndoing] = useState(false)

  // Queries & Mutations
  const { data: orgsData } = useQuery(listOrganizations, { page: 1, limit: 100 })
  const organizations = orgsData?.organizations || []

  const createMutation = useMutation(createEvent)
  const deleteMutation = useMutation(deleteEvent)

  // Build organization lookup (memoized for performance)
  const orgNameToId = useMemo(() => {
    const map = new Map<string, number>()
    organizations.forEach((org) => {
      map.set(org.title.toLowerCase(), org.id)
      map.set(org.title, org.id)
    })
    return map
  }, [organizations])

  const findOrgIdByName = useCallback(
    (name: string | null | undefined): string | null => {
      if (!name) return null
      const id = orgNameToId.get(name) || orgNameToId.get(name.toLowerCase())
      return id ? String(id) : null
    },
    [orgNameToId]
  )

  // Handlers
  const handleFileChange = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return
      const file = files[0]

      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        toast.error('Invalid file type', { description: 'Please upload an Excel file (.xlsx or .xls)' })
        return
      }

      const result = await parseExcelFile(file)
      setParseResult(result)

      if (result.success && result.events.length > 0) {
        setSelectedEvents(new Set(result.events.map((_, i) => i)))

        const orgAssignments = new Map<number, string>()
        result.events.forEach((event, index) => {
          const orgId = findOrgIdByName(event.normalizedOrganization)
          if (orgId) orgAssignments.set(index, orgId)
        })
        setEventOrganizations(orgAssignments)
        setStep('preview')
      } else {
        toast.error('Parse Failed', { description: result.errors[0] || 'Could not parse Excel file' })
      }
    },
    [findOrgIdByName]
  )

  const handleImport = useCallback(async () => {
    if (!parseResult) return

    const selectedIndices = Array.from(selectedEvents)
    if (selectedIndices.length === 0) {
      toast.error('No events selected', { description: 'Please select at least one event to import' })
      return
    }

    const missingOrgs = selectedIndices.filter((index) => {
      return !eventOrganizations.has(index) && !defaultOrganizationId
    })
    if (missingOrgs.length > 0) {
      toast.error('Missing organizations', {
        description: `${missingOrgs.length} events need an organization assigned`
      })
      return
    }

    setStep('importing')
    setImportProgress(0)

    const results: ImportResult = { success: 0, failed: 0, createdIds: [], errors: [] }
    const mergedEvents = parseResult.events.map((event, i) => ({ ...event, ...(editedEvents.get(i) || {}) }))

    for (let i = 0; i < selectedIndices.length; i++) {
      const index = selectedIndices[i]
      const event = mergedEvents[index]
      const orgId = eventOrganizations.get(index) || defaultOrganizationId

      try {
        const request = toCreateEventRequest(event, parseInt(orgId), 0)
        const response = await createMutation.mutateAsync(request)
        results.success++
        if (response.event?.id) {
          results.createdIds.push(response.event.id)
        }
      } catch (error) {
        results.failed++
        results.errors.push({
          row: event.rowNumber || index + 2,
          title: event.title,
          reason: error instanceof Error ? error.message : 'Unknown error',
          originalData: event
        })
      }
      setImportProgress(Math.round(((i + 1) / selectedIndices.length) * 100))
    }

    setImportResults(results)
    setStep('complete')
    queryClient.invalidateQueries({ queryKey: ['connect-query'] })
  }, [parseResult, selectedEvents, eventOrganizations, defaultOrganizationId, editedEvents, createMutation, queryClient])

  const handleUndo = useCallback(async () => {
    if (importResults.createdIds.length === 0) return

    setIsUndoing(true)

    try {
      await Promise.all(importResults.createdIds.map((id) => deleteMutation.mutateAsync({ id })))
      toast.success('Import undone', {
        description: `Removed ${importResults.createdIds.length} events`
      })
      handleClose()
    } catch {
      toast.error('Undo failed', { description: 'Some events could not be removed' })
    } finally {
      setIsUndoing(false)
    }
  }, [importResults.createdIds, deleteMutation])

  const handleDownloadErrorReport = useCallback(() => {
    if (importResults.errors.length === 0) return

    const csvData = importResults.errors.map((err) => ({
      'Row Number': err.row,
      'Event Title': err.title,
      'Error Reason': err.reason,
      ...err.originalData
    }))

    const ws = XLSX.utils.json_to_sheet(csvData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Import Errors')

    XLSX.writeFile(wb, `import-errors-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }, [importResults.errors])

  const handleClose = useCallback(() => {
    setStep('upload')
    setEditedEvents(new Map())
    setParseResult(null)
    setSelectedEvents(new Set())
    setDefaultOrganizationId('')
    setEventOrganizations(new Map())
    setImportProgress(0)
    setImportResults({ success: 0, failed: 0, createdIds: [], errors: [] })
    setCurrentPage(1)
    onOpenChange(false)
  }, [onOpenChange])

  // Pagination
  const totalItems = parseResult?.events.length || 0
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)
  const paginatedIndices = useMemo(() => {
    return (
      parseResult?.events.map((_, i) => i).slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE) || []
    )
  }, [parseResult, currentPage])

  // Selection stats
  const validSelectedCount = useMemo(() => {
    if (!parseResult) return 0
    return Array.from(selectedEvents).filter((index) => {
      const event = parseResult.events[index]
      const edits = editedEvents.get(index) || {}
      const currentEvent = { ...event, ...edits }
      const hasOrg = !!(eventOrganizations.get(index) || defaultOrganizationId)
      return currentEvent.title && hasOrg
    }).length
  }, [parseResult, selectedEvents, editedEvents, eventOrganizations, defaultOrganizationId])

  const toggleSelectAll = useCallback(() => {
    if (!parseResult) return
    if (selectedEvents.size === parseResult.events.length) {
      setSelectedEvents(new Set())
    } else {
      setSelectedEvents(new Set(parseResult.events.map((_, i) => i)))
    }
  }, [parseResult, selectedEvents.size])

  const updateField = useCallback((index: number, field: keyof ParsedEvent, value: string | number | undefined) => {
    setEditedEvents((prev) => {
      const newMap = new Map(prev)
      newMap.set(index, { ...(newMap.get(index) || {}), [field]: value })
      return newMap
    })
  }, [])

  const updateOrganization = useCallback((index: number, value: string) => {
    setEventOrganizations((prev) => {
      const newMap = new Map(prev)
      if (value) newMap.set(index, value)
      else newMap.delete(index)
      return newMap
    })
  }, [])

  const toggleSelection = useCallback((index: number) => {
    setSelectedEvents((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(index)) newSet.delete(index)
      else newSet.add(index)
      return newSet
    })
  }, [])

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className={cn(
          'flex flex-col p-0 gap-0',
          step === 'preview' ? 'w-[95vw] max-w-6xl h-[85vh]' : 'w-full max-w-md'
        )}
        style={{ overscrollBehavior: 'contain' }}
      >
        {/* Header */}
        <DialogHeader className="px-6 py-5 border-b shrink-0 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">Import Events</DialogTitle>
                <DialogDescription className="text-sm">
                  {step === 'upload' && 'Upload an Excel file to bulk import events'}
                  {step === 'preview' && 'Review and edit data before importing'}
                  {step === 'importing' && 'Please wait while events are being created…'}
                  {step === 'complete' && 'Import completed'}
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={handleClose}
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <StepIndicator currentStep={step} />
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {/* Upload Step */}
          {step === 'upload' && (
            <div className="p-6 space-y-4">
              <FileUpload
                accept={{
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                  'application/vnd.ms-excel': ['.xls']
                }}
                maxSize={10 * 1024 * 1024}
                maxFiles={1}
                onChange={handleFileChange}
                placeholder="Drop Excel file here or click to browse…"
                className="bg-background w-full min-h-[200px]"
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Upload className="h-3.5 w-3.5" />
                <span>Supports .xlsx and .xls files up to 10&nbsp;MB</span>
              </div>
            </div>
          )}

          {/* Preview Step */}
          {step === 'preview' && parseResult && (
            <div className="h-full flex flex-col">
              {/* Toolbar */}
              <div className="px-4 py-3 border-b bg-muted/30 flex flex-wrap items-center gap-4 shrink-0">
                <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                  <Label htmlFor="default-org" className="text-sm font-medium whitespace-nowrap">
                    Default Organization
                  </Label>
                  <Select value={defaultOrganizationId} onValueChange={setDefaultOrganizationId}>
                    <SelectTrigger id="default-org" className="h-9 w-[200px]">
                      <SelectValue placeholder="Select organization…" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={String(org.id)}>
                          {org.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono">
                      {selectedEvents.size}
                    </Badge>
                    <span className="text-sm text-muted-foreground">selected</span>
                    <span className="text-muted-foreground/50">·</span>
                    <Badge variant="outline" className="font-mono text-green-600 border-green-200 bg-green-50">
                      {validSelectedCount}
                    </Badge>
                    <span className="text-sm text-muted-foreground">ready</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="h-8">
                    {selectedEvents.size === parseResult.events.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
              </div>

              {/* Table */}
              <ScrollArea className="flex-1">
                <Table>
                  <TableHeader className="bg-background sticky top-0 z-10">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-12 text-center">&nbsp;</TableHead>
                      <TableHead className="min-w-[200px]">Title</TableHead>
                      <TableHead className="w-[140px]">Date</TableHead>
                      <TableHead className="w-[150px]">Location</TableHead>
                      <TableHead className="w-[100px]">Format</TableHead>
                      <TableHead className="w-[180px]">Organization</TableHead>
                      <TableHead className="w-16 text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedIndices.map((index) => {
                      const event = parseResult.events[index]
                      const edits = editedEvents.get(index) || {}
                      const currentEvent = { ...event, ...edits }
                      const isSelected = selectedEvents.has(index)
                      const hasOrg = !!(eventOrganizations.get(index) || defaultOrganizationId)
                      const isValid = currentEvent.title && hasOrg

                      return (
                        <TableRow
                          key={index}
                          className={cn(
                            'transition-colors',
                            !isSelected && 'opacity-40 bg-muted/10',
                            isSelected && !isValid && 'bg-amber-50/50 dark:bg-amber-950/20'
                          )}
                        >
                          <TableCell className="text-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelection(index)}
                              aria-label={`Select row ${index + 1}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={currentEvent.title}
                              onChange={(e) => updateField(index, 'title', e.target.value)}
                              className={cn('h-8', !currentEvent.title && 'border-destructive focus-visible:ring-destructive')}
                              aria-label="Event title"
                              aria-invalid={!currentEvent.title}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={currentEvent.formattedDates || currentEvent.dates || ''}
                              onChange={(e) => updateField(index, 'formattedDates', e.target.value)}
                              className="h-8"
                              aria-label="Event date"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={currentEvent.location || ''}
                              onChange={(e) => updateField(index, 'location', e.target.value)}
                              className="h-8"
                              placeholder="Enter location…"
                              aria-label="Event location"
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={String(currentEvent.format)}
                              onValueChange={(v) => updateField(index, 'format', parseInt(v))}
                            >
                              <SelectTrigger className="h-8" aria-label="Event format">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">Online</SelectItem>
                                <SelectItem value="2">In-Person</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={eventOrganizations.get(index) || ''}
                              onValueChange={(v) => updateOrganization(index, v)}
                            >
                              <SelectTrigger
                                className={cn('h-8', !hasOrg && isSelected && 'border-amber-500 text-amber-700')}
                                aria-label="Organization"
                                aria-invalid={!hasOrg && isSelected}
                              >
                                <SelectValue placeholder={event.normalizedOrganization || 'Select…'} />
                              </SelectTrigger>
                              <SelectContent>
                                {organizations.map((org) => (
                                  <SelectItem key={org.id} value={String(org.id)}>
                                    {org.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-center">
                            {isSelected ? (
                              isValid ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" aria-label="Valid" />
                              ) : (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <AlertTriangle
                                        className="h-4 w-4 text-amber-500 mx-auto"
                                        aria-label="Missing required fields"
                                      />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Missing title or organization</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )
                            ) : (
                              <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/20 mx-auto" />
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t bg-background shrink-0">
                  <p className="text-sm text-muted-foreground font-variant-numeric: tabular-nums">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                    {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="px-3 text-sm font-medium tabular-nums">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Importing Step */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center p-8 space-y-6 min-h-[300px]">
              <div className="relative">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
              </div>
              <div className="text-center space-y-3 w-full max-w-xs">
                <h3 className="text-lg font-semibold">Creating Events…</h3>
                <Progress value={importProgress} className="h-2 w-full" />
                <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
                  {importProgress}% complete
                </p>
              </div>
            </div>
          )}

          {/* Complete Step */}
          {step === 'complete' && (
            <div className="p-6 space-y-6">
              {/* Result Summary */}
              <div className="text-center space-y-4">
                {importResults.failed === 0 ? (
                  <div className="mx-auto h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                ) : (
                  <div className="mx-auto h-16 w-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                    <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-semibold">
                    {importResults.failed === 0 ? 'All Events Imported' : 'Import Completed with Errors'}
                  </h3>
                  <p className="text-muted-foreground mt-1">
                    <span className="font-medium text-foreground">{importResults.success}</span> events created
                    {importResults.failed > 0 && (
                      <>
                        {' · '}
                        <span className="font-medium text-destructive">{importResults.failed}</span> failed
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Error List */}
              {importResults.failed > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-destructive/5 px-4 py-3 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      Failed Events ({importResults.failed})
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleDownloadErrorReport}>
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Download Report
                    </Button>
                  </div>
                  <ScrollArea className="h-[180px]">
                    <div className="divide-y">
                      {importResults.errors.map((err, i) => (
                        <div key={i} className="px-4 py-3 flex gap-3">
                          <span className="font-mono text-xs text-muted-foreground shrink-0 tabular-nums">
                            Row&nbsp;{err.row}
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{err.title || 'Untitled Event'}</p>
                            <p className="text-xs text-destructive truncate">{err.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/30 shrink-0">
          {step === 'upload' && (
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          )}

          {step === 'preview' && (
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep('upload')}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={validSelectedCount === 0}>
                  Import {validSelectedCount} Events
                </Button>
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div className="flex items-center justify-between">
              {importResults.success > 0 ? (
                <Button
                  variant="outline"
                  onClick={handleUndo}
                  disabled={isUndoing}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                >
                  {isUndoing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Undo2 className="h-4 w-4 mr-2" />}
                  Undo Import
                </Button>
              ) : (
                <div />
              )}
              <Button onClick={handleClose}>Done</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
