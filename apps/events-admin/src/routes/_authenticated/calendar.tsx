import { createFileRoute } from '@tanstack/react-router'
import { Calendar } from '@/features/calendar/calendar' 

export const Route = createFileRoute('/_authenticated/calendar')({
  component: CalendarPage
})

function CalendarPage() {
  return (
    <div className='px-8'>
      <Calendar />
    </div>
  )
}
