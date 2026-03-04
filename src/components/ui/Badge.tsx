interface BadgeProps {
  children: React.ReactNode;
  variant?: "easy" | "medium" | "hard" | "p1" | "built" | "next" | "planned" | "teal" | "gold";
  className?: string;
}

const variantClasses = {
  easy: "badge-easy",
  medium: "badge-medium",
  hard: "badge-hard",
  p1: "badge-p1",
  built: "badge-built",
  next: "badge-next",
  planned: "badge-planned",
  teal: "bg-teal/20 text-teal border border-teal/30 text-xs px-2 py-0.5 rounded-full",
  gold: "bg-gold/20 text-gold border border-gold/30 text-xs px-2 py-0.5 rounded-full",
};

export function Badge({ children, variant = "teal", className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}
