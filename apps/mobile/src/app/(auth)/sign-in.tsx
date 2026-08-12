import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { useSignIn } from "@clerk/clerk-expo";

import { SsoButtons, SsoDivider } from "@/components/auth/sso-buttons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSignIn = async () => {
    if (!isLoaded || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(app)/(tabs)");
      } else {
        setError("Additional verification required. Use the web app to finish setup.");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Sign in failed. Try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-center px-6"
      >
        <Text className="mb-2 text-3xl font-bold text-foreground">
          OpenTrainer
        </Text>
        <Text className="mb-8 text-base text-muted-foreground">
          Sign in to keep training
        </Text>
        <SsoButtons onError={setError} />
        <SsoDivider />
        <Input
          className="mb-3 h-12"
          placeholder="Email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Input
          className="mb-3 h-12"
          placeholder="Password"
          secureTextEntry
          autoComplete="current-password"
          value={password}
          onChangeText={setPassword}
        />
        {error && (
          <Text className="mb-3 text-sm text-destructive">{error}</Text>
        )}
        <Button size="lg" onPress={onSignIn} loading={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
        <View className="mt-6 flex-row justify-center">
          <Text className="text-muted-foreground">New here? </Text>
          <Link href="/(auth)/sign-up" className="font-semibold text-primary">
            Create an account
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
