'use client';

import { AdminProvider } from '@/context/AdminContext';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { useAdmin } from '@/context/AdminContext';

function OwnerRoot() {
  const { isAdminAuthenticated } = useAdmin();
  return isAdminAuthenticated ? <AdminDashboard /> : <AdminLogin />;
}

export default function OwnerPage() {
  return (
    <AdminProvider>
      <OwnerRoot />
    </AdminProvider>
  );
}
