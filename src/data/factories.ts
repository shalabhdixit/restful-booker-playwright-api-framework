import type { Booking } from '../apis/booking.api';

function rand(n = 1_000_000): number {
  return Math.floor(Math.random() * n);
}

export function bookingFactory(overrides: Partial<Booking> = {}): Booking {
  const id = rand(999_999);
  const today = new Date();
  const checkin = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const checkout = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  return {
    firstname: overrides.firstname ?? `John${id}`,
    lastname: overrides.lastname ?? `Doe${id}`,
    totalprice: overrides.totalprice ?? (100 + (id % 300)),
    depositpaid: overrides.depositpaid ?? true,
    bookingdates: overrides.bookingdates ?? { checkin: fmt(checkin), checkout: fmt(checkout) },
    additionalneeds: overrides.additionalneeds ?? 'Breakfast',
  };
}
