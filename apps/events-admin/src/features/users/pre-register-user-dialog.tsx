import { useMutation } from '@connectrpc/connect-query'
import { useQueryClient } from '@tanstack/react-query'
import { PlatformRole, preRegisterUser } from '@repo/proto'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@repo/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@repo/ui/components/dialog'
import { Input } from '@repo/ui/components/input'
import { Label } from '@repo/ui/components/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/components/select'

interface PreRegisterUserDialogProps {
  children: React.ReactNode
}

export function PreRegisterUserDialog({ children }: PreRegisterUserDialogProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'staff' | 'admin'>('staff')

  const queryClient = useQueryClient()

  const mutation = useMutation(preRegisterUser, {
    onSuccess: () => {
      toast.success('User pre-registered successfully')
      queryClient.invalidateQueries({ queryKey: ['connect-query'] })
      setOpen(false)
      setEmail('')
      setRole('staff')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to pre-register user')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.endsWith('@astanait.edu.kz')) {
      toast.error('Email must be an @astanait.edu.kz address')
      return
    }
    mutation.mutate({
      email,
      platformRole: role === 'admin' ? PlatformRole.ADMIN : PlatformRole.STAFF
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Pre-register User</DialogTitle>
            <DialogDescription>
              Pre-register an email address so they automatically get assigned a role when they first sign up.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@astanait.edu.kz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">Must be an @astanait.edu.kz email address</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Platform Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as 'staff' | 'admin')}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff - Can manage all clubs</SelectItem>
                  <SelectItem value="admin">Admin - Full system access</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Pre-registering...' : 'Pre-register'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
