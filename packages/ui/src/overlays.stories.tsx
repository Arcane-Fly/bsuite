import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Button } from './button.js'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog.js'
import { Popover, PopoverContent, PopoverTrigger } from './popover.js'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from './command.js'

/**
 * Radix-backed overlays on BSuite semantic tokens.
 *
 * These render in a PORTAL, outside the story root. That is exactly why they
 * need a story: an overlay inherits the theme only if the class the tokens
 * hang off is on an ancestor of the portal target. This harness puts `.dark`
 * on `documentElement`, which is what every app's theme provider does — so
 * flipping the theme toolbar with a dialog OPEN is the real check. An overlay
 * that stays light while the page goes dark has a portal-scoping bug, and it
 * is invisible in any test that renders the trigger without opening it.
 */
const meta = {
  title: 'Primitives/Overlays',
  parameters: { layout: 'centered' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

interface DialogArgs {
  title: string
  description: string
  confirmLabel: string
  destructive: boolean
}

/**
 * Editable dialog. Change the copy, and toggle `destructive` to check that a
 * destructive confirm reads as RED (`--role-error`) and never as the primary
 * blue — the two must stay separable under protanopia.
 */
export const DialogPlayground: StoryObj<DialogArgs> = {
  args: {
    title: 'Delete charge rate',
    description:
      'This removes the rate from every quote that has not yet been issued. Issued quotes keep the rate they were priced with.',
    confirmLabel: 'Delete rate',
    destructive: true,
  },
  argTypes: {
    title: { control: 'text', description: 'Says what will happen, in the user’s nouns.' },
    description: { control: 'text', description: 'The consequence, not the mechanism.' },
    confirmLabel: {
      control: 'text',
      description: 'Names the ACTION ("Delete rate"), never a bare "OK".',
    },
    destructive: {
      control: 'boolean',
      description: 'Binds the confirm to --role-error instead of --role-primary.',
    },
  },
  render: (args) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Open dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{args.title}</DialogTitle>
          <DialogDescription>{args.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button variant={args.destructive ? 'destructive' : 'primary'}>
            {args.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

/**
 * A dialog that starts OPEN, so the portal's theme can be checked without a
 * click — and so a screenshot pass captures it at all.
 */
export const DialogOpenByDefault: Story = {
  parameters: { layout: 'padded' },
  render: () => {
    const [open, setOpen] = useState(true)
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">Reopen</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shared dialog</DialogTitle>
            <DialogDescription>
              Rendered in a portal. Flip the Theme toolbar while this is open — the
              overlay and panel must follow.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  },
}

interface PopoverArgs {
  side: 'top' | 'right' | 'bottom' | 'left'
  align: 'start' | 'center' | 'end'
  sideOffset: number
}

/** Editable popover placement. */
export const PopoverPlayground: StoryObj<PopoverArgs> = {
  args: { side: 'bottom', align: 'center', sideOffset: 4 },
  argTypes: {
    side: { control: 'inline-radio', options: ['top', 'right', 'bottom', 'left'] },
    align: { control: 'inline-radio', options: ['start', 'center', 'end'] },
    sideOffset: { control: { type: 'range', min: 0, max: 24, step: 1 } },
  },
  render: (args) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Open popover</Button>
      </PopoverTrigger>
      <PopoverContent side={args.side} align={args.align} sideOffset={args.sideOffset}>
        <p className="text-sm text-foreground">Placement is editable in Controls.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          side={args.side} · align={args.align} · offset={args.sideOffset}
        </p>
      </PopoverContent>
    </Popover>
  ),
}

interface CommandArgs {
  placeholder: string
  emptyMessage: string
  showShortcuts: boolean
}

/**
 * The command palette. `CommandEmpty` is the state most likely to ship
 * untested — type a string that matches nothing and confirm it reads as
 * "no match", not as a broken list.
 */
export const CommandPalette: StoryObj<CommandArgs> = {
  args: {
    placeholder: 'Search people, placements, rates…',
    emptyMessage: 'No matches.',
    showShortcuts: true,
  },
  argTypes: {
    placeholder: { control: 'text' },
    emptyMessage: { control: 'text', description: 'Shown when the filter matches nothing.' },
    showShortcuts: { control: 'boolean' },
  },
  render: (args) => (
    <Command className="w-96 rounded-lg border border-border bg-card">
      <CommandInput placeholder={args.placeholder} />
      <CommandList>
        <CommandEmpty>{args.emptyMessage}</CommandEmpty>
        <CommandGroup heading="People">
          <CommandItem>
            Apprentices
            {args.showShortcuts ? <CommandShortcut>⌘A</CommandShortcut> : null}
          </CommandItem>
          <CommandItem>
            Host employers
            {args.showShortcuts ? <CommandShortcut>⌘H</CommandShortcut> : null}
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Money">
          <CommandItem>
            Charge rates
            {args.showShortcuts ? <CommandShortcut>⌘R</CommandShortcut> : null}
          </CommandItem>
          <CommandItem>
            Quotes
            {args.showShortcuts ? <CommandShortcut>⌘Q</CommandShortcut> : null}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
}
