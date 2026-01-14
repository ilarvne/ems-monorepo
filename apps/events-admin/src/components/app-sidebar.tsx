import {
  IconCamera,
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFileAi,
  IconFileDescription,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconInnerShadowTop,
  IconListDetails,
  IconReport,
  IconSearch,
  IconSettings,
  IconUsers
} from '@tabler/icons-react'
import { Calendar1, CalendarCheck, FerrisWheel, Sparkle, Tags } from 'lucide-react'
import { useState } from 'react'

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
} from '@/components/ui/sidebar'

import { Sparkles } from './animate-ui/icons/sparkles'

function LogoWithSparkles({ ...props }: React.ComponentPropsWithoutRef<'a'>) {
  const [isHovered, setIsHovered] = useState(false)
  
  return (
    <a
      {...props}
      href='#'
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Sparkles animate={isHovered} animateOnView className='size-5! text-lime-400' />
      <span className='text-base font-semibold'>AITU Events.</span>
    </a>
  )
}

const data = {
  navMain: [
    {
      title: 'Dashboard',
      url: '/',
      icon: IconDashboard
    },
    {
      title: 'Calendar',
      url: '/calendar',
      icon: CalendarCheck
    },
    {
      title: 'Users',
      url: '/users',
      icon: IconUsers
    }
  ],
  navClouds: [
    {
      title: 'Capture',
      icon: IconCamera,
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
      icon: IconFileDescription,
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
      icon: IconFileAi,
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
      icon: IconSettings
    },
    {
      title: 'Get Help',
      url: '#',
      icon: IconHelp
    },
    {
      title: 'Search',
      url: '#',
      icon: IconSearch
    }
  ],
  documents: [
    {
      name: 'Events',
      url: '/events',
      icon: Calendar1
    },
    {
      name: 'Clubs',
      url: '/clubs',
      icon: FerrisWheel
    },
    {
      name: 'Tags',
      url: '/tags',
      icon: Tags
    },
    {
      name: 'Reports',
      url: '/reports',
      icon: IconReport
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
