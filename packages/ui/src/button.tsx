import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from './utils.js'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
  outline: 'border border-border-interactive bg-background hover:bg-accent hover:text-accent-foreground',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
  link: 'text-primary underline-offset-4 hover:underline',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 rounded-md px-3 text-xs',
  md: 'h-10 rounded-md px-4 py-2 text-sm',
  lg: 'h-11 rounded-md px-8 text-base',
  icon: 'h-10 w-10 rounded-md',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  )
})
