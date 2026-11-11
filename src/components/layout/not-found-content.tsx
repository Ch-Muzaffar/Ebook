import { Container } from "./container";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";

export function NotFoundContent() {
  return (
    <Container className="py-section">
      <EmptyState
        title="This page isn't on our shelves"
        description="The page you're looking for may have moved or no longer exists."
        action={<LinkButton href="/">Return home</LinkButton>}
      />
    </Container>
  );
}
