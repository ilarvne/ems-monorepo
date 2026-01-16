'use client'

import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@connectrpc/connect-query'
import {
  Building2,
  Calendar,
  CalendarCheck,
  FileStack,
  LayoutDashboard,
  Loader2,
  Moon,
  Plus,
  SearchIcon,
  Settings,
  Sun,
  Tags,
  Upload,
  User,
  Users
} from 'lucide-react'
import * as React from 'react'

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut
} from '@repo/ui/components/command'
import { useTheme } from '@repo/ui/hooks/use-theme'
import { globalSearch, SearchResultType } from '@repo/proto'
import { transport } from '@/lib/api'
import { useDebounce } from '@/hooks/use-debounce'

// Navigation items
const navigationItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/', shortcut: 'G D' },
  { name: 'Calendar', icon: CalendarCheck, path: '/calendar', shortcut: 'G C' },
  { name: 'Events', icon: Calendar, path: '/events', shortcut: 'G E' },
  { name: 'Organizations', icon: Building2, path: '/organizations', shortcut: 'G O' },
  { name: 'Users', icon: Users, path: '/users', shortcut: 'G U' },
  { name: 'Tags', icon: Tags, path: '/tags', shortcut: 'G T' },
  { name: 'Reports', icon: FileStack, path: '/reports', shortcut: 'G R' }
]

// Icon mapping for search result types
const resultTypeConfig = {
  [SearchResultType.EVENT]: { icon: Calendar, label: 'Event', path: '/events' },
  [SearchResultType.ORGANIZATION]: { icon: Building2, label: 'Organization', path: '/organizations' },
  [SearchResultType.USER]: { icon: User, label: 'User', path: '/users' },
  [SearchResultType.TAG]: { icon: Tags, label: 'Tag', path: '/tags' },
  [SearchResultType.UNSPECIFIED]: { icon: SearchIcon, label: 'Unknown', path: '/' }
}

export default function SearchCommandPalette() {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const debouncedQuery = useDebounce(searchQuery, 300)
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()

  // Search query using Connect-RPC
  const { data: searchResults, isLoading: isSearching } = useQuery(
    globalSearch,
    { query: debouncedQuery, limit: 10 },
    {
      transport,
      enabled: debouncedQuery.length >= 2,
      staleTime: 1000 * 60, // 1 minute
    }
  )

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  // Reset search when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSearchQuery('')
    }
  }, [open])

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  const handleSearchResultSelect = (type: SearchResultType, id: number) => {
    const config = resultTypeConfig[type]
    runCommand(() => {
      navigate({ to: `${config.path}/${id}` })
    })
  }

  const hasSearchResults = searchResults?.results && searchResults.results.length > 0
  // Use the immediate searchQuery to determine if we're in "search mode"
  // This prevents the flash when erasing
  const isSearchMode = searchQuery.length >= 2
  const showSearchResults = isSearchMode && debouncedQuery.length >= 2

  return (
    <>
      <button
        className="inline-flex h-9 xl:w-[21rem] xl:mr-[13rem] rounded-md border border-input bg-background px-3 py-2 text-foreground text-sm placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 hover:bg-accent transition-colors"
        onClick={() => setOpen(true)}
        type="button"
      >
        <span className="flex grow items-center">
          <SearchIcon
            aria-hidden="true"
            className="-ms-1 me-3 text-muted-foreground/80"
            size={16}
          />
          <span className="font-normal text-muted-foreground/70">Search or jump to...</span>
        </span>
        <kbd className="-me-1 ms-6 inline-flex h-5 max-h-full items-center rounded border border-border/50 bg-muted/50 px-1.5 font-mono text-[0.625rem] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
      <CommandDialog onOpenChange={setOpen} open={open} shouldFilter={false}>
        <CommandInput
          placeholder="Type a command or search..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          {/* Search Loading State */}
          {isSearching && showSearchResults && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
            </div>
          )}

          {/* Search Results - use forceMount and value to prevent cmdk filtering */}
          {showSearchResults && !isSearching && hasSearchResults && (
            <>
              <CommandGroup heading={`Search Results (${searchResults.totalHits})`} forceMount>
                {searchResults.results.map((result) => {
                  const config = resultTypeConfig[result.type]
                  const Icon = config.icon
                  return (
                    <CommandItem
                      key={`${result.type}-${result.id}`}
                      value={`search-${result.type}-${result.id}-${result.title}`}
                      onSelect={() => handleSearchResultSelect(result.type, result.id)}
                      forceMount
                    >
                      <Icon aria-hidden="true" className="mr-2 size-4 opacity-60" />
                      <div className="flex flex-col">
                        <span>{result.title}</span>
                        {result.description && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {result.description}
                          </span>
                        )}
                      </div>
                      <CommandShortcut>{config.label}</CommandShortcut>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* No Search Results */}
          {showSearchResults && !isSearching && !hasSearchResults && (
            <CommandEmpty>No results found for "{debouncedQuery}"</CommandEmpty>
          )}

          {/* Default Empty State (no search query) */}
          {!isSearchMode && <CommandEmpty>No results found.</CommandEmpty>}

          {/* Navigation - hide when searching */}
          {!isSearchMode && (
            <CommandGroup heading="Navigation">
              {navigationItems.map((item) => (
                <CommandItem
                  key={item.path}
                  onSelect={() => runCommand(() => navigate({ to: item.path }))}
                >
                  <item.icon aria-hidden="true" className="mr-2 size-4 opacity-60" />
                  <span>{item.name}</span>
                  <CommandShortcut>{item.shortcut}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!isSearchMode && <CommandSeparator />}

          {/* Quick Actions - hide when searching */}
          {!isSearchMode && (
            <CommandGroup heading="Quick Actions">
              <CommandItem
                onSelect={() =>
                  runCommand(() => {
                    navigate({ to: '/events', search: { action: 'create' } })
                  })
                }
              >
                <Plus aria-hidden="true" className="mr-2 size-4 opacity-60" />
                <span>Create Event</span>
                <CommandShortcut>C E</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  runCommand(() => {
                    navigate({ to: '/events', search: { action: 'import' } })
                  })
                }
              >
                <Upload aria-hidden="true" className="mr-2 size-4 opacity-60" />
                <span>Import from Excel</span>
                <CommandShortcut>C I</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          )}

          {!isSearchMode && <CommandSeparator />}

          {/* Theme - hide when searching */}
          {!isSearchMode && (
            <CommandGroup heading="Theme">
              <CommandItem onSelect={() => runCommand(() => setTheme('light'))}>
                <Sun aria-hidden="true" className="mr-2 size-4 opacity-60" />
                <span>Light Mode</span>
                {theme === 'light' && <CommandShortcut>✓</CommandShortcut>}
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => setTheme('dark'))}>
                <Moon aria-hidden="true" className="mr-2 size-4 opacity-60" />
                <span>Dark Mode</span>
                {theme === 'dark' && <CommandShortcut>✓</CommandShortcut>}
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => setTheme('system'))}>
                <Settings aria-hidden="true" className="mr-2 size-4 opacity-60" />
                <span>System Theme</span>
                {theme === 'system' && <CommandShortcut>✓</CommandShortcut>}
              </CommandItem>
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
