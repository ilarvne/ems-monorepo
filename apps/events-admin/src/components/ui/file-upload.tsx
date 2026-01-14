import { Loader2, Upload, X, FileIcon, ImageIcon } from 'lucide-react'
import { useCallback } from 'react'
import { useDropzone, type Accept, type FileRejection, type FileError } from 'react-dropzone'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  /** Accepted file types */
  accept?: Accept
  /** Maximum file size in bytes */
  maxSize?: number
  /** Maximum number of files */
  maxFiles?: number
  /** Whether multiple files can be uploaded */
  multiple?: boolean
  /** Current files */
  value?: File[]
  /** Callback when files change */
  onChange?: (files: File[]) => void
  /** Whether the input is disabled */
  disabled?: boolean
  /** Custom class name */
  className?: string
  /** Placeholder text */
  placeholder?: string
  /** Whether currently uploading */
  isUploading?: boolean
}

export function FileUpload({
  accept = {
    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    'application/pdf': ['.pdf'],
  },
  maxSize = 5 * 1024 * 1024, // 5MB
  maxFiles = 1,
  multiple = false,
  value = [],
  onChange,
  disabled = false,
  className,
  placeholder = 'Drag & drop files here, or click to select',
  isUploading = false,
}: FileUploadProps) {

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (onChange) {
        const newFiles = multiple
          ? [...value, ...acceptedFiles].slice(0, maxFiles)
          : acceptedFiles.slice(0, 1)
        onChange(newFiles)
      }
    },
    [onChange, value, multiple, maxFiles]
  )

  const removeFile = useCallback(
    (index: number) => {
      if (onChange) {
        const newFiles = value.filter((_, i) => i !== index)
        onChange(newFiles)
      }
    },
    [onChange, value]
  )

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles: multiple ? maxFiles : 1,
    multiple,
    disabled: disabled || isUploading,
  })

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className='size-4' />
    }
    return <FileIcon className='size-4' />
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50',
          disabled && 'cursor-not-allowed opacity-50',
          fileRejections.length > 0 && 'border-destructive'
        )}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <Loader2 className='size-8 animate-spin text-muted-foreground' />
        ) : (
          <Upload className='size-8 text-muted-foreground' />
        )}
        <p className='mt-2 text-center text-sm text-muted-foreground'>
          {isDragActive ? 'Drop files here...' : placeholder}
        </p>
        <p className='mt-1 text-center text-xs text-muted-foreground'>
          Max {formatFileSize(maxSize)} per file
          {multiple && `, up to ${maxFiles} files`}
        </p>
      </div>

      {/* File rejections */}
      {fileRejections.length > 0 && (
        <div className='text-sm text-destructive'>
          {fileRejections.map((rejection: FileRejection) => (
            <p key={rejection.file.name}>
              {rejection.file.name}: {rejection.errors.map((e: FileError) => e.message).join(', ')}
            </p>
          ))}
        </div>
      )}

      {/* File previews */}
      {value.length > 0 && (
        <div className='space-y-2'>
          {value.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className='flex items-center gap-3 rounded-lg border bg-muted/50 p-3'
            >
              {/* Preview thumbnail for images */}
              {file.type.startsWith('image/') ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className='size-10 rounded object-cover'
                />
              ) : (
                <div className='flex size-10 items-center justify-center rounded bg-muted'>
                  {getFileIcon(file)}
                </div>
              )}
              <div className='flex-1 min-w-0'>
                <p className='truncate text-sm font-medium'>{file.name}</p>
                <p className='text-xs text-muted-foreground'>{formatFileSize(file.size)}</p>
              </div>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='size-8 shrink-0'
                onClick={() => removeFile(index)}
                disabled={disabled}
              >
                <X className='size-4' />
                <span className='sr-only'>Remove file</span>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Image-only upload variant with preview
 */
export function ImageUpload({
  value,
  onChange,
  disabled,
  className,
  aspectRatio = 'square',
}: {
  value?: File | string | null
  onChange?: (file: File | null) => void
  disabled?: boolean
  className?: string
  aspectRatio?: 'square' | 'video' | 'wide'
}) {
  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    wide: 'aspect-[3/1]',
  }

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (onChange && acceptedFiles[0]) {
        onChange(acceptedFiles[0])
      }
    },
    [onChange]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
    maxSize: 5 * 1024 * 1024,
    maxFiles: 1,
    multiple: false,
    disabled,
  })

  const imageUrl = value
    ? typeof value === 'string'
      ? value
      : URL.createObjectURL(value)
    : null

  return (
    <div className={cn('relative', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'relative flex cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors',
          aspectClasses[aspectRatio],
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <input {...getInputProps()} />
        {imageUrl ? (
          <img src={imageUrl} alt='Upload preview' className='size-full object-cover' />
        ) : (
          <div className='flex flex-col items-center gap-2 text-muted-foreground'>
            <ImageIcon className='size-8' />
            <span className='text-sm'>Click or drag to upload</span>
          </div>
        )}
      </div>
      {imageUrl && !disabled && (
        <Button
          type='button'
          variant='destructive'
          size='icon'
          className='absolute -top-2 -right-2 size-6'
          onClick={(e) => {
            e.stopPropagation()
            onChange?.(null)
          }}
        >
          <X className='size-3' />
        </Button>
      )}
    </div>
  )
}
