"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useState } from "react";

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

function useConvexTemplateAuth() {
  const auth = useAuth();
  return {
    ...auth,
    getToken: (options: Parameters<typeof auth.getToken>[0]) =>
      auth.getToken({ ...options, template: "convex" }),
  };
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => convexUrl ? new ConvexReactClient(convexUrl) : null);
  if (!client) return children;
  if (!publishableKey) return <ConvexProvider client={client}>{children}</ConvexProvider>;

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <ConvexProviderWithClerk client={client} useAuth={useConvexTemplateAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
