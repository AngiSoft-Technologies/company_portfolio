# cURL Direct Examples

## Generate Token
```bash
curl -X GET "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials" \
 -H "Authorization: Basic Base64(ConsumerKey:ConsumerSecret)"
```

## Trigger STK Push
```bash
curl -X POST "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest" \
 -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
 -H "Content-Type: application/json" \
 -d '{
  "BusinessShortCode": 174379,
  "Password": "MTc0Mzc5YmZiMjc5ZjlhYTliZGJjZjE1OGU5N2RkNzFhNDY3Y2QyZTBjODkzMDU5YjEwZjc4Zjc4YTQ2M2U2M2YwSI====",
  "Timestamp": "20260503140510",
  "TransactionType": "CustomerPayBillOnline",
  "Amount": 100,
  "PartyA": 254708374100,
  "PartyB": 174379,
  "PhoneNumber": 254708374100,
  "CallBackURL": "https://yourserver.com/callback",
  "AccountReference": "INV-102",
  "TransactionDesc": "Web Checkout"
 }'
```
