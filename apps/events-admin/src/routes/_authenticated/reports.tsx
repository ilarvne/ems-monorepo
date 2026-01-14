import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/reports')({
  component: Reports
})

function Reports() {
  return (
    <div className='p-8'>
      <h1 className='text-3xl font-bold mb-4'>Reports</h1>
      <p>View and generate reports</p>
    </div>
  )
}
