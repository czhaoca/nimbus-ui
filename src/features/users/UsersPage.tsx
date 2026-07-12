"use client";

/**
 * User management (admin CRUD) — feature module since #42 (the GAP-001
 * material-touch migration). The table renders contract-real fields only:
 * /api/v1 exposes no creation time, so there is no Created column. The
 * engine enforces the admin tier server-side; UI gating stays cosmetic.
 */
import { useState, useEffect, useCallback } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { createUser, deleteUser, listUsers, updateUser } from "./api";
import { ROLES, type Role, type User } from "./types";
import { ConfirmModal } from "@/components/ConfirmModal";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /* create form */
  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("viewer");
  const [creating, setCreating] = useState(false);

  /* password change */
  const [pwUserId, setPwUserId] = useState<string | null>(null);
  const [newPw, setNewPw] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  /* delete */
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // listUsers is UserOut[]-typed end to end — no cast (#42/GAP-004).
      setUsers(await listUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async () => {
    if (!newUsername.trim() || !newPassword.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await createUser({
        username: newUsername.trim(),
        email: newEmail.trim() || null,
        password: newPassword,
        role: newRole,
      });
      setNewUsername("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("viewer");
      setShowCreate(false);
      setSuccess("User created successfully");
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteUser(deleteTarget.id);
      setDeleteTarget(null);
      setSuccess("User deleted");
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  const handleRoleChange = async (userId: string, role: Role) => {
    setError(null);
    try {
      // Contract exposes PUT (not PATCH) for user updates.
      await updateUser(userId, { role });
      setSuccess("Role updated");
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    }
  };

  const handlePasswordChange = async () => {
    if (!pwUserId || !newPw.trim()) return;
    setChangingPw(true);
    setError(null);
    try {
      // Per-user password change rides the user-update endpoint; the old
      // /users/{id}/password route has no /api/v1 equivalent.
      await updateUser(pwUserId, { password: newPw });
      setPwUserId(null);
      setNewPw("");
      setSuccess("Password changed successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        action={
          <Button
            size="sm"
            variant={showCreate ? "outline" : "default"}
            onClick={() => setShowCreate(!showCreate)}
          >
            {showCreate ? "Cancel" : "Add User"}
          </Button>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Create form */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Create User</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-username">Username</Label>
                <Input
                  id="new-username"
                  placeholder="Username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-email">Email</Label>
                <Input
                  id="new-email"
                  placeholder="Email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Password</Label>
                <Input
                  id="new-password"
                  placeholder="Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={newRole}
                  onValueChange={(v) => setNewRole(v as Role)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              disabled={creating || !newUsername.trim() || !newPassword.trim()}
              onClick={handleCreate}
            >
              {creating ? "Creating..." : "Create"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Password change dialog */}
      <Dialog
        open={!!pwUserId}
        onOpenChange={(open) => {
          if (!open) {
            setPwUserId(null);
            setNewPw("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Change Password for {users.find((u) => u.id === pwUserId)?.username}
            </DialogTitle>
            <DialogDescription>
              Enter a new password for this user account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-pw">New Password</Label>
            <Input
              id="new-pw"
              placeholder="New password"
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPwUserId(null);
                setNewPw("");
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={changingPw || !newPw.trim()}
              onClick={handlePasswordChange}
            >
              {changingPw ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Users table */}
      {loading ? (
        <Card>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ) : users.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">No users found.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.username}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.email || "—"}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={u.role}
                      onValueChange={(v) => handleRoleChange(u.id, v as Role)}
                    >
                      <SelectTrigger size="sm" className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={u.is_active ? "default" : "secondary"}
                      className={
                        u.is_active
                          ? "bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {u.is_active ? "active" : "disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPwUserId(u.id);
                          setNewPw("");
                        }}
                      >
                        Change PW
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteTarget(u)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Confirm delete modal */}
      {deleteTarget && (
        <ConfirmModal
          title="Delete User"
          message={
            <>
              Are you sure you want to delete user <strong>{deleteTarget.username}</strong>? This action cannot be undone.
            </>
          }
          confirmLabel="Delete"
          confirmVariant="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
