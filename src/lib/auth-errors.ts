/** Turn raw auth errors into a plain-language reason + what to do next. */
export interface FriendlyError {
  title: string;
  description: string;
  code: string;
}

export function explainAuthError(err: { message?: string; status?: number; code?: string } | null | undefined, context: "login" | "reset-request" | "reset-update" | "signup" = "login"): FriendlyError {
  const msg = (err?.message || "").toLowerCase();
  const code = err?.code || "";

  if (msg.includes("invalid login credentials") || code === "invalid_credentials") {
    return {
      code: "invalid_credentials",
      title: "Email or password is incorrect",
      description:
        "Check the spelling of your email and password. If you haven't set a new password since our upgrade, click \"Forgot password?\" to create one.",
    };
  }
  if (msg.includes("email not confirmed") || code === "email_not_confirmed") {
    return {
      code: "email_not_confirmed",
      title: "Please confirm your email first",
      description: "Open the confirmation email we sent you, then sign in again. Check your spam folder too.",
    };
  }
  if (msg.includes("rate limit") || msg.includes("only request this after") || err?.status === 429 || code === "over_email_send_rate_limit") {
    const secs = msg.match(/after (\d+) seconds/)?.[1];
    return {
      code: "rate_limited",
      title: "Too many attempts",
      description: secs
        ? `For your security, please wait ${secs} seconds before trying again.`
        : "For your security, please wait a minute before trying again.",
    };
  }
  if (msg.includes("user not found") || code === "user_not_found") {
    return {
      code: "user_not_found",
      title: "No account with that email",
      description: "Check the email address, or create a new account.",
    };
  }
  if (msg.includes("expired") || msg.includes("invalid") && context === "reset-update" || code === "otp_expired") {
    return {
      code: "link_expired",
      title: "This reset link has expired",
      description: "Reset links work once and expire after a short time. Request a new one from the sign-in page.",
    };
  }
  if (msg.includes("same") && msg.includes("password") || code === "same_password") {
    return {
      code: "same_password",
      title: "Choose a different password",
      description: "Your new password must be different from your old one.",
    };
  }
  if (msg.includes("weak") || msg.includes("password should") || code === "weak_password") {
    return {
      code: "weak_password",
      title: "Password is too weak",
      description: "Use at least 8 characters with upper and lower case letters, a number and a symbol.",
    };
  }
  if (msg.includes("already registered") || code === "user_already_exists") {
    return {
      code: "user_exists",
      title: "This email already has an account",
      description: "Sign in instead, or use \"Forgot password?\" if you can't remember it.",
    };
  }
  if (msg.includes("failed to fetch") || msg.includes("network")) {
    return {
      code: "network",
      title: "Can't reach Prime right now",
      description: "Check your internet connection and try again.",
    };
  }
  return {
    code: code || "unknown",
    title: context === "reset-request" ? "Couldn't send the reset email" : "Something went wrong",
    description: err?.message || "Please try again in a moment. If it keeps happening, contact support.",
  };
}
