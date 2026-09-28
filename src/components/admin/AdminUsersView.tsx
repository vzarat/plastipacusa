"use client";

import React, { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronDown,
  KeyRound,
  Loader2,
  MoreHorizontal,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
  X,
  XCircle,
} from "lucide-react";
import {
  updateAdminManagedUserProfile,
  updateAdminManagedUserRole,
  type AdminManagedRole,
  type AdminManagedUser,
} from "@/actions/admin-users";
import { useLanguage } from "@/context/LanguageContext";

interface AdminUsersViewProps {
  initialUsers: AdminManagedUser[];
  currentAdminId: string;
}

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AdminUsersView({
  initialUsers,
  currentAdminId,
}: AdminUsersViewProps) {
  const { locale } = useLanguage();
  const isSpanish = locale === "es";
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [menuUserId, setMenuUserId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<AdminManagedUser | null>(null);
  const [passwordUser, setPasswordUser] = useState<AdminManagedUser | null>(
    null
  );
  const [deleteUser, setDeleteUser] = useState<AdminManagedUser | null>(null);
  const [roleUser, setRoleUser] = useState<AdminManagedUser | null>(null);
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    fullName: "",
    companyName: "",
    phone: "",
  });
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nextRole, setNextRole] = useState<AdminManagedRole>("client");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.companyName.toLowerCase().includes(q) ||
        u.taxId.toLowerCase().includes(q)
    );
  }, [users, search]);

  const openEdit = (user: AdminManagedUser) => {
    setMenuUserId(null);
    setEditUser(user);
    setEditForm({
      fullName: user.fullName,
      companyName: user.companyName,
      phone: user.phone,
    });
  };

  const openPassword = (user: AdminManagedUser) => {
    setMenuUserId(null);
    setPasswordUser(user);
    setNewPassword("");
    setConfirmPassword("");
  };

  const openRole = (user: AdminManagedUser) => {
    setMenuUserId(null);
    setRoleUser(user);
    setNextRole(user.role === "admin" ? "client" : "admin");
  };

  const openDelete = (user: AdminManagedUser) => {
    setMenuUserId(null);
    setDeleteUser(user);
  };

  const handleSaveEdit = () => {
    if (!editUser) return;
    setBusyId(editUser.id);
    startTransition(async () => {
      const result = await updateAdminManagedUserProfile({
        userId: editUser.id,
        fullName: editForm.fullName,
        companyName: editForm.companyName,
        phone: editForm.phone,
      });
      setBusyId(null);
      if (!result.success) {
        toast.error(result.error || "Update failed.");
        return;
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editUser.id
            ? {
                ...u,
                fullName: editForm.fullName.trim(),
                companyName: editForm.companyName.trim(),
                phone: editForm.phone.trim(),
              }
            : u
        )
      );
      setEditUser(null);
      toast.success(isSpanish ? "Usuario actualizado." : "User updated.");
    });
  };

  const handleSaveRole = () => {
    if (!roleUser) return;
    setBusyId(roleUser.id);
    startTransition(async () => {
      const result = await updateAdminManagedUserRole({
        userId: roleUser.id,
        role: nextRole,
      });
      setBusyId(null);
      if (!result.success) {
        toast.error(result.error || "Role update failed.");
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === roleUser.id ? { ...u, role: nextRole } : u))
      );
      setRoleUser(null);
      toast.success(isSpanish ? "Rol actualizado." : "Role updated.");
    });
  };

  const handleResetPassword = () => {
    if (!passwordUser) return;
    if (newPassword.length < 6) {
      toast.error(
        isSpanish
          ? "La contraseña debe tener al menos 6 caracteres."
          : "Password must be at least 6 characters."
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(
        isSpanish
          ? "Las contraseñas no coinciden."
          : "Passwords do not match."
      );
      return;
    }

    setBusyId(passwordUser.id);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reset_password",
            userId: passwordUser.id,
            password: newPassword,
          }),
        });
        const data = await res.json().catch(() => ({}));
        setBusyId(null);
        if (!res.ok) {
          toast.error(data.error || "Password reset failed.");
          return;
        }
        setPasswordUser(null);
        toast.success(
          isSpanish ? "Contraseña actualizada." : "Password updated."
        );
      } catch {
        setBusyId(null);
        toast.error("Password reset failed.");
      }
    });
  };

  const handleDelete = () => {
    if (!deleteUser) return;
    setBusyId(deleteUser.id);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete",
            userId: deleteUser.id,
          }),
        });
        const data = await res.json().catch(() => ({}));
        setBusyId(null);
        if (!res.ok) {
          toast.error(data.error || "Delete failed.");
          return;
        }
        setUsers((prev) => prev.filter((u) => u.id !== deleteUser.id));
        setDeleteUser(null);
        toast.success(isSpanish ? "Usuario eliminado." : "User deleted.");
      } catch {
        setBusyId(null);
        toast.error("Delete failed.");
      }
    });
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold mb-1">
            <span>Admin</span>
            <span>/</span>
            <span className="text-slate-900 font-bold">
              {isSpanish ? "Usuarios" : "Users"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {isSpanish ? "Gestión de Usuarios" : "User Management"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isSpanish
              ? "Administra cuentas registradas, roles, contraseñas y perfiles."
              : "Manage registered accounts, roles, passwords, and profiles."}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
          <Users className="w-4 h-4 text-blue-600" />
          {filtered.length} {isSpanish ? "usuarios" : "users"}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <div className="p-4 sm:px-6 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                isSpanish
                  ? "Buscar por nombre, email o empresa…"
                  : "Search by name, email, or company…"
              }
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-400"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">
              {isSpanish ? "No hay usuarios." : "No users found."}
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">
                    {isSpanish ? "Nombre" : "Full Name"}
                  </th>
                  <th className="py-3.5 px-3">Email</th>
                  <th className="py-3.5 px-3">
                    {isSpanish ? "Rol" : "Role"}
                  </th>
                  <th className="py-3.5 px-3">TAX ID</th>
                  <th className="py-3.5 px-3">
                    {isSpanish ? "Registro" : "Registered"}
                  </th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">
                    {isSpanish ? "Acciones" : "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-4 px-4 sm:px-6">
                      <div>
                        <p className="font-bold text-slate-900">
                          {user.fullName || "—"}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate max-w-[180px]">
                          {user.companyName || "—"}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-3">
                      <p className="text-slate-800 break-all">{user.email}</p>
                    </td>
                    <td className="py-4 px-3">
                      {user.role === "admin" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-[10px] font-bold">
                          <ShieldCheck className="w-3 h-3" />
                          admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-bold">
                          client
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-3">
                      {user.hasTaxId ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          {user.taxId}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <XCircle className="w-3 h-3" />
                          {isSpanish ? "Sin EIN" : "Missing"}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-3 text-slate-600 whitespace-nowrap">
                      {formatDate(user.createdAt, locale)}
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-right relative">
                      <button
                        type="button"
                        onClick={() =>
                          setMenuUserId((id) =>
                            id === user.id ? null : user.id
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 text-[10px] font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                        {isSpanish ? "Menú" : "Menu"}
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                      </button>

                      {menuUserId === user.id && (
                        <>
                          <button
                            type="button"
                            className="fixed inset-0 z-20 cursor-default"
                            aria-label="Close menu"
                            onClick={() => setMenuUserId(null)}
                          />
                          <div className="absolute right-4 sm:right-6 top-full mt-1 z-30 w-48 rounded-xl border border-slate-200 bg-white shadow-xl py-1 text-left">
                            <button
                              type="button"
                              onClick={() => openEdit(user)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5 text-slate-400" />
                              {isSpanish ? "Editar usuario" : "Edit User"}
                            </button>
                            <button
                              type="button"
                              onClick={() => openRole(user)}
                              disabled={user.id === currentAdminId}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                            >
                              <UserCog className="w-3.5 h-3.5 text-slate-400" />
                              {isSpanish ? "Cambiar rol" : "Change Role"}
                            </button>
                            <button
                              type="button"
                              onClick={() => openPassword(user)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                              {isSpanish
                                ? "Restablecer contraseña"
                                : "Reset Password"}
                            </button>
                            <button
                              type="button"
                              onClick={() => openDelete(user)}
                              disabled={user.id === currentAdminId}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-40 cursor-pointer border-t border-slate-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              {isSpanish ? "Eliminar" : "Delete User"}
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editUser && (
        <ModalShell
          title={isSpanish ? "Editar usuario" : "Edit User"}
          onClose={() => setEditUser(null)}
        >
          <div className="space-y-3">
            <Field
              label={isSpanish ? "Nombre completo" : "Full Name"}
              value={editForm.fullName}
              onChange={(v) => setEditForm((p) => ({ ...p, fullName: v }))}
            />
            <Field
              label={isSpanish ? "Empresa" : "Company Name"}
              value={editForm.companyName}
              onChange={(v) => setEditForm((p) => ({ ...p, companyName: v }))}
            />
            <Field
              label={isSpanish ? "Teléfono" : "Phone"}
              value={editForm.phone}
              onChange={(v) => setEditForm((p) => ({ ...p, phone: v }))}
            />
          </div>
          <ModalActions
            onCancel={() => setEditUser(null)}
            onConfirm={handleSaveEdit}
            confirmLabel={isSpanish ? "Guardar" : "Save"}
            busy={busyId === editUser.id || isPending}
          />
        </ModalShell>
      )}

      {/* Role modal */}
      {roleUser && (
        <ModalShell
          title={isSpanish ? "Cambiar rol" : "Change Role"}
          onClose={() => setRoleUser(null)}
        >
          <p className="text-xs text-slate-600 mb-3">
            {roleUser.fullName || roleUser.email}
          </p>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            {isSpanish ? "Nuevo rol" : "New role"}
          </label>
          <select
            value={nextRole}
            onChange={(e) => setNextRole(e.target.value as AdminManagedRole)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold bg-white"
          >
            <option value="client">client</option>
            <option value="admin">admin</option>
          </select>
          <ModalActions
            onCancel={() => setRoleUser(null)}
            onConfirm={handleSaveRole}
            confirmLabel={isSpanish ? "Actualizar rol" : "Update Role"}
            busy={busyId === roleUser.id || isPending}
          />
        </ModalShell>
      )}

      {/* Password modal */}
      {passwordUser && (
        <ModalShell
          title={isSpanish ? "Restablecer contraseña" : "Reset Password"}
          onClose={() => setPasswordUser(null)}
        >
          <p className="text-xs text-slate-600 mb-3">
            {passwordUser.email}
          </p>
          <div className="space-y-3">
            <Field
              label={isSpanish ? "Nueva contraseña" : "New password"}
              value={newPassword}
              onChange={setNewPassword}
              type="password"
            />
            <Field
              label={isSpanish ? "Confirmar contraseña" : "Confirm password"}
              value={confirmPassword}
              onChange={setConfirmPassword}
              type="password"
            />
          </div>
          <ModalActions
            onCancel={() => setPasswordUser(null)}
            onConfirm={handleResetPassword}
            confirmLabel={isSpanish ? "Guardar contraseña" : "Set Password"}
            busy={busyId === passwordUser.id || isPending}
          />
        </ModalShell>
      )}

      {/* Delete modal */}
      {deleteUser && (
        <ModalShell
          title={isSpanish ? "Eliminar usuario" : "Delete User"}
          onClose={() => setDeleteUser(null)}
          danger
        >
          <p className="text-sm text-slate-700 leading-relaxed">
            {isSpanish
              ? `¿Eliminar permanentemente a ${deleteUser.fullName || deleteUser.email}? Esta acción no se puede deshacer.`
              : `Permanently delete ${deleteUser.fullName || deleteUser.email}? This cannot be undone.`}
          </p>
          <ModalActions
            onCancel={() => setDeleteUser(null)}
            onConfirm={handleDelete}
            confirmLabel={isSpanish ? "Eliminar" : "Delete"}
            busy={busyId === deleteUser.id || isPending}
            danger
          />
        </ModalShell>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
      />
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
  danger,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h2
            className={`text-lg font-black tracking-tight ${
              danger ? "text-rose-800" : "text-slate-900"
            }`}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({
  onCancel,
  onConfirm,
  confirmLabel,
  busy,
  danger,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  busy?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-2 pt-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={busy}
        className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={busy}
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50 cursor-pointer ${
          danger
            ? "bg-rose-600 hover:bg-rose-700"
            : "bg-slate-900 hover:bg-blue-950"
        }`}
      >
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {confirmLabel}
      </button>
    </div>
  );
}
