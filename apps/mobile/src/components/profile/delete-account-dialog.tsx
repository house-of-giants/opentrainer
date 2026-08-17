import { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useClerk, useUser } from "@clerk/clerk-expo";
import { useMutation } from "convex/react";
import { api } from "@opentrainer/backend";
import { AlertTriangle } from "lucide-react-native";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { useTheme } from "@/theme/theme-provider";

// Port of apps/web/src/components/profile/delete-account-dialog.tsx.
const DELETED_DATA = [
  "All workout history",
  "All routines",
  "Training Lab assessments",
  "Profile and preferences",
];

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
}: DeleteAccountDialogProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteAccount = useMutation(api.users.deleteAccount);
  const { signOut } = useClerk();
  const { user } = useUser();

  const isConfirmed = confirmation === "DELETE";

  const handleDelete = async () => {
    if (!isConfirmed || !user) return;

    setIsDeleting(true);
    try {
      await deleteAccount({});
      await user.delete();
      toast.success("Account deleted successfully");
      onOpenChange(false);
      await signOut();
      // Web relies on Clerk's redirect; expo-router needs the push itself.
      router.replace("/(auth)/sign-in");
    } catch {
      toast.error("Failed to delete account. Please try again.");
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setConfirmation("");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogHeader>
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle size={20} color={colors.destructive} />
          </View>
          <DialogTitle>Delete Account</DialogTitle>
        </View>
        <DialogDescription className="pt-2">
          This action cannot be undone. This will permanently delete your account
          and all associated data including:
        </DialogDescription>
      </DialogHeader>

      <View className="gap-1 pl-4">
        {DELETED_DATA.map((item) => (
          <Text key={item} className="text-sm text-muted-foreground">
            {`• ${item}`}
          </Text>
        ))}
      </View>

      <View className="gap-2 pt-2">
        <Text className="text-sm font-medium text-foreground">
          Type DELETE to confirm:
        </Text>
        <Input
          value={confirmation}
          onChangeText={setConfirmation}
          placeholder="Type DELETE to confirm"
          autoCapitalize="characters"
          autoCorrect={false}
          accessibilityLabel="Delete confirmation"
        />
      </View>

      <DialogFooter className="gap-3 pt-4">
        <Button
          variant="outline"
          onPress={() => handleOpenChange(false)}
          disabled={isDeleting}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onPress={handleDelete}
          disabled={!isConfirmed || isDeleting}
        >
          {isDeleting ? "Deleting..." : "Delete Account"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
