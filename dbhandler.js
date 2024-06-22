const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const fs = require("node:fs");
var db = null;

async function openDb() {
    if (!fs.existsSync("./db/database.db")) {
        var stream = fs.createWriteStream("./db/database.db");
        stream.end();
    }
    const _db = await open({
        filename: "./db/database.db",
        driver: sqlite3.Database
    });
    return _db;
}

/*(async () => {
    db = await openDb();
    db.exec("CREATE TABLE guildCategories (guildId TEXT, channelId TEXT)");
})();*/

async function setGuildCategory(guildId, channelId) {
    if (db == null) {
        db = await openDb();
        console.log(db);
    }
    try {
        if ((await db.get("SELECT * FROM guildCategories WHERE guildId=" + guildId))) {
            await db.exec(`UPDATE guildCategories SET channelId="${channelId}" WHERE guildId = ${guildId}`)
        }
        else {
            await db.exec(`INSERT INTO guildCategories (guildId, channelId) VALUES ("${guildId}", "${channelId}")`)
        }
    } catch {

    }
}

async function getGuildCategory(guildId) {
    if (db == null) {
        db = await openDb();
        console.log(db);
    }
    try {
        return (await db.get("SELECT * FROM guildCategories WHERE guildId=" + guildId)) ?? false;
    } catch {

    }
}

module.exports = {setGuildCategory, getGuildCategory};