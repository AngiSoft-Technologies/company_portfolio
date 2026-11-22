# M-Pesa Express (STK Push) - Callbacks

After a user enters their PIN on their phone (or cancels the prompt), M-Pesa sends a JSON POST payload to your configured `CallBackURL`.

## Success Callback Structure

Below is the standard JSON structure received when a payment succeeds.

```json
{
 "Body": {
  "stkCallback": {
   "MerchantRequestID": "29115-34626-1",
   "CheckoutRequestID": "ws_CO_191220191020363925",
   "ResultCode": 0,
   "ResultDesc": "The service request is processed successfully.",
   "CallbackMetadata": {
    "Item": [
     {
      "Name": "Amount",
      "Value": 1.00
     },
     {
      "Name": "MpesaReceiptNumber",
      "Value": "NLJ7RT61SV"
     },
     {
      "Name": "TransactionDate",
      "Value": 20260503140510
     },
     {
      "Name": "PhoneNumber",
      "Value": 254708374100
     }
    ]
   }
  }
 }
}
```

---

## Failure Callback Structure

If the user rejects the prompt or inputs the wrong PIN:

```json
{
 "Body": {
  "stkCallback": {
   "MerchantRequestID": "29115-34626-1",
   "CheckoutRequestID": "ws_CO_191220191020363925",
   "ResultCode": 1032,
   "ResultDesc": "Request cancelled by user."
  }
 }
}
```

## Important Result Codes
- `0`: Success.
- `1032`: User cancelled the STK push prompt.
- `1037`: DS timeout user cannot be reached.
- `1`: Insufficient funds on customer account.
