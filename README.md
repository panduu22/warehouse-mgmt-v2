This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Environment Setup

The application requires several environment variables for database connections, NextAuth authentication, and timezone handling. 

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
2. Open `.env.local` and configure the following variables:
   - **`MONGODB_URI`**: Your MongoDB connection string.
   - **`NEXTAUTH_URL`**: 
     - Local: `http://localhost:3000`
     - Production: The canonical URL of your deployed application (e.g. `https://your-app.vercel.app`).
   - **`NEXTAUTH_SECRET`**: A random string used to hash tokens. You can generate one using:
     ```bash
     openssl rand -base64 32
     ```
   - **`GOOGLE_CLIENT_ID`** & **`GOOGLE_CLIENT_SECRET`**:
     1. Go to the [Google Cloud Console](https://console.cloud.google.com).
     2. Create a project (or select an existing one) and navigate to the **APIs & Services > Credentials** screen.
     3. Click **Create Credentials** and choose **OAuth client ID**. Select **Web application** as application type.
     4. Set **Authorized JavaScript origins**:
        - Local: `http://localhost:3000`
        - Production: `https://your-app.vercel.app` (add your production domains)
     5. Set **Authorized redirect URIs**:
        - Local: `http://localhost:3000/api/auth/callback/google`
        - Production: `https://your-app.vercel.app/api/auth/callback/google`
     6. Save and copy the generated Client ID and Client Secret into your `.env.local`.
   - **`TZ`**: Set to `Asia/Kolkata` to enforce Indian Standard Time across all database queries and formatting.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
