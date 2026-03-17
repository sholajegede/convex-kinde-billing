import { useAction } from "convex/react";
import { useState } from "react";
import type { FunctionReference } from "convex/server";

type GetPortalUrlFn = FunctionReference<
  "action",
  "public",
  { userId: string; returnUrl?: string; orgCode?: string },
  { url: string }
>;

type ManageBillingButtonProps = {
  getPortalUrl: GetPortalUrlFn;
  userId: string;
  returnUrl?: string;
  orgCode?: string;
  children?: React.ReactNode;
  className?: string;
};

export function ManageBillingButton({
  getPortalUrl,
  userId,
  returnUrl,
  orgCode,
  children = "Manage Billing",
  className,
}: ManageBillingButtonProps) {
  const generatePortalUrl = useAction(getPortalUrl);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const { url } = await generatePortalUrl({ userId, returnUrl, orgCode });
      window.location.href = url;
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleClick} disabled={loading} className={className}>
      {loading ? "Loading..." : children}
    </button>
  );
}
