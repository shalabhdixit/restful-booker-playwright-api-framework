import type { ApiClient } from '../core/apiClient';

export type BookingDates = { checkin: string; checkout: string };

export type Booking = {
  firstname: string;
  lastname: string;
  totalprice: number;
  depositpaid: boolean;
  bookingdates: BookingDates;
  additionalneeds?: string;
};

export type CreateBookingResponse = {
  bookingid: number;
  booking: Booking;
};

export class BookingApi {
  constructor(private readonly client: ApiClient) {}

  getAll(query?: { firstname?: string; lastname?: string; checkin?: string; checkout?: string }) {
    return this.client.get<Array<{ bookingid: number }>>('/booking', { query });
  }

  getById(bookingId: number) {
    return this.client.get<Booking>(`/booking/${bookingId}`, { headers: { 'Accept': 'application/json' } });
  }

  create(booking: Booking) {
    return this.client.post<CreateBookingResponse>('/booking', {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      data: booking,
    });
  }

  update(bookingId: number, booking: Booking, token: string) {
    return this.client.put<Booking>(`/booking/${bookingId}`, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      data: booking,
      cookieToken: token,
    });
  }

  partialUpdate(bookingId: number, patch: Partial<Booking>, token: string) {
    return this.client.patch<Booking>(`/booking/${bookingId}`, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      data: patch,
      cookieToken: token,
    });
  }

  delete(bookingId: number, token: string) {
    return this.client.delete(`/booking/${bookingId}`, { cookieToken: token });
  }
}
