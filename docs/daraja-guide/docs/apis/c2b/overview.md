# Customer to Business (C2B)

The C2B API allows you to receive payments from customers. Instead of initiating the payment from your app, the user enters your Paybill or Till number on their phone manually.

## Two-Step Integration Lifecycle

Unlike STK push, setting up C2B involves two distinct steps.

### Step 1: Register URL
You must register validation and confirmation URLs with Safaricom.

- **Sandbox URL:** `https://sandbox.safaricom.co.ke/mpesa/c2b/v2/registerurl`
- **Method:** `POST`

#### Request Payload:
```json
{
 "ShortCode": 600999,
 "ResponseType": "Completed",
 "ConfirmationURL": "https://yourdomain.com/mpesa/confirmation",
 "ValidationURL": "https://yourdomain.com/mpesa/validation"
}
```

- **ValidationURL:** Safaricom calls this URL immediately when a customer starts an M-Pesa transfer. You can respond with `Accepted` or `Rejected` to approve or stop the payment (e.g., validate an invoice reference number).
- **ConfirmationURL:** Safaricom calls this URL once the user payment succeeds.

---

### Step 2: Simulate Transaction (Sandbox only)
To test your integration in the sandbox environment, simulate a customer entering your Paybill number.

- **Sandbox URL:** `https://sandbox.safaricom.co.ke/mpesa/c2b/v1/simulate`
- **Method:** `POST`

#### Request Payload:
```json
{
 "CommandID": "CustomerPayBillOnline",
 "Amount": 100,
 "Msisdn": "254708374100",
 "BillRefNumber": "INV-103"
}
```

---

## 🧠 Real-World Deployment Notes
- **HTTPS:** Both URLs MUST be secure.
- **Immediate Response:** When Safaricom hits your validation URL, you must reply within a strict timeout limit with:
```json
{ "ResultCode": 0, "ResultDesc": "Accepted" }
```
- If your server fails to respond, Safaricom defaults to **Accepting** the payment.
