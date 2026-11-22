# Advanced STK Push Flow Explained

This guide explains the complex asynchronous transaction execution process for M-Pesa Express.

## Flow Diagram

```
[Customer App] → [Your Server] → [Daraja Gateway]
                    ↓
                [Safaricom Core]
                    ↓
                [Customer Phone SIM]
                    ↓
                [Customer Inputs PIN]
                    ↓
[Your Server Webhook] ← [Daraja Gateway Result]
```

## Timing Issues & Mitigations
- **User PIN Prompt Latency:** Safaricom usually takes 3-10 seconds to prompt the phone. Do not time out your frontend loader too quickly; allow up to 60 seconds before showing a failure screen.
- **Lost Webhooks:** Sometimes, user connectivity issues prevent Safaricom from triggering your `CallBackURL`. Mitigate this by polling the Transaction Status API when you receive no callback within 5 minutes.
