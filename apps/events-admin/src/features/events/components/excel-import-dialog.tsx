'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation } from '@connectrpc/connect-query'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, Download, Undo2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import * as XLSX from 'xlsx'

import { createEvent, listOrganizations, deleteEvent } from '@repo/proto'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/dialog'
import { Button } from '@repo/ui/components/button'
import { ScrollArea } from '@repo/ui/components/scroll-area'
import { Progress } from '@repo/ui/components/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select'
import { Label } from '@repo/ui/components/label'
import { Checkbox } from '@repo/ui/components/checkbox'
import { Input } from '@repo/ui/components/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/ui/components/tooltip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/table'

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

const ITEMS_PER_PAGE = 50

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
    errors: [],
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [isUndoing, setIsUndoing] = useState(false)

  // Queries & Mutations
  const { data: orgsData } = useQuery(listOrganizations, { page: 1, limit: 100 })
  const organizations = orgsData?.organizations || []
  
  const createMutation = useMutation(createEvent)
  const deleteMutation = useMutation(deleteEvent)

  // Build organization lookup
  const orgNameToId = new Map<string, number>()
  organizations.forEach((org) => {
    orgNameToId.set(org.title.toLowerCase(), org.id)
    orgNameToId.set(org.title, org.id)
  })
  
  const findOrgIdByName = useCallback((name: string | null | undefined): string | null => {
    if (!name) return null
    const id = orgNameToId.get(name) || orgNameToId.get(name.toLowerCase())
    return id ? String(id) : null
  }, [orgNameToId])

  // Handlers
  const handleFileChange = async (files: File[]) => {
    if (files.length === 0) return
    const file = files[0]
    
    // Manual MIME check as fallback
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
  }

  const handleImport = async () => {
    if (!parseResult) return

    const selectedIndices = Array.from(selectedEvents)
    if (selectedIndices.length === 0) {
      toast.error('Selection Empty', { description: 'Please select at least one event to import' })
      return
    }
    
    const missingOrgs = selectedIndices.filter((index) => {
      return !eventOrganizations.has(index) && !defaultOrganizationId
    })
    if (missingOrgs.length > 0) {
      toast.error('Missing Organizations', { description: `${missingOrgs.length} events need an organization assigned.` })
      return
    }

    setStep('importing')
    setImportProgress(0)
    
    const results: ImportResult = { success: 0, failed: 0, createdIds: [], errors: [] }
    const mergedEvents = parseResult.events.map((event, i) => ({ ...event, ...(editedEvents.get(i) || {}) }))

    // Process sequentially to maintain order and allow progress tracking
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
  }

  const handleUndo = async () => {
    if (importResults.createdIds.length === 0) return
    
    setIsUndoing(true)
    let undoneCount = 0
    
    try {
      await Promise.all(importResults.createdIds.map(id => deleteMutation.mutateAsync({ id })))
      undoneCount = importResults.createdIds.length
      toast.success('Import Undone', { description: `Successfully removed ${undoneCount} created events.` })
      handleClose()
    } catch {
      toast.error('Undo Partial/Failed', { description: 'Some events could not be removed. Please check manually.' })
    } finally {
      setIsUndoing(false)
    }
  }

  const handleDownloadErrorReport = () => {
    if (importResults.errors.length === 0) return

    // Prepare CSV data
    const csvData = importResults.errors.map(err => ({
      'Row Number': err.row,
      'Event Title': err.title,
      'Error Reason': err.reason,
      ...err.originalData // Include original data for context
    }))

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(csvData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Import Errors')
    
    // Download
    XLSX.writeFile(wb, `import-errors-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const handleClose = () => {
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
  }

  // Pagination Logic
  const totalItems = parseResult?.events.length || 0
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)
  const paginatedIndices = parseResult?.events
    .map((_, i) => i)
    .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE) || []

  // Toggle selection
  const toggleSelectAll = () => {
    if (!parseResult) return
    if (selectedEvents.size === parseResult.events.length) {
      setSelectedEvents(new Set())
    } else {
      setSelectedEvents(new Set(parseResult.events.map((_, i) => i)))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className={cn(
        "flex flex-col p-0 gap-0 transition-all duration-200",
        step === 'preview' 
          ? "w-[95vw] sm:max-w-[1600px] h-[90vh]" 
          : "w-full max-w-lg sm:max-w-lg rounded-lg border"
      )}>
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {step === 'upload' && 'Import Events from Excel'}
            {step === 'preview' && 'Review & Map Data'}
            {step === 'importing' && 'Importing Events...'}
            {step === 'complete' && 'Import Complete'}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload a spreadsheet to bulk create events. Supports .xlsx and .xls up to 10MB.'}
            {step === 'preview' && 'Review the data below. Edit values inline or download an error report if needed.'}
            {step === 'importing' && <span aria-live="polite">Processing {importProgress}%... Do not close this window.</span>}
            {step === 'complete' && 'Review the results of your import below.'}
          </DialogDescription>
        </DialogHeader>

        {/* Content Area */}
        <div className={cn(
          "flex-1 relative overflow-hidden bg-muted/5",
          step !== 'preview' && "min-h-0" 
        )}>
          {step === 'upload' && (
            <div className="p-6">
              <FileUpload 
                accept={{ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] }}
                maxSize={10 * 1024 * 1024} // 10MB
                maxFiles={1}
                onChange={handleFileChange}
                placeholder="Drag & drop Excel file here"
                className="bg-background w-full"
              />
            </div>
          )}

          {step === 'preview' && parseResult && (
            <div className="h-full flex flex-col">
              {/* Toolbar */}
              <div className="px-6 py-3 border-b bg-background flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-4 flex-1">
                  <div className="grid gap-1.5 flex-1 max-w-sm">
                    <Label htmlFor="default-org" className="text-xs font-medium text-muted-foreground">Fallback Organization</Label>
                    <Select value={defaultOrganizationId} onValueChange={setDefaultOrganizationId}>
                      <SelectTrigger id="default-org" className="h-8 text-xs">
                        <SelectValue placeholder="Select fallback..." />
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
                  
                  <div className="h-8 w-px bg-border mx-2" />
                  
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium">{selectedEvents.size}</span> selected
                    <span className="text-muted-foreground">/ {parseResult.events.length} total</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="h-8 text-xs">
                    {selectedEvents.size === parseResult.events.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
              </div>

              {/* Data Table */}
              <div className="flex-1 overflow-auto">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-[40px] text-center">#</TableHead>
                      <TableHead className="w-[250px]">Title</TableHead>
                      <TableHead className="w-[120px]">Dates</TableHead>
                      <TableHead className="w-[150px]">Location</TableHead>
                      <TableHead className="w-[100px]">Format</TableHead>
                      <TableHead className="w-[200px]">Organization</TableHead>
                      <TableHead className="w-[50px] text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedIndices.map((index) => {
                      const event = parseResult.events[index]
                      const edits = editedEvents.get(index) || {}
                      const currentEvent = { ...event, ...edits }
                      const isSelected = selectedEvents.has(index)
                      const hasOrg = !!(eventOrganizations.get(index) || defaultOrganizationId)
                      
                      // Row Validation Logic
                      const isValid = currentEvent.title && hasOrg
                      
                      const updateField = (field: keyof ParsedEvent, value: string | number | undefined) => {
                        const newMap = new Map(editedEvents)
                        newMap.set(index, { ...(newMap.get(index) || {}), [field]: value })
                        setEditedEvents(newMap)
                      }

                      return (
                        <TableRow key={index} className={cn(!isSelected && "opacity-50 bg-muted/20")}>
                          <TableCell className="text-center p-2">
                            <Checkbox 
                              checked={isSelected}
                              onCheckedChange={() => {
                                const newSet = new Set(selectedEvents)
                                if (isSelected) newSet.delete(index)
                                else newSet.add(index)
                                setSelectedEvents(newSet)
                              }}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input 
                              value={currentEvent.title} 
                              onChange={(e) => updateField('title', e.target.value)}
                              className={cn("h-7 text-xs", !currentEvent.title && "border-destructive")}
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input 
                              value={currentEvent.formattedDates || currentEvent.dates || ''} 
                              onChange={(e) => updateField('formattedDates', e.target.value)}
                              className="h-7 text-xs"
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input 
                              value={currentEvent.location || ''} 
                              onChange={(e) => updateField('location', e.target.value)}
                              className="h-7 text-xs"
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Select 
                              value={String(currentEvent.format)} 
                              onValueChange={(v) => updateField('format', parseInt(v))}
                            >
                              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">Online</SelectItem>
                                <SelectItem value="2">In-Person</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="p-2">
                            <Select 
                              value={eventOrganizations.get(index) || ''} 
                              onValueChange={(v) => {
                                const newMap = new Map(eventOrganizations)
                                if (v) newMap.set(index, v)
                                else newMap.delete(index)
                                setEventOrganizations(newMap)
                              }}
                            >
                              <SelectTrigger className={cn("h-7 text-xs", !hasOrg && isSelected && "border-warning text-warning-foreground")}>
                                <SelectValue placeholder={event.normalizedOrganization || "Select..."} />
                              </SelectTrigger>
                              <SelectContent>
                                {organizations.map(org => (
                                  <SelectItem key={org.id} value={String(org.id)}>{org.title}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-center p-2">
                            {isSelected ? (
                              isValid ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                              ) : (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <AlertTriangle className="h-4 w-4 text-amber-500 mx-auto" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Missing required fields (Title or Organization)</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )
                            ) : (
                              <div className="h-4 w-4 rounded-full border border-muted-foreground/30 mx-auto" />
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-2 border-t bg-background shrink-0">
                  <div className="text-xs text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8" 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8" 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center p-8 space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                <Loader2 className="h-16 w-16 text-primary animate-spin relative" />
              </div>
              <div className="text-center space-y-2 w-full max-w-xs">
                <h3 className="text-lg font-medium">Importing Events</h3>
                <Progress value={importProgress} className="h-2 w-full" />
                <p className="text-xs text-muted-foreground text-center" aria-live="polite">
                  {importProgress}% complete
                </p>
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div className="flex flex-col items-center justify-center p-8">
              <div className="w-full space-y-8">
                <div className="text-center space-y-4">
                  {importResults.failed === 0 ? (
                    <div className="mx-auto h-20 w-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                    </div>
                  ) : (
                    <div className="mx-auto h-20 w-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                      <AlertTriangle className="h-10 w-10 text-amber-600 dark:text-amber-400" />
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-2xl font-semibold">Import Complete</h3>
                    <p className="text-muted-foreground mt-1">
                      {importResults.success} events created successfully.
                      {importResults.failed > 0 && ` ${importResults.failed} events failed.`}
                    </p>
                  </div>
                </div>

                {/* Error Summary Box */}
                {importResults.failed > 0 && (
                  <div className="border rounded-lg bg-background overflow-hidden">
                    <div className="bg-destructive/5 px-4 py-3 border-b border-destructive/10 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        Failed Rows ({importResults.failed})
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-xs hover:bg-destructive/10 text-destructive"
                        onClick={handleDownloadErrorReport}
                      >
                        <Download className="h-3 w-3 mr-1.5" />
                        Download Report
                      </Button>
                    </div>
                    <ScrollArea className="h-[150px]">
                      <div className="divide-y">
                        {importResults.errors.map((err, i) => (
                          <div key={i} className="px-4 py-3 text-sm flex gap-3">
                            <span className="font-mono text-xs text-muted-foreground shrink-0 mt-0.5">Row {err.row}</span>
                            <div className="space-y-0.5">
                              <p className="font-medium leading-none">{err.title || 'Untitled Event'}</p>
                              <p className="text-xs text-destructive">{err.reason}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t bg-background shrink-0">
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
          )}
          
          {step === 'preview' && (
            <div className="flex items-center justify-between w-full">
              <Button variant="ghost" onClick={() => setStep('upload')}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button onClick={handleImport} disabled={selectedEvents.size === 0}>
                  Import {selectedEvents.size} Events
                </Button>
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div className="flex items-center justify-between w-full">
              {importResults.success > 0 ? (
                <Button 
                  variant="outline" 
                  onClick={handleUndo} 
                  disabled={isUndoing}
                  className="text-destructive hover:bg-destructive/10 border-destructive/20"
                >
                  {isUndoing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Undo2 className="h-4 w-4 mr-2" />}
                  Undo Import
                </Button>
              ) : <div />}
              
              <Button onClick={handleClose}>Done</Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
