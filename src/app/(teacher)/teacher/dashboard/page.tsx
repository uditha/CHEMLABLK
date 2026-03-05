"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { EXPERIMENTS } from "@/data/experiments";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface TeacherStats {
  totalStudents: number;
  completedExperiments: number;
  activeAssignments: number;
}

interface RecentActivity {
  studentName: string;
  studentIndex: string;
  experimentTitle: string;
  experimentSlug: string;
  bestScore: number;
  completedAt: string;
}

interface ClassOption {
  id: string;
  name: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function TeacherDashboard() {
  const [stats, setStats] = useState<TeacherStats>({
    totalStudents: 0,
    completedExperiments: 0,
    activeAssignments: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Class modal
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [createClassLoading, setCreateClassLoading] = useState(false);

  // Create Assignment modal
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedExpSlug, setSelectedExpSlug] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [createAssignmentLoading, setCreateAssignmentLoading] = useState(false);

  const builtExperiments = EXPERIMENTS.filter((e) => e.status === "Built");
  const p1Experiments = EXPERIMENTS.filter(
    (e) => e.priority === "P1" && e.status !== "Built"
  );

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/teacher/stats");
      const json = await res.json();
      if (json.data) {
        setStats({
          totalStudents: json.data.totalStudents,
          completedExperiments: json.data.completedExperiments,
          activeAssignments: json.data.activeAssignments,
        });
        setRecentActivity(json.data.recentActivity ?? []);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch("/api/teacher/classes");
      const json = await res.json();
      if (json.data) {
        setClasses(json.data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
      }
    } catch (err) {
      console.error("Failed to fetch classes:", err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleCreateClass = async () => {
    if (!newClassName.trim()) return;
    setCreateClassLoading(true);
    try {
      const res = await fetch("/api/teacher/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newClassName.trim() }),
      });
      if (res.ok) {
        setNewClassName("");
        setShowCreateClass(false);
        fetchStats();
      }
    } catch (err) {
      console.error("Failed to create class:", err);
    } finally {
      setCreateClassLoading(false);
    }
  };

  const openAssignmentModal = () => {
    fetchClasses();
    setSelectedClassId("");
    setSelectedExpSlug("");
    setDueDate("");
    setShowCreateAssignment(true);
  };

  const handleCreateAssignment = async () => {
    if (!selectedClassId || !selectedExpSlug) return;
    setCreateAssignmentLoading(true);
    try {
      const res = await fetch("/api/teacher/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          experimentSlug: selectedExpSlug,
          dueDate: dueDate || null,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setShowCreateAssignment(false);
        fetchStats();
      } else {
        alert(json.error || "Failed to create assignment");
      }
    } catch (err) {
      console.error("Failed to create assignment:", err);
    } finally {
      setCreateAssignmentLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] bg-deep">
      {/* Header */}
      <div className="bg-panel border-b border-border px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-orbitron text-xl font-bold text-white mb-1">
              Teacher Dashboard
            </h1>
            <p className="text-slate-400 text-sm font-rajdhani">
              Manage assignments and track class progress
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowCreateClass(true)}>
              + Class
            </Button>
            <Button variant="primary" size="sm" onClick={openAssignmentModal}>
              + Assignment
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Students", value: stats.totalStudents, color: "#0D7E6A" },
            { label: "Completions", value: stats.completedExperiments, color: "#C4962A" },
            { label: "Active Assignments", value: stats.activeAssignments, color: "#9966CC" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="lab-panel rounded p-5 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div
                className="font-orbitron text-3xl font-bold mb-1"
                style={{ color: stat.color }}
              >
                {loading ? "—" : stat.value}
              </div>
              <div className="text-slate-400 text-sm font-rajdhani">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Link href="/teacher/classes">
            <motion.div
              className="lab-panel rounded p-5 hover:border-teal/30 border border-transparent transition-colors cursor-pointer"
              whileHover={{ y: -2 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal/10 flex items-center justify-center text-teal text-lg">
                  👥
                </div>
                <div>
                  <h3 className="text-white font-rajdhani font-semibold">
                    Manage Classes
                  </h3>
                  <p className="text-slate-500 text-xs font-rajdhani">
                    Create classes and add students
                  </p>
                </div>
              </div>
            </motion.div>
          </Link>
          <motion.div
            className="lab-panel rounded p-5 hover:border-gold/30 border border-transparent transition-colors cursor-pointer"
            whileHover={{ y: -2 }}
            onClick={openAssignmentModal}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center text-gold text-lg">
                📋
              </div>
              <div>
                <h3 className="text-white font-rajdhani font-semibold">
                  Assign Experiment
                </h3>
                <p className="text-slate-500 text-xs font-rajdhani">
                  Assign experiments to your classes
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <motion.div
            className="mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="font-orbitron text-sm font-bold text-slate-300 mb-4">
              Recent Activity
            </h2>
            <div className="lab-panel rounded divide-y divide-border">
              {recentActivity.map((activity, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-teal text-xs font-orbitron font-bold">
                        {activity.studentName.charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-rajdhani truncate">
                        <span className="font-semibold">{activity.studentName}</span>
                        <span className="text-slate-500 ml-1.5">({activity.studentIndex})</span>
                      </p>
                      <p className="text-slate-400 text-xs font-rajdhani truncate">
                        Completed {activity.experimentTitle}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {activity.bestScore > 0 && (
                      <Badge variant="gold">{activity.bestScore} pts</Badge>
                    )}
                    <span className="text-slate-600 text-xs font-rajdhani whitespace-nowrap">
                      {timeAgo(activity.completedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Available experiments */}
        <div className="mb-8">
          <h2 className="font-orbitron text-sm font-bold text-slate-300 mb-4">
            Available Experiments ({builtExperiments.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {builtExperiments.map((exp) => (
              <div
                key={exp.slug}
                className="lab-panel rounded p-4 flex items-start justify-between gap-3"
              >
                <div>
                  <span className="text-slate-500 font-orbitron text-xs">
                    U{String(exp.unit).padStart(2, "0")}
                  </span>
                  <h3 className="text-white font-rajdhani text-sm mt-1 leading-tight">
                    {exp.title}
                  </h3>
                </div>
                <Badge
                  variant={
                    exp.difficulty === "Easy"
                      ? "easy"
                      : exp.difficulty === "Medium"
                      ? "medium"
                      : "hard"
                  }
                >
                  {exp.difficulty}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* P1 Priority coming soon */}
        {p1Experiments.length > 0 && (
          <div>
            <h2 className="font-orbitron text-sm font-bold text-slate-300 mb-4">
              P1 Priority Experiments (Coming Soon)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {p1Experiments.map((exp) => (
                <div
                  key={exp.slug}
                  className="lab-panel rounded p-4 opacity-60 flex items-start justify-between gap-3"
                >
                  <div>
                    <span className="text-slate-600 font-orbitron text-xs">
                      U{String(exp.unit).padStart(2, "0")}
                    </span>
                    <h3 className="text-slate-400 font-rajdhani text-sm mt-1 leading-tight">
                      {exp.title}
                    </h3>
                  </div>
                  <Badge variant={exp.status === "Next" ? "next" : "planned"}>
                    {exp.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Class Modal */}
      <Modal
        isOpen={showCreateClass}
        onClose={() => setShowCreateClass(false)}
        title="CREATE CLASS"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-orbitron text-slate-400 mb-1.5 tracking-wider">
              CLASS NAME
            </label>
            <input
              type="text"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="e.g. Grade 12 Science A"
              className="lab-input w-full"
              onKeyDown={(e) => e.key === "Enter" && handleCreateClass()}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowCreateClass(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={createClassLoading}
              onClick={handleCreateClass}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Assignment Modal */}
      <Modal
        isOpen={showCreateAssignment}
        onClose={() => setShowCreateAssignment(false)}
        title="ASSIGN EXPERIMENT"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-orbitron text-slate-400 mb-1.5 tracking-wider">
              CLASS
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="lab-input w-full"
            >
              <option value="">Select a class...</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {classes.length === 0 && (
              <p className="text-amber-400 text-xs font-rajdhani mt-1">
                No classes yet. Create a class first.
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-orbitron text-slate-400 mb-1.5 tracking-wider">
              EXPERIMENT
            </label>
            <select
              value={selectedExpSlug}
              onChange={(e) => setSelectedExpSlug(e.target.value)}
              className="lab-input w-full"
            >
              <option value="">Select an experiment...</option>
              {builtExperiments.map((exp) => (
                <option key={exp.slug} value={exp.slug}>
                  U{String(exp.unit).padStart(2, "0")} — {exp.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-orbitron text-slate-400 mb-1.5 tracking-wider">
              DUE DATE (OPTIONAL)
            </label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="lab-input w-full"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowCreateAssignment(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={createAssignmentLoading}
              onClick={handleCreateAssignment}
            >
              Assign
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
