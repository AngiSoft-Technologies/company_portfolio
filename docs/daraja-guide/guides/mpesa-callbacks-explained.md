# Handling M-Pesa Webhooks (Callbacks)

M-Pesa webhooks are POST requests sent by the Daraja API Gateway to your server's `CallBackURL` once a transaction processes.

## Best Practices
- **Security:** In production, use a custom URL token or hash (e.g. `https://yourserver.com/callback?token=xyz123`) to prevent unauthorized third parties from spoofing Safaricom requests.
- **Response Handling:** Return a `200 OK` status immediately before running long database queries.
- **Idempotency:** Always store the `CheckoutRequestID` and skip processing if you receive a duplicate callback with the same ID.
