# AI Environment Setup Guide

## Overview

This document explains how to configure environment variables for AI services in the Resonant application.

## Required Environment Variables

### Google Gemini API Configuration

```bash
# Google Gemini API key (required)
GOOGLE_GEMINI_API_KEY=your_api_key_here

# Gemini model to use (default: gemini-1.5-flash)
GOOGLE_GEMINI_MODEL=gemini-1.5-flash

# API endpoint (default shown)
GOOGLE_GEMINI_API_ENDPOINT=https://generativelanguage.googleapis.com
```

### AI Analysis Configuration

```bash
# Number of entries to process in a single batch (default: 10)
AI_ANALYSIS_BATCH_SIZE=10

# Maximum requests per minute (default: 100 for dev, 60 for prod)
AI_ANALYSIS_RATE_LIMIT=100

# Timeout for AI API calls in milliseconds (default: 30000)
AI_ANALYSIS_TIMEOUT=30000
```

## Getting Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API key"
3. Select your project or create a new one
4. Copy the generated API key
5. Add it to your `.env.local` file

## Environment Files

### Development (.env.local)

- Used for local development
- Contains actual API keys and development settings
- **Never commit this file to git**

### Production (.env.production)

- Used for production builds
- Contains placeholder values that should be replaced with actual production keys
- Production keys should be set in Vercel environment variables

### Template (.env.local.template)

- Template file for new developers
- Shows all required environment variables
- Copy to `.env.local` and fill in actual values

## Vercel Deployment

For production deployment, set these environment variables in your Vercel dashboard:

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add each variable for the "Production" environment
4. Redeploy your application

## Security Notes

- **Never commit API keys to version control**
- Use different API keys for development and production
- Regularly rotate API keys for security
- Monitor API usage to detect unauthorized access

## Testing Configuration

To verify your AI configuration is working:

```bash
# Run the AI configuration tests
npm test src/lib/ai/__tests__/

# Check environment loading in development
npm run dev
# Look for "Environments: .env.local" in the startup logs
```

## Cost Management

- The rate limiting helps prevent excessive API usage
- Monitor your Google Cloud billing dashboard
- Consider implementing usage quotas for production users
- Use batch processing to optimize API calls

## Troubleshooting

### Common Issues

1. **"API key is required" error**
   - Check that `GOOGLE_GEMINI_API_KEY` is set in your environment
   - Verify the key is correctly copied (no extra spaces)

2. **Rate limit errors**
   - Adjust `AI_ANALYSIS_RATE_LIMIT` if needed
   - Implement exponential backoff in your application

3. **Environment not loading**
   - Ensure `.env.local` exists in project root
   - Restart development server after changing environment variables
   - Check file permissions on `.env.local`

### Development vs Production

| Environment | Rate Limit | Batch Size | Timeout |
| ----------- | ---------- | ---------- | ------- |
| Development | 100/min    | 10         | 30s     |
| Production  | 60/min     | 10         | 30s     |

Production uses more conservative rate limiting to ensure stability and cost control.
