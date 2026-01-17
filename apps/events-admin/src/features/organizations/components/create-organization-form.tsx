import { Suspense, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useSuspenseQuery } from '@connectrpc/connect-query'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { createOrganization, listOrganizationTypes, OrganizationStatus } from '@repo/proto'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@repo/ui/components/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@repo/ui/components/form'
import { Input } from '@repo/ui/components/input'
import { Button } from '@repo/ui/components/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@repo/ui/components/select'
import { Textarea } from '@repo/ui/components/textarea'
import { handleServerErrors, clearServerError } from '@/lib/form-utils'

// ============================================================================
// FORM SCHEMA
// ============================================================================

const createOrganizationSchema = z.object({
  title: z
    .string()
    .min(2, 'Title must be at least 2 characters')
    .max(100, 'Title must be less than 100 characters'),
  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),
  organizationTypeId: z.coerce.number().min(1, 'Organization type is required'),
  status: z.nativeEnum(OrganizationStatus).default(OrganizationStatus.ACTIVE),
  // Social links
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  instagram: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  telegramChannel: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  telegramChat: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  youtube: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  tiktok: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  linkedin: z.string().url('Please enter a valid URL').optional().or(z.literal(''))
})

type CreateOrganizationFormData = z.infer<typeof createOrganizationSchema>

const defaultValues: Partial<CreateOrganizationFormData> = {
  title: '',
  description: '',
  organizationTypeId: 0,
  status: OrganizationStatus.ACTIVE,
  website: '',
  instagram: '',
  telegramChannel: '',
  telegramChat: '',
  youtube: '',
  tiktok: '',
  linkedin: ''
}

// ============================================================================
// SECTION HEADER COMPONENT
// ============================================================================

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-0.5">
      <h3 className="text-sm font-medium">{title}</h3>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  )
}

// ============================================================================
// COMPONENT
// ============================================================================

interface CreateOrganizationFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId?: number
  initialValues?: Partial<CreateOrganizationFormData>
}

export function CreateOrganizationForm({
  open,
  onOpenChange,
  organizationId,
  initialValues
}: CreateOrganizationFormProps) {
  const queryClient = useQueryClient()
  const isEditMode = !!organizationId

  const form = useForm<CreateOrganizationFormData>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: { ...defaultValues, ...initialValues },
    mode: 'onBlur'
  })

  const { isDirty } = form.formState

  const orgTypesQuery = useSuspenseQuery(listOrganizationTypes, { page: 1, limit: 1000 })
  const organizationTypes = orgTypesQuery.data.organizationTypes

  const createMutation = useMutation(createOrganization, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connect-query'] })
      toast.success('Organization created!')
      onOpenChange(false)
      form.reset()
    },
    onError: (error) => {
      handleServerErrors(form, error)
    }
  })

  const isSubmitting = createMutation.isPending

  const handleSubmit = form.handleSubmit(async (data) => {
    await createMutation.mutateAsync({
      title: data.title,
      description: data.description || undefined,
      organizationTypeId: data.organizationTypeId,
      status: data.status,
      imageUrl: undefined,
      website: data.website || undefined,
      instagram: data.instagram || undefined,
      telegramChannel: data.telegramChannel || undefined,
      telegramChat: data.telegramChat || undefined,
      youtube: data.youtube || undefined,
      tiktok: data.tiktok || undefined,
      linkedin: data.linkedin || undefined
    })
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] w-[min(800px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden p-0"
        style={{ overscrollBehavior: 'contain' }}
        showCloseButton={false}
      >
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>{isEditMode ? 'Edit Organization' : 'Create Organization'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <div className="grid gap-6 p-6 md:grid-cols-2">
                {/* LEFT COLUMN: Basic Info */}
                <div className="space-y-6">
                  {/* Basic Info Section */}
                  <fieldset className="space-y-4 rounded-lg border bg-muted/30 p-4">
                    <legend className="sr-only">Basic Information</legend>
                    <SectionHeader title="Basic Information" />

                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Student Council..."
                              {...field}
                              onChange={(e) => {
                                field.onChange(e)
                                clearServerError(form, 'title')
                              }}
                            />
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
                            <Textarea
                              placeholder="What does this organization do?"
                              className="min-h-[100px] resize-none"
                              {...field}
                            />
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
                            <FormLabel>Type</FormLabel>
                            <Select
                              onValueChange={(v) => field.onChange(Number(v))}
                              value={field.value ? String(field.value) : ''}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {organizationTypes.map((type) => (
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
                            <Select
                              onValueChange={(v) => field.onChange(Number(v))}
                              value={String(field.value)}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status..." />
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
                  </fieldset>
                </div>

                {/* RIGHT COLUMN: Social Links */}
                <div className="space-y-6">
                  <fieldset className="space-y-4 rounded-lg border bg-muted/30 p-4">
                    <legend className="sr-only">Social Links</legend>
                    <SectionHeader title="Social Links" description="Optional social profiles and website" />

                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com" {...field} />
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

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="telegramChannel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telegram Channel</FormLabel>
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
                            <FormLabel>Telegram Chat</FormLabel>
                            <FormControl>
                              <Input placeholder="https://t.me/..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

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
                  </fieldset>
                </div>
              </div>
            </div>

            <DialogFooter className="shrink-0 border-t px-6 py-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || (!isDirty && !isEditMode)}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Save Changes' : 'Create Organization'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// TRIGGER WRAPPER COMPONENT
// ============================================================================

interface CreateOrganizationTriggerProps {
  children: React.ReactNode
}

export function CreateOrganizationTrigger({ children }: CreateOrganizationTriggerProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div onClick={() => setIsOpen(true)}>{children}</div>
      <Suspense fallback={null}>
        <CreateOrganizationForm open={isOpen} onOpenChange={setIsOpen} />
      </Suspense>
    </>
  )
}
