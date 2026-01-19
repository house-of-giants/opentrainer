"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useClerk } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";
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
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
}: DeleteAccountDialogProps) {
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteAccount = useMutation(api.users.deleteAccount);
  const { signOut } = useClerk();

  const isConfirmed = confirmation === "DELETE";

  const handleDelete = async () => {
    if (!isConfirmed) return;

    setIsDeleting(true);
    try {
      await deleteAccount({});
      toast.success("Account deleted successfully");
      onOpenChange(false);
      await signOut();
    } catch {
      toast.error("Failed to delete account. Please try again.");
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setConfirmation("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <DialogTitle>Delete Account</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            This action cannot be undone. This will permanently delete your
            account and all associated data including:
          </DialogDescription>
        </DialogHeader>

        <ul className="text-sm text-muted-foreground space-y-1 pl-4 list-disc">
          <li>All workout history</li>
          <li>All routines</li>
          <li>Training Lab assessments</li>
          <li>Profile and preferences</li>
        </ul>

        <div className="space-y-2 pt-2">
          <p className="text-sm font-medium">
            Type <span className="font-mono text-destructive">DELETE</span> to confirm:
          </p>
          <Input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="Type DELETE to confirm"
            className="font-mono"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
