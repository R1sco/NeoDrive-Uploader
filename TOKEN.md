## Configuration Guide

### Getting Your Parent ID

The parent_id represents the folder ID where files will be uploaded in your Neova Drive. Here's how to find it:

1. Log in to your Neova Drive account
2. Navigate to the folder where you want to upload files
3. The folder ID can be found in:
   - The URL when you open the folder
   - Or through the folder's properties/information panel

## Getting Your Token

To obtain your authentication tokens:

1. Log in to your Neova Drive account
2. Open your browser's Developer Tools (F12 or right-click > Inspect)
3. Go to the Network tab
4. Look for requests to the API (usually 'session' or authentication-related endpoints)
5. Find the response containing:
   ```json
   {
     "accessToken": "...",
     "refreshToken": "...",
     "expires": "YYYY-MM-DDT05:21:13..."
   }
   ```
6. Copy these tokens to your `config.json` file:
   ```json
   {
     "access_token": "your_access_token_here",
     "refresh_token": "your_refresh_token_here"
   }
   ```

⚠️ **IMPORTANT SECURITY NOTICES**:

- Never share your tokens with anyone
- Keep your `config.json` file private
- Tokens expire - you may need to refresh them periodically
- If your tokens are compromised, invalidate them immediately by logging out
- Do not commit tokens to version control
