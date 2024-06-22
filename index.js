const { Client, Events, GatewayIntentBits, Collection, ActivityType } = require('discord.js');
require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const cidHandler = require("./channelIdsHandler.js");

const client = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildIntegrations, GatewayIntentBits.GuildVoiceStates]});

client.once(Events.ClientReady, readyClient => {
    console.log("Ready! Logged in as " + readyClient.user.tag);
    readyClient.user.setPresence({
        activities: [{
            name: "You",
            type: ActivityType.Watching
        }],
        status: "online"
    });
})

client.login(process.env.DISCORD_TOKEN);

//Commands

client.commands = new Collection();

const cmdFoldersPath = path.join(__dirname, "commands");
const cmdFolders = fs.readdirSync(cmdFoldersPath);

for (const folder of cmdFolders) {
    const commandsPath = path.join(cmdFoldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ("data" in command && "execute" in command) {
            client.commands.set(command.data.name, command);
        }
        else {
            console.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
        console.error("No command matching " + interaction.commandName);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
    }
})

//Voice Channel Listener

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    let channelIds = cidHandler.getChannelIds();
    let cids = channelIds.map((el) => {return el.channelId});
    console.log(cids);
    if (cids.length == 0) {   return;    }
    if (oldState.channelId != newState.channelId && cids.includes(oldState.channelId)) {
        if (oldState.channel.members.size == 0) {
            const generatedId = channelIds.filter((cid) => cid.channelId == oldState.channelId)[0].generatedId;
            let channelsToDelete = [];
            let channelsWithId = channelIds.filter((cid) => cid.generatedId == generatedId);
            console.log(channelsWithId);
            var toReturn = false;
            await channelsWithId.forEach(async (channel) => {
                const c = await oldState.guild.channels.fetch(channel.channelId.toString());
                if ((c.members.size ?? 0) > 0) {
                    toReturn = true;
                    return;
                }
                channelsToDelete.push(c);
            });
            if (toReturn) { return; };
            cidHandler.removeFromGeneratedId(generatedId);
            channelsToDelete.forEach(async (channel) => {
                await channel.delete();
            })
        }
    }
})

