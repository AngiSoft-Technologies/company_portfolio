# Node.js Integration Client

```javascript
const shortCode = "174379";
const passkey = "bfb279f9aa9bdbc...yourpasskey";
const consumerKey = "YOUR_CONSUMER_KEY";
const consumerSecret = "YOUR_CONSUMER_SECRET";

async function getToken() {
 const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
 const res = await fetch("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
  method: "GET",
  headers: { "Authorization": `Basic ${auth}` }
 });
 const data = await res.json();
 return data.access_token;
}

async function requestPayment(phoneNumber, amount) {
 const token = await getToken();
 const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
 const password = Buffer.from(shortCode + passkey + timestamp).toString("base64");

 const payload = {
  BusinessShortCode: shortCode,
  Password: password,
  Timestamp: timestamp,
  TransactionType: "CustomerPayBillOnline",
  Amount: amount,
  PartyA: phoneNumber,
  PartyB: shortCode,
  PhoneNumber: phoneNumber,
  CallBackURL: "https://yourserver.com/callback",
  AccountReference: "Invoice 12",
  TransactionDesc: "Payment Description"
 };

 const res = await fetch("https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", {
  method: "POST",
  headers: {
   "Authorization": `Bearer ${token}`,
   "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
 });

 return await res.json();
}
```
