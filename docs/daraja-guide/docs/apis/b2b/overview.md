# Business to Business (B2B)

The B2B API enables businesses to pay other merchants directly from their shortcode (e.g., Paybill or Till) to another Paybill, Till, or microSME.

## API Request Payload

- **Sandbox URL:** `https://sandbox.safaricom.co.ke/mpesa/b2b/v1/paymentrequest`
- **Method:** `POST`

### Request Payload Format:
```json
{
 "Initiator": "testapi",
 "SecurityCredential": "Your_Base64_Initiator_Password",
 "CommandID": "BusinessPayBill",
 "SenderIdentifierType": 4,
 "RecieverIdentifierType": 4,
 "Amount": 1000,
 "PartyA": 600111,
 "PartyB": 600222,
 "AccountReference": "INV-1092",
 "Remarks": "Stock purchase",
 "QueueTimeOutURL": "https://yourdomain.com/b2b/timeout",
 "ResultURL": "https://yourdomain.com/b2b/result"
}
```

---

## Request Fields

- **CommandID:** Options include `BusinessPayBill`, `BusinessBuyGoods`, `DisburseFundsToBusiness`, `BusinessToBusinessTransfer`.
- **PartyA:** Your organization's shortcode initiating the payment.
- **PartyB:** The recipient organization's shortcode.
- **SenderIdentifierType / ReceiverIdentifierType:** Usually `4` for a Shortcode.
