import { createFileRoute } from '@tanstack/react-router'
import { Construction, FileBarChart, FileSpreadsheet, Mail, PieChart } from 'lucide-react'

import { Button } from '@repo/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/card'

export const Route = createFileRoute('/_authenticated/reports')({
  component: Reports
})

function Reports() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground mt-2">Generate and export detailed reports for your organization</p>
      </div>

      {/* Work in Progress Notice */}
      <Card className="border-dashed mb-8">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Construction className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Reports Module Coming Soon</h2>
          <p className="text-muted-foreground max-w-md mb-6">
            We're building a comprehensive reporting system to help you analyze event performance, track attendance, and
            generate insights for your organization.
          </p>
          <Button variant="outline" asChild>
            <a href="mailto:me@ilarvne.dev">
              <Mail className="mr-2 h-4 w-4" />
              Request Early Access
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Planned Features Preview */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-muted-foreground">Planned Features</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="opacity-60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-primary/10 p-2">
                  <FileBarChart className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base">Event Analytics</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Detailed breakdowns of event attendance, engagement metrics, and performance trends over time.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="opacity-60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-primary/10 p-2">
                  <PieChart className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base">Organization Insights</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Compare organization activity, member engagement, and resource utilization across departments.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="opacity-60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-primary/10 p-2">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base">Export & Scheduling</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Export reports to PDF and Excel formats. Schedule automated reports delivered to your inbox.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
