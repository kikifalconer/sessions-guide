# Group sessions — production checklist

Click through this on production after `feat/group-sessions` is merged and deployed. It is the live pass. The unit script does not replace it.

0018 was applied 2026-10-26. 0019 was applied 2026-10-30. Both have to be on the production database before you start. The Vercel team is Pro, so `/api/cron/expire-group-holds` stays on `*/15 * * * *` (every 15 minutes). A Hobby plan would have forced that job to once a day.

## Before you start

Use accounts you control.

- An Alchemist Guide, with Google Calendar connected on Practice, and Stripe Connect ready if you will pay on the platform.
- The same Guide after you leave Alchemist, for the downgrade steps. A second Guide who was never Alchemist is enough for the “cannot create” step.
- Two client accounts.
- A 1:1 session that already books, so the last step is a regression check.

Transactional email still depends on TD9. If `RESEND_FROM_EMAIL` is the Resend sandbox sender, mail reaches only the Resend account owner. A 403 from Resend is that gate, not a failed group email. Payments follow whatever Stripe mode production is in (STRIPE-LIVE until go-live).

Public pages show only **Spots available** or **Full**. They never show a capacity, a count, or a seat id.

## 1. Alchemist creates a group session and an event

1. Sign in as the Alchemist Guide. Open Practice (`/dashboard/offerings`).
2. Add a session. Check **Group session**. Set **Max seats** to 2. Use fixed, sliding scale, or donation pricing, and confirmation **instant** or once paid. Save it.
3. On that session, under **Events**, choose **Add event**. Pick an active availability block, a format, a start, and an end inside that block. Seats can be 2. **Create event**.
4. The event stays on the list with `0 of 2 seats taken`.
5. Open the Guide’s Google Calendar. One event is there, titled with the session name, spanning the event’s start and end. It is not one event per seat.
6. Open the public profile (`/[slug]`). The session lists that date. The book page (`/[slug]/book/[sessionTypeId]`) shows the same date and **Spots available**.

Pass: the event exists in Practice and on the calendar, and the public page does not show a number of seats.

If the calendar is connected and the event is missing, Practice shows **Calendar not synced.** and **Retry**. The event itself should still be saved. Retry, then check the calendar again.

## 2. A non-Alchemist cannot add a group session

1. Sign in as a Guide who is not Alchemist.
2. Open Practice and start a new session.

Pass: there is no **Group session** checkbox, and there is no **Add event** button. A new group type is not created.

## 3. A downgraded Guide can only lower seats

1. Back on the Alchemist account, leave Alchemist (billing / membership) so the tier is no longer Alchemist. The group session from step 1 is still there.
2. Edit that session.

Pass: **Group session** stays checked and cannot be turned off. The note reads “This stays a group session. You can lower the seat count.” **Max seats** cannot be raised. Lowering it (still 2 or more) saves. Raising it, if the field allows a try, is refused with “You can lower the seat count, not raise it.”

3. Open the existing event. **Add event** is gone.

Pass: with no clients booked, you can lower **Seats** and save. You cannot raise **Seats** above the session maximum. The calendar event updates to the new time only if you were still allowed to change time (you are, until a client is booked). After a client is booked, only the seat count can change.

## 4. A client books a seat

Use the Alchemist Guide again if step 3 left the account unable to create anything new. The event from step 1 is enough. Put the tier back on Alchemist only if you still need to edit the session upward. Capacity 2 is the case to test.

1. As client A, signed out or signed in, open the book page and choose the date.
2. Sign in with the magic link if asked. The link must bring you back to the same event (`?occurrence=` is kept).
3. Finish booking. Pay on the platform if Connect is ready. Otherwise the seat is arranged with the Guide and is not charged in Stripe.
4. The screen says the seat is confirmed (or reserved, if it is still waiting on payment). My Bookings (`/account/bookings`) shows the session title and the date range in the block’s timezone, not a start time alone.
5. Client A gets one email, “Your seat is confirmed,” with the title, the date range, the format (`In‑person` or Virtual), and the location or the bookings link.
6. The Guide gets one email, “A client booked a seat,” ending in `1 of 2 seats taken`.
7. The public date still says **Spots available**. The Guide’s event says `1 of 2 seats taken`. There is still one calendar event, not a second one for the seat.
8. As client A, try to book the same event again.

Pass: “You already have a seat in this event.” No second charge.

9. As client B, book the last seat and pay.

