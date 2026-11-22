# Python Integration Snippet

```python
import requests
import base64
from datetime import datetime

shortcode = "174379"
passkey = "bfb279f9aa9bdbc...yourpasskey"
consumer_key = "YOUR_KEY"
consumer_secret = "YOUR_SECRET"

def get_access_token():
  auth_str = f"{consumer_key}:{consumer_secret}"
  auth_encoded = base64.b64encode(auth_str.encode()).decode()
  url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
  headers = {"Authorization": f"Basic {auth_encoded}"}
  r = requests.get(url, headers=headers)
  return r.json()["access_token"]

def initiate_stk_push(phone, amount):
  token = get_access_token()
  timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
  password = base64.b64encode(f"{shortcode}{passkey}{timestamp}".encode()).decode()

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
    "Amount": amount,
    "PartyA": phone,
    "PartyB": shortcode,
    "PhoneNumber": phone,
    "CallBackURL": "https://yourserver.com/callback",
    "AccountReference": "INV-102",
    "TransactionDesc": "Test Payment"
  }

  r = requests.post(url, headers=headers, json=payload)
  return r.json()
```
