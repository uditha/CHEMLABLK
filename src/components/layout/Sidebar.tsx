"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { EXPERIMENTS, UNIT_NAMES } from "@/data/experiments";
import { Badge } from "@/components/ui/Badge";

export function Sidebar() {
  const pathname = usePathname();
  const units = Array.from(new Set(EXPERIMENTS.map((e) => e.unit))).sort();

  return (
    <aside className="w-64 bg-panel border-r border-border h-full overflow-y-auto flex-shrink-0">
      <div className="p-4">
        <p className="text-slate-500 text-xs font-orbitron tracking-wider mb-4 uppercase">
          Experiments
        </p>
        {units.map((unit) => {
          const unitExperiments = EXPERIMENTS.filter((e) => e.unit === unit);
          return (
            <div key={unit} className="mb-4">
              <p className="text-slate-500 text-xs font-rajdhani mb-2 px-2">
                {UNIT_NAMES[unit] ?? `Unit ${unit}`}
              </p>
              {unitExperiments.map((exp) => (
                <Link
                  key={exp.slug}
                  href={`/lab/${exp.slug}`}
                  className={`
                    flex items-center justify-between px-2 py-2 rounded text-sm font-rajdhani
                    transition-colors mb-0.5
                    ${pathname === `/lab/${exp.slug}`
                      ? "bg-teal/10 text-teal border border-teal/20"
                      : exp.status === "Planned"
                      ? "text-slate-600 cursor-not-allowed"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                    }
                  `}
                  onClick={(e) => exp.status === "Planned" && e.preventDefault()}
                >
                  <span className="line-clamp-1 flex-1 mr-2 text-xs">{exp.title}</span>
                  <Badge
                    variant={exp.status === "Built" ? "built" : exp.status === "Next" ? "next" : "planned"}
                  >
                    {exp.status}
                  </Badge>
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
