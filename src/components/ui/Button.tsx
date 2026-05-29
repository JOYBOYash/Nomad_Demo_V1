import * as React from "react"
import { cn } from "@/src/lib/utils"

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost', size?: 'sm' | 'md' | 'lg' }>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: "bg-brand-500 text-black hover:bg-brand-400 shadow-[0_0_15px_rgba(201,255,0,0.2)] hover:shadow-[0_0_25px_rgba(201,255,0,0.4)]",
      secondary: "bg-slate-800 text-white hover:bg-slate-700 shadow-md",
      outline: "border-2 border-slate-200 bg-white hover:border-brand-500 hover:text-brand-600 text-slate-900",
      ghost: "hover:bg-slate-100 hover:text-slate-900 text-slate-600",
    }
    const sizes = { sm: "h-8 px-3 text-xs", md: "h-11 px-6 py-2", lg: "h-14 px-8 text-lg uppercase tracking-widest font-bebas relative overflow-hidden" }
    
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300 ease-out active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:pointer-events-none disabled:opacity-50 hover:-translate-y-0.5",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
