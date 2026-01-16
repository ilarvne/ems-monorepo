import { useEffect } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikethroughIcon,
  ListIcon,
  ListOrderedIcon,
  Heading1Icon,
  Heading2Icon,
  QuoteIcon,
  Undo2Icon,
  Redo2Icon,
  RemoveFormattingIcon
} from 'lucide-react'

import { Button } from '@repo/ui/components/button'
import { Separator } from '@repo/ui/components/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/components/tooltip'
import { cn } from '@repo/ui/lib/utils'

// ============================================================================
// TOOLBAR BUTTON
// ============================================================================

interface ToolbarButtonProps {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  tooltip: string
  shortcut?: string
  children: React.ReactNode
}

function ToolbarButton({ onClick, isActive, disabled, tooltip, shortcut, children }: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', isActive && 'bg-accent')}
          onClick={onClick}
          disabled={disabled}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <span>{tooltip}</span>
        {shortcut && <span className="ml-1 text-xs text-muted-foreground">({shortcut})</span>}
      </TooltipContent>
    </Tooltip>
  )
}

// ============================================================================
// TOOLBAR
// ============================================================================

interface EditorToolbarProps {
  editor: Editor
}

function EditorToolbar({ editor }: EditorToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 p-1">
      {/* Text formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        tooltip="Bold"
        shortcut="Ctrl+B"
      >
        <BoldIcon className="h-4 w-4" aria-hidden="true" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        tooltip="Italic"
        shortcut="Ctrl+I"
      >
        <ItalicIcon className="h-4 w-4" aria-hidden="true" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        disabled={!editor.can().chain().focus().toggleUnderline().run()}
        tooltip="Underline"
        shortcut="Ctrl+U"
      >
        <UnderlineIcon className="h-4 w-4" aria-hidden="true" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        tooltip="Strikethrough"
      >
        <StrikethroughIcon className="h-4 w-4" aria-hidden="true" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        tooltip="Heading 1"
      >
        <Heading1Icon className="h-4 w-4" aria-hidden="true" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        tooltip="Heading 2"
      >
        <Heading2Icon className="h-4 w-4" aria-hidden="true" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        tooltip="Bullet List"
      >
        <ListIcon className="h-4 w-4" aria-hidden="true" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        tooltip="Numbered List"
      >
        <ListOrderedIcon className="h-4 w-4" aria-hidden="true" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        tooltip="Quote"
      >
        <QuoteIcon className="h-4 w-4" aria-hidden="true" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* History */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        tooltip="Undo"
        shortcut="Ctrl+Z"
      >
        <Undo2Icon className="h-4 w-4" aria-hidden="true" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        tooltip="Redo"
        shortcut="Ctrl+Y"
      >
        <Redo2Icon className="h-4 w-4" aria-hidden="true" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Clear formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        tooltip="Clear Formatting"
      >
        <RemoveFormattingIcon className="h-4 w-4" aria-hidden="true" />
      </ToolbarButton>
    </div>
  )
}

// ============================================================================
// NOTEBOOK EDITOR
// ============================================================================

interface NotebookEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
  maxHeight?: string
}

export function NotebookEditor({
  value,
  onChange,
  placeholder = 'Start writing...',
  className,
  minHeight = '200px',
  maxHeight
}: NotebookEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Underline,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty'
      })
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'prose prose-sm prose-neutral dark:prose-invert max-w-none focus:outline-none'
      }
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    }
  })

  // Sync external value changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [editor, value])

  if (!editor) {
    return (
      <div className={cn('rounded-lg border', className)}>
        <div className="h-10 border-b bg-muted/30" />
        <div style={{ minHeight }} className="p-4">
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg border overflow-hidden', className)}>
      <EditorToolbar editor={editor} />
      <div 
        className={cn('overflow-y-auto', maxHeight && 'scrollbar-thin')}
        style={{ maxHeight }}
      >
        <EditorContent
          editor={editor}
          className="p-4"
          style={{ minHeight }}
        />
      </div>
      <style>{`
        .tiptap p.is-editor-empty:first-child::before {
          color: hsl(var(--muted-foreground));
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .tiptap {
          min-height: ${minHeight};
        }
        .tiptap:focus {
          outline: none;
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// UTILITY: Convert HTML to plain text (for display)
// ============================================================================

export function htmlToPlainText(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

// ============================================================================
// UTILITY: Check if content is empty
// ============================================================================

export function isEditorContentEmpty(html: string): boolean {
  if (!html) return true
  const text = htmlToPlainText(html)
  return text.trim().length === 0
}
