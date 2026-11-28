import { Suspense } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { GlobalSearchFallback } from "@/components/search/global-search";
import { GlobalSearchLoader } from "@/components/search/global-search-loader";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      search={
        <Suspense fallback={<GlobalSearchFallback />}>
          <GlobalSearchLoader />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  );
}
