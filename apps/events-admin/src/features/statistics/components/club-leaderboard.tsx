'use client'

import { useQuery } from '@connectrpc/connect-query'
import { getTopPerformingClubs } from '@repo/proto'
import { Trophy, TrendingUp, Users, Calendar } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { SchrodingersModal } from '@/components/ui/schrodingers-modal'
import { useSchrodingersModal } from '@/hooks/use-schrodingers-modal'

interface ClubLeaderboardProps {
  limit?: number
  days?: number
}

export function ClubLeaderboard({ limit = 5, days = 90 }: ClubLeaderboardProps) {
  const modal = useSchrodingersModal()
  const { data, isLoading } = useQuery(getTopPerformingClubs, { limit, days })

  const clubs = data?.clubs || []

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Trophy className='size-5' />
            Top Performing Clubs
          </CardTitle>
          <CardDescription>Most active organizations in the last {days} days</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {[...Array(3)].map((_, i) => (
            <div key={i} className='flex items-center gap-4'>
              <Skeleton className='size-12 rounded-full' />
              <div className='flex-1 space-y-2'>
                <Skeleton className='h-4 w-32' />
                <Skeleton className='h-3 w-48' />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  const topClubs = clubs.slice(0, limit)

  return (
    <>
      <Card className='h-full'>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2'>
                <Trophy className='size-5' />
                Top Performing Clubs
              </CardTitle>
              <CardDescription>Most active organizations in the last {days} days</CardDescription>
            </div>
            <Button variant='outline' size='sm' onClick={modal.open}>
              See More
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {topClubs.length === 0 ? (
            <div className='text-muted-foreground flex h-32 items-center justify-center text-sm'>
              No club activity in this period
            </div>
          ) : (
            <div className='space-y-4'>
              {topClubs.map((club, index) => (
                <div key={club.organizationId} className='flex items-center gap-4'>
                  <div className='flex size-10 shrink-0 items-center justify-center'>
                    {index < 3 ? (
                      <div
                        className={`flex size-8 items-center justify-center rounded-full font-bold ${
                          index === 0
                            ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                            : index === 1
                              ? 'bg-gray-400/20 text-gray-600 dark:text-gray-400'
                              : 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
                        }`}
                      >
                        {index + 1}
                      </div>
                    ) : (
                      <span className='text-muted-foreground text-sm font-medium'>{index + 1}</span>
                    )}
                  </div>
                  <Avatar className='size-12'>
                    <AvatarImage src={club.organizationImage || undefined} alt={club.organizationTitle} />
                    <AvatarFallback>{club.organizationTitle.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className='flex-1 space-y-1'>
                    <div className='font-medium'>{club.organizationTitle}</div>
                    <div className='flex gap-3 text-xs text-muted-foreground'>
                      <span className='flex items-center gap-1'>
                        <Calendar className='size-3' />
                        {club.totalEvents} events
                      </span>
                      <span className='flex items-center gap-1'>
                        <Users className='size-3' />
                        {club.totalRegistrations} registrations
                      </span>
                    </div>
                  </div>
                  <Badge variant='secondary' className='ml-auto'>
                    <TrendingUp className='mr-1 size-3' />
                    {club.averageAttendanceRate.toFixed(0)}%
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SchrodingersModal
        {...modal.props}
        title='Top Performing Clubs'
        description={`All clubs ranked by activity in the last ${days} days`}
        className='max-w-2xl'
      >
        <div className='space-y-4 py-4'>
          {clubs.length === 0 ? (
            <div className='text-muted-foreground flex h-32 items-center justify-center text-sm'>
              No club activity in this period
            </div>
          ) : (
            clubs.map((club, index) => (
              <div key={club.organizationId} className='flex items-center gap-4 rounded-lg border p-4'>
                <div className='flex size-12 shrink-0 items-center justify-center'>
                  {index < 3 ? (
                    <div
                      className={`flex size-10 items-center justify-center rounded-full font-bold text-lg ${
                        index === 0
                          ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                          : index === 1
                            ? 'bg-gray-400/20 text-gray-600 dark:text-gray-400'
                            : 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
                      }`}
                    >
                      {index + 1}
                    </div>
                  ) : (
                    <span className='text-muted-foreground text-lg font-semibold'>{index + 1}</span>
                  )}
                </div>
                <Avatar className='size-14'>
                  <AvatarImage src={club.organizationImage || undefined} alt={club.organizationTitle} />
                  <AvatarFallback>{club.organizationTitle.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className='flex-1 space-y-2'>
                  <div className='text-lg font-semibold'>{club.organizationTitle}</div>
                  <div className='grid grid-cols-3 gap-4 text-sm'>
                    <div>
                      <div className='text-muted-foreground text-xs'>Events</div>
                      <div className='font-semibold'>{club.totalEvents}</div>
                    </div>
                    <div>
                      <div className='text-muted-foreground text-xs'>Registrations</div>
                      <div className='font-semibold'>{club.totalRegistrations}</div>
                    </div>
                    <div>
                      <div className='text-muted-foreground text-xs'>Attendees</div>
                      <div className='font-semibold'>{club.totalAttendees}</div>
                    </div>
                  </div>
                </div>
                <Badge variant='secondary' className='ml-auto'>
                  <TrendingUp className='mr-1 size-3' />
                  {club.averageAttendanceRate.toFixed(1)}%
                </Badge>
              </div>
            ))
          )}
        </div>
      </SchrodingersModal>
    </>
  )
}
