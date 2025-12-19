import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";

interface PasswordConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (password: string) => Promise<void>;
  title?: string;
  description?: string;
  confirmButtonText?: string;
}

export function PasswordConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Confirm Action",
  description = "Please enter your password to confirm this action.",
  confirmButtonText = "Confirm",
}: PasswordConfirmDialogProps) {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      setError("Password is required");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await onConfirm(password);
      // Reset state on success
      setPassword("");
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Incorrect password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setPassword("");
    setError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning-600" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                disabled={isLoading}
                autoComplete="current-password"
                data-testid="input-confirm-password"
              />
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400" data-testid="password-error">
                  {error}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
              data-testid="button-cancel-password"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isLoading || !password}
              data-testid="button-confirm-password"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {confirmButtonText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


