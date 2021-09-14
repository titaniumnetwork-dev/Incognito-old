# Incognito
Access the world wide web!

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/titaniumnetwork-dev/Incognito/tree/main)

## Setup

```sh
git clone https://github.com/titaniumnetwork-dev/Incognito
cd Incognito
npm install
npm start
```

## Config

```json
{
    "port": 8080,
    "ssl": false,
    "prefix": "/service/",
    "codec": "xor",
    "proxy": true,
    "blacklist": [],
    "addresses": [],
    "authorization": {
        "name": "__incog_auth",
        "value": "1"
    },
    "appearance": "bright",
    "engine": "google"
}
```
