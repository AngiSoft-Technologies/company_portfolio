# Business to Customer (B2C)

The B2C API allows organizations to disburse funds to individual customers (e.g., salaries, payouts, bonuses, rewards).

## Lifecycle

```
Your Server (Disbursement request) → Safaricom Gateway → Individual M-Pesa account
                                 ↓
                            Real-time Success Callback
```

## API Request Payload

- **Sandbox URL:** `https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest`
- **Method:** `POST`

### Request Payload Format:
```json
{
 "InitiatorName": "testapi",
 "SecurityCredential": "Your_Base64_Initiator_Password",
 "CommandID": "BusinessPayment",
 "Amount": 1000,
 "PartyA": 600000,
 "PartyB": 254708374100,
 "Remarks": "May Salary",
 "QueueTimeOutURL": "https://yourdomain.com/b2c/timeout",
 "ResultURL": "https://yourdomain.com/b2c/result",
 "Occasion": "Salary"
}
```

---

## Request Fields

- **InitiatorName:** The specific username used to log in to the Safaricom Organization portal.
- **SecurityCredential:** An encrypted base64 string derived from your Initiator Password and a Safaricom-provided public certificate.
- **CommandID:** Specifies the payout type:
 - `SalaryPayment`: For paying employee salaries.
 - `BusinessPayment`: General business payouts or utility disbursements.
 - `PromotionPayment`: Sweepstakes or marketing rewards.
- **PartyA:** Your organization's B2C shortcode.
- **PartyB:** Customer's valid phone number (`2547XXXXXXXX`).

---

## Callbacks & Payout Timing
- Safaricom enforces a two-tier callback architecture. If your endpoint goes down or times out, it posts the payout response to the `QueueTimeOutURL`. Otherwise, it pushes to your `ResultURL`.
- Payout transactions happen almost instantly, usually taking between **1 and 5 seconds** to complete.
