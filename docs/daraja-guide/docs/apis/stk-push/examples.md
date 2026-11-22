# M-Pesa Express (STK Push) - Examples

Ready-to-use snippets to trigger an STK Push in Node.js, Python, and cURL.

## cURL
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
  "CallBackURL": "https://yourdomain.com/mpesa/callback",
  "AccountReference": "INV-102",
  "TransactionDesc": "Web Checkout"
 }'
```

---

## Node.js
```javascript
async function initiateSTKPush(token) {
 const shortCode = "174379";
 const passkey = "bfb279f9aa9bdbc05eef642...yourpasskey";
 const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
 const password = Buffer.from(shortCode + passkey + timestamp).toString("base64");

 const payload = {
  BusinessShortCode: shortCode,
  Password: password,
  Timestamp: timestamp,
  TransactionType: "CustomerPayBillOnline",
  Amount: 1,
  PartyA: "254700000000",
  PartyB: shortCode,
  PhoneNumber: "254700000000",
  CallBackURL: "https://yourdomain.com/mpesa/callback",
  AccountReference: "Invoice 12",
  TransactionDesc: "Payment Description"
 };

 const response = await fetch("https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", {
  method: "POST",
  headers: {
   "Authorization": `Bearer ${token}`,
   "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
 });

 return await response.json();
}
```

---

## Python
```python
import base64
from datetime import datetime
import requests

def initiate_stk_push(token):
  shortcode = "174379"
  passkey = "bfb279f9aa9bdbc05eef642...yourpasskey"
  timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
  
  password_str = f"{shortcode}{passkey}{timestamp}"
  password = base64.b64encode(password_str.encode()).decode()

  url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
  headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
  }

  payload = {
    "BusinessShortCode": shortcode,
    "Password": password,
    "Timestamp": timestamp,
    "TransactionType": "CustomerPayBillOnline",
    "Amount": 1,
    "PartyA": "254700000000",
    "PartyB": shortcode,
    "PhoneNumber": "254700000000",
    "CallBackURL": "https://yourdomain.com/mpesa/callback",
    "AccountReference": "INV-102",
    "TransactionDesc": "Test Payment"
  }

  response = requests.post(url, headers=headers, json=payload)
  return response.json()
```
