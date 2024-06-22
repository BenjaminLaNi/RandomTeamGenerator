const { REST, Routes } = require("discord.js");
require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");

commands = [];

const cmdFoldersPath = path.join(__dirname, "commands");
const cmdFolders = fs.readdirSync(cmdFoldersPath);

for (const folder of cmdFolders) {
    const commandsPath = path.join(cmdFoldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ("data" in command && "execute" in command) {
            commands.push(command.data.toJSON());
        }
        else {
            console.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

console.log(commands);

(async () => {
    console.log("aaaaaa");
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			Routes.applicationCommands(process.env.APP_ID),
			{ body: commands },
		);

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();