/**
 * LoginPage — JWT authentication
 * Design: Dark navy background with circuit board image, centered card
 */
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, Wrench } from "lucide-react";

const BG_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663453495778/dMbiKHJ2Q6wcUfaeSgxuHX/pos-login-bg-EK5nJiYYXZ2mrnSYvDQQTU.webp";
const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663453495778/dMbiKHJ2Q6wcUfaeSgxuHX/repair-shop-icon-nNFFAMRbxyYHqX8entLyVP.webp";

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const ok = await login(email, password);
    if (!ok) setError("Invalid email or password. Please try again.");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative"
      style={{
        backgroundImage: `url(${BG_URL})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{ background: "oklch(0.1 0.06 250 / 0.75)" }}
      />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-md mx-4 rounded-2xl p-8 shadow-2xl animate-fade-in-up"
        style={{
          background: "oklch(1 0 0 / 0.97)",
          backdropFilter: "blur(20px)",
          border: "1px solid oklch(0.88 0.008 250)",
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img
            src={LOGO_URL}
            alt="PhonefixPOS"
            className="w-16 h-16 rounded-xl mb-4 shadow-lg"
          />
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            PhonefixPOS
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Mobile Repair Shop Management
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Example@email.com"
              required
              autoComplete="email"
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                className="h-11 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-11 text-sm font-semibold"
            disabled={isLoading}
            style={{ background: "oklch(0.28 0.09 250)" }}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" /> Signing
                in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
