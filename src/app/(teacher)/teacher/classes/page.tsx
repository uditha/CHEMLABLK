"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";

interface ClassItem {
  id: string;
  name: string;
  createdAt: string;
  _count: { students: number; assignments: number };
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch("/api/teacher/classes");
      const json = await res.json();
      if (json.data) setClasses(json.data);
    } catch (err) {
      console.error("Failed to fetch classes:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreateLoading(true);
    try {
      const res = await fetch("/api/teacher/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        setNewName("");
        setShowCreate(false);
        fetchClasses();
      }
    } catch (err) {
      console.error("Failed to create class:", err);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] bg-deep">
      {/* Header */}
      <div className="bg-panel border-b border-border px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-orbitron text-xl font-bold text-white mb-1">
              My Classes
            </h1>
            <p className="text-slate-400 text-sm font-rajdhani">
              Manage your classes and students
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
            + Create Class
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-teal/30 border-t-teal rounded-full animate-spin" />
          </div>
        ) : classes.length === 0 ? (
          <motion.div
            className="text-center py-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-4xl mb-4">📚</div>
            <h2 className="text-white font-rajdhani text-lg font-semibold mb-2">
              No classes yet
            </h2>
            <p className="text-slate-500 font-rajdhani text-sm mb-6">
              Create your first class to start managing students and assignments.
            </p>
            <Button variant="primary" onClick={() => setShowCreate(true)}>
              Create Your First Class
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls, i) => (
              <Link key={cls.id} href={`/teacher/classes/${cls.id}`}>
                <motion.div
                  className="lab-panel rounded-lg p-5 border border-transparent hover:border-teal/30 transition-all cursor-pointer h-full"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -2 }}
                >
                  <h3 className="text-white font-rajdhani text-lg font-semibold mb-3">
                    {cls.name}
                  </h3>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="teal">
                      {cls._count.students} student{cls._count.students !== 1 ? "s" : ""}
                    </Badge>
                    <Badge variant="gold">
                      {cls._count.assignments} assignment{cls._count.assignments !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <p className="text-slate-600 text-xs font-rajdhani">
                    Created {new Date(cls.createdAt).toLocaleDateString()}
                  </p>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Class Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="CREATE CLASS"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-orbitron text-slate-400 mb-1.5 tracking-wider">
              CLASS NAME
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Grade 12 Science A"
              className="lab-input w-full"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={createLoading}
              onClick={handleCreate}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
