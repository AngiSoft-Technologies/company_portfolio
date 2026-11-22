# 🧪 Sandbox vs. Production Environment

## Comparison Matrix

| Aspect | Sandbox Environment | Production Environment |
| :--- | :--- | :--- |
| **URL Base** | `https://sandbox.safaricom.co.ke` | `https://api.safaricom.co.ke` |
| **Validation** | Dummy authentication rules | Strict SSL/TLS & HTTPS rules |
| **Whitelisting** | Open to all IPs | Strictly whitelisted IPs |
| **Certificates** | Optional | Required for secure payouts |

## Go-Live Steps
1. Navigate to the Daraja Developer Portal and select "Go Live".
2. Fill out the application, enter your production callback URLs, and sign your terms.
3. Replace sandbox API keys and URLs with your production credentials.
