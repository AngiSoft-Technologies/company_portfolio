# Transaction Status

Use the Transaction Status API to query the state of a payment. This is essential for verifying a payment when callbacks are delayed or when the response is lost.

## API Request Payload

- **Sandbox URL:** `https://sandbox.safaricom.co.ke/mpesa/transactionstatus/v1/query`
- **Method:** `POST`

### Request Payload Format:
```json
{
 "Initiator": "testapi",
 "SecurityCredential": "Your_Base64_Initiator_Password",
 "CommandID": "TransactionStatusQuery",
 "TransactionID": "OEI2AK4V15",
 "PartyA": 600111,
 "IdentifierType": 4,
 "Remarks": "Checking Payment Status",
 "QueueTimeOutURL": "https://yourdomain.com/status/timeout",
 "ResultURL": "https://yourdomain.com/status/result",
 "Occasion": "Query"
}
```

---

## Request Fields

- **TransactionID:** The M-Pesa receipt number of the transaction you want to verify (e.g., `OEI2AK4V15`).
- **PartyA:** The shortcode of the business that received or initiated the original payment.
- **IdentifierType:** Specifies what `PartyA` is. Usually `4` for a ShortCode or `1` for MSISDN.

---

## 🧠 Real-World Implementation Tips

- **Do not poll this API continuously:** Polling Safaricom too frequently will trigger an automatic IP block. Use it only when a webhook callback has not been received after a sensible duration (e.g., 5 to 10 minutes).
- **Result Schema:** The actual details are sent asynchronously to your `ResultURL`.
```json
{
 "Result": {
  "ResultCode": 0,
  "ResultDesc": "The service request is processed successfully.",
  "ResultParameters": {
   "ResultParameter": [
    { "Key": "ReceiptNo", "Value": "OEI2AK4V15" },
    { "Key": "TransactionStatus", "Value": "Completed" }
   ]
  }
 }
}
```