Pass: the public date now says **Full** and stays listed. The Guide sees `2 of 2 seats taken`. Client B gets their own confirmation. The Guide’s mail says `2 of 2 seats taken`.

10. As a third client, try to book.

Pass: “This event is full.” No charge.

## 5. An abandoned hold frees a seat

Use a new event with 2 seats, or cancel the seats from step 4 first and use that event again (see step 7 if you cancel the whole event).

1. As client A, book and pay, so one seat is taken.
2. As client B, go as far as the payment step and stop. Do not pay. Do not finish.
3. Reload the public book page while that hold is under 30 minutes old.

Pass: the date says **Full**. The Guide’s count includes the unpaid hold.

4. Wait until the hold is older than 30 minutes. Reload the public book page without anyone else booking.

Pass: the date says **Spots available** again. The page treats a stale unpaid hold as free even before the row is deleted.

5. Wait for the next cron, which runs every 15 minutes, so this is at most about 15 minutes after the hold turns 30 minutes old. Reload Practice.

Pass: the Guide’s count drops. The hold is cancelled with reason `payment_abandoned`, and its PaymentIntent is cancelled in Stripe. An offsite seat is not cancelled by this job.

## 6. The Guide adds a client who paid directly

1. On a scheduled event that is not full, fill **Add a client who paid you directly** with a name and an email. **Add seat**.
2. The row appears as **Paid directly**. The seat count goes up by one. No Stripe payment is created.
3. If the event was one seat short of full, the public date says **Full**.
4. **Remove** that seat.

Pass: the count goes down. That client gets one email, “Your seat was cancelled,” saying they paid the Guide directly and no refund is sent from the platform. Stripe shows no refund. The seat stays gone until you add it again. It is not cleared by the 30-minute cron.

Adding the same email again to the same event is refused: “That client already has a seat in this event.”

## 7. A client cancels their own seat

1. From client A’s confirmation email, open the cancel link and confirm.

Pass: client A gets the existing cancellation email. The Guide gets that same cancellation, plus a closing line `X of N seats taken` for the seats still held. The public date shows **Spots available** if a seat is now open. My Bookings no longer shows it as an upcoming seat.

## 8. The Guide cancels the event

1. Book at least two seats again (one paid on the platform, and one **Paid directly** if you still want both refund wordings).
2. On the event, choose **Cancel event**. The note says each client is refunded.
3. Confirm.

Pass, when every refund succeeds:

- Each seated client gets one email, “This event was cancelled,” with the title, the date range, the format, and the refund status. Paid-on-platform clients see the refund amount. The direct-pay client sees that no platform refund is sent. Nobody gets a second, older “your session has been cancelled” mail for the same seat.
- The Guide does not get one cancellation email per seat.
- Stripe shows one refund per paid seat, on the connected account. The direct-pay seat has no refund.
- Practice shows the event as **Cancelled**.
- The Google Calendar event is deleted.
- The public profile and book page no longer list it.

If a refund fails, the event stays **Cancelling**, that client stays listed with “The refund for {name} did not go through,” and **Retry refund** tries again. It becomes **Cancelled** only after every seat is resolved. A seat already marked completed is not refunded and does not keep the event open.

If the calendar delete fails, the cancelled event still shows **Calendar not synced.** and **Retry**.

## 9. A 1:1 booking still works

1. On the same Guide, open a session that is not a group session (no **Group session** check, duration in minutes on the profile).
2. As a client, choose a date and a time, sign in, and pay or complete the offsite path.
3. The screen says the session is confirmed or reserved. My Bookings shows the start time, not a start-to-end range.
4. The client and the Guide get the existing 1:1 emails, not “A client booked a seat.”
5. The Guide’s calendar gets one event for that booking.
6. Cancel from the link in the client’s email.

Pass: the booking cancels, the refund follows the cancellation policy, and that booking’s calendar event is removed. The group event from the earlier steps is untouched.

## Record

| Step | Pass | Notes |
|---|---|---|
| 1. Create type and event, calendar event appears | | |
| 2. Non-Alchemist cannot add a group | | |
| 3. Downgrade can only lower seats | | |
| 4. Book, one seat per client, Full, emails | | |
| 5. Abandoned hold frees the public seat, then the Guide count | | |
| 6. Offsite seat, no Stripe, no refund on remove | | |
| 7. Client cancels their own seat | | |
| 8. Guide cancels the event | | |
| 9. 1:1 still books and cancels | | |
