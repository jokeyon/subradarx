# Renewal reminders — time and timezone

- **Charge dates** are stored as calendar days in local time (`yyyy-MM-dd`), parsed with `date-fns` on the device.
- **Reminder fire time** is computed in `lib/renewalMath.ts` as **09:00 local** on the reminder day (the day that is `reminderDays` **before** the next charge day; `0` means same calendar day as the charge).
- **Notifications** use the OS scheduler (`expo-notifications`); the trigger date uses the device’s local timezone, so no extra UTC conversion is applied in app code.

If the user travels across timezones, scheduled triggers follow the device clock; editing or saving renewals reschedules based on current local time.
