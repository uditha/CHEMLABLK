"use client";
import { motion } from "framer-motion";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = "", hover = false, glow = false, onClick }: CardProps) {
  return (
    <motion.div
      onClick={onClick}
      className={`
        lab-panel rounded
        ${hover ? "lab-panel-hover cursor-pointer" : ""}
        ${glow ? "shadow-teal-glow" : ""}
        ${className}
      `}
      whileHover={hover ? { scale: 1.01 } : undefined}
      transition={{ duration: 0.15 }}
    >
      {children}
    </motion.div>
  );
}
