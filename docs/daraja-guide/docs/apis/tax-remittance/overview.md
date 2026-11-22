# Tax Remittance API

The Tax Remittance API allows business entities to programmatically file and pay their corporate tax or VAT directly to Kenya Revenue Authority (KRA) from their M-Pesa accounts.

## Key Features
- Directly settle corporate tax obligations or withholding taxes.
- Complete payments securely via the M-Pesa API gateway.

## Request Parameters

- **Sandbox URL:** `https://sandbox.safaricom.co.ke/mpesa/tax/v1/remit`
- **Method:** `POST`

### Sample Request:
```json
{
 "Initiator": "testapi",
 "SecurityCredential": "Your_Base64_Initiator_Password",
 "CommandID": "PayTaxToKRA",
 "SenderIdentifierType": 4,
 "ReceiverIdentifierType": 4,
 "Amount": 1000,
 "PartyA": 600111,
 "PartyB": 572572,
 "AccountReference": "KRA-PRN-9281",
 "Remarks": "VAT Settlement March",
 "QueueTimeOutURL": "https://yourdomain.com/tax/timeout",
 "ResultURL": "https://yourdomain.com/tax/result"
}
```

- **PartyB:** The official KRA Shortcode.
- **AccountReference:** The PRN (Payment Registration Number) generated on the iTax portal.
