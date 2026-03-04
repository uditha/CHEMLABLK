import { notFound } from "next/navigation";
import { getExperimentBySlug } from "@/data/experiments";
import { ExperimentShell } from "@/components/lab/ExperimentShell";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props) {
  const exp = getExperimentBySlug(params.slug);
  if (!exp) return { title: "Experiment Not Found" };
  return {
    title: `${exp.title} | ChemLab LK`,
    description: exp.description,
  };
}

export default function LabPage({ params }: Props) {
  const experiment = getExperimentBySlug(params.slug);

  if (!experiment) {
    notFound();
  }

  if (experiment.status === "Planned") {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center bg-deep">
        <div className="text-center max-w-md p-8">
          <div className="text-5xl mb-6">🔬</div>
          <h1 className="font-orbitron text-xl font-bold text-white mb-3">
            Coming Soon
          </h1>
          <p className="text-slate-400 font-rajdhani mb-2">
            <strong className="text-white">{experiment.title}</strong>
          </p>
          <p className="text-slate-500 text-sm font-rajdhani">
            This experiment is being built. Check back soon.
          </p>
          <div className="mt-4">
            <span className="badge-planned">Planned</span>
          </div>
        </div>
      </div>
    );
  }

  return <ExperimentShell experiment={experiment} />;
}
