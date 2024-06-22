const {SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ChannelType, PermissionFlagsBits} = require("discord.js");
const {maxTeams} = require("../../config.json");
const db = require("../../dbhandler.js");
const cidHandler = require("../../channelIdsHandler.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("createteam")
        .setDescription("Creates a random team")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setDMPermission(false),
    async execute(interaction) {
        const sender = interaction.member;
        const guild = interaction.guild;
        const catResponse = await db.getGuildCategory(guild.id);
        if (!catResponse) {
            await interaction.reply({content: "A Channel Category hasn't been setup. Use the command '/setupcategory'", ephemeral: true});
            return;
        }
        const categoryId = catResponse["channelId"];
        if (!await isInVC(sender)) {
            await interaction.reply({content: "You aren't currently connected to a voice channel.", ephemeral: true});
        }
        else {
            var users = await fetchUsersInVC(guild, sender.voice.channel.id);
            if (users.size < 2) {
                await interaction.reply({content: "At least two people is required to create teams.", ephemeral: true});
                return;
            }
            var max = Math.max(Math.min(Math.round(users.size/2), maxTeams), 2);
            var teamOptions = []
            for (var i = 2; i <= max; i++) {
                teamOptions.push(new StringSelectMenuOptionBuilder()
                    .setLabel(i + " Teams")
                    .setDescription(`Creates ${i} teams.`)
                    .setValue(i + " teams")
                );
            }
            const select = new StringSelectMenuBuilder()
                .setCustomId("teamAmountSelect")
                .setPlaceholder("Choose amount of teams")
                .addOptions(teamOptions);
            const button = new ButtonBuilder()
                .setCustomId("cancelBtn")
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Danger);
            const selectRow = new ActionRowBuilder().addComponents(select);
            const buttonRow = new ActionRowBuilder().addComponents(button);
            const response = await interaction.reply({
                content: "How many teams do you want to create?",
                components: [selectRow, buttonRow],
                ephemeral: true
            })

            const collectorFilter = i => i.user.id === interaction.user.id;
            try {
                const confirmation = await response.awaitMessageComponent({filter: collectorFilter, time: 60_000});
                if (confirmation.customId == "cancelBtn") {
                    await interaction.editReply({content: "Team Creation has been cancelled.", components: [], ephemeral: true});
                }
                else {
                    const amount = Number(confirmation.values[0].split(" ")[0]);
                    if (isNaN(amount)) { throw ("Team amount NaN"); }
                    let teams = createTeams(users, amount);
                    let teamTags = []
                    teams.forEach((team, index) => {
                        let teamTag = [];
                        team.forEach(user => {  teamTag.push({id: user.guildmember.user.id, guildmember: user.guildmember, name: user.guildmember.user.globalName, nickname: user.guildmember.nickname});   });
                        teamTags.push(teamTag);
                    });
                    let fields = [];
                    console.log(interaction.client);
                    const generatedId = cidHandler.nextGeneratedId();
                    teamTags.forEach(async (teamTag, index) => {
                        fields.push({name: "Team " + (index+1), value: teamTag.map((t) => {return t.nickname ? t.nickname + ` (${t.name})` : t.name}).join("\n"), inline: true});
                        let perms = [{
                            id: guild.id,
                            deny: [PermissionFlagsBits.Connect]
                        }, {
                            id: await interaction.client.user.id,
                            allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels]
                        }];
                        let ids = teamTag.map((t) => {return t.id});
                        ids.forEach(id => {
                            perms.push({id: id, allow: [PermissionFlagsBits.Connect]});
                        })

                        const channel = await guild.channels.create({
                            name: `Team ${index+1}`,
                            type: ChannelType.GuildVoice,
                            parent: categoryId,
                            userLimit: ids.length,
                            permissionOverwrites: perms
                        });
                        teamTag.forEach((teamUser) => {
                            teamUser.guildmember.voice.setChannel(channel.id);
                        })
                        cidHandler.addChannelId({channelId: channel.id, generatedId: generatedId});
                    })
                    await interaction.editReply({content: "Teams Created.", components: [], ephemeral: true})
                    const embed = new EmbedBuilder()
                        .setColor("Aqua")
                        .setTitle(`Created ${amount} Teams`)
                        .setDescription(`${sender.nickname ? sender.nickname + " (" + sender.user.globalName + ")" : sender.user.globalName}` + ` has created random teams.`)
                        .setFooter("The generated voice channels will be deleted, once all of them are empty.")
                        .addFields(fields);
                    await interaction.followUp({content: "", embeds: [embed], components: [], ephemeral: false});
                }
            } catch (e) {
                console.log("error catched: ");
                console.log(e);
                await interaction.editReply({content: "Team Creation has been cancelled.", components: [], ephemeral: true});
            }
        }
    }
}

async function isInVC(member) {
    return await member.voice.channel ? true : false;
}

async function fetchUsersInVC(guild, id) {
    const channel = await guild.channels.fetch(id);
    return channel.members;
}

function createTeams(users, amount) {
    const quot = Math.floor(users.size / amount);
    const rem = users.size % amount;
    var a = Array.from(users, ([id, guildmember]) => ({id, guildmember}));
    let currentIndex = a.length;
    while (currentIndex != 0) {
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [a[currentIndex], a[randomIndex]] = [
        a[randomIndex], a[currentIndex]];
    }
    var parts = [];
    for (var i = 0; i < amount; ++i) {
        const begin = i * quot + Math.min(rem, i);
        const end = begin + quot + (i < rem);
        parts.push(a.slice(begin, end));
    }
    return parts;
}