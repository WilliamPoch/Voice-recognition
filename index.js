require('dotenv').config()
const fs = require('fs');
const Discord = require('discord.js');
const client = new Discord.Client();
// const Commando = require('discord.js-commando');
// const client = new Commando.Client();
const DiscordAntiSpam = require('discord-anti-spam');
const decode = require('./decodeOpus.js');
const WitSpeech = require('node-witai-speech');
const ffmpeg = require('fluent-ffmpeg');
const WIT_API_KEY = process.env.witai
const path = require('path');
const recordingsPath = makeDir('./recordings');
var dispatcher = null;
var voiceChannel = null;
var textChannel = null;
var listenConnection = null;
var listenReceiver = null;
var listenStreams = new Map();
var listening = false;

function makeDir(dir) {
    try {
      fs.mkdirSync(dir);
      console.log('dir')
    } catch (err) {}
  }

client.music = require('discord.js-musicbot-addon');

// global.servers = {};
// client.registry.registerGroup('simple', 'Simple');
// client.registry.registerDefaults();
// client.registry.registerCommandsIn(__dirname + '/commands');

client.music.start(client, {

    youtubeKey: process.env.youtubeAPI,

    messageNewSong: false,
    botPrefix: "#",

})

const AntiSpam = new DiscordAntiSpam({
    warnThreshold: 4, // Amount of messages sent in a row that will cause a warning.
    banThreshold: 7, // Amount of messages sent in a row that will cause a ban
    maxInterval: 3000, // Amount of time (in ms) in which messages are cosidered spam.
    warnMessage: "{@user}, Can you don't?.", // Message will be sent in chat upon warning.
    banMessage: ("**{user_tag}** has been banned for spamming.", { files: ['./img/Pogweird.png'] }), // Message will be sent in chat upon banning.
    maxDuplicatesWarning: 4, // Amount of same messages sent that will be considered as duplicates that will cause a warning.
    maxDuplicatesBan: 8, // Amount of same messages sent that will be considered as duplicates that will cause a ban.
    deleteMessagesAfterBanForPastDays: 1, // Amount of days in which old messages will be deleted. (1-7)
    ignoredUsers: [], // array of ignored user ids
    ignoredGuilds: [], // array of ignored guild ids
    exemptPermissions: [], // Bypass users with at least one of these permissions
    ignoreBots: true, // Ignore bot messages
    verbose: false, // Extended Logs from module
    client: client, // Client is your Discord.Client and is a required option.
    ignoredUsers: [], // Array of string user IDs that are ignored
    ignoredGuilds: [] // Array of string Guild IDs that are ignored
});

AntiSpam.on("warnEmit", (member) => console.log(`Attempt to warn ${member.user.tag}.`));
AntiSpam.on("warnAdd", (member) => console.log(`${member.user.tag} has been warned.`));
AntiSpam.on("banEmit", (member) => console.log(`Attempt to ban ${member.user.tag}.`));
AntiSpam.on("banAdd", (member) => console.log(`${member.user.tag} has been banned.`));
AntiSpam.on("dataReset", () => console.log("Module cache has been cleared."));

function date() {
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var yyyy = today.getFullYear();

    today = dd + '-' + mm + '-' + yyyy;
    return today;
}
function dateTime() {
    var today = new Date();
    var hour = String(today.getHours()).padStart(2, '0');
    var min = String(today.getMinutes()).padStart(2, '0');
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var yyyy = today.getFullYear();

    today = hour + ":" + min + "-" + dd + '-' + mm + '-' + yyyy;
    return today;
}
client.on('guildMemberSpeaking', handleSpeaking.bind(this));

client.on("message", (msg) => {
    AntiSpam.message(msg);
})

client.on("message", (msg) => {
    if (msg.content == "!listen") {
        textChannel = msg.channel;
        commandListen(msg);
        // handleSpeaking(msg);
    } else if (msg.content == "!leave") {
        commandLeave(msg);
    }
})

client.on("message", (msg) => {
    let filename = 'logs/log' + date() + '.txt';
    let CreateFiles = fs.createWriteStream(filename, {
        flags: 'a'
    })
    if (fs.existsSync(filename)) {
        let link
        for (var [key, value] of msg.attachments) {
            link = (value.url);
        }
        if (link != undefined) {
            CreateFiles.write(dateTime() + "," + msg.author.id + "," + msg.author.username + "," + msg.content + "," + link + '\r\n');
        } else {
            CreateFiles.write(dateTime() + "," + msg.author.id + "," + msg.author.username + "," + msg.content + "," + '\r\n');
        }
    } else {
        CreateFiles = fs.createWriteStream(filename, {
            flags: 'a'
        })
    }



})
fs.readdir('./events/', (err, files) => {
    files.forEach(file => {
        const eventHandler = require(`./events/${file}`)
        const eventName = file.split('.')[0]
        client.on(eventName, (...args) => eventHandler(client, ...args))
    })
})
client.login(process.env.BOT_TOKEN);

