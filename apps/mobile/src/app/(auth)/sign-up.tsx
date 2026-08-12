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
import { useSignUp } from "@clerk/clerk-expo";

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSignUp = async () => {
    if (!isLoaded || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const onVerify = async () => {
    if (!isLoaded || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(app)/(tabs)");
      } else {
        setError("Verification incomplete. Check the code and try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
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
        <Text className="mb-2 text-3xl font-bold">Create your account</Text>
        <Text className="mb-8 text-base text-neutral-500">
          Free while OpenTrainer is in alpha
        </Text>
        {pendingVerification ? (
          <>
            <Text className="mb-3 text-neutral-600">
              We emailed a verification code to {email}.
            </Text>
            <TextInput
              className="mb-3 h-12 rounded-lg border border-neutral-300 px-4"
              placeholder="Verification code"
              keyboardType="number-pad"
              value={code}
              onChangeText={setCode}
            />
            {error && (
              <Text className="mb-3 text-sm text-red-600">{error}</Text>
            )}
            <Pressable
              className="h-12 items-center justify-center rounded-lg bg-violet-600 active:opacity-80"
              onPress={onVerify}
              disabled={submitting}
            >
              <Text className="text-base font-semibold text-white">
                {submitting ? "Verifying…" : "Verify email"}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
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
              autoComplete="new-password"
              value={password}
              onChangeText={setPassword}
            />
            {error && (
              <Text className="mb-3 text-sm text-red-600">{error}</Text>
            )}
            <Pressable
              className="h-12 items-center justify-center rounded-lg bg-violet-600 active:opacity-80"
              onPress={onSignUp}
              disabled={submitting}
            >
              <Text className="text-base font-semibold text-white">
                {submitting ? "Creating account…" : "Sign up"}
              </Text>
            </Pressable>
          </>
        )}
        <View className="mt-6 flex-row justify-center">
          <Text className="text-neutral-500">Already have an account? </Text>
          <Link href="/(auth)/sign-in" className="font-semibold text-violet-600">
            Sign in
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
