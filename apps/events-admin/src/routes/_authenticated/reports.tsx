import { createFileRoute } from '@tanstack/react-router'
import { Construction } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/reports')({
  component: Reports
})

function Reports() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-8">
      <Construction className="h-10 w-10 text-muted-foreground mb-4" />
      <h1 className="text-xl font-semibold mb-1">Reports Coming Soon</h1>
      <p className="text-muted-foreground text-sm">This feature is under development.</p>
    </div>
  )
}
