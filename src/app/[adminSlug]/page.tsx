// src/app/[adminSlug]/page.tsx
import { notFound } from "next/navigation";
import AdminDashboard from "./AdminDashboard";

interface Props {
  params: Promise<{ adminSlug: string }>;
}

export default async function AdminPage({ params }: Props) {
  const { adminSlug } = await params;

  if (!process.env.ADMIN_PAGE_SLUG || adminSlug !== process.env.ADMIN_PAGE_SLUG) {
    notFound();
  }

  return <AdminDashboard />;
}

export const dynamic = "force-dynamic";
