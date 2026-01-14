import { Link, useMatches } from '@tanstack/react-router'
import { Moon, Sun } from 'lucide-react'
import { Fragment, useRef } from 'react'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { HouseIcon, type HouseHandle } from '@/components/house-icon'

import { useTheme } from '@/features/theme/hooks/use-theme'
import SearchCommandPalette from '@/features/search/components/search-command-palette'

export function SiteHeader() {
  const { setTheme } = useTheme()
  const matches = useMatches()
  const houseIconRef = useRef<HouseHandle>(null)

  // Get breadcrumb items from route matches
  const breadcrumbs = matches
    .filter((match) => match.pathname !== '/')
    .map((match) => ({
      title: match.pathname.split('/').pop() || 'Dashboard',
      path: match.pathname
    }))

  // Add home as first item if there are other items
  const allBreadcrumbs =
    breadcrumbs.length > 0
      ? [{ title: 'Dashboard', path: '/' }, ...breadcrumbs]
      : [{ title: 'Dashboard', path: '/' }]

  return (
    <header className='flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)'>
      <div className='flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6'>
        <SidebarTrigger className='-ml-1' />
        <Separator orientation='vertical' className='mx-2 data-[orientation=vertical]:h-4' />
        <Breadcrumb>
          <BreadcrumbList>
            {allBreadcrumbs.map((item, index) => (
              <Fragment key={item.path}>
                <BreadcrumbItem>
                  {index === allBreadcrumbs.length - 1 ? (
                    <BreadcrumbPage
                      className='capitalize font-medium flex items-center gap-1.5'
                      onMouseEnter={() => houseIconRef.current?.startAnimation()}
                      onMouseLeave={() => houseIconRef.current?.stopAnimation()}
                    >
                      {index === 0 && <HouseIcon ref={houseIconRef} size={16} />}
                      {index === 0 && allBreadcrumbs.length === 1 ? item.title : index !== 0 ? item.title : null}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link
                        className='capitalize font-medium flex items-center gap-1.5'
                        to={item.path}
                        onMouseEnter={() => houseIconRef.current?.startAnimation()}
                        onMouseLeave={() => houseIconRef.current?.stopAnimation()}
                      >
                        {index === 0 && <HouseIcon ref={houseIconRef} size={16} />}
                        {index === 0 && allBreadcrumbs.length === 1 ? item.title : index !== 0 ? item.title : null}
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {index < allBreadcrumbs.length - 1 && <BreadcrumbSeparator />}
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex-1 flex justify-center">
          <SearchCommandPalette />
        </div>
        <div className='ml-auto flex items-center gap-2'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' size='icon'>
                <Sun className='h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90' />
                <Moon className='absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0' />
                <span className='sr-only'>Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem onClick={() => setTheme('light')}>Light</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}>Dark</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')}>System</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
