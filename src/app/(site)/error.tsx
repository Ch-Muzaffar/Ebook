"use client";

import { useEffect } from "react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";

export default function SiteError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    // Replace with an error-reporting service in Phase 8.
    console.error(error);
  }, [error]);

  return (
    <Container className="py-section">
      <ErrorState action={<Button onClick={() => retry()}>Try again</Button>} />
    </Container>
  );
}
