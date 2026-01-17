import { useMutation } from '@connectrpc/connect-query'
import { useQueryClient } from '@tanstack/react-query'
import { PlatformRole, assignPlatformRole, type User } from '@repo/proto'
import { useState } from 'react'
import { toast } from 'sonner'
import { ShieldIcon } from 'lucide-react'

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
import { Label } from '@repo/ui/components/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/components/select'

interface AssignRoleDialogProps {
  user: User
  children?: React.ReactNode
}

function platformRoleToString(role: PlatformRole): string {
  switch (role) {
    case PlatformRole.ADMIN:
      return 'admin'
    case PlatformRole.STAFF:
      return 'staff'
    default:
      return 'user'
  }
}

function stringToPlatformRole(role: string): PlatformRole {
  switch (role) {
    case 'admin':
      return PlatformRole.ADMIN
    case 'staff':
      return PlatformRole.STAFF
    default:
      return PlatformRole.USER
  }
}

export function AssignRoleDialog({ user, children }: AssignRoleDialogProps) {
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState<string>(platformRoleToString(user.platformRole))

  const queryClient = useQueryClient()

  const mutation = useMutation(assignPlatformRole, {
    onSuccess: () => {
      toast.success(`Role updated for ${user.username}`)
      queryClient.invalidateQueries({ queryKey: ['connect-query'] })
      setOpen(false)
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to assign role')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({
      userId: user.id,
      role: stringToPlatformRole(role)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm">
            <ShieldIcon className="mr-1.5 h-3.5 w-3.5" />
            Assign Role
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
            <DialogDescription>
              Change platform role for <strong>{user.username}</strong> ({user.email})
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="role">Platform Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User - Regular user (no special permissions)</SelectItem>
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
              {mutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
