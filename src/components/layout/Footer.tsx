export function Footer() {
  return (
    <footer className="border-t border-border py-4 px-6 flex items-center justify-between text-xs text-slate-600 font-rajdhani">
      <span className="font-orbitron text-teal/60 tracking-wider">CHEMLAB LK</span>
      <span>NIE Chemistry {new Date().getFullYear()} · Units 1–14</span>
      <span>v1.0</span>
    </footer>
  );
}
