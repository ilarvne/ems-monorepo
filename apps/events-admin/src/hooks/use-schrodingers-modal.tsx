import { useState } from 'react';

/**
 * Convenience hook for using SchrodingersModal with state
 * Usage:
 * ```tsx
 * const modal = useSchrodingersModal()
 *
 * return (
 *   <>
 *     <Button onClick={modal.open}>Open Portal</Button>
 *     <SchrodingersModal {...modal.props}>
 *       <p>Hello from the quantum realm!</p>
 *     </SchrodingersModal>
 *   </>
 * )
 * ```
 */

export function useSchrodingersModal() {
  const [isOpen, setIsOpen] = useState(false);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
    props: {
      open: isOpen,
      onOpenChange: setIsOpen
    }
  };
}
