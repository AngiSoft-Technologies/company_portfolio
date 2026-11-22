# Business to Pochi API

The Business to Pochi la Biashara API allows organizations to disburse payments directly from their business shortcodes to micro-merchants using the **Pochi la Biashara** product.

## Key Features
- Transfer funds to individual sellers or small businesses.
- The recipient receives money directly into their Pochi la Biashara wallet.

## Request Parameters

- **Sandbox URL:** `https://sandbox.safaricom.co.ke/mpesa/b2pochi/v1/paymentrequest`
- **Method:** `POST`

### Sample Request:
```json
{
 "Initiator": "testapi",
 "SecurityCredential": "Your_Base64_Initiator_Password",
 "CommandID": "BusinessPaymentToPochi",
 "Amount": 3500,
 "PartyA": 600000,
 "PartyB": 254708374100,
 "Remarks": "Supply delivery",
 "QueueTimeOutURL": "https://yourdomain.com/pochi/timeout",
 "ResultURL": "https://yourdomain.com/pochi/result",
 "Occasion": "VendorPayment"
}
```
