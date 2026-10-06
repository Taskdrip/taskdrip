# Taskdrip Creator Publishing (Phase 1)

Creator Publishing is part of the existing Taskdrip app. It reuses creator accounts, the Taskdrip Shop, purchases, product reviews, wallet balance, payout requests, and notifications.

## Creator flow

1. Open **Creator Studio** from the creator dashboard.
2. Create a book draft or a digital-product draft.
3. Save chapters and product metadata; AI outline/chapter drafting is optional.
4. Submit the finished product file for admin review.
5. After approval, the listing appears in the existing shop and on the creator profile.
6. Buyers pay through the existing checkout/payment-review flow. Once an admin marks the purchase paid, the purchase appears in the buyer's Digital Library and the creator's earnings are credited to the existing Taskdrip balance.
7. Buyers can submit one verified-purchase review per digital product. Download access requires authentication and a paid/approved/delivered purchase; downloads are logged and capped at 10 per purchase.

## Setup and operations

- Apply the additive development database migration with `npm run db:migrate`.
- Private product files are written under `.private-product-files/`, which is excluded from Git and is not served as public uploads.
- Admins can open **Admin → Creator Publishing Review** to approve or reject submissions and configure the publishing platform fee. The default fee is 10% until changed.
- AI book drafting is disabled unless `OPENAI_API_KEY` is configured in Replit Secrets. The app reports this state rather than returning mock AI content.
- Product prices and creator publishing earnings currently use USD because the existing shop and wallet flow do not carry a transaction currency. Do not represent USD prices as NGN; multi-currency checkout and conversion are not implemented.
- Payment-processing fees are recorded as zero because the existing manual payment-review flow does not provide a processor-fee amount.

## Current boundaries

This is the initial creator-to-shop vertical slice, not the full publishing suite. It does not yet include automated virus scanning, durable object storage, signed expiring links, automatic book/PDF/EPUB export, full KDP preflight, refunds/reversals for creator earnings, subscription products, advanced marketing/analytics, or a complete AI writing/editorial gateway.
