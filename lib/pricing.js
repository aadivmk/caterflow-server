const safe = (n) => (Number.isFinite(n) ? n : 0);

export function computePricing(input) {
  const subtotal = safe(input.guestCount) * safe(input.pricePerPerson);
  const totalPrice = Math.max(0, subtotal + safe(input.additionalCharges) - safe(input.discount));
  const advance = safe(input.advanceAmount);
  const remainingBalance = Math.max(0, totalPrice - advance);
  const paymentStatus = advance <= 0 ? "Unpaid" : advance >= totalPrice ? "Paid" : "Advance Paid";
  return { subtotal, totalPrice, remainingBalance, paymentStatus };
}

export function menuPricePerPerson(menu, items) {
  const byId = new Map(items.map((item) => [item.id, item]));
  return menu.itemIds.reduce((sum, id) => sum + (byId.get(id)?.pricePerPerson ?? 0), 0);
}
