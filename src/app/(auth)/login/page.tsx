"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [tab, setTab] = useState<"student" | "teacher">("student");
  const [indexNumber, setIndexNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        type: tab,
        indexNumber: tab === "student" ? indexNumber : undefined,
        email: tab === "teacher" ? email : undefined,
        password: tab === "teacher" ? password : undefined,
        callbackUrl,
      });

      if (result?.error) {
        setError("Invalid credentials. Please check and try again.");
      } else {
        // Use relative path so redirect works on any domain (localhost or production)
        const defaultPath = tab === "teacher" ? "/teacher/dashboard" : "/dashboard";
        const path = callbackUrl?.startsWith("/") ? callbackUrl : defaultPath;
        router.push(path);
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-deep flex items-center justify-center px-4">
      <div className="absolute inset-0 lab-grid-bg opacity-30" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(13,126,106,0.1) 0%, transparent 70%)",
        }}
      />

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-teal/20 border border-teal/40 flex items-center justify-center">
              <span className="text-teal font-orbitron font-bold">C</span>
            </div>
            <span className="font-orbitron font-bold text-white tracking-widest">CHEMLAB LK</span>
          </Link>
          <p className="text-slate-400 text-sm mt-3 font-rajdhani">Virtual Chemistry Laboratory</p>
        </div>

        <div className="lab-panel rounded-lg overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-border">
            {(["student", "teacher"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(""); }}
                className={`flex-1 py-3 font-orbitron text-xs tracking-wider uppercase transition-colors ${
                  tab === t
                    ? "text-teal border-b-2 border-teal bg-teal/5"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {t === "student" ? "Student" : "Teacher"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {tab === "student" ? (
              <div>
                <label className="block text-sm font-rajdhani font-medium text-slate-300 mb-2">
                  Index Number
                </label>
                <input
                  type="text"
                  value={indexNumber}
                  onChange={(e) => setIndexNumber(e.target.value)}
                  placeholder="e.g. 12A001"
                  className="lab-input"
                  required
                  autoComplete="username"
                />
                <p className="text-slate-500 text-xs mt-1 font-rajdhani">
                  Enter your school index number
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-rajdhani font-medium text-slate-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teacher@school.lk"
                    className="lab-input"
                    required
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-rajdhani font-medium text-slate-300 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="lab-input"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </>
            )}

            {error && (
              <motion.div
                className="bg-red-900/30 border border-red-700/50 rounded p-3 text-red-300 text-sm font-rajdhani"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal hover:bg-teal-light disabled:opacity-50 disabled:cursor-not-allowed text-white font-orbitron font-bold py-3 px-6 rounded text-sm tracking-wider transition-all duration-200 mt-2"
            >
              {loading ? "ENTERING..." : "ENTER THE LAB"}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-400 text-sm mt-6 font-rajdhani">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-teal hover:text-teal-light">
            Register here
          </Link>
        </p>
      </motion.div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-deep flex items-center justify-center"><span className="text-slate-400 font-rajdhani">Loading...</span></div>}>
      <LoginForm />
    </Suspense>
  );
}
