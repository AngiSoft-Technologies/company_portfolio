# M-Pesa Express (STK Push) - Common Errors

When working with STK Push, you may encounter both synchronous errors (from initial request) and asynchronous errors (from callback).

## Synchronous Error Codes

| Error Code | Meaning | Fix / Solution |
| :--- | :--- | :--- |
| `400.002.02` | Invalid CallBackURL | Your URL must use `https://` and be accessible from the internet. |
| `403.002.01` | Forbidden | Your access token is either invalid, missing, or has expired. |
| `400.002.05` | Invalid shortcode | `BusinessShortCode` or `PartyB` does not match your credentials. |

---

## Callback Result Codes

| Result Code | Meaning | Developer Notes |
| :--- | :--- | :--- |
| `1` | Insufficient funds | Advise the customer to top up their M-Pesa account. |
| `1032` | Request cancelled by user | The user clicked 'Cancel' on their phone prompt. |
| `1037` | Time out | The user took too long to input their PIN. |
| `2001` | Invalid PIN | The user entered the wrong M-Pesa PIN. |
| `1001` | System lock / Processing | Another transaction is currently active on this MSISDN. |
