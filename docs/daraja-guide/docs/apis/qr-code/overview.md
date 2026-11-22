# QR Code API

The QR Code API enables merchants to generate dynamic QR codes that customers can scan using the M-Pesa app to complete a payment instantly.

## Key Features
- **Dynamic Generation:** Create specific QR codes for individual amounts, bills, or items.
- **Convenience:** Speeds up checking out by automating manual Paybill/Till number entry.

## Request Parameters

- **Sandbox URL:** `https://sandbox.safaricom.co.ke/mpesa/qrcode/v1/generate`
- **Method:** `POST`

### Sample Request:
```json
{
 "MerchantName": "OpenCode LTD",
 "RefNo": "Invoice-384",
 "Amount": 500,
 "TrxCode": "BG",
 "CPI": "123456",
 "Size": "300"
}
```

- **CPI:** The Shortcode or Identifier receiving the payment.
- **TrxCode:** The Transaction Type code:
 - `BG`: Buy Goods and Services (Till)
 - `PB`: Pay Bill
 - `WA`: Withdraw Cash at Agent
 - `SM`: Send Money
