/** Badge colours for order statuses (shared by the orders list and detail pages). */
export const STATUS_STYLE: Record<string, string> = {
  paid: "bg-success/10 text-success",
  pending: "bg-beige text-muted",
  refunded: "bg-danger/10 text-danger",
  partially_refunded: "bg-gold/20 text-gold-deep",
  failed: "bg-danger/10 text-danger",
  cancelled: "bg-beige text-muted",
};
