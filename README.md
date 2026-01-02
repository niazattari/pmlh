# pmlh
Project Management Learning Hub Website

## Database Configuration
- Set the MongoDB connection via environment variable `MONGODB_URI`.
- Example (MongoDB Atlas): `mongodb+srv://<username>:<password>@<cluster-host>/<db>?retryWrites=true&w=majority`.
- This project defaults to Atlas using database `pmlh` if `MONGODB_URI` is not provided.
- To run locally:
	- Create a `.env` file in the project root and add:
		- `MONGODB_URI=mongodb+srv://niazattari:Pakistan%40786@cluster0.mrodwfv.mongodb.net/pmlh?retryWrites=true&w=majority`
	- Then start the app: `npm start`

## Email Configuration
- Preferred: set SMTP credentials in `.env`:
	- `SMTP_HOST=smtp.yourprovider.com`
	- `SMTP_PORT=587`
	- `SMTP_SECURE=false` (set `true` for port 465)
	- `SMTP_USER=your-smtp-username`
	- `SMTP_PASS=your-smtp-password`
	- `SMTP_FROM=no-reply@yourdomain.com`
- Alternative (Gmail):
	- `ADMIN_EMAIL=youraddress@gmail.com`
	- `ADMIN_PASSWORD=<Gmail App Password>` (must be a 16-character app password)
- If no SMTP/Gmail credentials are provided, the app uses a JSON fallback and logs emails instead of delivering.
- Test email:
	- `npm run mail:test`
