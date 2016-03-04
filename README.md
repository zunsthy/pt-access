# PT-login

PT-login is a tool to access multiple PT(private tracker) sites 
and store login info without opening those sites.

Some PT sites remove AFK accounts, so use the tool to make last
access time is now.

## Configure

* Open `conf/config.json` with text editor.

* Delete the sites where you have no accounts.

* Add correct `username` and `password` to config file.

## Usage

Open the network connection and run it:
```
  node app.js
```

(your node.js need to support ES6)

### Liscence

PT-login is licensed under the MIT License.
