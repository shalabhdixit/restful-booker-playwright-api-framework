import { test, expectOk, expect } from '../src/fixtures/apiTest';
import { bookingFactory } from '../src/data/factories';

test.describe('Booking lifecycle', () => {
  test('Create -> Get -> Update -> Patch -> Delete @regression', async ({ bookingApi, token }) => {
    const booking = bookingFactory();

    const createResp = await bookingApi.create(booking);
    expectOk(createResp);
    const bookingId = createResp.bodyJson?.bookingid;
    expect(bookingId).toBeTruthy();

    const getResp = await bookingApi.getById(bookingId!);
    expectOk(getResp);
    expect(getResp.bodyJson?.firstname).toBe(booking.firstname);

    const updated = bookingFactory({ firstname: booking.firstname + '_Updated' });
    const putResp = await bookingApi.update(bookingId!, updated, token);
    expectOk(putResp);
    expect(putResp.bodyJson?.firstname).toBe(updated.firstname);

    const patchResp = await bookingApi.partialUpdate(bookingId!, { additionalneeds: 'Late Checkout' }, token);
    expectOk(patchResp);
    expect(patchResp.bodyJson?.additionalneeds).toBe('Late Checkout');

    const delResp = await bookingApi.delete(bookingId!, token);
    expect(delResp.status).toBe(201);

    const getAfterDel = await bookingApi.getById(bookingId!);
    expect(getAfterDel.status).toBe(404);
  });
});
