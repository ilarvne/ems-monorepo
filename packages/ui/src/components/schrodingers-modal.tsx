import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@repo/ui/components/dialog'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from '@repo/ui/components/drawer'
import { useMediaQuery } from "../hooks/use-media-query"
import { cn } from '@repo/ui/lib/utils'
import { useState } from 'react'

/**
 * SchrodingersModal - It's both a Drawer AND a Dialog until you observe the screen size! 🐱📦
 *
 * A quantum superposition of UI components that collapses into either:
 * - A majestic Dialog on desktop (because big screens deserve big modals)
 * - A sleek Drawer on mobile (because thumbs need room to swipe)
 *
 * Named after Schrödinger's famous thought experiment, where a cat is simultaneously
 * alive and dead until observed. Similarly, this component is simultaneously a drawer
 * and a dialog until the viewport width is measured! 🎭
 */

interface SchrodingersModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  title?: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function SchrodingersModal({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
  className
}: SchrodingersModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 768px)')

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  const currentOpen = open !== undefined ? open : isOpen

  // Desktop: The Dialog Form (for sophisticated users with large screens)
  if (isDesktop) {
    return (
      <Dialog onOpenChange={handleOpenChange} open={currentOpen}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent className={cn('sm:max-w-[425px]', className)}>
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    )
  }

  // Mobile: The Drawer Form (for thumb-wielding warriors)
  return (
    <Drawer onOpenChange={handleOpenChange} open={currentOpen}>
      {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
      <DrawerContent>
        <DrawerHeader className='text-left'>
          {title && <DrawerTitle>{title}</DrawerTitle>}
          {description && <DrawerDescription>{description}</DrawerDescription>}
        </DrawerHeader>
        <div className={cn('px-4', className)}>{children}</div>
        {footer && (
          <DrawerFooter className='pt-2'>
            {footer}
            <DrawerClose asChild>
              {/* Escape hatch for the indecisive */}
            </DrawerClose>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  )
}