function handleSpeaking(member, speaking) {
    // console.log(speaking)
    // Close the writeStream when a member stops speaking
    if (!speaking && member.voiceChannel) { 
        let stream = listenStreams.get(member.id);
        if (stream) {
            listenStreams.delete(member.id);
            stream.end(err => {
                if (err) {
                    console.error(err);
                }

                let basename = path.basename(stream.path, '.opus_string');
                let text = "default";
                // decode file into pcm
                decode.convertOpusStringToRawPCM(stream.path,
                    basename,
                    (function () {
                        processRawToWav(
                            path.join('./recordings', basename + '.raw_pcm'),
                            path.join('./recordings', basename + '.wav'),
                            (function (data) {
                                if (data != null) {
                                    handleSpeech(member, data._text);
                                }
                            }).bind(this))  
                    }).bind(this));
            });
        } 
    }
}

function processRawToWav(filepath, outputpath, cb) {
    fs.closeSync(fs.openSync(outputpath, 'w'));
    var command = ffmpeg(filepath)
        .addInputOptions([
            '-f s32le',
            '-ar 48k',
            '-ac 1'
        ])
        .on('end', function () {
            // Stream the file to be sent to the wit.ai
            var stream = fs.createReadStream(outputpath);

            // Its best to return a promise
            var parseSpeech = new Promise((ressolve, reject) => {
                // call the wit.ai api with the created stream
                
                WitSpeech.extractSpeechIntent(WIT_API_KEY, stream, "audio/wav",
                    (err, res) => {
                        if (err) return reject(err);
                        ressolve(res);
                    });
            });

            // check in the promise for the completion of call to witai
            parseSpeech.then((data) => {
                console.log("you said: " + data._text);
                console.log(data)
                cb(data);
                //return data;
            })
                .catch((err) => {
                    console.log(err);
                    cb(null);
                    //return null;
                })
        })
        .on('error', function (err) {
            console.log('an error happened: ' + err.message);
        })
        .addOutput(outputpath)
        .run();
}
function handleSpeech(member, speech) {
    var command = speech.toLowerCase().split(' ');
    if ((command[0] == 'play' && command[1] == 'list') || command[0] == 'playlist') {
      command = 'playlist';
    }
    else {
      command = command[0];
    }
    switch (command) {
      
      default:
    }
  }

  var listening = false;

  function commandListen(message) {
    member = message.member;
    if (!member) {
      return;
    }
    if (!member.voiceChannel) {
      message.reply(" you need to be in a voice channel first.")
      return;
    }
    if (listening) {
      message.reply(" a voice channel is already being listened to!");
      return;
    }
  
    listening = true;
    voiceChannel = member.voiceChannel;
    textChannel.send('Listening in to **' + member.voiceChannel.name + '**!');
  
    var recordingsPath = path.join('.', 'recordings');
    makeDir(recordingsPath);
  
    voiceChannel.join().then((connection) => {
      //listenConnection.set(member.voiceChannelId, connection);
      listenConnection = connection;
      let receiver = connection.createReceiver();
      const dispatcher = connection.playFile('./audio/boop.mp3')
      dispatcher.on('end', end => {
        console.log('boop')
      })
      receiver.on('opus', function(user, data) {
        let hexString = data.toString('hex');
        let stream = listenStreams.get(user.id);
        if (!stream) {
          if (hexString === 'f8fffe') {
            return;
          }
          let outputPath = path.join(recordingsPath, `${user.id}-${Date.now()}.opus_string`);
          stream = fs.createWriteStream(outputPath);
          listenStreams.set(user.id, stream);
        }
        stream.write(`,${hexString}`);
      });
      //listenReceiver.set(member.voiceChannelId, receiver);
      listenReceiver = receiver;
    }).catch(console.error);
  }

  function commandLeave() {
    listening = false;
    queue = []
    if (dispatcher) {
      dispatcher.end();
    }
    dispatcher = null;
    commandStop();
    if (listenReceiver) {
      listenReceiver.destroy();
      listenReceiver = null;
    }
    if (listenConnection) {
      listenConnection.disconnect();
      listenConnection = null;
    }
    if (voiceChannel) {
      voiceChannel.leave();
      voiceChannel = null;
    }
  }
  function commandStop() {
    if (listenReceiver) {
      listening = false;
      listenReceiver.destroy();
      listenReceiver = null;
      textChannel.send("Stopped listening!");
    }
  }