# SendGrid Email Configuration

This application uses SendGrid for sending emails (password reset, verification, etc.).

## Setup Instructions

### 1. Create a SendGrid Account
1. Go to [SendGrid](https://sendgrid.com/) and create a free account
2. Verify your email address

### 2. Create an API Key
1. Log in to your SendGrid dashboard
2. Navigate to **Settings** > **API Keys**
3. Click **Create API Key**
4. Give it a name (e.g., "DealCouponz Production")
5. Select **Full Access** or **Restricted Access** (with Mail Send permissions)
6. Click **Create & View**
7. **Copy the API key immediately** (you won't be able to see it again)

### 3. Verify Your Sender Identity
1. Navigate to **Settings** > **Sender Authentication**
2. Choose either:
   - **Single Sender Verification** (for testing)
   - **Domain Authentication** (for production - recommended)
3. Follow the verification steps

### 4. Configure Environment Variables

Add the following to your `.env` file:

```env
# SendGrid Configuration
# Option 1: Using SendGrid API (Recommended - More reliable)
SENDGRID_API_KEY=your_sendgrid_api_key_here
EMAIL_FROM=noreply@yourdomain.com  # Must be verified in SendGrid

# Option 2: Using SendGrid SMTP (Alternative)
# SENDGRID_USE_SMTP=true
# SENDGRID_SMTP_HOST=smtp.sendgrid.net
# SENDGRID_SMTP_PORT=587
# SENDGRID_SMTP_USER=apikey
# SENDGRID_SMTP_PASSWORD=your_sendgrid_api_key_here

# Client URL (for email links)
CLIENT_URL=http://localhost:3002

# Email Settings
DISABLE_EMAIL=false  # Set to true to disable email sending (for development)
VERIFY_EMAIL_CONFIG=true  # Set to true to verify email config on startup (development only)
```

### 5. SMTP Configuration (Alternative Method)

If you prefer to use SMTP instead of the API:

1. Use the same API key as the password
2. Username is always `apikey`
3. Host: `smtp.sendgrid.net`
4. Port: `587` (TLS) or `465` (SSL)

Example SMTP settings:
```
Host: smtp.sendgrid.net
Port: 587
Username: apikey
Password: [Your SendGrid API Key]
```

### 6. Testing

To test the email configuration:

1. Set `VERIFY_EMAIL_CONFIG=true` in your `.env` file
2. Restart your server
3. Check the logs for "Email transporter is ready" or "SendGrid API is configured"
4. Try requesting a password reset to test email sending

### 7. Free Tier Limits

SendGrid Free Tier includes:
- 100 emails per day
- Unlimited contacts
- Email API and SMTP relay

### Troubleshooting

**Error: "Email transporter not configured"**
- Make sure `SENDGRID_API_KEY` is set in your `.env` file
- Restart your server after adding the key

**Error: "Unauthorized" or "403 Forbidden"**
- Verify your API key is correct
- Check that your API key has "Mail Send" permissions
- Ensure your sender email is verified in SendGrid

**Emails not sending in development**
- Check if `DISABLE_EMAIL=true` is set
- Check server logs for error messages
- Verify `CLIENT_URL` is set correctly

**SMTP Connection Failed**
- Verify your API key is correct
- Check firewall settings
- Try using port 465 with `secure: true` instead of 587

### Production Checklist

- [ ] Domain authentication set up in SendGrid
- [ ] API key created with appropriate permissions
- [ ] `SENDGRID_API_KEY` set in production environment
- [ ] `EMAIL_FROM` matches verified sender in SendGrid
- [ ] `CLIENT_URL` set to production domain
- [ ] `DISABLE_EMAIL=false` in production
- [ ] Test password reset flow end-to-end

