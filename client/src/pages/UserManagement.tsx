import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Shield, Trash2, User, KeyRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function UserManagement() {
  const { data: usersList, refetch } = trpc.users.list.useQuery();
  const [showCreate, setShowCreate] = useState(false);
  const [showResetPw, setShowResetPw] = useState<number | null>(null);

  // Create user form
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "user">("user");

  // Reset password
  const [resetPassword, setResetPassword] = useState("");

  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowCreate(false);
      setNewUsername("");
      setNewPassword("");
      setNewName("");
      setNewRole("user");
      toast.success("تم إنشاء المستخدم بنجاح");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("تم حذف المستخدم");
    },
  });

  const resetPwMutation = trpc.users.resetPassword.useMutation({
    onSuccess: () => {
      refetch();
      setShowResetPw(null);
      setResetPassword("");
      toast.success("تم تغيير كلمة المرور");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCreate = () => {
    if (!newUsername.trim() || !newPassword.trim() || !newName.trim()) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }
    createMutation.mutate({
      username: newUsername.trim(),
      password: newPassword,
      name: newName.trim(),
      role: newRole,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة المستخدمين</h1>
          <p className="text-muted-foreground">إنشاء وإدارة حسابات المستخدمين</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="navy-gradient">
              <Plus className="w-4 h-4 ml-2" />
              مستخدم جديد
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>إنشاء مستخدم جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>الاسم الكامل</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="الاسم" />
              </div>
              <div className="space-y-2">
                <Label>اسم المستخدم</Label>
                <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="اسم المستخدم" dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>كلمة المرور</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="كلمة المرور (6 أحرف على الأقل)" dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>الصلاحية</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as "admin" | "user")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">مستخدم عادي</SelectItem>
                    <SelectItem value="admin">مدير (Admin)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} className="w-full navy-gradient" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                إنشاء المستخدم
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {!usersList || usersList.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              لا يوجد مستخدمون
            </CardContent>
          </Card>
        ) : (
          usersList.map((u) => (
            <Card key={u.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${u.role === "admin" ? "navy-gradient" : "bg-muted"}`}>
                    {u.role === "admin" ? (
                      <Shield className="w-5 h-5 text-white" />
                    ) : (
                      <User className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">
                      @{u.username} | {u.role === "admin" ? "مدير" : "مستخدم"} | آخر دخول: {u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleDateString("ar-SA") : "-"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {/* Reset Password */}
                  <Dialog open={showResetPw === u.id} onOpenChange={(open) => { if (!open) setShowResetPw(null); else setShowResetPw(u.id); }}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <KeyRound className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent dir="rtl">
                      <DialogHeader>
                        <DialogTitle>تغيير كلمة المرور - {u.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label>كلمة المرور الجديدة</Label>
                          <Input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="كلمة المرور الجديدة" dir="ltr" />
                        </div>
                        <Button
                          onClick={() => resetPwMutation.mutate({ userId: u.id, newPassword: resetPassword })}
                          className="w-full"
                          disabled={resetPwMutation.isPending || !resetPassword.trim()}
                        >
                          {resetPwMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                          تغيير كلمة المرور
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      if (confirm(`هل أنت متأكد من حذف المستخدم ${u.name}؟`)) {
                        deleteMutation.mutate({ userId: u.id });
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
