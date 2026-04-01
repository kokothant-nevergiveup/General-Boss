module.exports = {
  apps: [
    {
      name: 'general-boss',
      script: 'npx',
      args: 'wrangler pages dev dist --ip 0.0.0.0 --port 3000',
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        APP_ENV: process.env.APP_ENV || 'development',
        ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN || 'http://127.0.0.1:3000',
        PORT: 3000,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || 'https://www.genspark.ai/api/llm_proxy/v1',
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
        STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
        STRIPE_PRICE_STARTER: process.env.STRIPE_PRICE_STARTER,
        STRIPE_PRICE_PRO: process.env.STRIPE_PRICE_PRO,
        LEMONSQUEEZY_API_KEY: process.env.LEMONSQUEEZY_API_KEY,
        LEMONSQUEEZY_WEBHOOK_SECRET: process.env.LEMONSQUEEZY_WEBHOOK_SECRET,
        LEMONSQUEEZY_STORE_ID: process.env.LEMONSQUEEZY_STORE_ID
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}
