"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { EXPERIMENTS } from "@/data/experiments";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentItem {
  id: string;
  indexNumber: string;
  name: string;
  language: string;
}

interface AssignmentItem {
  id: string;
  experimentId: string;
  dueDate: string | null;
  createdAt: string;
  experiment: {
    slug: string;
    title: string;
    difficulty: string;
    unit: number;
  };
}

interface ClassData {
  id: string;
  name: string;
  createdAt: string;
  students: StudentItem[];
  assignments: AssignmentItem[];
}

interface ProgressEntry {
  studentId: string;
  experimentId: string;
  completed: boolean;
  bestScore: number;
  attempts: number;
  modeCompletions: string[];
  timeSpentSeconds: number;
}

interface ProgressData {
  students: { id: string; name: string; indexNumber: string }[];
  assignments: {
    id: string;
    experimentId: string;
    experiment: { id: string; slug: string; title: string };
  }[];
  progress: ProgressEntry[];
}

type Tab = "students" | "assignments" | "progress";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  const [classData, setClassData] = useState<ClassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("students");

  // Student management
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [addIndexNumber, setAddIndexNumber] = useState("");
  const [addStudentLoading, setAddStudentLoading] = useState(false);
  const [addStudentError, setAddStudentError] = useState("");

  // Assignment management
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [selectedExpSlug, setSelectedExpSlug] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [createAssignmentLoading, setCreateAssignmentLoading] = useState(false);
  const [createAssignmentError, setCreateAssignmentError] = useState("");

  // Edit class name
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState("");

  // Delete class
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Progress tab
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);

  const builtExperiments = EXPERIMENTS.filter((e) => e.status === "Built");

  // ─── Data fetching ────────────────────────────────────────────────────

  const fetchClass = useCallback(async () => {
    try {
      const res = await fetch(`/api/teacher/classes/${classId}`);
      const json = await res.json();
      if (json.data) {
        setClassData(json.data);
        setEditName(json.data.name);
      }
    } catch (err) {
      console.error("Failed to fetch class:", err);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  const fetchProgress = useCallback(async () => {
    if (progressData) return; // Already loaded
    setProgressLoading(true);
    try {
      const res = await fetch(`/api/teacher/classes/${classId}/progress`);
      const json = await res.json();
      if (json.data) setProgressData(json.data);
    } catch (err) {
      console.error("Failed to fetch progress:", err);
    } finally {
      setProgressLoading(false);
    }
  }, [classId, progressData]);

  useEffect(() => {
    fetchClass();
  }, [fetchClass]);

  useEffect(() => {
    if (activeTab === "progress") fetchProgress();
  }, [activeTab, fetchProgress]);

  // ─── Handlers ─────────────────────────────────────────────────────────

  const handleAddStudent = async () => {
    if (!addIndexNumber.trim()) return;
    setAddStudentLoading(true);
    setAddStudentError("");
    try {
      const res = await fetch(`/api/teacher/classes/${classId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ indexNumber: addIndexNumber.trim() }),
      });
      const json = await res.json();
      if (res.ok) {
        setAddIndexNumber("");
        setShowAddStudent(false);
        fetchClass();
      } else {
        setAddStudentError(json.error || "Failed to add student");
      }
    } catch {
      setAddStudentError("Network error");
    } finally {
      setAddStudentLoading(false);
    }
  };

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Remove ${studentName} from this class?`)) return;
    try {
      await fetch(`/api/teacher/classes/${classId}/students/${studentId}`, {
        method: "DELETE",
      });
      fetchClass();
    } catch (err) {
      console.error("Failed to remove student:", err);
    }
  };

  const handleCreateAssignment = async () => {
    if (!selectedExpSlug) return;
    setCreateAssignmentLoading(true);
    setCreateAssignmentError("");
    try {
      const res = await fetch("/api/teacher/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          experimentSlug: selectedExpSlug,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setSelectedExpSlug("");
        setDueDate("");
        setShowCreateAssignment(false);
        setProgressData(null); // Reset progress cache
        fetchClass();
      } else {
        setCreateAssignmentError(json.error || "Failed to create assignment");
      }
    } catch {
      setCreateAssignmentError("Network error");
    } finally {
      setCreateAssignmentLoading(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string, title: string) => {
    if (!confirm(`Remove assignment "${title}"?`)) return;
    try {
      await fetch(`/api/teacher/assignments/${assignmentId}`, {
        method: "DELETE",
      });
      setProgressData(null); // Reset progress cache
      fetchClass();
    } catch (err) {
      console.error("Failed to delete assignment:", err);
    }
  };

  const handleUpdateName = async () => {
    if (!editName.trim() || editName.trim() === classData?.name) {
      setEditingName(false);
      return;
    }
    try {
      await fetch(`/api/teacher/classes/${classId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      fetchClass();
      setEditingName(false);
    } catch (err) {
      console.error("Failed to update class:", err);
    }
  };

  const handleDeleteClass = async () => {
    setDeleteLoading(true);
    try {
      await fetch(`/api/teacher/classes/${classId}`, { method: "DELETE" });
      router.push("/teacher/classes");
    } catch (err) {
      console.error("Failed to delete class:", err);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-56px)] bg-deep flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal/30 border-t-teal rounded-full animate-spin" />
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="min-h-[calc(100vh-56px)] bg-deep flex items-center justify-center">
        <p className="text-slate-500 font-rajdhani">Class not found</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "students", label: "Students", count: classData.students.length },
    { id: "assignments", label: "Assignments", count: classData.assignments.length },
    { id: "progress", label: "Progress" },
  ];

  return (
    <div className="min-h-[calc(100vh-56px)] bg-deep">
      {/* Header */}
      <div className="bg-panel border-b border-border px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <Link
            href="/teacher/classes"
            className="text-teal text-xs font-rajdhani hover:underline mb-2 inline-flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Classes
          </Link>

          <div className="flex items-start justify-between mt-1">
            <div>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="lab-input text-lg font-rajdhani font-bold"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdateName();
                      if (e.key === "Escape") setEditingName(false);
                    }}
                    onBlur={handleUpdateName}
                  />
                </div>
              ) : (
                <h1
                  className="font-orbitron text-xl font-bold text-white mb-1 cursor-pointer hover:text-teal transition-colors"
                  onClick={() => setEditingName(true)}
                  title="Click to edit"
                >
                  {classData.name}
                </h1>
              )}
              <div className="flex items-center gap-3 mt-1">
                <Badge variant="teal">
                  {classData.students.length} student{classData.students.length !== 1 ? "s" : ""}
                </Badge>
                <span className="text-slate-600 text-xs font-rajdhani">
                  Created {new Date(classData.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete Class
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-panel border-b border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-4 py-3 text-sm font-rajdhani font-semibold transition-all border-b-2
                  ${activeTab === tab.id
                    ? "text-teal border-teal"
                    : "text-slate-500 border-transparent hover:text-slate-300"
                  }
                `}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-1.5 text-xs opacity-60">({tab.count})</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* ─── Students Tab ──────────────────────────────────────────── */}
          {activeTab === "students" && (
            <motion.div
              key="students"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-orbitron text-sm font-bold text-slate-300 tracking-wider">
                  STUDENTS
                </h2>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setAddStudentError("");
                    setAddIndexNumber("");
                    setShowAddStudent(true);
                  }}
                >
                  + Add Student
                </Button>
              </div>

              {classData.students.length === 0 ? (
                <div className="text-center py-12 lab-panel rounded-lg">
                  <p className="text-slate-500 font-rajdhani mb-3">
                    No students in this class yet.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowAddStudent(true)}
                  >
                    Add First Student
                  </Button>
                </div>
              ) : (
                <div className="lab-panel rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-3 text-xs font-orbitron text-slate-500 tracking-wider">
                          INDEX
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-orbitron text-slate-500 tracking-wider">
                          NAME
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-orbitron text-slate-500 tracking-wider">
                          LANG
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-orbitron text-slate-500 tracking-wider">
                          ACTION
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {classData.students.map((student) => (
                        <tr
                          key={student.id}
                          className="border-b border-border/50 last:border-0 hover:bg-teal/5 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm font-rajdhani text-teal font-semibold">
                            {student.indexNumber}
                          </td>
                          <td className="px-4 py-3 text-sm font-rajdhani text-white">
                            {student.name}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="teal">
                              {student.language.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleRemoveStudent(student.id, student.name)}
                              className="text-red-400 hover:text-red-300 text-xs font-rajdhani transition-colors"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {/* ─── Assignments Tab ───────────────────────────────────────── */}
          {activeTab === "assignments" && (
            <motion.div
              key="assignments"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-orbitron text-sm font-bold text-slate-300 tracking-wider">
                  ASSIGNMENTS
                </h2>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setCreateAssignmentError("");
                    setSelectedExpSlug("");
                    setDueDate("");
                    setShowCreateAssignment(true);
                  }}
                >
                  + Assign Experiment
                </Button>
              </div>

              {classData.assignments.length === 0 ? (
                <div className="text-center py-12 lab-panel rounded-lg">
                  <p className="text-slate-500 font-rajdhani mb-3">
                    No assignments yet.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowCreateAssignment(true)}
                  >
                    Assign First Experiment
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {classData.assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="lab-panel rounded-lg p-4 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex-shrink-0">
                          <span className="text-slate-600 font-orbitron text-xs">
                            U{String(assignment.experiment.unit).padStart(2, "0")}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-white font-rajdhani text-sm font-semibold truncate">
                            {assignment.experiment.title}
                          </h3>
                          {assignment.dueDate && (
                            <p className="text-slate-500 text-xs font-rajdhani">
                              Due: {new Date(assignment.dueDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge
                          variant={
                            assignment.experiment.difficulty === "Easy"
                              ? "easy"
                              : assignment.experiment.difficulty === "Medium"
                              ? "medium"
                              : "hard"
                          }
                        >
                          {assignment.experiment.difficulty}
                        </Badge>
                        <button
                          onClick={() =>
                            handleDeleteAssignment(
                              assignment.id,
                              assignment.experiment.title
                            )
                          }
                          className="text-red-400 hover:text-red-300 text-xs font-rajdhani transition-colors ml-2"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ─── Progress Tab ──────────────────────────────────────────── */}
          {activeTab === "progress" && (
            <motion.div
              key="progress"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
            >
              <h2 className="font-orbitron text-sm font-bold text-slate-300 tracking-wider mb-4">
                STUDENT PROGRESS
              </h2>

              {progressLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-teal/30 border-t-teal rounded-full animate-spin" />
                </div>
              ) : !progressData ||
                progressData.students.length === 0 ||
                progressData.assignments.length === 0 ? (
                <div className="text-center py-12 lab-panel rounded-lg">
                  <p className="text-slate-500 font-rajdhani">
                    {!progressData || progressData.students.length === 0
                      ? "Add students to see their progress."
                      : "Assign experiments to track progress."}
                  </p>
                </div>
              ) : (
                <div className="lab-panel rounded-lg overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-3 py-3 text-xs font-orbitron text-slate-500 tracking-wider sticky left-0 bg-panel z-10">
                          STUDENT
                        </th>
                        {progressData.assignments.map((a) => (
                          <th
                            key={a.id}
                            className="text-center px-2 py-3 text-xs font-rajdhani text-slate-400 max-w-[120px]"
                            title={a.experiment.title}
                          >
                            <div className="truncate">
                              {a.experiment.title.length > 18
                                ? a.experiment.title.slice(0, 16) + "..."
                                : a.experiment.title}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {progressData.students.map((student) => (
                        <tr
                          key={student.id}
                          className="border-b border-border/50 last:border-0 hover:bg-teal/5 transition-colors"
                        >
                          <td className="px-3 py-3 sticky left-0 bg-panel z-10">
                            <div className="text-sm font-rajdhani text-white font-semibold">
                              {student.name}
                            </div>
                            <div className="text-xs font-rajdhani text-slate-500">
                              {student.indexNumber}
                            </div>
                          </td>
                          {progressData.assignments.map((a) => {
                            const entry = progressData.progress.find(
                              (p) =>
                                p.studentId === student.id &&
                                p.experimentId === a.experimentId
                            );
                            return (
                              <td
                                key={a.id}
                                className="text-center px-2 py-3"
                              >
                                {entry ? (
                                  entry.completed ? (
                                    <div>
                                      <span className="text-green-400 text-sm">
                                        ✓
                                      </span>
                                      {entry.bestScore > 0 && (
                                        <div className="text-xs text-green-400/70 font-rajdhani">
                                          {entry.bestScore}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div>
                                      <span className="text-amber-400 text-xs font-rajdhani">
                                        {entry.attempts} att.
                                      </span>
                                    </div>
                                  )
                                ) : (
                                  <span className="text-slate-700">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}

                      {/* Summary row */}
                      <tr className="border-t border-border bg-panel/50">
                        <td className="px-3 py-3 text-xs font-orbitron text-slate-500 sticky left-0 bg-panel/50 z-10">
                          COMPLETION
                        </td>
                        {progressData.assignments.map((a) => {
                          const completed = progressData.progress.filter(
                            (p) =>
                              p.experimentId === a.experimentId && p.completed
                          ).length;
                          const total = progressData.students.length;
                          const pct =
                            total > 0 ? Math.round((completed / total) * 100) : 0;
                          return (
                            <td
                              key={a.id}
                              className="text-center px-2 py-3"
                            >
                              <span
                                className={`text-xs font-rajdhani font-bold ${
                                  pct === 100
                                    ? "text-green-400"
                                    : pct > 0
                                    ? "text-amber-400"
                                    : "text-slate-600"
                                }`}
                              >
                                {pct}%
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Modals ──────────────────────────────────────────────────────── */}

      {/* Add Student Modal */}
      <Modal
        isOpen={showAddStudent}
        onClose={() => setShowAddStudent(false)}
        title="ADD STUDENT"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-orbitron text-slate-400 mb-1.5 tracking-wider">
              STUDENT INDEX NUMBER
            </label>
            <input
              type="text"
              value={addIndexNumber}
              onChange={(e) => {
                setAddIndexNumber(e.target.value);
                setAddStudentError("");
              }}
              placeholder="e.g. 12A001"
              className="lab-input w-full"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleAddStudent()}
            />
            {addStudentError && (
              <p className="text-red-400 text-xs font-rajdhani mt-1.5">
                {addStudentError}
              </p>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowAddStudent(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={addStudentLoading}
              onClick={handleAddStudent}
            >
              Add
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
              EXPERIMENT
            </label>
            <select
              value={selectedExpSlug}
              onChange={(e) => {
                setSelectedExpSlug(e.target.value);
                setCreateAssignmentError("");
              }}
              className="lab-input w-full"
            >
              <option value="">Select an experiment...</option>
              {builtExperiments.map((exp) => (
                <option key={exp.slug} value={exp.slug}>
                  U{String(exp.unit).padStart(2, "0")} — {exp.title}
                </option>
              ))}
            </select>
            {createAssignmentError && (
              <p className="text-red-400 text-xs font-rajdhani mt-1.5">
                {createAssignmentError}
              </p>
            )}
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

      {/* Delete Class Confirmation */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="DELETE CLASS"
      >
        <div className="space-y-4">
          <p className="text-slate-300 text-sm font-rajdhani">
            Are you sure you want to delete <strong className="text-white">{classData.name}</strong>?
          </p>
          <p className="text-slate-500 text-xs font-rajdhani">
            Students will be unlinked (not deleted). Assignments will be removed. This cannot be undone.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={deleteLoading}
              onClick={handleDeleteClass}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
