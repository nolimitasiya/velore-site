import { ReactNode } from "react";

import AccountShell from "./AccountShell";

type Props = {
  children: ReactNode;
};

export default function AuthenticatedAccountLayout({
  children,
}: Props) {
  return (
    <AccountShell>
      {children}
    </AccountShell>
  );
}