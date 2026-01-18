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
  Check,
  X
} from 'lucide-react'
import * as XLSX from 'xlsx'

import { createEvent, listOrganizations, deleteEvent } from '@repo/proto'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@repo/ui/components/dialog'
import { Button } from '@repo/ui/components/button'
import { ScrollArea } from '@repo/ui/components/scroll-area'
import { Progress } from '@repo/ui/components/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/components/select'
import { Label } from '@repo/ui/components/label'
import { Checkbox } from '@repo/ui/components/checkbox'
import { Badge } from '@repo/ui/components/badge'

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

export function ExcelImportDialog({ open, onOpenChange }: ExcelImportDialogProps) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<ImportStep>('upload')
  const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null)
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
  const organizations = useMemo(() => orgsData?.organizations || [], [orgsData?.organizations])

  const createMutation = useMutation(createEvent)
  const deleteMutation = useMutation(deleteEvent)

  // Build organization lookup
  const orgNameToId = useMemo(() => {
    const map = new Map<string, number>()
    organizations.forEach((org) => {
      map.set(org.title.toLowerCase(), org.id)
      map.set(org.title, org.id)
    })
    return map
  }, [organizations])

  const orgIdToName = useMemo(() => {
    const map = new Map<number, string>()
    organizations.forEach((org) => map.set(org.id, org.title))
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
  const handleFileChange = async (files: File[]) => {
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

      // Auto-match organizations
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
  }

  const handleImport = async () => {
    if (!parseResult) return

    const selectedIndices = Array.from(selectedEvents)
    if (selectedIndices.length === 0) {
      toast.error('No events selected', { description: 'Select at least one event to import' })
      return
    }

    const missingOrgs = selectedIndices.filter((index) => {
      return !eventOrganizations.has(index) && !defaultOrganizationId
    })
    if (missingOrgs.length > 0) {
      toast.error('Missing organizations', {
        description: `${missingOrgs.length} events need an organization. Set a fallback or deselect them.`
      })
      return
    }

    setStep('importing')
    setImportProgress(0)

    const results: ImportResult = { success: 0, failed: 0, createdIds: [], errors: [] }

    for (let i = 0; i < selectedIndices.length; i++) {
      const index = selectedIndices[i]
      const event = parseResult.events[index]
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
  }

  const handleUndo = async () => {
    if (importResults.createdIds.length === 0) return

    setIsUndoing(true)

    try {
      await Promise.all(importResults.createdIds.map((id) => deleteMutation.mutateAsync({ id })))
      toast.success('Import undone', { description: `Removed ${importResults.createdIds.length} events` })
      handleClose()
    } catch {
      toast.error('Undo failed', { description: 'Some events could not be removed' })
    } finally {
      setIsUndoing(false)
    }
  }

  const handleDownloadErrorReport = () => {
    if (importResults.errors.length === 0) return

    const csvData = importResults.errors.map((err) => ({
      Row: err.row,
      Title: err.title,
      Error: err.reason
    }))

    const ws = XLSX.utils.json_to_sheet(csvData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Errors')
    XLSX.writeFile(wb, `import-errors-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const handleClose = () => {
    setStep('upload')
    setParseResult(null)
    setSelectedEvents(new Set())
    setDefaultOrganizationId('')
    setEventOrganizations(new Map())
    setImportProgress(0)
    setImportResults({ success: 0, failed: 0, createdIds: [], errors: [] })
    setCurrentPage(1)
    onOpenChange(false)
  }

  // Pagination
  const totalItems = parseResult?.events.length || 0
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)
  const paginatedIndices =
    parseResult?.events.map((_, i) => i).slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE) || []

  // Stats
  const matchedCount = useMemo(() => {
    if (!parseResult) return 0
    return Array.from(selectedEvents).filter((i) => eventOrganizations.has(i)).length
  }, [parseResult, selectedEvents, eventOrganizations])

  const unmatchedCount = selectedEvents.size - matchedCount

  const toggleSelectAll = () => {
    if (!parseResult) return
    if (selectedEvents.size === parseResult.events.length) {
      setSelectedEvents(new Set())
    } else {
      setSelectedEvents(new Set(parseResult.events.map((_, i) => i)))
    }
  }

  const getOrgDisplay = (index: number) => {
    const orgId = eventOrganizations.get(index)
    if (orgId) {
      return orgIdToName.get(parseInt(orgId)) || 'Unknown'
    }
    if (defaultOrganizationId) {
      return orgIdToName.get(parseInt(defaultOrganizationId)) || 'Fallback'
    }
    return null
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className={cn(
          '!grid-rows-[auto_1fr_auto] p-0 gap-0',
          step === 'preview' ? 'sm:max-w-3xl max-h-[80vh]' : 'sm:max-w-md'
        )}
      >
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            {step === 'upload' && 'Import Events'}
            {step === 'preview' && 'Review Import'}
            {step === 'importing' && 'Importing…'}
            {step === 'complete' && 'Import Complete'}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {step === 'upload' && 'Upload an Excel file (.xlsx, .xls) to bulk create events.'}
            {step === 'preview' && `${parseResult?.events.length || 0} events found. Review and select which to import.`}
            {step === 'importing' && (
              <span aria-live="polite">Processing {importProgress}%…</span>
            )}
            {step === 'complete' &&
              `${importResults.success} imported${importResults.failed > 0 ? `, ${importResults.failed} failed` : ''}`}
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="min-h-0 overflow-hidden">
          {/* Upload Step */}
          {step === 'upload' && (
            <div className="px-5 pb-5">
              <FileUpload
                accept={{
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                  'application/vnd.ms-excel': ['.xls']
                }}
                maxSize={10 * 1024 * 1024}
                maxFiles={1}
                onChange={handleFileChange}
                placeholder="Drop Excel file here or click to browse"
                className="h-32"
              />
            </div>
          )}

          {/* Preview Step */}
          {step === 'preview' && parseResult && (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Toolbar */}
              <div className="px-5 pb-3 flex items-center justify-between gap-3 border-b">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-medium tabular-nums">{selectedEvents.size}</span>
                    <span className="text-muted-foreground">selected</span>
                  </div>
                  {matchedCount > 0 && (
                    <Badge variant="secondary" className="text-xs font-normal gap-1">
                      <Check className="h-3 w-3" />
                      {matchedCount} matched
                    </Badge>
                  )}
                  {unmatchedCount > 0 && !defaultOrganizationId && (
                    <Badge variant="outline" className="text-xs font-normal gap-1 text-amber-600 border-amber-200">
                      <AlertTriangle className="h-3 w-3" />
                      {unmatchedCount} need org
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="h-7 text-xs">
                  {selectedEvents.size === parseResult.events.length ? 'Deselect all' : 'Select all'}
                </Button>
              </div>

              {/* Fallback Org Selector */}
              {unmatchedCount > 0 && (
                <div className="px-5 py-3 bg-muted/30 border-b">
                  <div className="flex items-center gap-3">
                    <Label htmlFor="fallback-org" className="text-xs text-muted-foreground whitespace-nowrap">
                      Fallback organization:
                    </Label>
                    <Select value={defaultOrganizationId} onValueChange={setDefaultOrganizationId}>
                      <SelectTrigger id="fallback-org" className="h-8 text-xs flex-1 max-w-xs">
                        <SelectValue placeholder="Select for unmatched events…" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={String(org.id)} className="text-xs">
                            {org.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Event List */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="divide-y">
                  {paginatedIndices.map((index) => {
                    const event = parseResult.events[index]
                    const isSelected = selectedEvents.has(index)
                    const orgDisplay = getOrgDisplay(index)
                    const hasOrg = !!orgDisplay

                    return (
                      <div
                        key={index}
                        className={cn(
                          'px-5 py-3 flex items-start gap-3 transition-colors',
                          !isSelected && 'opacity-50'
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => {
                            const newSet = new Set(selectedEvents)
                            if (isSelected) newSet.delete(index)
                            else newSet.add(index)
                            setSelectedEvents(newSet)
                          }}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{event.title || 'Untitled'}</span>
                            {isSelected && !hasOrg && (
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {event.formattedDates && <span>{event.formattedDates}</span>}
                            {event.formattedDates && event.location && <span>·</span>}
                            {event.location && <span className="truncate">{event.location}</span>}
                          </div>
                          {orgDisplay && (
                            <div className="text-xs text-muted-foreground">
                              <span className="text-foreground/70">{orgDisplay}</span>
                              {!eventOrganizations.has(index) && defaultOrganizationId && (
                                <span className="ml-1 text-muted-foreground">(fallback)</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0">
                          {event.format === 1 ? (
                            <Badge variant="secondary" className="text-xs font-normal">
                              Online
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs font-normal">
                              In-Person
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-5 py-2 border-t flex items-center justify-between">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {currentPage} / {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
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
            <div className="px-5 pb-5 flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <div className="w-full max-w-xs space-y-2">
                <Progress value={importProgress} className="h-1.5" />
                <p className="text-xs text-muted-foreground text-center tabular-nums" aria-live="polite">
                  {importProgress}% complete
                </p>
              </div>
            </div>
          )}

          {/* Complete Step */}
          {step === 'complete' && (
            <div className="px-5 pb-5">
              <div className="text-center py-6 space-y-3">
                {importResults.failed === 0 ? (
                  <div className="mx-auto h-12 w-12 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                ) : (
                  <div className="mx-auto h-12 w-12 rounded-full bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                )}
                <div>
                  <p className="font-medium">
                    {importResults.success} event{importResults.success !== 1 ? 's' : ''} imported
                  </p>
                  {importResults.failed > 0 && (
                    <p className="text-sm text-muted-foreground">{importResults.failed} failed</p>
                  )}
                </div>
              </div>

              {/* Error List */}
              {importResults.failed > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-muted/50 border-b flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {importResults.failed} failed
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={handleDownloadErrorReport}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Export
                    </Button>
                  </div>
                  <ScrollArea className="max-h-32">
                    <div className="divide-y">
                      {importResults.errors.map((err, i) => (
                        <div key={i} className="px-3 py-2 text-xs flex items-center gap-2">
                          <X className="h-3 w-3 text-destructive shrink-0" />
                          <span className="font-medium truncate">{err.title || 'Untitled'}</span>
                          <span className="text-muted-foreground truncate ml-auto">{err.reason}</span>
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
        <DialogFooter className="px-5 py-4 border-t">
          {step === 'upload' && (
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
          )}

          {step === 'preview' && (
            <>
              <Button variant="ghost" onClick={() => setStep('upload')}>
                Back
              </Button>
              <div className="flex-1" />
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={selectedEvents.size === 0 || (unmatchedCount > 0 && !defaultOrganizationId)}
              >
                Import {selectedEvents.size}
              </Button>
            </>
          )}

          {step === 'complete' && (
            <>
              {importResults.success > 0 && (
                <Button variant="ghost" onClick={handleUndo} disabled={isUndoing} className="text-destructive">
                  {isUndoing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Undo2 className="h-4 w-4 mr-1.5" />}
                  Undo
                </Button>
              )}
              <div className="flex-1" />
              <Button onClick={handleClose}>Done</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
