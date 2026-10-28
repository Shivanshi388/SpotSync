# Security policy

- Never commit `.env` files, provider secrets, database credentials, signing keys, or real user data.
- `backend/.env.example` and `frontend/.env.example` contain placeholders only.
- Production must set `APP_ENV=production`, use `PAYMENT_MODE=razorpay`, and leave `ALLOW_MOCK_PAYMENTS` false/unset.
- Mock payment verification is simulation, never proof of an actual charge.
- Report vulnerabilities privately to the repository maintainer instead of posting credentials or exploit details publicly.
