# Transaction Reversal

The Reversal API allows your business to initiate a return or reversal of a payment received.

## API Request Payload

- **Sandbox URL:** `https://sandbox.safaricom.co.ke/mpesa/reversal/v1/index`
- **Method:** `POST`

### Request Payload Format:
```json
{
 "Initiator": "testapi",
 "SecurityCredential": "Your_Base64_Initiator_Password",
 "CommandID": "TransactionReversal",
 "TransactionID": "OEI2AK4V15",
 "Amount": 100,
 "ReceiverShortCode": 600111,
 "ReceiverIdentifierType": 11,
 "Remarks": "Accidental transfer",
 "QueueTimeOutURL": "https://yourdomain.com/reversal/timeout",
 "ResultURL": "https://yourdomain.com/reversal/result",
 "Occasion": "Refund"
}
```

---

## Request Fields

- **TransactionID:** The M-Pesa receipt number of the transaction you want to reverse.
- **ReceiverShortCode:** Your organization's shortcode.
- **ReceiverIdentifierType:** Use `11` for Organization or `1` for Individual.
- **Amount:** The exact value you are reversing.
- **ResultURL:** The endpoint where Safaricom will send the reversal confirmation JSON payload.

---

## 🧠 Real-World Note
A reversal request can fail if the original sender has insufficient balance to withdraw the refunded amount or if the transaction was already reversed.
