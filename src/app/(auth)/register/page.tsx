"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = (searchParams.get("type") as "student" | "teacher") ?? "student";

  const [tab, setTab] = useState<"student" | "teacher">(defaultTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    indexNumber: "",
    email: "",
    password: "",
    name: "",
    schoolCode: "",
    district: "",
    province: "",
    language: "en",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = tab === "student"
        ? { type: "student", indexNumber: form.indexNumber, name: form.name, schoolCode: form.schoolCode, language: form.language }
        : { type: "teacher", email: form.email, password: form.password, name: form.name, schoolCode: form.schoolCode };

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Registration failed. Please try again.");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-deep flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 lab-grid-bg opacity-30" />

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-teal/20 border border-teal/40 flex items-center justify-center">
              <span className="text-teal font-orbitron font-bold">C</span>
            </div>
            <span className="font-orbitron font-bold text-white tracking-widest">CHEMLAB LK</span>
          </Link>
          <p className="text-slate-400 text-sm mt-3 font-rajdhani">Create your account</p>
        </div>

        {success ? (
          <motion.div
            className="lab-panel rounded-lg p-8 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="text-4xl mb-4">⚗️</div>
            <h2 className="font-orbitron text-teal text-lg font-bold mb-2">Account Created!</h2>
            <p className="text-slate-400 font-rajdhani">Redirecting to login...</p>
          </motion.div>
        ) : (
          <div className="lab-panel rounded-lg overflow-hidden">
            <div className="flex border-b border-border">
              {(["student", "teacher"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(""); }}
                  className={`flex-1 py-3 font-orbitron text-xs tracking-wider uppercase transition-colors ${
                    tab === t ? "text-teal border-b-2 border-teal bg-teal/5" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-4">
              <div>
                <label className="block text-sm font-rajdhani font-medium text-slate-300 mb-2">Full Name</label>
                <input name="name" type="text" value={form.name} onChange={handleChange} placeholder="Your full name" className="lab-input" required />
              </div>

              {tab === "student" ? (
                <>
                  <div>
                    <label className="block text-sm font-rajdhani font-medium text-slate-300 mb-2">Index Number</label>
                    <input name="indexNumber" type="text" value={form.indexNumber} onChange={handleChange} placeholder="e.g. 12A001" className="lab-input" required />
                  </div>
                  <div>
                    <label className="block text-sm font-rajdhani font-medium text-slate-300 mb-2">Language</label>
                    <select name="language" value={form.language} onChange={handleChange} className="lab-input">
                      <option value="en">English</option>
                      <option value="si">සිංහල (Sinhala)</option>
                      <option value="ta">தமிழ் (Tamil)</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-rajdhani font-medium text-slate-300 mb-2">Email Address</label>
                    <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="teacher@school.lk" className="lab-input" required />
                  </div>
                  <div>
                    <label className="block text-sm font-rajdhani font-medium text-slate-300 mb-2">Password</label>
                    <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Min. 8 characters" className="lab-input" required minLength={8} />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-rajdhani font-medium text-slate-300 mb-2">School Code</label>
                <input name="schoolCode" type="text" value={form.schoolCode} onChange={handleChange} placeholder="e.g. DEMO-001" className="lab-input" required />
                <p className="text-slate-500 text-xs mt-1 font-rajdhani">Use DEMO-001 for testing</p>
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-700/50 rounded p-3 text-red-300 text-sm font-rajdhani">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal hover:bg-teal-light disabled:opacity-50 text-white font-orbitron font-bold py-3 px-6 rounded text-sm tracking-wider transition-all mt-2"
              >
                {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-slate-400 text-sm mt-6 font-rajdhani">
          Already have an account?{" "}
          <Link href="/login" className="text-teal hover:text-teal-light">Log in here</Link>
        </p>
      </motion.div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-deep flex items-center justify-center"><span className="text-slate-400 font-rajdhani">Loading...</span></div>}>
      <RegisterForm />
    </Suspense>
  );
}
