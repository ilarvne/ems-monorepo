import {
  Building2,
  Calendar,
  CalendarCheck,
  Camera,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Search,
  Settings,
  Sparkles,
  Tags,
  Users,
  FileStack
} from 'lucide-react'

import { NavDocuments } from '@/components/nav-documents'
import { NavMain } from '@/components/nav-main'
import { NavSecondary } from '@/components/nav-secondary'
import { NavUser } from '@/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail
} from '@repo/ui/components/sidebar'

function LogoWithSparkles({ ...props }: React.ComponentPropsWithoutRef<'a'>) {
  return (
    <a
      {...props}
      href='#'
      className='flex items-center gap-1 group-data-[collapsible=icon]:justify-center'
    >
      <span className='text-base group-data-[collapsible=icon]:hidden'>AITU</span>
      <span className='text-base font-bold group-data-[collapsible=icon]:hidden'>EMS</span>
      <span className='hidden text-base font-bold group-data-[collapsible=icon]:block'>A</span>
    </a>
  )
}

const data = {
  navMain: [
    {
      title: 'Dashboard',
      url: '/',
      icon: LayoutDashboard
    },
    {
      title: 'Calendar',
      url: '/calendar',
      icon: CalendarCheck
    },
    {
      title: 'Users',
      url: '/users',
      icon: Users
    }
  ],
  navClouds: [
    {
      title: 'Capture',
      icon: Camera,
      isActive: true,
      url: '#',
      items: [
        {
          title: 'Active Proposals',
          url: '#'
        },
        {
          title: 'Archived',
          url: '#'
        }
      ]
    },
    {
      title: 'Proposal',
      icon: FileText,
      url: '#',
      items: [
        {
          title: 'Active Proposals',
          url: '#'
        },
        {
          title: 'Archived',
          url: '#'
        }
      ]
    },
    {
      title: 'Prompts',
      icon: Sparkles,
      url: '#',
      items: [
        {
          title: 'Active Proposals',
          url: '#'
        },
        {
          title: 'Archived',
          url: '#'
        }
      ]
    }
  ],
  navSecondary: [
    {
      title: 'Settings',
      url: '#',
      icon: Settings
    },
    {
      title: 'Get Help',
      url: '#',
      icon: HelpCircle
    },
    {
      title: 'Search',
      url: '#',
      icon: Search
    }
  ],
  documents: [
    {
      name: 'Events',
      url: '/events',
      icon: Calendar
    },
    {
      name: 'Organizations',
      url: '/organizations',
      icon: Building2
    },
    {
      name: 'Tags',
      url: '/tags',
      icon: Tags
    },
    {
      name: 'Reports',
      url: '/reports',
      icon: FileStack
    }
  ]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible='icon' {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className='data-[slot=sidebar-menu-button]:p-1.5! hover:data-[slot=sidebar-menu-button]:bg-transparent!'>
              <LogoWithSparkles />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className='mt-auto' />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
