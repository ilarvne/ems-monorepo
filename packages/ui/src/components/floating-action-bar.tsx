'use client'

import { motion, AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'
import * as React from 'react'

import { Button } from '@repo/ui/components/button'
import { cn } from '@repo/ui/lib/utils'

interface FloatingActionBarProps {
  selectedCount: number
  totalCount?: number
  onClearSelection: () => void
  children: React.ReactNode
  className?: string
}

/**
 * Floating action bar that appears when items are selected.
 * Follows 2025 UX patterns - animates in from bottom center.
 */
export function FloatingActionBar({
  selectedCount,
  totalCount,
  onClearSelection,
  children,
  className
}: FloatingActionBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={cn(
            'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
            'flex items-center gap-2 px-4 py-2.5 rounded-lg',
            'bg-background/95 backdrop-blur-sm border',
            className
          )}
        >
          {/* Selection count */}
          <div className="flex items-center gap-2 pr-3 border-r">
            <span className="text-sm font-medium">
              {selectedCount} selected
              {totalCount !== undefined && totalCount > 0 && totalCount > selectedCount && (
                <span className="text-muted-foreground"> of {totalCount}</span>
              )}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onClearSelection}
              aria-label="Clear selection"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
