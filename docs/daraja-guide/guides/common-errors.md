# Common Errors & Pitfalls

## HTTP Errors
- **401 Unauthorized:** Your Access Token is missing or invalid. Check your Basic authorization header in the token generation request.
- **400 Bad Request:** Missing mandatory payload parameters or empty JSON string. Check parameter types and ensure numeric amounts are passed as integers, not strings.

## Callback Failures
- **Timeout (1037):** The user was out of network coverage or took too long to enter their PIN.
- **Insufficient Funds (1):** The user has less money than the transaction amount.
