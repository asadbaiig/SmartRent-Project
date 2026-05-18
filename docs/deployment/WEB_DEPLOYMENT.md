# Web Deployment

This project deploys as two web services:

- `smartrent-web`: Node/Express API plus the built React client.
- `smartrent-ai`: FastAPI rental price prediction service.

## Render Blueprint

1. Push `render.yaml`, `Dockerfile.web`, and `ai-service/Dockerfile` to GitHub.
2. In Render, create a new Blueprint from the GitHub repository.
3. Render will create both services from `render.yaml`.
4. Enter the prompted secret values from your local `.env`.
5. After the first deploy, open the `smartrent-web` URL.

The web service connects to the AI service using `AI_SERVICE_HOSTPORT`, which Render fills from the private `smartrent-ai` service address.

## Required Web Environment Variables

Set these on `smartrent-web`:

- `VITE_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `MONGODB_SRV_URL`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_URL`
- `BLOCKCHAIN_ENABLED`
- `BLOCKCHAIN_PRIVATE_KEY`
- `BLOCKCHAIN_RPC_URL`
- `RENTAL_CONTRACT_ADDRESS`

Do not commit `.env`.

## Health Checks

- Web app: `/`
- AI service: `/health`
- Web-to-AI proxy check: `/api/ai/health`

## Local Production Check

```bash
npm run build
npm start
```

For the AI service:

```bash
cd ai-service
uvicorn main:app --host 0.0.0.0 --port 8000
```
