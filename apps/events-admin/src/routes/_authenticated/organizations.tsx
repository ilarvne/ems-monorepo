import { useSuspenseQuery } from '@connectrpc/connect-query'
import { createOrganization, listOrganizationTypes, listOrganizations, OrganizationStatus } from '@repo/proto'
import { createFileRoute } from '@tanstack/react-router'
import { PlusIcon, FilterIcon } from 'lucide-react'
import { parseAsArrayOf, parseAsInteger, useQueryState } from 'nuqs'
import { useState } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@connectrpc/connect-query'
import { useQueryClient } from '@tanstack/react-query'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/form'
import { Input } from '@repo/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select'
import { Textarea } from '@repo/ui/components/textarea'
import { useForm } from 'react-hook-form'

import { Button } from '@repo/ui/components/button'
import { Checkbox } from '@repo/ui/components/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/popover'

import { DataTable, useDataTableState } from '@/components/admin-data-table'
import { columns } from '@/features/organizations/organizations.columns'

export const Route = createFileRoute('/_authenticated/organizations')({
  component: Organizations
})

// Status filter options
const statusOptions = [
  { value: OrganizationStatus.ACTIVE, label: 'Active' },
  { value: OrganizationStatus.ARCHIVED, label: 'Archived' },
  { value: OrganizationStatus.FROZEN, label: 'Frozen' }
]

const createOrganizationSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional(),
  organizationTypeId: z.coerce.number().min(1, 'Category is required'),
  instagram: z.string().optional(),
  telegramChannel: z.string().optional(),
  telegramChat: z.string().optional(),
  website: z.string().optional(),
  youtube: z.string().optional(),
  tiktok: z.string().optional(),
  linkedin: z.string().optional(),
  status: z.nativeEnum(OrganizationStatus).default(OrganizationStatus.ACTIVE),
})

type CreateOrganizationFormData = z.infer<typeof createOrganizationSchema>

