require('dotenv').config();
const Discord = require('discord.js');
const db = require('./database/db');
const Client = new Discord.Client({
  partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
});
const ticket = require('./models/ticket');

//Logs bot in (online) when client present
Client.login(process.env.BOT_TOKEN);
Client.on('ready', () => {
  console.log('Bot is online.');
  db.authenticate()
    .then(() => {
      console.log('Logged in to db.');
      ticket.init(db);
      ticket.sync();
    })
    .catch((err) => console.log(err));
});

Client.on('message', (message) => {
  if (message.author.bot) return;
  if (
    !message.channel.name.includes('dev-test', 'open-ticket', 'charity-ticket')
  )
    return;
  let embedMsg = new Discord.MessageEmbed()
    .setColor('#0099ff')
    .setTitle('Create Ticket Here!')
    .setDescription(
      'React to this message with 🎫 to open a ticket with Kedima!'
    )
    .setFooter(
      'TTicket coded by Taux#9643',
      'https://cdn.discordapp.com/avatars/218053093877743616/6c0b9f639049658d62f31f4b1c026634.png?size=128'
    );

  message.channel
    .send(embedMsg)
    .then((message) => {
      message.react('🎫');
    })
    .catch((err) => console.log(err));
});

Client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;

  let msg = await reaction.message.fetch();

  let embedMsgTitle = msg.embeds.map((embed) => {
    return embed.title;
  });

  console.log(embedMsgTitle.toString());

  if (
    embedMsgTitle.toString() === 'Create Ticket Here!' &&
    reaction.emoji.name === '🎫'
  ) {
    const userReactions = msg.reactions.cache.filter((reaction) =>
      reaction.users.cache.has(user.id)
    );
    try {
      for (const reaction of userReactions.values()) {
        await reaction.users.remove(user.id);
      }
    } catch (error) {
      console.error('Failed to remove reactions.');
    }

    let findTicket = await ticket
      .findOne({
        where: { authorId: user.id, resolved: false },
      })
      .catch((err) => console.log(err));
    if (findTicket) {
      user.send('You already have an open ticket.');
      console.log('Ticket exists for user');
    } else {
      console.log('Create new ticket.');
      try {
        await reaction.message.fetch();
      } catch (error) {
        console.log('Something went wrong when fetching the message: ', error);
        return;
      }
      // console.log(`${user.username} reacted!`);
      // console.log(
      //   `${reaction.count} user(s) have given the same reaction to this message!`
      // );
      console.log('Creating ticket...');
      try {
        let channel = await reaction.message.guild.channels.create('ticket', {
          type: 'text',
          permissionOverwrites: [
            {
              allow: 'VIEW_CHANNEL',
              id: user.id,
            },
            {
              deny: 'VIEW_CHANNEL',
              id: reaction.message.guild.id,
            },
          ],
        });
        let embed = new Discord.MessageEmbed()
          .setColor('#0099ff')
          .setTitle('Support Ticket')
          .setDescription(`To resolve this ticket, react with ✅`)
          .setTimestamp()
          .setFooter(
            'TTicket coded by Taux#9643',
            'https://cdn.discordapp.com/avatars/218053093877743616/6c0b9f639049658d62f31f4b1c026634.png?size=128'
          );
        let msg = await channel.send(embed);
        await msg.react('✅');
        let newTicket = await ticket.create({
          authorId: user.id,
          channelId: channel.id,
          guildId: reaction.message.guild.id,
          resolved: false,
          closeMessageId: msg.id,
        });
        let ticketId = String(newTicket.dataValues.ticketId).padStart(4, '0');
        await channel.edit({ name: `${channel.name}-${ticketId}` });
      } catch (err) {
        console.log(err);
      }
    }
  } else if (
    embedMsgTitle.toString() === 'Support Ticket' &&
    reaction.emoji.name === '✅'
  ) {
    try {
      await ticket.update(
        { resolved: true },
        { where: { closeMessageId: reaction.message.id } }
      );
      let channel = reaction.message.channel;
      channel.delete();
    } catch (err) {
      console.log(err);
    }
  } else {
    console.log('Wrong Emoji.');
    reaction.remove();
  }
});
