import * as React from "react"

import { cn } from "@/lib/utils"
import { MinusIcon } from "lucide-react"

type OTPValue = string

type InputOTPProps = {
  value?: OTPValue
  // Accept the callback signature used by `setOtp` from useState.
  onChange?: React.Dispatch<React.SetStateAction<OTPValue>> | ((value: OTPValue) => void)
  /** mirrors `input-otp` props; treated as number of inputs */
  maxLength?: number
  numInputs?: number
  className?: string
  containerClassName?: string
  children?: React.ReactNode
}





/**
 * Lightweight replacement for the missing `input-otp` dependency.
 *
 * API is intentionally minimal and designed to unblock `next build`.
 */
function InputOTP({
  value,
  onChange,
  numInputs = 6,
  className,
  containerClassName,
  ...props
}: InputOTPProps) {

  const digits = (value ?? '').split('').slice(0, numInputs)

  const setDigitAt = (index: number, digit: string) => {
    const next = [...digits]
    next[index] = digit
    const joined = next.join('').replace(/\s/g, '')
    onChange?.(joined)
  }

  return (
    <div
      data-slot="input-otp"
      className={cn(
        "cn-input-otp flex items-center has-disabled:opacity-50",
        containerClassName
      )}
      {...props}
    >
      {Array.from({ length: numInputs }).map((_, i) => (
        <input
          key={i}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digits[i] ?? ''}
          onChange={(e) => {
            const d = (e.target.value ?? '').replace(/\D/g, '').slice(-1)
            setDigitAt(i, d)
          }}
          className={cn(
            "relative flex size-8 items-center justify-center border-y border-r border-input text-sm transition-all outline-none first:rounded-l-lg first:border-l last:rounded-r-lg aria-invalid:border-destructive",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          aria-label={`OTP digit ${i + 1}`}
        />
      ))}

      {props.children}
    </div>
  )
}


function InputOTPGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn(
        "flex items-center rounded-lg has-aria-invalid:border-destructive has-aria-invalid:ring-3 has-aria-invalid:ring-destructive/20 dark:has-aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

function InputOTPSlot({
  // index is accepted for compatibility; this lightweight version does not use it.
  index,
  className,
  ...props
}: React.ComponentProps<"div"> & { index?: number }) {
  // Kept for compatibility with shadcn-style composition.
  return (
    <div
      data-slot="input-otp-slot"
      className={cn(
        "relative flex size-8 items-center justify-center border-y border-r border-input text-sm outline-none first:rounded-l-lg first:border-l last:rounded-r-lg",
        className
      )}
      {...props}
    />
  )
}


function InputOTPSeparator({
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-separator"
      className="flex items-center [&_svg:not([class*='size-'])]:size-4"
      role="separator"
      {...props}
    >
      <MinusIcon />
    </div>
  )
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }

