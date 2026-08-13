import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useSSO } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

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

export function SsoButtons({ onError }: SsoButtonsProps) {
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const signInWithGoogle = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { createdSessionId, setActive, signIn, signUp, authSessionResult } =
        await startSSOFlow({
          strategy: "oauth_google",
          redirectUrl: AuthSession.makeRedirectUri(),
          // Ephemeral session: never share Safari's cookie jar. With shared
          // cookies, an existing web session at clerk.opentrainer.app makes the
          // OAuth callback bind the new session to the BROWSER's client, and
          // activating it from the app's client 401s ("You are signed out").
          // clerk-expo's type only exposes showInRecents, but the object is
          // passed straight through to WebBrowser.openAuthSessionAsync.
          authSessionOptions: {
            preferEphemeralSession: true,
          } as { showInRecents?: boolean },
        });
      // TEMP DIAGNOSTIC (visible in TestFlight; remove after SSO stabilizes)
      const cbParams =
        authSessionResult && "url" in authSessionResult && authSessionResult.url
          ? [...new URL(authSessionResult.url).searchParams.keys()].join(",")
          : "none";
      toast.info(
        "diag: sso callback",
        `params: ${cbParams} · signIn: ${signIn?.status ?? "-"} · signUp: ${signUp?.status ?? "-"}`,
      );
      // Diagnostic for the SSO handshake (visible in metro; harmless in prod).
      console.log(
        "[sso] result",
        JSON.stringify({
          createdSessionId,
          authSession: authSessionResult?.type,
          url: authSessionResult && "url" in authSessionResult ? authSessionResult.url : null,
          signIn: signIn && {
            status: signIn.status,
            firstFactor: signIn.firstFactorVerification?.status,
            error: signIn.firstFactorVerification?.error?.longMessage,
          },
          signUp: signUp && {
            status: signUp.status,
            missing: signUp.missingFields,
            extAccount: signUp.verifications?.externalAccount?.status,
            extError: signUp.verifications?.externalAccount?.error?.longMessage,
          },
        }),
      );

      // BUG WORKAROUND (clerk-expo 2.20.0): startSSOFlow returns
      // `signUp.createdSessionId ?? signIn.createdSessionId`, but the signUp
      // resource is sticky on the Clerk client — after a sign-out, a previous
      // registration's stale (revoked) session id shadows the fresh sign-in's
      // one, and activating it throws "You are signed out". Only trust a
      // session id from a resource whose status is complete *now*.
      const freshSessionId =
        (signIn?.status === "complete" ? signIn.createdSessionId : null) ??
        (signUp?.status === "complete" ? signUp.createdSessionId : null) ??
        null;

      if (freshSessionId && setActive) {
        await setActive({ session: freshSessionId });
        router.replace("/(app)/(tabs)");
        return;
      }

      // First-time Google users come back as an incomplete sign-up whose
      // external account is already verified — completing it mints the session
      // (Clerk "transfer" flow).
      if (
        setActive &&
        signUp?.verifications?.externalAccount?.status === "verified" &&
        signUp.status === "missing_requirements" &&
        signUp.missingFields.length === 0
      ) {
        const completed = await signUp.update({});
        if (completed.status === "complete" && completed.createdSessionId) {
          await setActive({ session: completed.createdSessionId });
          router.replace("/(app)/(tabs)");
          return;
        }
      }

      // Anything else that isn't a plain browser dismissal: surface the state
      // so failures are debuggable instead of silent.
      if (signIn?.status || signUp?.status) {
        onError?.(
          `Sign-in needs another step (${signIn?.status ?? signUp?.status}). ` +
            "Try again, or sign in on opentrainer.app first.",
        );
      }
    } catch (err) {
      onError?.(
        err instanceof Error ? err.message : "Google sign-in failed. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }, [busy, startSSOFlow, router, onError]);

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
