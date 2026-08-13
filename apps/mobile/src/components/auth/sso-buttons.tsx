import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useSignIn, useSignUp } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";

import { Button } from "@/components/ui/button";

// Completes any pending auth session when the browser redirects back into
// the app; must run at module scope on the screens that start SSO flows.
WebBrowser.maybeCompleteAuthSession();

function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}

interface SsoButtonsProps {
  /** Rendered under the buttons when a flow errors. */
  onError?: (message: string) => void;
}

// Custom OAuth flow using Clerk primitives directly instead of
// useSSO().startSSOFlow. The hook's reload step was failing with a
// server-side `signed_out` (rotating client token not re-synced after the
// browser hop); owning the flow lets us parse the callback nonce robustly,
// instrument each step, and recover deliberately.
export function SsoButtons({ onError }: SsoButtonsProps) {
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const signInWithGoogle = useCallback(async () => {
    if (busy || !signInLoaded || !signUpLoaded || !signIn || !signUp) return;
    setBusy(true);
    try {
      const redirectUrl = AuthSession.makeRedirectUri();

      await signIn.create({ strategy: "oauth_google", redirectUrl });
      const externalUrl =
        signIn.firstFactorVerification.externalVerificationRedirectURL;
      if (!externalUrl) {
        onError?.("Could not start Google sign-in. Try again.");
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(
        externalUrl.toString(),
        redirectUrl,
        // Ephemeral: never share Safari's cookie jar with the auth session.
        { preferEphemeralSession: true } as WebBrowser.AuthSessionOpenOptions,
      );
      if (result.type !== "success" || !result.url) {
        return; // user dismissed the browser
      }

      // Parse the nonce without relying on the URL API (regex is immune to
      // any RN URL polyfill quirks).
      const match = /[?&#]rotating_token_nonce=([^&#]+)/.exec(result.url);
      // ROOT CAUSE (found via build #19 evidence dump): with a bare-scheme
      // redirect URL (opentrainer://), Clerk's callback appends a stray
      // encoded "#" (%23) to the nonce value. Sending it back corrupted makes
      // FAPI reject the reload with `signed_out` (the rotated client token
      // never re-syncs). Nonces are alphanumeric — strip everything else.
      const rotatingTokenNonce = match
        ? decodeURIComponent(match[1]).replace(/[^A-Za-z0-9]/g, "")
        : "";

      await signIn.reload(
        rotatingTokenNonce ? { rotatingTokenNonce } : undefined,
      );

      if (signIn.status === "complete" && signIn.createdSessionId) {
        await setActive({ session: signIn.createdSessionId });
        router.replace("/(app)/(tabs)");
        return;
      }

      // New-user path: the external account verified but no user exists yet —
      // transfer the verification onto a sign-up, which mints the session on
      // this client.
      if (signIn.firstFactorVerification.status === "transferable") {
        await signUp.create({ transfer: true });
        if (signUp.status === "complete" && signUp.createdSessionId) {
          await setActive({ session: signUp.createdSessionId });
          router.replace("/(app)/(tabs)");
          return;
        }
      }

      onError?.(
        `Sign-in needs another step (${signIn.status ?? "unknown"}). ` +
          "Try again, or sign in on opentrainer.app first.",
      );
    } catch (err) {
      onError?.(
        err instanceof Error ? err.message : "Google sign-in failed. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }, [busy, signInLoaded, signUpLoaded, signIn, signUp, setActive, router, onError]);

  return (
    <View className="gap-3">
      <Button
        variant="outline"
        onPress={signInWithGoogle}
        loading={busy}
        accessibilityLabel="Continue with Google"
      >
        {!busy && <GoogleLogo />}
        <Text className="text-base font-medium text-foreground">
          Continue with Google
        </Text>
      </Button>
    </View>
  );
}

export function SsoDivider() {
  return (
    <View className="my-5 flex-row items-center gap-3">
      <View className="h-px flex-1 bg-border" />
      <Text className="text-xs uppercase text-muted-foreground">
        or continue with email
      </Text>
      <View className="h-px flex-1 bg-border" />
    </View>
  );
}
