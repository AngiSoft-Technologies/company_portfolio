# M-Pesa Express (STK Push) - Overview

**M-Pesa Express** (commonly referred to as **STK Push**) is the most used M-Pesa API product. It prompts the customer to enter their M-Pesa PIN directly on their phone screen to confirm a payment.

## Transaction Lifecycle

The full lifecycle of an STK Push involves an initial client request followed by asynchronous callback results.

```
User App / Web → Your Backend → Safaricom API Gateway
                   ↓
                User Phone (PIN prompt)
                   ↓
                 User Enters PIN
                   ↓
Safaricom Gateway → Your Callback Endpoint → Real-time Confirmation
```

## Critical Execution Steps
1. **Client Action:** The user clicks 'Pay Now' or submits their phone number.
2. **STK Generation Request:** Your server generates the request payload, includes a base64 password, and posts to Safaricom's endpoint.
3. **Menu Prompt:** Safaricom sends a prompt to the customer's SIM ToolKit.
4. **User Action:** The customer types their PIN and clicks 'Send'.
5. **Callback Notification:** Once processed by Safaricom, a validation or confirmation JSON payload is sent to your server via `CallBackURL`.
