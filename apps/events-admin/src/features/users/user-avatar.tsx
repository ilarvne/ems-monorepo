import { useState } from 'react'

interface UserAvatarProps {
  username: string
}

export function UserAvatar({ username }: UserAvatarProps) {
  const [imageError, setImageError] = useState(false)
  const avatarUrl = `https://t.me/i/userpic/320/${username}.jpg`

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    // Check if image is 1x1 pixel (placeholder)
    if (img.naturalWidth === 1 && img.naturalHeight === 1) {
      setImageError(true)
    }
  }

  if (imageError) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
        {username.slice(0, 2).toUpperCase()}
      </div>
    )
  }

  return (
    <img
      alt={username}
      className="h-10 w-10 shrink-0 rounded-full object-cover"
      onError={() => setImageError(true)}
      onLoad={handleImageLoad}
      src={avatarUrl}
    />
  )
}
