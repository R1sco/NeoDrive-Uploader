# Neova Drive File Uploader

A Node.js utility for uploading files to Neova Drive with chunked upload support and interactive file selection.

## ⚠️ Security Notice

This tool requires authentication tokens to work with Neova Drive. Never share your tokens or commit them to the repository. Always use the config file or environment variables for sensitive data.

## Prerequisites

- Node.js 14.0 or higher
- A Neova Drive account
- Valid authentication tokens from Neova Drive

## Installation

1. Clone the repository:

```bash
git clone https://github.com/your-username/neova-drive-uploader.git
cd neova-drive-uploader
```

2. Install dependencies:

```bash
npm install
```

3. Set up configuration:
   - Copy `config.example.json` to `config.json`
   - Update the configuration with your credentials
   - Never commit your `config.json` file!

## Configuration

1. Create a `config.json` file based on the example:

```json
{
  "api_url": "https://drive-api.neova.io",
  "parent_id": "your_parent_folder_id", // Optional
  "token": {
    "access_token": "your_access_token",
    "refresh_token": "your_refresh_token"
  }
}
```

2. Obtain your credentials:
   - Access Token: Get this from your Neova Drive authentication process
   - Parent ID: (Optional) The ID of the folder where files will be uploaded
   - See "Getting Your Parent ID" section below

## Usage

Run the utility:

```bash
npm start
```

## Features

- 📁 Interactive file selection
- 📊 Upload progress tracking
- 🔄 Chunked file upload (5MB chunks)
- 🔒 Secure token handling
- ⚠️ Comprehensive error handling

## Security Best Practices

1. Never commit sensitive data:

   - Keep tokens private
   - Don't share your config.json
   - Use .gitignore to prevent accidental commits

2. Token Storage:
   - Store tokens securely
   - Regularly rotate your tokens
   - Use environment variables in production

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

## Legal & Compliance

This is an unofficial tool and is not affiliated with Neova Drive. Use at your own risk and ensure compliance with Neova Drive's terms of service.

## Support

- Create an issue for bugs or feature requests
- Pull requests are welcome

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This tool is provided "as is" without warranty of any kind. Users are responsible for protecting their authentication credentials and ensuring compliance with Neova Drive's terms of service.
