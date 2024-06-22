const {SlashCommandBuilder, ActionRowBuilder, ChannelSelectMenuBuilder, PermissionFlagsBits, ChannelType} = require("discord.js");
const db = require("../../dbhandler.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setupcategory")
        .setDescription("Sets the category of where the team channels are created.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),
    async execute(interaction) {
        const sender = interaction.member;
        const guild = interaction.guild;
        const select = new ChannelSelectMenuBuilder()
            .setCustomId("category")
            .setPlaceholder("Choose Category")
            .setChannelTypes(ChannelType.GuildCategory)
            .setMaxValues(1);
        const actionRow = new ActionRowBuilder().addComponents(select);
        const response = await interaction.reply({
            content: "Select which category the team channels will be created:", components: [actionRow], ephemeral: true
        });
        var category = null;
        const collectorFilter = i => i.user.id === interaction.user.id;
            try {
                const confirmation = await response.awaitMessageComponent({filter: collectorFilter, time: 60_000});
                if (confirmation.customId == "category") {
                    category = await guild.channels.fetch(confirmation.values[0]);
                    db.setGuildCategory(guild.id, category.id);
                    await interaction.editReply({content: "Team Category has been set to: " + category.name, components: [], ephemeral: true});
                }
            } catch (e) {
                console.log(e);
                await interaction.editReply({content: "Setup has been cancelled", components: [], ephemeral: true});
            }
    }
}