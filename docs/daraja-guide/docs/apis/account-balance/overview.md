# Account Balance API

The Account Balance API queries the real-time balance of your organization's shortcode.

## API Request Payload

- **Sandbox URL:** `https://sandbox.safaricom.co.ke/mpesa/accountbalance/v1/query`
- **Method:** `POST`

### Request Payload Format:
```json
{
 "Initiator": "testapi",
 "SecurityCredential": "Your_Base64_Initiator_Password",
 "CommandID": "AccountBalanceQuery",
 "PartyA": 600111,
 "IdentifierType": 4,
 "Remarks": "Checking balance before payroll",
 "QueueTimeOutURL": "https://yourdomain.com/balance/timeout",
 "ResultURL": "https://yourdomain.com/balance/result"
}
```

---

## Request Fields

- **PartyA:** The shortcode of the account whose balance you wish to query.
- **IdentifierType:** Use `4` to indicate that `PartyA` is a Shortcode.

---

## Sample Result Callback Payload
Safaricom will send a POST request asynchronously to your `ResultURL`:
```json
{
 "Result": {
  "ResultCode": 0,
  "ResultDesc": "The service request is processed successfully.",
  "ResultParameters": {
   "ResultParameter": [
    { "Key": "AccountBalance", "Value": "Working Account|KES|1000000.00|1000000.00|0.00|0.00" }
   ]
  }
 }
}
```
The balance string lists: `AccountType|Currency|TotalBalance|AvailableBalance|ReservedBalance|UnclearedBalance`.
