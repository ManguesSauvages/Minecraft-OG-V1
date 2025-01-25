const { Client, GatewayIntentBits, Partials } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const polls = new Map();

client.once('ready', () => {
    console.log(`Bot connecté en tant que ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content.startsWith('!poll')) {
        const filter = (m) => m.author.id === message.author.id;

        // Étape 1 : Demander le titre
        message.channel.send('Quel est le **titre** du sondage ?');
        const collectedTitle = await message.channel.awaitMessages({ filter, max: 1, time: 30000 }).catch(() => null);
        if (!collectedTitle || !collectedTitle.first()) return message.channel.send('⏰ Temps écoulé. Commande annulée.');
        const title = collectedTitle.first().content;

        // Étape 2 : Demander les choix
        message.channel.send('Listez les **choix** pour le sondage séparés par des virgules (ex: Choix 1, Choix 2, Choix 3).');
        const collectedChoices = await message.channel.awaitMessages({ filter, max: 1, time: 30000 }).catch(() => null);
        if (!collectedChoices || !collectedChoices.first()) return message.channel.send('⏰ Temps écoulé. Commande annulée.');
        const choices = collectedChoices.first().content.split(',').map((choice) => choice.trim());
        if (choices.length < 2) return message.channel.send('❌ Vous devez fournir au moins **deux choix**.');

        // Étape 3 : Durée du sondage
        message.channel.send('Combien de temps le sondage doit-il durer ? (en secondes)');
        const collectedTime = await message.channel.awaitMessages({ filter, max: 1, time: 30000 }).catch(() => null);
        if (!collectedTime || !collectedTime.first()) return message.channel.send('⏰ Temps écoulé. Commande annulée.');
        const duration = parseInt(collectedTime.first().content);
        if (isNaN(duration) || duration <= 0) return message.channel.send('❌ Durée invalide.');

        // Création du sondage
        const pollMessage = await message.channel.send({
            embeds: [{
                title: `📊 ${title}`,
                description: choices.map((choice, index) => `${index + 1}. ${choice}`).join('\n'),
                footer: { text: `Sondage créé par ${message.author.tag} | Clôture dans ${duration} secondes` },
                color: 0x00bfff,
            }],
        });

        // Ajouter les réactions pour voter
        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        for (let i = 0; i < choices.length && i < emojis.length; i++) {
            await pollMessage.react(emojis[i]);
        }

        // Stocker le sondage dans la Map
        polls.set(pollMessage.id, {
            title,
            choices,
            votes: new Array(choices.length).fill(0),
        });

        // Attendre la durée spécifiée
        setTimeout(async () => {
            const poll = polls.get(pollMessage.id);
            if (!poll) return;

            // Récupérer les résultats
            const pollResults = await pollMessage.fetch();
            pollResults.reactions.cache.forEach((reaction, emoji) => {
                const index = emojis.indexOf(emoji);
                if (index !== -1) poll.votes[index] = reaction.count - 1; // -1 pour exclure le bot
            });

            // Annoncer les résultats
            const results = poll.choices.map((choice, index) => `${choice}: ${poll.votes[index]} votes`).join('\n');
            message.channel.send({
                embeds: [{
                    title: `📊 Résultats du sondage: ${poll.title}`,
                    description: results,
                    color: 0x00ff00,
                }],
            });

            polls.delete(pollMessage.id);
        }, duration * 1000);
    }
});

client.login('MTMzMjc0NDg3ODQxMjc5NTk4MA.GkptLU.Q2NihmoghangEr3NpVr8p36ZD7xPNbEXUaH4AY');
