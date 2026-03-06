import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Settings as SettingsIcon, User, Mail, ShieldAlert } from "lucide-react";
import { DeleteDataButton } from "./delete-data-button";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
          <SettingsIcon className="size-8 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground text-sm font-medium">
          Manage your account preferences and workout data.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Profile Card */}
        <Card className="border-none shadow-xl shadow-primary/5 bg-gradient-to-br from-card to-muted/20">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <User className="size-5 text-primary" />
              Profile
            </CardTitle>
            <CardDescription className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Your account details</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-2 space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/40 border border-muted-foreground/10">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                <Mail className="size-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Email Address</p>
                <p className="font-bold truncate text-foreground">{user.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Management Card */}
        <Card className="border-none shadow-xl shadow-destructive/5 overflow-hidden">
          <CardHeader className="p-6 pb-2 border-b border-destructive/10 bg-destructive/5">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-destructive">
              <ShieldAlert className="size-5" />
              Data Management
            </CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-widest text-destructive/60">Handle with care</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-8 space-y-6">
            <div className="space-y-2">
              <h3 className="font-bold text-foreground">Clear All Data</h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                Want a fresh start? This will delete all your workout logs, routines, exercises, and all data associated with your account. 
                This action is irreversible.
              </p>
            </div>
            <DeleteDataButton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
