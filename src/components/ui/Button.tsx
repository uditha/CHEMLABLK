"use client";
import { forwardRef } from "react";
import { motion } from "framer-motion";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "gold" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClasses = {
  primary: "bg-teal hover:bg-teal-light text-white border border-teal",
  secondary: "border border-teal text-teal hover:bg-teal hover:text-white",
  gold: "bg-gold hover:bg-gold-light text-white border border-gold",
  ghost: "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent",
  danger: "bg-red-900/50 hover:bg-red-800/60 text-red-300 border border-red-700/50",
};

const sizeClasses = {
  sm: "py-1.5 px-3 text-xs",
  md: "py-2 px-5 text-sm",
  lg: "py-3 px-8 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, icon, children, className = "", disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        disabled={disabled || loading}
        className={`
          inline-flex items-center justify-center gap-2
          font-rajdhani font-semibold rounded
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
        {...(props as unknown as Record<string, unknown>)}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : icon ? (
          <span className="flex-shrink-0">{icon}</span>
        ) : null}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = "Button";
