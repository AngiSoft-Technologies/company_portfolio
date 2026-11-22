# Authorization API

All M-Pesa Daraja requests require a Bearer OAuth 2.0 access token passed via the HTTP header.

## Generating a Token

To generate a token, you must authenticate using your **Consumer Key** and **Consumer Secret**.

### Endpoint details
- **Method:** `GET`
- **Sandbox URL:** `https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`
- **Production URL:** `https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`

### Request Headers
```http
Authorization: Basic Base64(ConsumerKey:ConsumerSecret)
Accept: application/json
```

---

## Code Examples

### cURL
```bash
curl -X GET "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials" \
 -H "Authorization: Basic eW91cl9jb25zdW1lcl9rZXk6eW91cl9jb25zdW1lcl9zZWNyZXQ="
```

### Node.js (Fetch)
```javascript
const consumerKey = "YOUR_CONSUMER_KEY";
const consumerSecret = "YOUR_CONSUMER_SECRET";
const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

async function getToken() {
 const response = await fetch("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
  method: "GET",
  headers: {
   "Authorization": `Basic ${auth}`
  }
 });
 
 const data = await response.json();
 return data.access_token;
}
```

### Python
```python
import requests
import base64

consumer_key = "YOUR_CONSUMER_KEY"
consumer_secret = "YOUR_CONSUMER_SECRET"

auth_string = f"{consumer_key}:{consumer_secret}"
auth_encoded = base64.b64encode(auth_string.encode()).decode()

def get_token():
  url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
  headers = {"Authorization": f"Basic {auth_encoded}"}
  response = requests.get(url, headers=headers)
  return response.json()["access_token"]
```

---

## 🧠 Real-World Notes & Expiry Management

- **Token Expiry:** Access tokens expire exactly **3600 seconds (1 hour)** after generation.
- **Caching Pattern:** Do not fetch a new token for every individual payment. Cache the token locally with its timestamp and fetch a fresh one only when it has expired or within 5 minutes of its scheduled expiry.
- **Header Structure:** In all subsequent API requests, always use the header: `Authorization: Bearer YOUR_ACCESS_TOKEN`.
