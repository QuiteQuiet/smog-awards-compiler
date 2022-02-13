Script for fetching the nomnations and votes for the Smog Awards.

Requires access to the TFP Smogon account which is target for all votes. Which is limited to relevant TFP staff members only. The script is fairly useless without access.

I am aware request and request-promise has been deprecated. Should be replaced with axios or other valid candidate.

# Usage

Requires NodeJs version >13.6.0

1. Download repo whichever your preferred method is and navigate to it.
2. `npm install` to install all required packages.
3. Create config.js based on the example (`copy config-example.js config.js` on Windows, `cp config-example.js config.js` on Linux).
4. Open `config.js` and input username and password.
2. `node app.js <args>` to run.

`<args>` will be the tag for the current round of nominations, which typically looks something similar to [SA2021R1] or [SA2021R2].