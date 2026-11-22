# M-Pesa Daraja Ultimate Developer Documentation

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

The absolute best developer-first documentation repository for Safaricom's M-Pesa Daraja 3.0 API. Built for real-world production integrations, this guide clears the confusing corporate wording and fills the gaps of the official docs.

---

## Why This Repo Exists

While Safaricom's official portal provides the raw endpoints, many developers struggle with:
- Asynchronous Flow Management: Understanding when to use polling vs listening to callbacks.
- Dynamic Security Generation: Confusing base64 generation and timestamp formatting rules.
- Production Readiness: Handling unexpected downtime, retries, and timing issues.

This repository exists to bridge the gap, offering clear markdown breakdowns, comprehensive curl & code examples, flow diagrams, and real-world implementation notes.

---

## Features and Coverage

We cover 100% of the Daraja APIs including:
- OAuth 2.0 Auth
- M-Pesa Express (STK Push)
- Customer to Business (C2B)
- Business to Customer (B2C)
- Transaction Status and Balance Queries
- Business to Business (B2B)
- Bill Manager and Invoicing
- Reversals and Standing Orders
- QR Code Generation
- Tax Remittance
- Business to Pochi
- M-Pesa Ratiba

---

## Repository Structure

```
mpesa-daraja-docs/
 README.md         # Project Overview and Quick Start
 /docs
  /getting-started
   intro.md       # High-Level Architecture
   auth.md        # OAuth Token Management
  /apis
   /stk-push
    overview.md     # STK Flow and Callbacks
    request.md     # Payload details
    response.md     # Response samples
    callbacks.md    # Callback schemas
    errors.md      # STK-specific errors
    examples.md     # Implementation Snippets
   /c2b
   /b2c
   /transaction-status
   /reversal
   /account-balance
   /b2b
   /bill-manager
   /qr-code
   /tax-remittance
   /business-to-pochi
   /ratiba
 /guides
  stk-flow-explained.md  # Advanced STK Logic
  mpesa-callbacks-explained.md
  common-errors.md
  sandbox-vs-production.md
 /examples
  nodejs.md        # Ready-to-use Node.js client
  python.md        # Python Requests snippets
  curl.md         # Direct command line examples
```

---

## Quick Start (STK Push)

In a rush? Here is a minimal valid example to prompt an STK PIN menu on a user's phone.

### 1. Generate an Authorization Token
```bash
curl -X GET "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials" \
   -H "Authorization: Basic Base64(ConsumerKey:ConsumerSecret)"
```

### 2. Initiate STK Push
```bash
curl -X POST "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest" \
   -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
   -H "Content-Type: application/json" \
   -d '{
    "BusinessShortCode": 174379,
    "Password": "MTc0Mzc5YmZiMjc5ZjlhYTliZGJjZjE1OGU5N2RkNzFhNDY3Y2QyZTBjODkzMDU5YjEwZjc4Zjc4YTQ2M2U2M2YwSI====",
    "Timestamp": "20260503140510",
    "TransactionType": "CustomerPayBillOnline",
    "Amount": 1,
    "PartyA": 254708374100,
    "PartyB": 174379,
    "PhoneNumber": 254708374100,
    "CallBackURL": "https://yourdomain.com/mpesa/callback",
    "AccountReference": "INV-001",
    "TransactionDesc": "Test Payment"
   }'
```

---

## Contribution Guidelines
Found a typo, an updated endpoint, or a missing error code? 
1. Fork the repo.
2. Add your updates to the relevant .md file in docs/ or guides/.
3. Open a Pull Request!

---

## Disclaimer
This documentation is maintained independently by the open-source community for developer convenience. It is not an official Safaricom PLC publication. For real production credentials and final verification, always consult the Official Safaricom Daraja Portal.
