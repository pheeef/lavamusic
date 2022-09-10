const Client = require("../../index");
const { VoiceState, EmbedBuilder } = require("discord.js");
const MusicBot = require("../../structures/Client");
/**
 *
 * @param {MusicBot} client
 * @param {VoiceState} oldState
 * @param {VoiceState} newState
 * @returns {Promise<void>}
 */
module.exports = {
  name: "voiceStateUpdate",
  /**
   *
   * @param {MusicBot} client
   * @param {VoiceState} oldState
   * @param {VoiceState} newState
   * @returns {Promise<void>}
   */
  run: async (client, oldState, newState) => {
    // get guild and player
    let guildId = newState.guild.id;
    const player = client.manager.get(guildId);

    // check if the bot is active (playing, paused or empty does not matter (return otherwise)
    if (!player || player.state !== "CONNECTED") return;

    // prepreoces the data
    const stateChange = {};
    // get the state change
    if (oldState.channel === null && newState.channel !== null)
      stateChange.type = "JOIN";
    if (oldState.channel !== null && newState.channel === null)
      stateChange.type = "LEAVE";
    if (oldState.channel !== null && newState.channel !== null)
      stateChange.type = "MOVE";
    if (newState.serverMute == true && oldState.serverMute == false)
      return player.pause(false);
    if (newState.serverMute == false && oldState.serverMute == true)
      return player.pause(true);
    // move check first as it changes type
    if (stateChange.type === "MOVE") {
      if (oldState.channel.id === player.voiceChannel)
        stateChange.type = "LEAVE";
      if (newState.channel.id === player.voiceChannel)
        stateChange.type = "JOIN";
    }
    // double triggered on purpose for MOVE events
    if (stateChange.type === "JOIN") stateChange.channel = newState.channel;
    if (stateChange.type === "LEAVE") stateChange.channel = oldState.channel;

    // check if the bot's voice channel is involved (return otherwise)
    if (!stateChange.channel || stateChange.channel.id !== player.voiceChannel)
      return;

    // filter current users based on being a bot
    stateChange.members = stateChange.channel.members.filter(
      (member) => !member.user.bot
    );

    switch (stateChange.type) {
      case "JOIN":
        if (
          (oldState.selfMute && !newState.selfMute) ||
          (!oldState.selfMute && newState.selfMute)
        )
          return;
        if (
          (oldState.selfDeaf && !newState.selfDeaf) ||
          (!oldState.selfDeaf && newState.selfDeaf)
        )
          return;
        if (stateChange.members.size >= 1 && player.paused) {
          let emb = new EmbedBuilder()
            .setAuthor({ name: `Resuming paused queue` })
            .setColor(client.embedColor)
            .setDescription(
              `Resuming playback because all of you left me with music to play all alone`
            );
          client.channels.cache.get(player.textChannel).send({ embeds: [emb] });

          player.pause(false);
        }
        break;
      case "LEAVE":
        if (
          stateChange.members.size === 0 &&
          !player.paused &&
          player.playing
        ) {
          player.pause(true);

          let emb = new EmbedBuilder()
            .setAuthor({ name: `Paused!` })
            .setColor(client.embedColor)
            .setDescription(
              `The player has been paused because everybody left`
            );
          client.channels.cache
            .get(player?.textChannel)
            .send({ embeds: [emb] });
        }
        break;
    }
  },
};
