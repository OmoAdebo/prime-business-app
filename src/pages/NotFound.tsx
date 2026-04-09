import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { PublicNavbar } from "@/components/PublicNavbar";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-2xl mb-2">
            404
          </div>
          <h1 className="text-2xl font-bold font-display text-foreground">Page not found</h1>
          <p className="text-muted-foreground">
            The page <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{location.pathname}</code> doesn't exist or has been moved.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button asChild>
              <Link to="/"><Home className="h-4 w-4 mr-2" />Go Home</Link>
            </Button>
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />Go Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
