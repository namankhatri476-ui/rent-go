import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const nameSchema = z.string().min(2, "Name must be at least 2 characters");

type AuthMode = "login" | "signup";

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, user, isLoading: authLoading, isAdmin } = useAuth();
  const { settings: platformSettings } = usePlatformSettings();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!authLoading && user) {
      const from = (location.state as any)?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
      } else if (isAdmin) {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [user, authLoading, navigate, location, isAdmin]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
    setFormError("");
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    try { emailSchema.parse(formData.email); } catch (e: any) { newErrors.email = e.errors[0].message; }
    try { passwordSchema.parse(formData.password); } catch (e: any) { newErrors.password = e.errors[0].message; }
    if (mode === "signup") {
      try { nameSchema.parse(formData.name); } catch (e: any) { newErrors.name = e.errors[0].message; }
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    setFormError("");

    try {
      if (mode === "login") {
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          setFormError(error.message.includes("Invalid login credentials") ? "Invalid email or password" : error.message);
        }
      } else {
        const { error } = await signUp(formData.email, formData.password, formData.name, {
          userType: 'customer',
          redirectTo: `${window.location.origin}/`,
        });
        if (error) {
          setFormError(error.message.includes("User already registered") ? "An account with this email already exists. Please sign in instead." : error.message);
        } else {
          setSignupSuccess(true);
          setTimeout(() => setSignupSuccess(false), 8000);
        }
      }
    } catch {
      setFormError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/5" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="relative w-full max-w-md mx-4 z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          {platformSettings.logoUrl ? (
            <img src={platformSettings.logoUrl} alt={platformSettings.platformName} className="h-10 w-auto mx-auto object-contain" />
          ) : (
            <h1 className="text-3xl font-bold text-primary">{platformSettings.platformName}</h1>
          )}
        </div>

        {/* Success Message */}
        {signupSuccess && (
          <div className="mb-6 p-4 bg-success/10 border border-success/30 rounded-xl flex items-start gap-3 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-success text-sm">Account created successfully!</p>
              <p className="text-xs text-muted-foreground mt-1">Please check your email to verify your account. You can then log in.</p>
            </div>
          </div>
        )}

        {/* Glassmorphism Card */}
        <div className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border/50 p-8 shadow-xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {mode === "login" ? "Sign in to continue" : "Join as a customer"}
            </p>
          </div>

          {formError && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-medium">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="name" name="name" placeholder="John Doe" className="pl-10 h-11 rounded-xl bg-muted/50 border-border/50" value={formData.name} onChange={handleInputChange} />
                </div>
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" name="email" type="email" placeholder="you@example.com" className="pl-10 h-11 rounded-xl bg-muted/50 border-border/50" value={formData.email} onChange={handleInputChange} />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" className="pl-10 pr-10 h-11 rounded-xl bg-muted/50 border-border/50" value={formData.password} onChange={handleInputChange} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-medium">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="••••••••" className="pl-10 h-11 rounded-xl bg-muted/50 border-border/50" value={formData.confirmPassword} onChange={handleInputChange} />
                </div>
                {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
              </div>
            )}

            {mode === "login" && (
              <div className="text-right">
                <button type="button" onClick={async () => {
                  if (!formData.email) { setFormError("Please enter your email address first"); return; }
                  try {
                    const { error } = await supabase.auth.resetPasswordForEmail(formData.email, { redirectTo: `${window.location.origin}/reset-password` });
                    if (error) throw error;
                    setFormError("");
                  } catch (error: any) { setFormError(error.message || "Failed to send reset link"); }
                }} className="text-xs text-primary hover:underline">
                  Forgot password?
                </button>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full gap-2 h-11 rounded-xl" disabled={isLoading}>
              {isLoading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/50" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card/80 px-2 text-muted-foreground">Or</span></div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>Don't have an account?{" "}<button type="button" onClick={() => { setMode("signup"); setSignupSuccess(false); setFormError(""); }} className="text-primary font-medium hover:underline">Sign up</button></>
            ) : (
              <>Already have an account?{" "}<button type="button" onClick={() => { setMode("login"); setSignupSuccess(false); setFormError(""); }} className="text-primary font-medium hover:underline">Sign in</button></>
            )}
          </p>
        </div>

        <div className="text-center mt-6">
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to home</a>
        </div>
      </div>
    </div>
  );
};

export default Auth;
