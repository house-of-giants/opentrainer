import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { useSignIn } from "@clerk/clerk-expo";

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
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-center px-6"
      >
        <Text className="mb-2 text-3xl font-bold">OpenTrainer</Text>
        <Text className="mb-8 text-base text-neutral-500">
          Sign in to keep training
        </Text>
        <TextInput
          className="mb-3 h-12 rounded-lg border border-neutral-300 px-4"
          placeholder="Email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          className="mb-3 h-12 rounded-lg border border-neutral-300 px-4"
          placeholder="Password"
          secureTextEntry
          autoComplete="current-password"
          value={password}
          onChangeText={setPassword}
        />
        {error && <Text className="mb-3 text-sm text-red-600">{error}</Text>}
        <Pressable
          className="h-12 items-center justify-center rounded-lg bg-violet-600 active:opacity-80"
          onPress={onSignIn}
          disabled={submitting}
        >
          <Text className="text-base font-semibold text-white">
            {submitting ? "Signing in…" : "Sign in"}
          </Text>
        </Pressable>
        <View className="mt-6 flex-row justify-center">
          <Text className="text-neutral-500">New here? </Text>
          <Link href="/(auth)/sign-up" className="font-semibold text-violet-600">
            Create an account
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