function Organizations() {
  const queryClient = useQueryClient()
  const { tableState } = useDataTableState({ defaultSortBy: 'title', defaultSortDesc: false })

  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const { data: orgTypesData } = useSuspenseQuery(listOrganizationTypes, {
    page: 1,
    limit: 1000,
  })

  const form = useForm<CreateOrganizationFormData>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      title: '',
      description: '',
      organizationTypeId: 0,
      status: OrganizationStatus.ACTIVE,
    },
    mode: 'onBlur',
  })

  const createMutation = useMutation(createOrganization, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connect-query'] })
      setIsCreateOpen(false)
      form.reset()
    },
  })

  // Additional filter state for status
  const [statusFilter, setStatusFilter] = useQueryState('status', parseAsArrayOf(parseAsInteger).withDefault([]))

  // When filters are active, fetch all data for client-side filtering
  const hasActiveFilters = Boolean(tableState.search) || statusFilter.length > 0

  const { data } = useSuspenseQuery(listOrganizations, {
    limit: hasActiveFilters ? 1000 : tableState.pageSize,
    page: hasActiveFilters ? 1 : tableState.page
  })

  const handleStatusChange = (checked: boolean, value: number) => {
    const newValues = statusFilter ? [...statusFilter] : []
    if (checked) {
      newValues.push(value)
    } else {
      const index = newValues.indexOf(value)
      if (index > -1) {
        newValues.splice(index, 1)
      }
    }
    setStatusFilter(newValues.length ? newValues : null)
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Organizations</h1>
          <p className="text-muted-foreground mt-1">Manage organizations</p>
        </div>
      </div>

      <DataTable
        data={data.organizations}
        columns={columns}
        totalCount={data.total || 0}
        hasActiveFilters={hasActiveFilters}
        searchColumnId="title"
        searchPlaceholder="Search organizations..."
        entityName="organizations"
        defaultSortBy="title"
        defaultSortDesc={false}
        filterComponents={
          <StatusFilter
            statusOptions={statusOptions}
            selectedValues={statusFilter}
            onFilterChange={handleStatusChange}
          />
        }
         toolbarActions={
           <Button className="ml-auto" onClick={() => setIsCreateOpen(true)}>
             <PlusIcon aria-hidden="true" className="-ms-1 opacity-60" size={16} />
             Add organization
           </Button>
         }
       />

       <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
         <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
           <DialogHeader>
             <DialogTitle>Create organization</DialogTitle>
             <DialogDescription>Add a new organization to the system.</DialogDescription>
           </DialogHeader>

           <Form {...form}>
             <form
               onSubmit={form.handleSubmit((values) => {
                 createMutation.mutate({
                   title: values.title,
                   description: values.description || undefined,
                   organizationTypeId: values.organizationTypeId,
                   instagram: values.instagram || undefined,
                   telegramChannel: values.telegramChannel || undefined,
                   telegramChat: values.telegramChat || undefined,
                   website: values.website || undefined,
                   youtube: values.youtube || undefined,
                   tiktok: values.tiktok || undefined,
                   linkedin: values.linkedin || undefined,
                   status: values.status,
                   imageUrl: undefined,
                 })
               })}
               className="space-y-6"
             >
               <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                 <div className="space-y-1">
                   <div className="text-sm font-medium">Basics</div>
                   <div className="text-sm text-muted-foreground">Name, category, and status.</div>
                 </div>

                 <FormField
                   control={form.control}
                   name="title"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Title</FormLabel>
                       <FormControl>
                         <Input placeholder="Student Council" {...field} />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />

                 <FormField
                   control={form.control}
                   name="description"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Description</FormLabel>
                       <FormControl>
                         <Textarea placeholder="What does this organization do?" className="min-h-[90px]" {...field} />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />

                 <div className="grid gap-4 sm:grid-cols-2">
                   <FormField
                     control={form.control}
                     name="organizationTypeId"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Category</FormLabel>
                         <Select onValueChange={field.onChange} value={String(field.value || '')}>
                           <FormControl>
                             <SelectTrigger>
                               <SelectValue placeholder="Select category" />
                             </SelectTrigger>
                           </FormControl>
                           <SelectContent>
                             {orgTypesData.organizationTypes.map((type) => (
                               <SelectItem key={type.id} value={String(type.id)}>
                                 {type.title}
                               </SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                         <FormMessage />
                       </FormItem>
                     )}
                   />

                   <FormField
                     control={form.control}
                     name="status"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Status</FormLabel>
                         <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)}>
                           <FormControl>
                             <SelectTrigger>
                               <SelectValue placeholder="Select status" />
                             </SelectTrigger>
                           </FormControl>
                           <SelectContent>
                             <SelectItem value={String(OrganizationStatus.ACTIVE)}>Active</SelectItem>
                             <SelectItem value={String(OrganizationStatus.ARCHIVED)}>Archived</SelectItem>
                             <SelectItem value={String(OrganizationStatus.FROZEN)}>Frozen</SelectItem>
                           </SelectContent>
                         </Select>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                 </div>
               </div>

               <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                 <div className="space-y-1">
                   <div className="text-sm font-medium">Links</div>
                   <div className="text-sm text-muted-foreground">Optional social profiles.</div>
                 </div>

                 <div className="grid gap-4 sm:grid-cols-2">
                   <FormField
                     control={form.control}
                     name="website"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Website</FormLabel>
                         <FormControl>
                           <Input placeholder="https://..." {...field} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />

                   <FormField
                     control={form.control}
                     name="instagram"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Instagram</FormLabel>
                         <FormControl>
                           <Input placeholder="https://instagram.com/..." {...field} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />

                   <FormField
                     control={form.control}
                     name="telegramChannel"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Telegram channel</FormLabel>
                         <FormControl>
                           <Input placeholder="https://t.me/..." {...field} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />

                   <FormField
                     control={form.control}
                     name="telegramChat"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Telegram chat</FormLabel>
                         <FormControl>
                           <Input placeholder="https://t.me/..." {...field} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />

                   <FormField
                     control={form.control}
                     name="youtube"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>YouTube</FormLabel>
                         <FormControl>
                           <Input placeholder="https://youtube.com/..." {...field} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />

                   <FormField
                     control={form.control}
                     name="tiktok"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>TikTok</FormLabel>
                         <FormControl>
                           <Input placeholder="https://tiktok.com/@..." {...field} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />

                   <FormField
                     control={form.control}
                     name="linkedin"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>LinkedIn</FormLabel>
                         <FormControl>
                           <Input placeholder="https://linkedin.com/..." {...field} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                 </div>

                 <FormDescription>
                   Image upload is not wired yet (backend expects `image_url`).
                 </FormDescription>
               </div>

               <DialogFooter>
                 <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                   Cancel
                 </Button>
                 <Button type="submit" disabled={createMutation.isPending}>
                   Create
                 </Button>
               </DialogFooter>
             </form>
           </Form>
         </DialogContent>
       </Dialog>
    </div>
  )
}

// Status filter component
function StatusFilter({
  statusOptions,
  selectedValues,
  onFilterChange
}: {
  statusOptions: { value: number; label: string }[]
  selectedValues: number[]
  onFilterChange: (checked: boolean, value: number) => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <FilterIcon aria-hidden="true" className="-ms-1 opacity-60" size={16} />
          Status
          {selectedValues.length > 0 && (
            <span className="-me-1 inline-flex h-5 max-h-full items-center rounded border bg-background px-1 font-[inherit] font-medium text-[0.625rem] text-muted-foreground/70">
              {selectedValues.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto min-w-36 p-3">
        <div className="space-y-3">
          <div className="font-medium text-muted-foreground text-xs">Filter by status</div>
          <div className="space-y-3">
            {statusOptions.map((option) => (
              <label key={option.value} className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={selectedValues.includes(option.value)}
                  onCheckedChange={(checked) => onFilterChange(!!checked, option.value)}
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
