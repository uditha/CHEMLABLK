import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "teacher") {
    redirect("/teacher/dashboard");
  }

  return (
    <div className="min-h-screen bg-deep flex flex-col">
      <Navbar userName={session.user.name ?? undefined} userRole={session.user.role} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
