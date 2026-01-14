import type { LucideIcon } from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

interface SocialIconProps {
  url?: string
  icon: LucideIcon | ComponentType<SVGProps<SVGSVGElement>>
  variant?: 'channel' | 'chat'
}

export const SocialIcon = ({ url, icon: Icon, variant }: SocialIconProps) => {
  if (!url) return null

  const isLucideIcon = 'displayName' in Icon
  const title = variant ? `${variant}: ${url}` : url

  return (
    <a
      href={url}
      target='_blank'
      rel='noopener noreferrer'
      className='relative inline-flex items-center justify-center p-1 hover:text-primary transition-colors'
      title={title}
    >
      {isLucideIcon ? <Icon size={18} /> : <Icon className='w-[18px] h-[18px]' />}
      {variant === 'chat' && (
        <span className='absolute -top-[1px] -right-[1px] flex size-2'>
          <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75'></span>
          <span className='relative inline-flex size-2 rounded-full bg-blue-500'></span>
        </span>
      )}
    </a>
  )
}
