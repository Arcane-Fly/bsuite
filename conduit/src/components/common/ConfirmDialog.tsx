'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle, X } from 'lucide-react'
import { useCallback, useState } from 'react'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
  onConfirm: () => void | Promise<void>
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const busy = loading || isProcessing

  async function handleConfirm() {
    setIsProcessing(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setIsProcessing(false)
    }
  }

  const variantStyles = {
    danger: {
      icon: 'text-red-500 bg-red-50 dark:bg-red-950/30',
      button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white',
    },
    warning: {
      icon: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30',
      button: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 text-white',
    },
    default: {
      icon: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30',
      button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white',
    },
  }

  const styles = variantStyles[variant]

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="flex items-start gap-4">
            <div className={`shrink-0 rounded-full p-2 ${styles.icon}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                className="shrink-0 rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild>
              <button
                disabled={busy}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                {cancelLabel}
              </button>
            </Dialog.Close>
            <button
              onClick={handleConfirm}
              disabled={busy}
              className={`rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${styles.button}`}
            >
              {busy ? 'Processing...' : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

interface UseConfirmDialogOptions {
  title: string
  description: string
  confirmLabel?: string
  variant?: 'danger' | 'warning' | 'default'
}

interface ConfirmDialogState {
  open: boolean
  options: UseConfirmDialogOptions
  onConfirm: () => void | Promise<void>
}

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmDialogState>({
    open: false,
    options: { title: '', description: '' },
    onConfirm: () => {},
  })

  const requestConfirm = useCallback(
    (options: UseConfirmDialogOptions, onConfirm: () => void | Promise<void>) => {
      setState({ open: true, options, onConfirm })
    },
    [],
  )

  const dialogProps = {
    open: state.open,
    onOpenChange: (open: boolean) => setState((s) => ({ ...s, open })),
    title: state.options.title,
    description: state.options.description,
    confirmLabel: state.options.confirmLabel ?? 'Delete',
    variant: state.options.variant ?? ('danger' as const),
    onConfirm: state.onConfirm,
  }

  return { requestConfirm, dialogProps }
}
