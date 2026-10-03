import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import {
  getSafeWorkspaceInvitationEmail,
  getWorkspaceInvitationAuthPath,
  getSafeWorkspaceInvitationReturnPath,
} from "@/src/server/auth/safe-workspace-invitation-return";
import { NO_INDEX_ROBOTS } from "@/src/seo/site-metadata";

export const metadata = {
  title: "Sign In",
  robots: NO_INDEX_ROBOTS,
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const redirectValue = Array.isArray(params.redirect_url)
    ? params.redirect_url[0]
    : params.redirect_url;
  const emailValue = Array.isArray(params.email) ? params.email[0] : params.email;
  const workspaceInvitationRedirect = getSafeWorkspaceInvitationReturnPath(redirectValue);
  const workspaceInvitationEmail = getSafeWorkspaceInvitationEmail(emailValue);
  const workspaceInvitationSignUpUrl = workspaceInvitationRedirect
    ? getWorkspaceInvitationAuthPath("/sign-up", workspaceInvitationRedirect, workspaceInvitationEmail)
    : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAFAF8] px-4 py-12">
      <div className="w-full max-w-[430px]">
        <AuthBrand />
        <SignIn
          fallbackRedirectUrl={workspaceInvitationRedirect ?? "/dashboard"}
          forceRedirectUrl={workspaceInvitationRedirect ?? undefined}
          initialValues={
            workspaceInvitationEmail ? { emailAddress: workspaceInvitationEmail } : undefined
          }
          path="/sign-in"
          routing="path"
          signUpFallbackRedirectUrl={workspaceInvitationRedirect ?? "/dashboard"}
          signUpForceRedirectUrl={workspaceInvitationRedirect ?? undefined}
          signUpUrl={workspaceInvitationSignUpUrl ?? "/sign-up"}
        />
      </div>
    </main>
  );
}

function AuthBrand() {
  return (
    <div className="mb-8 text-center">
      <Link
        className="font-serif text-[28px] leading-none text-[#1C1C1C]"
        href="/"
      >
        Tied Forever
      </Link>
      <p className="mt-2 text-[11px] font-medium tracking-[0.14em] text-[#7A7A6E]">
        WEDDING PLANNER
      </p>
    </div>
  );
}
