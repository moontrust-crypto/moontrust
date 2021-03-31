# Installation:
* $ npm install -g ts-node
* $ npm install .

# Create SQLite3 DB:
```
$ sqlite3 monitor.db
sqlite> create table balances(address text primary key, balance text, latest_block bigint);
```

# Scripts:

* Start Airdrop-Monitor: `$ ts-node scripts/airdrop-monitor.ts`