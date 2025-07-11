require('dotenv').config();
const axios = require('axios');
const { 
  Client, 
  GatewayIntentBits, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ActionRowBuilder, 
  Events,
  REST,
  Routes,
  SlashCommandBuilder
} = require('discord.js');

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
  ] 
});

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const CLIENT_ID = '1392991120006447124';
const GUILD_ID = '1392646373907894315';

// Register slash command on startup
const commands = [
  new SlashCommandBuilder()
    .setName('ticketform')
    .setDescription('Open a ticket form modal'),
]
  .map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands },
    );
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'ticketform') {
      // Build the modal
      const modal = new ModalBuilder()
        .setCustomId('ticketModal')
        .setTitle('Create a Ticket');

      const subjectInput = new TextInputBuilder()
        .setCustomId('subject')
        .setLabel("Subject")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter ticket subject')
        .setRequired(true);

      const descriptionInput = new TextInputBuilder()
        .setCustomId('description')
        .setLabel("Description")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Describe the issue')
        .setRequired(true);

      const firstActionRow = new ActionRowBuilder().addComponents(subjectInput);
      const secondActionRow = new ActionRowBuilder().addComponents(descriptionInput);

      modal.addComponents(firstActionRow, secondActionRow);

      // Show the modal to the user
      await interaction.showModal(modal);
    }
  } else if (interaction.isModalSubmit()) {
    if (interaction.customId === 'ticketModal') {
      const subject = interaction.fields.getTextInputValue('subject');
      const description = interaction.fields.getTextInputValue('description');

      try {
        // Create ticket in HubSpot
        const response = await axios.post('https://api.hubapi.com/crm/v3/objects/tickets', {
          properties: {
            hs_ticket_subject: subject,        // HubSpot ticket subject property
            content: description,               // HubSpot ticket content/description property
            hs_pipeline: "0",                   // default pipeline (adjust if needed)
            hs_pipeline_stage: "1",             // default stage (adjust if needed)
            status: 'new'                      // custom status if your portal supports it
          }
        }, {
          headers: {
            'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        const ticketId = response.data.id;

        await interaction.reply({
          content: `✅ Ticket created successfully in HubSpot! Your ticket number is **${ticketId}**.`,
          ephemeral: true
        });
      } catch (error) {
        console.error('Error creating ticket in HubSpot:', error.response?.data || error.message);
        await interaction.reply({
          content: '❌ There was an error creating your ticket in HubSpot. Please try again later.',
          ephemeral: true
        });
      }
    }
  }
});

client.login(TOKEN);
