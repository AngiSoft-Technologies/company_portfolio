# M-Pesa Ratiba (Standing Orders) API

M-Pesa Ratiba allows developers to programmatically create, manage, and cancel recurring payments or standing orders on the M-Pesa platform.

## Key Features
- Create fixed subscription-style payments (e.g., utility bills, insurance, rent).
- Setup regular deductions directly from customer accounts.

## Request Parameters

- **Sandbox URL:** `https://sandbox.safaricom.co.ke/mpesa/ratiba/v1/subscribe`
- **Method:** `POST`

### Sample Request:
```json
{
 "Initiator": "testapi",
 "SecurityCredential": "Your_Base64_Initiator_Password",
 "CommandID": "CreateSubscription",
 "SubscriptionName": "Streaming Monthly Subscription",
 "Frequency": "Monthly",
 "StartDate": "2026-06-01",
 "EndDate": "2027-06-01",
 "Amount": 1000,
 "PartyA": 600111,
 "PartyB": 254708374100,
 "QueueTimeOutURL": "https://yourdomain.com/ratiba/timeout",
 "ResultURL": "https://yourdomain.com/ratiba/result"
}
```
