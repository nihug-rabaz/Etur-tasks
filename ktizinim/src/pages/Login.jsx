import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Mail, Lock, Loader2 } from "lucide-react";
import GoogleIcon from "@/components/GoogleIcon";
import { useOrgSettings } from "@/hooks/useOrgSettings";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { settings } = useOrgSettings();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "אימייל או סיסמה שגויים");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => base44.auth.loginWithProvider("google", "/");

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-body">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="לוגו" className="w-14 h-14 object-contain rounded-2xl mx-auto mb-4" />
          ) : (
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-primary-foreground" />
            </div>
          )}
          <h1 className="font-display text-2xl font-bold text-primary">{settings?.unit_name || 'מדור איתור'}</h1>
          <p className="text-slate-500 mt-1 text-sm">מערכת ניהול יום מיונים קציני דת</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <h2 className="font-bold text-lg mb-6">כניסה למערכת</h2>

          <Button variant="outline" className="w-full h-11 text-sm font-medium mb-5" onClick={handleGoogle}>
            <GoogleIcon className="w-4 h-4 ml-2" />
            המשך עם Google
          </Button>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-slate-400">או</span></div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-700 text-sm border border-rose-100">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">כתובת מייל</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input id="email" type="email" autoComplete="email" autoFocus
                  placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)}
                  className="pr-10 h-11" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">סיסמה</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">שכחת סיסמה?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input id="password" type="password" autoComplete="current-password"
                  placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
                  className="pr-10 h-11" required />
              </div>
            </div>

            <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" />מתחבר...</> : 'כניסה'}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            אין לך חשבון?{' '}
            <Link to="/register" className="text-primary font-medium hover:underline">צור חשבון</Link>
          </p>
        </div>
      </div>
    </div>
  );
}