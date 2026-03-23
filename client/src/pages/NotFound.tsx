import { Link } from "wouter";
import { Home, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
          style={{ background: "oklch(0.94 0.01 250)" }}>
          <AlertTriangle size={28} style={{ color: "oklch(0.28 0.09 250)" }} />
        </div>
        <h1 className="text-4xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "oklch(0.28 0.09 250)" }}>
          404
        </h1>
        <p className="text-muted-foreground">Page not found</p>
        <Link href="/">
          <Button style={{ background: "oklch(0.28 0.09 250)" }} className="gap-2">
            <Home size={16} /> Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
