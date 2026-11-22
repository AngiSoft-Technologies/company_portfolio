# M-Pesa Express (STK Push) - Request Structure

This page breaks down the required payload structure for generating a successful STK Push.

## Request Schema

- **Method:** `POST`
- **Sandbox URL:** `https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest`
- **Production URL:** `https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest`

### Request Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `BusinessShortCode` | Integer | Yes | ShortCode receiving the money (Paybill or Till). |
| `Password` | String | Yes | Base64 string: `Base64(ShortCode + Passkey + Timestamp)`. |
| `Timestamp` | String | Yes | Time in format `YYYYMMDDHHmmss` (e.g., `20260503140510`). |
| `TransactionType` | String | Yes | `CustomerPayBillOnline` or `CustomerBuyGoodsOnline`. |
| `Amount` | Integer | Yes | The exact transaction value. Must be a whole number. |
| `PartyA` | Long | Yes | Phone number sending funds in format `2547XXXXXXXX`. |
| `PartyB` | Integer | Yes | The organization ShortCode receiving funds. |
| `PhoneNumber` | Long | Yes | Same as `PartyA`. |
| `CallBackURL` | String | Yes | Publicly accessible URL to receive results. |
| `AccountReference` | String | Yes | Unique reference (e.g., invoice number or username). |
| `TransactionDesc` | String | Yes | Description of transaction. |

---

## Password Generation Logic

The `Password` field is the single biggest source of errors in Daraja integrations. To generate it correctly:

1. Retrieve your `Shortcode` (e.g., `174379`).
2. Retrieve your `Passkey` (e.g., `bfb279f9aa9bdbc...`).
3. Generate the current `Timestamp` in `YYYYMMDDHHmmss` format (e.g., `20260503140510`).
4. Concatenate them exactly: `174379` + `bfb279f9aa9bdbc...` + `20260503140510`.
5. Convert that string to base64.
