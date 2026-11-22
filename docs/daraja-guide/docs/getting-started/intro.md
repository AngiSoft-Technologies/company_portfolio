# Introduction to M-Pesa Daraja 3.0

The Safaricom Daraja API provides a programmatic interface to interact with M-Pesa. It enables applications to push payments directly to customers, receive funds, handle payouts, and query transaction statuses.

## High-Level Architecture

All interactions on Daraja follow a client-server architecture with RESTful patterns. The standard transaction lifecycle involves an **asynchronous pattern**:

```
User → Your Backend → Safaricom Gateway → User's SIM ToolKit
             ↓
         Asynchronous Callback
             ↓
          Your Backend
```

## Environments

Safaricom offers two main environments for developers:

### 1. Sandbox Environment
- **Base URL:** `https://sandbox.safaricom.co.ke`
- For testing and integration verification.
- Test shortcodes, keys, and dummy phone numbers are provided.
- Rates and transactions are simulated (no real money).

### 2. Production Environment
- **Base URL:** `https://api.safaricom.co.ke`
- Real transactions with live money.
- Requires HTTPS and whitelisted IP addresses.

---

## Common Concepts

- **ShortCode:** A Paybill number (e.g., 174379) or Buy Goods Till number used to accept payments.
- **Passkey:** A secret string provided in the developer portal used to generate transaction passwords for STK Push.
- **Initiator:** A specific administrative username created via the Safaricom Organization portal to sign payouts or transaction status requests.
